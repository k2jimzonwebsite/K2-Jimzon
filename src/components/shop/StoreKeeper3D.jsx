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

const SKIN = '#F6D9BE'
const SKIN_SHADE = '#E4B996'
const HAIR = '#3A2A22'
const HAIR_SHEEN = '#5B4335'
const CAP = '#B84E3A'
const CAP_SHADE = '#9A3F2E'
const APRON = '#6E7F52'
const BLOUSE = '#FBF9F6'
const GOLD = '#C6A867'

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

      {/* Back low ponytail bundle */}
      <mesh position={[0, -HEAD_R * 1.05, -HEAD_R * 0.82]} rotation={[0.26, 0, 0]} castShadow>
        <capsuleGeometry args={[HEAD_R * 0.4, HEAD_R * 1.9, 6, 14]} />
        <meshStandardMaterial color={HAIR} roughness={0.58} />
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
      {/* Legs */}
      {[-1, 1].map((side) => (
        <group key={side} ref={side < 0 ? leftLeg : rightLeg} position={[side * cm(9), cm(75), 0]}>
          <mesh position={[0, -cm(31), 0]} castShadow>
            <capsuleGeometry args={[cm(7.5), cm(66), 6, 14]} />
            <meshStandardMaterial color="#363636" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Torso: Blouse */}
      <mesh position={[0, TORSO_Y, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[cm(14.5), cm(32), 10, 24]} />
        <meshStandardMaterial color={BLOUSE} roughness={0.8} />
      </mesh>

      {/* Apron: front panel */}
      <mesh position={[0, cm(100), cm(16.5)]} scale={[1, 1, 0.26]} castShadow>
        <capsuleGeometry args={[cm(10.5), cm(24), 8, 20]} />
        <meshStandardMaterial color={APRON} roughness={0.88} />
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
