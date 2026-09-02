import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOUTH_SHAPES, capBadgeTexture, faceTexture, mouthTexture, speechCloudTexture } from './keeperTextures'
import { AISLE_TRAVEL_RATE, CLOUD, KEEPER, cm } from './keeperRig'

/**
 * MAP-027 — the shopkeeper, standing in the room.
 *
 * An illustrated anime/cartoon human character constructed from styled primitives
 * and high-fidelity procedural canvas textures.
 *
 * She greets on arrival, reacts to the basket, and looks at what the customer
 * picks up. She does not claim to be present, does not type, and says nothing the
 * shelf model and approved knowledge have not established.
 */

/**
 * Palette, taken from the K2 shopkeeper character sheet.
 *
 * These are the sheet's own swatches rather than values picked by eye, which is
 * what the previous set were: the cap was a warm orange-red where the sheet is
 * a deep burgundy, the shirt was near-white where the sheet is cream, and the
 * denim was grey-slate where the sheet is navy.
 */
const SKIN = '#F2D3B3'
const SKIN_SHADE = '#DFB392'
const HAIR = '#2E2018'          // sheet #222222, warmed so it is not flat black
const HAIR_SHEEN = '#4E382A'
const CAP = '#8B1E2D'           // sheet swatch
const CAP_SHADE = '#711824'
const APRON = '#556B3F'         // sheet swatch
const APRON_SHADE = '#4A5C36'
const APRON_TIE = '#41512F'
const BLOUSE = '#F5ECDD'        // sheet swatch
const GOLD = '#D8A574'          // sheet swatch, the apron buckles
const NAMETAG = '#FBF7F0'
// Denim and footwear. The sheet gives navy wide-leg jeans over white sneakers.
const TROUSER = '#2C3650'       // sheet swatch
const TROUSER_SHADE = '#243049'
const SHOE = '#F4F2EE'
const SHOE_SOLE = '#DCD8D1'

/**
 * Skeleton, in centimetres from the floor.
 */
const HEAD_R = cm(KEEPER.headRadiusCm)

/**
 * The patch of skull the face is painted on.
 */
const FACE_PHI = 1.55
const FACE_THETA_START = 0.72
const FACE_THETA = 1.25

const HEAD_Y = cm(KEEPER.headCm)
const NECK_Y = cm(KEEPER.neckCm)
const SHOULDER_Y = cm(KEEPER.shoulderCm)
const TORSO_Y = cm(KEEPER.torsoCm)

/** A blink on an irregular clock; a periodic one reads as a machine. */
function useBlink() {
  const [openness, setOpenness] = useState(1)
  const next = useRef(2 + Math.random() * 4)
  const clock = useRef(0)
  const closing = useRef(0)

  useFrame((_, delta) => {
    clock.current += delta
    if (closing.current > 0) {
      closing.current -= delta
      const phase = 1 - Math.max(0, closing.current) / 0.16
      setOpenness(phase < 0.5 ? 1 - phase * 2 : (phase - 0.5) * 2)
      if (closing.current <= 0) setOpenness(1)
      return
    }
    if (clock.current >= next.current) {
      clock.current = 0
      next.current = 2.5 + Math.random() * 4.5
      closing.current = 0.16
    }
  })

  return openness
}

/**
 * Which viseme she is on.
 *
 * Cycled from a small set on a jittered clock — even timing reads as a machine
 * flapping a jaw, and the irregularity is what makes it look like speech.
 */
function useViseme(talking, expression) {
  const [shape, setShape] = useState('closed')
  const clock = useRef(0)
  const next = useRef(0.12)

  useFrame((_, delta) => {
    if (!talking) {
      const resting = expression === 'delighted' ? 'grin' : expression === 'listening' ? 'line' : 'closed'
      if (shape !== resting) setShape(resting)
      return
    }
    clock.current += delta
    if (clock.current < next.current) return
    clock.current = 0
    next.current = 0.08 + Math.random() * 0.13
    const shapes = MOUTH_SHAPES.slice(0, 4)
    setShape(shapes[Math.floor(Math.random() * shapes.length)])
  })

  return shape
}

/**
 * The mouth, rendered on a dedicated texture to avoid GPU churn.
 */
function Mouth({ shape = 'closed' }) {
  const texture = useMemo(() => mouthTexture(shape), [shape])

  return (
    <mesh position={[0, -HEAD_R * 0.28, HEAD_R * 0.94]} rotation={[-0.14, 0, 0]}>
      <planeGeometry args={[HEAD_R * 0.44, HEAD_R * 0.44]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

/**
 * The speech cloud, hanging over her head the way a game draws one.
 */
function SpeechCloud({ message }) {
  const group = useRef(null)
  const map = useMemo(() => speechCloudTexture(message), [message])
  const life = useRef(0)

  useEffect(() => { life.current = 0 }, [message])

  useFrame((state, delta) => {
    const node = group.current
    if (!node || !map) return
    life.current = Math.min(1, life.current + delta * 2.6)
    const t = life.current
    const eased = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 1.2) : 1
    node.scale.setScalar(Math.max(0.001, eased))
    node.position.y = cm(CLOUD.centreCm) + Math.sin(state.clock.elapsedTime * 1.4) * cm(2.2)
  })

  if (!map) return null

  return (
    <group ref={group} position={[cm(CLOUD.offsetXCm), cm(CLOUD.centreCm), cm(10)]}>
      <mesh>
        <planeGeometry args={[cm(CLOUD.widthCm), cm(CLOUD.heightCm)]} />
        <meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * Hair.
 */
function Hair() {
  const opening = 1.02

  return (
    <group>
      {/* Back Hair Shell */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry
          args={[HEAD_R * 1.2, 36, 28, Math.PI / 2 + opening, Math.PI * 2 - opening * 2]}
        />
        <meshStandardMaterial color={HAIR} roughness={0.58} side={THREE.DoubleSide} />
      </mesh>

      {/* Crown */}
      <mesh castShadow>
        <sphereGeometry args={[HEAD_R * 1.18, 36, 20, 0, Math.PI * 2, 0, 0.78]} />
        <meshStandardMaterial color={HAIR} roughness={0.58} />
      </mesh>

      {/* The fringe: a band of styled anime bangs across the forehead. */}
      <mesh>
        <sphereGeometry args={[HEAD_R * 1.14, 36, 24, Math.PI / 2 - 1.15, 2.3, 0.38, 0.54]} />
        <meshStandardMaterial color={HAIR} roughness={0.55} />
      </mesh>

      {/* Lighter inner strand for depth */}
      <mesh>
        <sphereGeometry args={[HEAD_R * 1.15, 24, 16, Math.PI / 2 - 0.34, 0.5, 0.42, 0.38]} />
        <meshStandardMaterial color={HAIR_SHEEN} roughness={0.5} />
      </mesh>

      {/* Short points below the fringe */}
      {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
        <mesh
          key={i}
          position={[x * HEAD_R, HEAD_R * 0.44, HEAD_R * 0.9]}
          rotation={[Math.PI, 0, x * 0.28]}
        >
          <coneGeometry args={[HEAD_R * 0.08, HEAD_R * 0.24, 4]} />
          <meshStandardMaterial color={HAIR} roughness={0.55} />
        </mesh>
      ))}

      {/* Side locks falling past the jaw */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * HEAD_R * 0.95, -HEAD_R * 0.55, -HEAD_R * 0.05]}
          rotation={[0, 0, side * 0.08]}
          castShadow
        >
          <capsuleGeometry args={[HEAD_R * 0.28, HEAD_R * 1.25, 6, 14]} />
          <meshStandardMaterial color={HAIR} roughness={0.58} />
        </mesh>
      ))}

      {/* Long waved length down the back.
          The sheet gives her hair well past the shoulder blades with body in
          it, not the short bundle that was here. Three overlapping strands at
          slightly different lengths and angles read as waves; one capsule reads
          as a ponytail. */}
      {[
        { x: 0, len: 3.6, r: 0.52, tilt: 0.2, z: -0.86 },
        { x: -0.62, len: 3.1, r: 0.4, tilt: 0.16, z: -0.7 },
        { x: 0.62, len: 3.2, r: 0.4, tilt: 0.16, z: -0.7 },
      ].map((strand, i) => (
        <mesh
          key={i}
          position={[strand.x * HEAD_R, -HEAD_R * (0.5 + strand.len / 2.4), HEAD_R * strand.z]}
          rotation={[strand.tilt, 0, strand.x * -0.1]}
          castShadow
        >
          <capsuleGeometry args={[HEAD_R * strand.r, HEAD_R * strand.len, 6, 16]} />
          <meshStandardMaterial color={i === 0 ? HAIR : HAIR_SHEEN} roughness={0.56} />
        </mesh>
      ))}

      {/* The wave itself: a wider mass low down, where hair curls out rather
          than hanging straight. */}
      <mesh position={[0, -HEAD_R * 2.5, -HEAD_R * 0.62]} scale={[1.15, 1, 0.9]} castShadow>
        <sphereGeometry args={[HEAD_R * 0.62, 20, 16]} />
        <meshStandardMaterial color={HAIR} roughness={0.56} />
      </mesh>
    </group>
  )
}

/**
 * The K2 cap.
 */
function Cap() {
  const badge = useMemo(() => capBadgeTexture(), [])

  return (
    <group position={[0, HEAD_R * 0.24, 0]}>
      {/* Crown */}
      <mesh castShadow>
        <sphereGeometry args={[HEAD_R * 1.07, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2.3]} />
        <meshStandardMaterial color={CAP} roughness={0.62} />
      </mesh>

      {/* Front panel for the seam */}
      <mesh>
        <sphereGeometry args={[HEAD_R * 1.076, 32, 20, Math.PI / 2 - 0.46, 0.92, 0, Math.PI / 2.5]} />
        <meshStandardMaterial color={CAP_SHADE} roughness={0.66} />
      </mesh>

      {/* Brim: narrow across, long forward, and seated ABOVE the brow line. */}
      <mesh
        position={[0, HEAD_R * 0.44, HEAD_R * 0.65]}
        rotation={[0.38, 0, 0]}
        scale={[0.85, 1, 1.28]}
        castShadow
      >
        <cylinderGeometry args={[HEAD_R * 0.95, HEAD_R * 0.95, HEAD_R * 0.08, 32, 1, false, -Math.PI / 3, (Math.PI * 2) / 3]} />
        <meshStandardMaterial color={CAP_SHADE} roughness={0.66} side={THREE.DoubleSide} />
      </mesh>

      {/* Top Gold Button */}
      <mesh position={[0, HEAD_R * 1.02, 0]}>
        <sphereGeometry args={[HEAD_R * 0.09, 12, 12]} />
        <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.72} />
      </mesh>

      {/* Front Gold Monogram */}
      <mesh position={[0, HEAD_R * 0.46, HEAD_R * 0.94]} rotation={[-0.14, 0, 0]}>
        <planeGeometry args={[HEAD_R * 0.9, HEAD_R * 0.45]} />
        <meshBasicMaterial map={badge} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * A readable arm silhouette built from shoulder, forearm, palm and thumb.
 * The previous single sleeve plus sphere read as a floating ball at shelf scale.
 */
function ClerkArm({ side, armRef = null }) {
  const restingTurn = side > 0 ? -0.04 : 0.14

  return (
    <group
      ref={armRef}
      position={[side * cm(17), SHOULDER_Y, cm(1)]}
      rotation={[0, 0, restingTurn]}
    >
      {/* Upper sleeve */}
      <mesh position={[0, -cm(13), 0]} castShadow>
        <capsuleGeometry args={[cm(4.1), cm(18), 6, 14]} />
        <meshStandardMaterial color={BLOUSE} roughness={0.78} />
      </mesh>

      {/* Forearm: slightly forward and angled so the elbow remains visible. */}
      <group position={[0, -cm(26), cm(1)]} rotation={[0.12, 0, side * 0.08]}>
        <mesh position={[0, -cm(10.5), cm(0.8)]} castShadow>
          <capsuleGeometry args={[cm(3.5), cm(14), 6, 14]} />
          <meshStandardMaterial color={SKIN_SHADE} roughness={0.76} />
        </mesh>

        {/* Palm: an oval capsule, not a ball. */}
        <mesh position={[0, -cm(22), cm(1.8)]} scale={[0.78, 1.08, 0.54]} castShadow>
          <capsuleGeometry args={[cm(3.6), cm(1.5), 6, 14]} />
          <meshStandardMaterial color={SKIN} roughness={0.74} />
        </mesh>

        <mesh
          position={[side * cm(3.2), -cm(21.5), cm(2.4)]}
          rotation={[0, 0, -side * 0.48]}
          scale={[0.62, 0.9, 0.55]}
          castShadow
        >
          <capsuleGeometry args={[cm(1.45), cm(2.8), 5, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.74} />
        </mesh>
      </group>
    </group>
  )
}

export default function StoreKeeper3D({
  position = [0, 0, 0],
  targetBay = 0,
  scale = 1,
  expression = 'idle',
  message = '',
  talking = false,
  waving = false,
  gesture = 'rest',
  showMessage = true,
  lookAt = null,
}) {
  const root = useRef(null)
  const head = useRef(null)
  const rightArm = useRef(null)
  const leftLeg = useRef(null)
  const rightLeg = useRef(null)
  const placed = useRef(false)
  const openness = useBlink()
  const viseme = useViseme(talking, expression)

  const face = useMemo(
    () => faceTexture(expression, openness),
    [expression, openness],
  )

  const wave = useRef(0)
  useEffect(() => {
    if (waving || gesture === 'celebrate') wave.current = gesture === 'celebrate' ? 1.1 : 2.6
  }, [waving, gesture])

  useEffect(() => {
    if (!root.current || placed.current) return
    root.current.position.set(position[0], position[1], position[2])
    placed.current = true
  }, [position])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    if (root.current) {
      const distance = Math.abs(position[0] - root.current.position.x)
      const moving = distance > 0.08
      const travelEase = Math.min(1, delta * AISLE_TRAVEL_RATE)
      root.current.position.x += (position[0] - root.current.position.x) * travelEase
      root.current.position.z += (position[2] - root.current.position.z) * travelEase
      const step = moving ? Math.abs(Math.sin(t * 7.2)) * cm(1.8) : Math.sin(t * 1.15) * cm(0.9)
      root.current.position.y = position[1] + step
      root.current.rotation.z = Math.sin(t * 0.42) * 0.012
      const travelTurn = moving ? Math.sign(position[0] - root.current.position.x) * 0.34 : 0
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, travelTurn, 5, delta)

      const stride = moving ? Math.sin(t * 7.2) * 0.26 : 0
      if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.damp(leftLeg.current.rotation.x, stride, 9, delta)
      if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.damp(rightLeg.current.rotation.x, -stride, 9, delta)
    }

    if (head.current) {
      const targetY = lookAt ? THREE.MathUtils.clamp(lookAt * 0.26, -0.34, 0.34) : Math.sin(t * 0.55) * 0.12
      const targetX = lookAt ? 0.05 : Math.sin(t * 0.37) * 0.04
      head.current.rotation.y += (targetY - head.current.rotation.y) * Math.min(1, delta * 3)
      head.current.rotation.x += (targetX - head.current.rotation.x) * Math.min(1, delta * 3)
    }

    if (rightArm.current) {
      if (wave.current > 0) {
        wave.current -= delta
        const swing = Math.sin(t * 8.5) * 0.38
        rightArm.current.rotation.z += (-2.3 + swing - rightArm.current.rotation.z) * Math.min(1, delta * 8)
      } else {
        const restingAngle = gesture === 'present' || gesture === 'point' ? -1.08 : -0.14
        rightArm.current.rotation.z += (restingAngle - rightArm.current.rotation.z) * Math.min(1, delta * 4)
      }
    }
  })

  return (
    <group ref={root} scale={scale} userData={{ targetBay }}>
      {/* Legs.
          The sheet shows wide-leg navy jeans over white sneakers: the trouser
          is widest at the hem, not the thigh, and it breaks over the shoe
          rather than stopping at the ankle. An earlier pass tapered them the
          other way, toward a narrow ankle, which is the opposite silhouette. */}
      {[-1, 1].map((side) => (
        <group key={side} ref={side < 0 ? leftLeg : rightLeg} position={[side * cm(9), cm(75), 0]}>
          {/* Thigh */}
          <mesh position={[0, -cm(20), 0]} castShadow>
            <capsuleGeometry args={[cm(7.4), cm(38), 6, 16]} />
            <meshStandardMaterial color={TROUSER} roughness={0.88} />
          </mesh>

          {/* Wide hem, flaring toward the floor and long enough to break on
              the shoe, which is what reads as a wide-leg cut. */}
          <mesh position={[0, -cm(50), cm(0.4)]} scale={[1.28, 1, 1.24]} castShadow>
            <capsuleGeometry args={[cm(7.2), cm(28), 6, 16]} />
            <meshStandardMaterial color={TROUSER_SHADE} roughness={0.88} />
          </mesh>

          {/* Sneaker: white upper, slightly wider sole under it. */}
          <mesh position={[0, -cm(67), cm(3.6)]} scale={[1, 0.6, 1.55]} castShadow>
            <capsuleGeometry args={[cm(5.5), cm(3.4), 5, 14]} />
            <meshStandardMaterial color={SHOE} roughness={0.62} />
          </mesh>
          <mesh position={[0, -cm(70.5), cm(3.6)]} scale={[1.06, 0.34, 1.6]} castShadow>
            <capsuleGeometry args={[cm(5.5), cm(3.4), 5, 14]} />
            <meshStandardMaterial color={SHOE_SOLE} roughness={0.72} />
          </mesh>
        </group>
      ))}

      {/* Hips. The legs previously began in mid-air below the blouse, so the
          body had no join. This carries the waist down to where they start. */}
      <mesh position={[0, cm(77), 0]} scale={[1, 0.86, 0.92]} castShadow>
        <capsuleGeometry args={[cm(13.2), cm(11), 8, 20]} />
        <meshStandardMaterial color={TROUSER} roughness={0.85} />
      </mesh>

      {/* Torso: Blouse */}
      <mesh position={[0, TORSO_Y, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[cm(14.5), cm(32), 10, 24]} />
        <meshStandardMaterial color={BLOUSE} roughness={0.8} />
      </mesh>

      {/* Apron.
          A single flattened capsule read as a green slab stuck to her front.
          A real apron is wider at the hem than at the chest and is tied at the
          waist, so it is now a bib, a skirt that widens, and a tie. */}
      {/* Bib */}
      <mesh position={[0, cm(112), cm(16.2)]} scale={[1, 1, 0.2]} castShadow>
        <capsuleGeometry args={[cm(8.4), cm(11), 6, 18]} />
        <meshStandardMaterial color={APRON} roughness={0.88} />
      </mesh>

      {/* Skirt, widening toward the hem */}
      <mesh position={[0, cm(92), cm(15.4)]} scale={[1.18, 1, 0.22]} castShadow>
        <capsuleGeometry args={[cm(10.8), cm(19), 8, 20]} />
        <meshStandardMaterial color={APRON_SHADE} roughness={0.88} />
      </mesh>

      {/* Name tag, pinned to the bib as it is on the sheet. Small, but it is
          the detail that turns an apron into a uniform. */}
      <mesh position={[cm(6.2), cm(116), cm(17.4)]} rotation={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[cm(7.4), cm(3.4), cm(0.35)]} />
        <meshStandardMaterial color={NAMETAG} roughness={0.55} />
      </mesh>
      {/* Its burgundy header strip, the same red as the cap. */}
      <mesh position={[cm(6.2), cm(117.3), cm(17.6)]} rotation={[0, 0, -0.04]}>
        <boxGeometry args={[cm(7.4), cm(1.1), cm(0.36)]} />
        <meshStandardMaterial color={CAP} roughness={0.6} />
      </mesh>

      {/* Waist tie, which is what makes the two pieces read as one garment */}
      <mesh position={[0, cm(101), cm(15.6)]} scale={[1, 0.34, 0.3]} castShadow>
        <capsuleGeometry args={[cm(11.6), cm(4), 6, 18]} />
        <meshStandardMaterial color={APRON_TIE} roughness={0.8} />
      </mesh>

      {/* Two shoulder straps with gold buckles */}
      {[-1, 1].map((side) => (
        <mesh
          key={`strap-${side}`}
          position={[side * cm(6), cm(120), cm(15)]}
          rotation={[0.1, 0, side * 0.16]}
        >
          <capsuleGeometry args={[cm(0.9), cm(15), 4, 8]} />
          <meshStandardMaterial color={GOLD} roughness={0.42} metalness={0.5} />
        </mesh>
      ))}

      {/* Arms: facing the camera, -X is her anatomical right and owns the wave. */}
      <ClerkArm side={1} />
      <ClerkArm side={-1} armRef={rightArm} />

      {/* Neck */}
      <mesh position={[0, NECK_Y, 0]}>
        <cylinderGeometry args={[cm(5), cm(6), cm(9), 16]} />
        <meshStandardMaterial color={SKIN_SHADE} roughness={0.8} />
      </mesh>

      {/* Head */}
      <group ref={head} position={[0, HEAD_Y, 0]}>
        <group scale={[1, 1.05, 0.95]}>
          {/* Head Sphere */}
          <mesh castShadow>
            <sphereGeometry args={[HEAD_R, 36, 28]} />
            <meshStandardMaterial color={SKIN} roughness={0.76} />
          </mesh>

          {/* Face Shell */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry
              args={[HEAD_R * 1.012, 48, 40, Math.PI / 2 - FACE_PHI / 2, FACE_PHI, FACE_THETA_START, FACE_THETA]}
            />
            <meshBasicMaterial map={face} transparent toneMapped={false} depthWrite={false} />
          </mesh>

          {/* Mouth Component */}
          <Mouth shape={viseme} />
        </group>

        {/* Ears */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * HEAD_R * 0.95, -HEAD_R * 0.05, 0]} scale={[0.5, 1, 0.7]}>
            <sphereGeometry args={[HEAD_R * 0.24, 14, 14]} />
            <meshStandardMaterial color={SKIN_SHADE} roughness={0.78} />
          </mesh>
        ))}

        <Hair />
        <Cap />
      </group>

      {showMessage && <SpeechCloud message={message} />}
    </group>
  )
}
