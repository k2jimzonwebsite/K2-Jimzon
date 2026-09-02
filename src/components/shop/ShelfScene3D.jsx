import { Suspense, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { stockState } from './shelfModel'
import { packRows } from './shelfLayout'
import { labelTexture, photoTexture, talkerTexture, packageMaterials, disposePackageTextures } from './packageTexture'
import { marbleTexture, signTexture, wallMarbleTexture, disposeRoomTextures } from './roomTextures'
import StoreKeeper3D from './StoreKeeper3D'
import { disposeKeeperTextures } from './keeperTextures'
import {
  AISLE_TRAVEL_RATE, COUNTER, FLOOR_Y, FOV, ZOOM_MAX, ZOOM_MIN, clampZoom, cm, computeFraming, visibleHeight,
} from './keeperRig'

/**
 * MAP-027 — the store as an aisle, not a single shelf.
 *
 * Every category is a bay standing side by side along one run. The camera
 * travels laterally between bays rather than orbiting one centre point, so
 * looking left moves you to the previous category and looking right to the next
 * — the way you move along a real shop wall.
 *
 * This is still not a free world. There is no walking, no vertical flight, and
 * no way to leave the aisle: travel is confined to the run of bays, and the
 * camera always faces the shelving. MAP-027's rejection of a 360-degree world
 * holds; what it rejected was an unbounded space, not lateral movement.
 *
 * Goods are drawn at their real derived size and in their real form — a jar is a
 * cylinder, a bar is flat, a coffee bag is tall — and packed by width with
 * facings, so a bay reads as a stocked shelf in a Manila import aisle rather
 * than as evenly spaced display boxes.
 *
 * All materials are drawn at runtime. No external textures, fonts or HDR — the
 * production CSP forbids external asset hosts.
 *
 * The canvas is decoration; `InteractiveShop` renders the semantic product list
 * regardless, so the store works without any of this.
 */

const BAY_WIDTH = 15
const BAY_GAP = 10
const BAY_SPACING = BAY_WIDTH + BAY_GAP
const SHELF_DEPTH = 2.4
const ROW_HEIGHT = 2.9
const BOARD_THICKNESS = 0.26
const MAX_ROWS = 7
const MIN_ROWS = 5

// One physical person, one physical scale. Her X offset is fixed relative to
// every bay so the clerk and the camera cover the same distance during travel;
// changing either per scene made her shrink and slip out of the shot.
const CLERK_STAGE_SCALE = 0.92
const CLERK_STAGE_X = BAY_WIDTH / 2 + BAY_GAP / 2
const CLERK_STAGE_Z = 3.2

/**
 * The room's own light and dark.
 *
 * A 3D scene cannot inherit a CSS variable, so the palette that matters to the
 * renderer — clear colour, fog, wall tint, light temperature — is declared here
 * and picked by the same `isDark` the rest of the storefront uses. Dark is the
 * shop after hours: the stone is turned down and the pendants carry the room,
 * rather than the marble being swapped for grey.
 */
const ROOM = {
  light: {
    wall: '#EADFCE',
    panel: '#F1EBE2',
    fog: [52, 110],
    ambient: 1.05,
    hemi: 0.85,
    key: 1.35,
    fill: 0.32,
    stone: '#F0E7D9',
    pendant: 26,
    pendantDistance: 20,
    shelfGlow: 0,
  },
  /**
   * Lights low: the shop after closing, lit by its own pendants.
   *
   * The previous values were the daytime rig turned down, which read as a dim
   * photograph rather than as a different time of day. The point of the switch
   * is that the light source changes, not just its level: ambient and key drop
   * far enough that the pendants stop being decoration and become the reason
   * anything is visible, so each one throws a real pool onto the goods beneath
   * it and the aisle falls away between them.
   *
   * Fog closes in for the same reason. In daylight it sits far enough back to be
   * invisible; at night it puts the far end of the run in shadow, which is what
   * gives the aisle depth instead of a flat lit wall.
   */
  dark: {
    wall: '#14110E',
    panel: '#1C1814',
    fog: [26, 74],
    ambient: 0.2,
    hemi: 0.15,
    key: 0.16,
    fill: 0.05,
    stone: '#5E564B',
    pendant: 74,
    pendantDistance: 13,
    shelfGlow: 9,
  },
}

/**
 * The lighting state, shared with the bays.
 *
 * Pendants and shelf glow live inside `Bay` and `CounterBay`, which are rendered
 * from a list and take no lighting props. Threading the palette through both
 * signatures for one value each is how those signatures rot, so the room is a
 * context instead.
 */
const RoomContext = createContext(ROOM.light)
const useRoom = () => useContext(RoomContext)

const WALL = '#F3EBE0'
const WARM_WOOD = '#A87F55'
const STONE_EDGE = '#E4DCD1'
const GOLD = '#C6A867'

/** Banderitas — the strung festival pennants of a Philippine market street. */
const PENNANT_COLOURS = ['#B84E3A', '#C6A867', '#6E7F52', '#9A6A45']

/**
 * Lateral camera.
 *
 * Slides to the active bay and lets the customer drag along the run. Releasing
 * near a neighbouring bay commits to it, which is what makes "look left" mean
 * "go to the previous shelf" rather than "spin in place".
 */
function AisleCamera({ activeIndex, bayCount, onShelfChange, height, fov, zoomRequest, mode }) {
  const { camera, gl } = useThree()
  const drag = useRef({ active: false, startX: 0, offset: 0 })
  const settled = useRef(activeIndex)
  const zoom = useRef(1)
  const pointers = useRef(new Map())
  const pinchStart = useRef(0)
  // How far the view has been carried away from the bay centre by zooming
  // toward the pointer. Zero means centred on the bay.
  const pan = useRef({ x: 0, y: 0 })
  // The framing distance, held in a ref so the pointer handlers can read it
  // without being torn down and rebound every time the bay height changes.
  const baseDistance = useRef(1)

  useEffect(() => { settled.current = activeIndex }, [activeIndex])

  /**
   * Framing.
   *
   * The first version put the camera 15 units out and aimed at the middle of
   * the bay, which showed y from 2.4 upward — the floor sits at -1.45, so the
   * bottom of the room, the counter plinth and her legs were all cut off below
   * the frame. The distance is now derived from what actually has to be in
   * shot rather than picked by eye.
   */
  const framing = useMemo(() => computeFraming({ height, fov, mode }), [height, fov, mode])
  useEffect(() => { baseDistance.current = framing.distance }, [framing])

  useEffect(() => {
    const el = gl.domElement
    const width = () => el.clientWidth || 1

    const down = (event) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size === 2) {
        // A second finger starts a pinch, and cancels the drag so the aisle
        // does not slide sideways while the customer is zooming.
        drag.current.active = false
        drag.current.offset = 0
        pinchStart.current = pinchDistance() / zoom.current
        return
      }
      drag.current.active = true
      drag.current.startX = event.clientX
      el.setPointerCapture?.(event.pointerId)
    }

    const pinchDistance = () => {
      const [a, b] = [...pointers.current.values()]
      if (!a || !b) return 0
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    const move = (event) => {
      if (pointers.current.has(event.pointerId)) {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      }
      if (pointers.current.size === 2 && pinchStart.current > 0) {
        // Fingers apart means closer, which is why the ratio is inverted.
        const before = zoom.current
        const after = clampZoom(pinchStart.current / (pinchDistance() || 1))
        zoom.current = after
        if (after !== before) {
          // A pinch zooms toward the midpoint between the two fingers, which is
          // where the gesture is pointing.
          const [a, b] = [...pointers.current.values()]
          if (a && b) focusOn((a.x + b.x) / 2, (a.y + b.y) / 2, before, after)
        }
        return
      }
      if (!drag.current.active) return
      // One full viewport drag traverses roughly one bay.
      drag.current.offset = -((event.clientX - drag.current.startX) / width()) * 1.15
    }

    const up = (event) => {
      pointers.current.delete(event.pointerId)
      if (pointers.current.size < 2) pinchStart.current = 0
      if (!drag.current.active) return
      drag.current.active = false
      const target = Math.round(settled.current + drag.current.offset)
      drag.current.offset = 0
      const clamped = Math.max(0, Math.min(bayCount - 1, target))
      if (clamped !== settled.current) onShelfChange(clamped)
      el.releasePointerCapture?.(event.pointerId)
    }

    /**
     * Zoom toward whatever is under the pointer.
     *
     * Zooming to a fixed centre is the behaviour of a slide viewer: to inspect
     * a jar on the left of the bay you have to zoom in and then hunt for it.
     * Every map and every design tool instead keeps the point under the cursor
     * still while the view closes in, which is what makes zoom feel like
     * reaching for something rather than operating a control.
     *
     * The pan offset is what does it. The cursor's position on the focal plane
     * is computed from the field of view at the current distance; the offset
     * then moves a share of the way there, proportional to how far this gesture
     * actually zoomed.
     */
    const focusOn = (clientX, clientY, before, after) => {
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      // Normalised device coordinates: -1 to 1, origin at the centre.
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1
      const ny = -(((clientY - rect.top) / rect.height) * 2 - 1)

      const halfHeight = visibleHeight(baseDistance.current * before) / 2
      const halfWidth = halfHeight * (rect.width / rect.height)
      const wantX = pan.current.x + nx * halfWidth
      const wantY = pan.current.y + ny * halfHeight

      // Closing in by 20% moves the offset 20% of the way to the cursor, so the
      // point under it stays put; zooming back out unwinds the same way.
      const share = 1 - after / before
      pan.current.x += (wantX - pan.current.x) * share
      pan.current.y += (wantY - pan.current.y) * share
    }

    const wheel = (event) => {
      // The store owns the viewport, so the page has nothing to scroll; without
      // this the gesture would fall through to the browser.
      event.preventDefault()
      const before = zoom.current
      const after = clampZoom(before * (1 + event.deltaY * 0.0011))
      zoom.current = after
      if (after !== before) focusOn(event.clientX, event.clientY, before, after)
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl, bayCount, onShelfChange])

  // Zoom driven from the on-screen controls. The wheel is not discoverable and
  // is unreachable by keyboard, so the buttons are the real affordance and this
  // is the same value they both move.
  useEffect(() => {
    if (!zoomRequest) return
    if (zoomRequest.reset) {
      zoom.current = 1
      // Reset means reset: recentre the bay as well as pulling back, or the
      // button leaves the customer looking at a corner they panned to.
      pan.current = { x: 0, y: 0 }
      return
    }
    zoom.current = clampZoom(zoom.current * (zoomRequest.direction === 'in' ? 0.78 : 1.28))
  }, [zoomRequest])

  // The arrival. The camera starts back and high, as if stepping through the
  // door, and settles over the first couple of seconds. It runs once.
  const intro = useRef(0)
  // Sway is faded rather than switched, so letting go of a drag does not snap
  // the view back into motion.
  const sway = useRef(1)
  const clock = useRef(0)

  useFrame((_, delta) => {
    clock.current += delta
    intro.current = Math.min(1, intro.current + delta / 2.2)
    // Quintic ease-out: fast in, long settle. Linear reads as a camera being
    // dragged; this reads as coming to rest.
    const arrival = 1 - Math.pow(1 - intro.current, 5)

    const virtual = settled.current + (drag.current.active ? drag.current.offset : 0)
    const bounded = Math.max(0, Math.min(bayCount - 1, virtual))
    const ease = Math.min(1, delta * AISLE_TRAVEL_RATE)

    // At full zoom-out there is nothing to pan to, so the offset is wound back
    // to nothing. This also stops repeated in-and-out drifting the view away.
    const roam = 1 - (zoom.current - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)
    const halfHeight = visibleHeight(framing.distance * zoom.current) / 2
    // Never far enough to leave the bay or drop through the floor.
    const limitX = Math.max(0, BAY_WIDTH / 2 - halfHeight * 0.35) * roam
    const limitY = Math.max(0, (framing.top - framing.bottom) / 2 - halfHeight) * roam
    pan.current.x = THREE.MathUtils.clamp(pan.current.x, -limitX, limitX)
    pan.current.y = THREE.MathUtils.clamp(pan.current.y, -limitY, limitY)

    // Standing sway.
    //
    // A camera bolted to an exact position reads as a tripod, and a tripod is
    // the thing that makes a rendered room feel like a product shot instead of
    // somewhere a person is standing. Two slow sine waves at different periods
    // never repeat visibly, and the amplitude is deliberately below the level
    // anyone would name: about a centimetre and a half of drift. It is felt
    // rather than seen. It also stops entirely while dragging, because sway
    // fighting a deliberate pan is what makes a view feel loose.
    const held = drag.current.active || pointers.current.size > 0
    const swayTarget = held ? 0 : 1
    sway.current += (swayTarget - sway.current) * Math.min(1, delta * 3)
    const breath = sway.current * arrival
    const swayX = Math.sin(clock.current * 0.53) * cm(1.6) * breath
    const swayY = Math.sin(clock.current * 0.71 + 1.1) * cm(1.1) * breath

    const wantX = bounded * BAY_SPACING + pan.current.x + swayX
    const wantY = framing.target + pan.current.y + swayY
    camera.position.x += (wantX - camera.position.x) * ease
    // Zoom eases rather than snapping, so a wheel notch is a move and not a cut.
    const wantZ = framing.distance * zoom.current + (1 - arrival) * 14
    camera.position.z += (wantZ - camera.position.z) * Math.min(1, delta * 5)
    camera.position.y += (wantY - camera.position.y) * ease

    // Always facing the shelving; the customer can never turn away from it.
    camera.lookAt(camera.position.x, camera.position.y - (1 - arrival) * 1.5, 0)
  })

  return null
}

function CanvasFailureBridge({ onFailure }) {
  const { gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    const handleContextLoss = (event) => {
      event.preventDefault()
      onFailure?.()
    }
    canvas.addEventListener('webglcontextlost', handleContextLoss)
    return () => canvas.removeEventListener('webglcontextlost', handleContextLoss)
  }, [gl, onFailure])

  return null
}

/**
 * Dust in the light.
 *
 * A slow drift of motes through the pendant beams. It is the cheapest way to
 * stop a rendered room reading as vacuum — one Points object for the whole run,
 * so it costs a single draw call rather than a particle per bay.
 */
function AmbientDust({ runWidth, height, centre }) {
  const points = useRef(null)

  const geometry = useMemo(() => {
    const count = 260
    const positions = new Float32Array(count * 3)
    // Deterministic, so the motes do not reshuffle between visits.
    let state = 20250828
    const rand = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = centre + (rand() - 0.5) * runWidth
      positions[i * 3 + 1] = rand() * (height + 4)
      positions[i * 3 + 2] = 1 + rand() * 9
    }
    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return buffer
  }, [runWidth, height, centre])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    const node = points.current
    if (!node) return
    // A whole-object drift rather than per-particle maths: the motes rise and
    // sway together, which at this scale is indistinguishable from the real
    // thing and costs nothing per frame.
    const t = state.clock.elapsedTime
    node.position.y = (t * 0.09) % 3
    node.position.x = Math.sin(t * 0.13) * 0.5
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.075}
        color="#FFF3E2"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

/**
 * Banderitas strung along the run.
 *
 * The one unmistakably Filipino note in a room of Italian goods: the pennants
 * that hang over every market street and sari-sari storefront at home. They sit
 * high and out of the shopping sightline, so they set the place without
 * competing with the shelves.
 */
function Banderitas({ bayCount, height }) {
  const pennants = useMemo(() => {
    const items = []
    const span = (bayCount - 1) * BAY_SPACING + BAY_WIDTH
    const start = -BAY_WIDTH / 2
    const step = 1.5
    for (let x = start; x < start + span; x += step) {
      const index = items.length
      // A shallow catenary between posts, so the line hangs rather than rules.
      const phase = (x - start) % (BAY_SPACING * 0.9)
      const sag = Math.sin((phase / (BAY_SPACING * 0.9)) * Math.PI) * 0.55
      items.push({ x, y: height + 3.4 - sag, colour: PENNANT_COLOURS[index % PENNANT_COLOURS.length] })
    }
    return items
  }, [bayCount, height])

  return (
    <group position={[0, 0, 6.5]}>
      {pennants.map((pennant) => (
        <mesh key={pennant.x} position={[pennant.x, pennant.y, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.34, 0.8, 3]} />
          <meshStandardMaterial color={pennant.colour} roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

/** A marble shelf board with a brass leading edge and a recessed underside. */
function Board({ y, marble }) {
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[BAY_WIDTH, BOARD_THICKNESS, SHELF_DEPTH]} />
        <meshStandardMaterial map={marble} roughness={0.28} metalness={0.04} />
      </mesh>
      <mesh position={[0, -0.15, SHELF_DEPTH / 2 - 0.02]}>
        <boxGeometry args={[BAY_WIDTH, 0.05, 0.06]} />
        <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.24, 0]}>
        <boxGeometry args={[BAY_WIDTH - 0.2, 0.14, SHELF_DEPTH - 0.15]} />
        <meshStandardMaterial color={STONE_EDGE} roughness={0.85} />
      </mesh>
    </group>
  )
}

/** The printed price strip clipped to the front edge of the plank. */
function Talker({ product, x, y }) {
  const map = useMemo(() => talkerTexture(product), [product])
  return (
    <mesh position={[x, y, SHELF_DEPTH / 2 + 0.02]}>
      <planeGeometry args={[0.95, 0.3]} />
      <meshBasicMaterial map={map} transparent toneMapped={false} />
    </mesh>
  )
}

/**
 * One package on a plank, at its measured size and in its measured form.
 *
 * `measurement` carries real centimetres converted to scene units, so a 43 g
 * bar and a 1 kg coffee bag differ here exactly as much as they do on a real
 * shelf. Round forms are drawn as cylinders with the label wrapped round them.
 */
function Package({ product, measurement, position, isSelected, isPrimary, onSelect, entranceDelay = 0 }) {
  const group = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [textureRevision, refreshTexture] = useState(0)
  // Goods settle onto the plank in a stagger rather than existing all at once.
  // The delay is derived from shelf position, so the fill reads left to right
  // and top to bottom — the order a person would stock it in.
  const entrance = useRef(-entranceDelay)

  const faceMap = useMemo(
    () => photoTexture(product, () => refreshTexture((n) => n + 1)) || labelTexture(product),
    // The revision counter re-runs this once a photograph resolves or fails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, textureRevision],
  )
  const soldOut = stockState(product).tone === 'out'
  const round = measurement.round

  // Materials are cached per SKU in `packageTexture`, so the four facings of a
  // well-stocked line share one set rather than building four.
  const materials = useMemo(
    () => packageMaterials(product, faceMap, { round, soldOut }),
    [product, faceMap, round, soldOut],
  )

  useFrame((state, delta) => {
    const node = group.current
    if (!node) return

    entrance.current = Math.min(1, entrance.current + delta * 1.9)
    const arrived = Math.max(0, entrance.current)
    // Back-eased overshoot: the package drops the last centimetre and settles,
    // which is what putting something down on a shelf actually looks like.
    const settle = arrived < 1
      ? 1 - Math.pow(1 - arrived, 3) * Math.cos(arrived * Math.PI * 1.1)
      : 1
    node.scale.setScalar(Math.max(0.001, settle))

    const lift = isSelected ? 0.3 : hovered ? 0.15 : 0
    // A selected item breathes very slightly, so the eye stays on it.
    const pulse = isSelected ? Math.sin(state.clock.elapsedTime * 2.4) * 0.012 : 0
    const restY = position[1] + lift + pulse + (1 - settle) * 0.9
    node.position.y += (restY - node.position.y) * Math.min(1, delta * 9)

    // Selected items turn to face the customer; everything else faces front.
    const targetSpin = isSelected ? 0.26 : 0
    node.rotation.y += (targetSpin - node.rotation.y) * Math.min(1, delta * 8)
  })

  const radius = measurement.width / 2

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => { event.stopPropagation(); onSelect(product) }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow receiveShadow material={materials}>
        {round
          ? <cylinderGeometry args={[radius, radius, measurement.height, 24]} />
          : <boxGeometry args={[measurement.width, measurement.height, measurement.depth]} />}
      </mesh>
      {isSelected && isPrimary && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -measurement.height / 2 - 0.01, 0]}>
          <circleGeometry args={[Math.max(radius, measurement.width * 0.6) + 0.2, 32]} />
          <meshBasicMaterial color="#B84E3A" transparent opacity={0.18} />
        </mesh>
      )}
    </group>
  )
}

/**
 * The Counter scene (concept §18).
 *
 * Where the customer arrives and where K2 stands. A marble-topped counter on a
 * warm wood base — the one place in the run that is wood rather than stone, so
 * the store reads as a shop with a person in it rather than a showroom.
 */
function CounterBay({ index }) {
  const marble = useMemo(() => marbleTexture(index + 1), [index])
  const wall = useMemo(() => wallMarbleTexture(index + 3), [index])
  const sign = useMemo(() => signTexture('K2 Jimzon'), [])

  // Real furniture, in centimetres. The first counter was 34 cm tall because it
  // was laid out in scene units by eye; at 13 cm per unit that is a footstool,
  // and it made the shopkeeper standing behind it look like a doll on a shelf.
  const top = FLOOR_Y + cm(COUNTER.heightCm)
  const bodyHeight = cm(COUNTER.heightCm)
  const depth = cm(COUNTER.depthCm)
  const width = cm(COUNTER.widthCm)
  const front = 1.4

  return (
    <group position={[index * BAY_SPACING, 0, 0]}>
      {/* The counter wall is clad in the same stone as the room, so arriving
          reads as walking into a marble hall rather than facing a painted flat.
          It sits well back, leaving her room to stand in front of it. */}
      <mesh position={[0, 6, -5.2]} receiveShadow>
        <boxGeometry args={[BAY_WIDTH + 0.5, 22, 0.3]} />
        <meshStandardMaterial map={wall} roughness={0.24} metalness={0.05} />
      </mesh>

      {/* Counter body in warm wood under a marble top.

          It was marble-on-marble against a marble wall, which meant the whole
          counter vanished and the shopkeeper appeared to float in a white void.
          Wood is both what a shop counter is actually made of and the contrast
          that gives her something to stand behind. */}
      <mesh position={[0, FLOOR_Y + bodyHeight / 2, front]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyHeight, depth]} />
        <meshStandardMaterial color={WARM_WOOD} roughness={0.66} />
      </mesh>
      {/* Panelled front, so it is joinery rather than a block. */}
      {[-1, 0, 1].map((slot) => (
        <mesh key={slot} position={[slot * width * 0.29, FLOOR_Y + bodyHeight / 2, front + depth / 2 + 0.02]}>
          <boxGeometry args={[width * 0.24, bodyHeight * 0.56, 0.06]} />
          <meshStandardMaterial color="#96703F" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, FLOOR_Y + cm(6), front]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.2, cm(12), depth + 0.15]} />
        <meshStandardMaterial color={WARM_WOOD} roughness={0.7} />
      </mesh>
      {/* Marble counter top, oversailing the body a little as a real one does. */}
      <mesh position={[0, top, front]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.5, cm(6), depth + 0.5]} />
        <meshStandardMaterial map={marble} roughness={0.16} metalness={0.08} />
      </mesh>
      {/* Brass inlay along the counter front */}
      <mesh position={[0, top - cm(16), front + depth / 2 + 0.03]}>
        <boxGeometry args={[width, 0.06, 0.05]} />
        <meshStandardMaterial color={GOLD} roughness={0.28} metalness={0.8} />
      </mesh>
      {/* Brass foot rail */}
      <mesh
        position={[0, FLOOR_Y + cm(18), front + depth / 2 + 0.25]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.07, 0.07, width, 12]} />
        <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.75} />
      </mesh>

      <mesh position={[0, 13.4, -4.9]}>
        <planeGeometry args={[9, 2.25]} />
        <meshBasicMaterial map={sign} transparent />
      </mesh>

      {/* Two pendants over the counter rather than one, so the light reads as
          a fitted shopfront instead of a single bulb on a wire. */}
      {[-4.6, 4.6].map((x) => (
        <Pendant key={x} position={[x, 17, front - 0.6]} />
      ))}
    </group>
  )
}

/**
 * A brass pendant with a lit glass shade.
 *
 * The earlier fitting was a bare rod with an invisible point light at the end,
 * which is why the counter read as an empty room with no visible source. The
 * shade is emissive so the lamp itself is bright in frame, and it breathes
 * very slightly — a filament never sits perfectly still.
 */
function Pendant({ position, warm = '#FFF3E2', intensity = null }) {
  const room = useRoom()
  const lit = intensity ?? room.pendant
  const glow = useRef(null)
  const light = useRef(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Tiny, slow flicker. Anything stronger reads as a fault, not as light.
    const flicker = 1 + Math.sin(t * 1.7) * 0.03 + Math.sin(t * 4.3) * 0.015
    if (light.current) light.current.intensity = lit * flicker
    if (glow.current) glow.current.material.emissiveIntensity = 1.5 * flicker
  })

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.035, 0.035, 2.4, 8]} />
        <meshStandardMaterial color={GOLD} roughness={0.32} metalness={0.78} />
      </mesh>
      {/* Brass shade */}
      <mesh position={[0, -1.42, 0]} castShadow>
        <coneGeometry args={[0.82, 0.7, 28, 1, true]} />
        <meshStandardMaterial color={GOLD} roughness={0.26} metalness={0.82} side={THREE.DoubleSide} />
      </mesh>
      {/* The lit globe inside it */}
      <mesh ref={glow} position={[0, -1.66, 0]}>
        <sphereGeometry args={[0.26, 20, 16]} />
        <meshStandardMaterial color="#FFFFFF" emissive={warm} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, -1.8, 0]} intensity={lit} distance={room.pendantDistance} decay={2} color={warm} castShadow />
    </group>
  )
}

/** One category bay: back panel, sign, marble boards, and its goods. */
function Bay({ shelf, index, selectedSku, onSelect }) {
  const room = useRoom()
  const rows = useMemo(
    () => packRows(shelf?.products || [], BAY_WIDTH, MAX_ROWS),
    [shelf],
  )
  const rowCount = Math.max(rows.length, MIN_ROWS)
  const height = rowCount * ROW_HEIGHT + 1.8
  const marble = useMemo(() => marbleTexture(index + 1), [index])
  const wall = useMemo(() => wallMarbleTexture(index + 3), [index])
  const sign = useMemo(() => signTexture(shelf?.name), [shelf])

  return (
    <group position={[index * BAY_SPACING, 0, 0]}>
      {/* Under-shelf light, and only with the lights low.
          With ambient this far down the pendants alone leave the goods in
          silhouette — readable as shapes, useless as products. A short-range
          warm light per bay puts the stock back in the light while the aisle
          around it stays dark, which is the whole point of the switch. At full
          lights this is zero and the element does not render at all. */}
      {room.shelfGlow > 0 && (
        <pointLight
          position={[0, height * 0.52, SHELF_DEPTH * 1.6]}
          intensity={room.shelfGlow}
          distance={16}
          decay={2}
          color="#FFE9CB"
        />
      )}

      {/* Recessed back panel, clad in the room's stone. Each bay draws its
          marble from a different seed so the veining never repeats down the
          run — a tiled wall is the tell that gives away a rendered room. */}
      <mesh position={[0, height / 2 - 1.2, -SHELF_DEPTH / 2 - 0.25]} receiveShadow>
        <boxGeometry args={[BAY_WIDTH + 0.5, height, 0.3]} />
        <meshStandardMaterial map={wall} roughness={0.22} metalness={0.05} />
      </mesh>

      {/* Side pilasters in marble tie the run together. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (BAY_WIDTH / 2 + 0.45), height / 2 - 1.2, -0.2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.6, height, SHELF_DEPTH + 0.4]} />
          <meshStandardMaterial map={marble} roughness={0.3} metalness={0.03} />
        </mesh>
      ))}

      {/* Category sign */}
      <mesh position={[0, height - 0.9, 0.1]}>
        <planeGeometry args={[7.2, 1.8]} />
        <meshBasicMaterial map={sign} transparent />
      </mesh>

      {Array.from({ length: rowCount }, (_, rowIndex) => {
        const y = (rowCount - 1 - rowIndex) * ROW_HEIGHT
        const row = rows[rowIndex]
        // The plank top, which is what goods actually rest on.
        const surface = y + BOARD_THICKNESS / 2
        return (
          <group key={`row-${rowIndex}`}>
            <Board y={y} marble={marble} />
            {row?.items.map((item, itemIndex) => {
              const id = item.product?.sku || item.product?.id
              return (
                <Package
                  key={`${id || rowIndex}-${itemIndex}`}
                  product={item.product}
                  measurement={item.measurement}
                  // Standing on the plank: half the package height above the
                  // surface, since a box is positioned from its centre.
                  position={[item.x, surface + item.measurement.height / 2, 0.1]}
                  isSelected={selectedSku === id}
                  isPrimary={item.isPrimary}
                  onSelect={onSelect}
                  entranceDelay={rowIndex * 0.16 + itemIndex * 0.035}
                />
              )
            })}
            {/* One price strip per product, clipped below its first facing. */}
            {row?.items.filter((item) => item.isPrimary).map((item, itemIndex) => (
              <Talker
                key={`talker-${item.product?.sku || item.product?.id || itemIndex}`}
                product={item.product}
                x={item.x}
                y={y - 0.03}
              />
            ))}
          </group>
        )
      })}

      {/* Pendant over the bay — the light source the shelving is lit by. */}
      <group position={[0, height + 1.4, 1.6]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
          <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.7} />
        </mesh>
        <mesh position={[0, -1.4, 0]}>
          <coneGeometry args={[0.9, 0.7, 24, 1, true]} />
          <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.75} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, -1.9, 0]} intensity={26} distance={16} decay={2} color="#FFF3E2" />
      </group>
    </group>
  )
}

function Aisle({ shelves, activeIndex, selectedSku, onSelect, onShelfChange, keeper, zoomRequest, room }) {
  const tallest = Math.max(
    ...shelves.map((s) => Math.max(packRows(s.products || [], BAY_WIDTH, MAX_ROWS).length, MIN_ROWS)),
    MIN_ROWS,
  )
  const height = tallest * ROW_HEIGHT + 1.8
  const runWidth = shelves.length * BAY_SPACING + 24
  const centre = ((shelves.length - 1) * BAY_SPACING) / 2
  const floor = useMemo(() => wallMarbleTexture(41), [])
  const backWall = useMemo(() => wallMarbleTexture(17), [])

  useEffect(() => {
    // Large slabs, not tiles. A high repeat would shrink the veining until the
    // floor read as patterned lino.
    floor.repeat.set(3, 3)
    backWall.repeat.set(4, 1)
  }, [floor, backWall])

  useEffect(() => () => {
    disposePackageTextures()
    disposeRoomTextures()
    disposeKeeperTextures()
  }, [])

  return (
    <RoomContext.Provider value={room}>
      {/* Bright, slightly warm, and low-contrast — the light of a luxury hall
          rather than a spotlit gallery. The shadows come from the pendants. */}
      <ambientLight intensity={room.ambient} />
      <hemisphereLight args={['#FFFFFF', '#EFE7DA', room.hemi]} />
      <directionalLight
        position={[activeIndex * BAY_SPACING + 5, 16, 12]}
        intensity={room.key}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      {/* A cool fill from the opposite side stops the marble going flat and
          yellow where the pendants do not reach. */}
      <directionalLight
        position={[activeIndex * BAY_SPACING - 9, 8, 6]}
        intensity={room.fill}
        color="#EAF0F6"
      />

      {/* Long marble wall behind the whole run */}
      <mesh position={[centre, height / 2, -SHELF_DEPTH / 2 - 0.8]} receiveShadow>
        <planeGeometry args={[runWidth, height + 16]} />
        <meshStandardMaterial map={backWall} color={room.stone} roughness={0.26} metalness={0.05} />
      </mesh>

      {/* Polished marble floor. The low roughness and slight metalness are what
          give it the wet sheen that reads as a maintained stone floor. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centre, -1.45, 4]} receiveShadow>
        <planeGeometry args={[runWidth, 34]} />
        <meshStandardMaterial map={floor} color={room.stone} roughness={0.12} metalness={0.14} envMapIntensity={1.4} />
      </mesh>

      {/* Brass strip where the floor meets the shelving, the detail that makes
          a room look fitted rather than assembled from planes. */}
      <mesh position={[centre, -1.36, SHELF_DEPTH / 2 + 0.1]}>
        <boxGeometry args={[runWidth, 0.06, 0.06]} />
        <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.8} />
      </mesh>

      {shelves.map((shelf, index) => (
        shelf.isCounter
          ? <CounterBay key={shelf.id} index={index} />
          : (
            <Bay
              key={shelf.id}
              shelf={shelf}
              index={index}
              selectedSku={selectedSku}
              onSelect={onSelect}
            />
          )
      ))}

      {/* One clerk belongs to the whole aisle. She walks to the active bay
          instead of being duplicated inside every shelf or stranded at the
          counter when the shopper moves. */}
      <StoreKeeper3D
        targetBay={activeIndex}
        scale={CLERK_STAGE_SCALE}
        position={[
          activeIndex * BAY_SPACING + CLERK_STAGE_X,
          FLOOR_Y,
          CLERK_STAGE_Z,
        ]}
        expression={keeper?.expression || 'idle'}
        message={keeper?.message || ''}
        talking={Boolean(keeper?.talking)}
        waving={keeper?.gesture === 'wave'}
        gesture={keeper?.gesture || 'rest'}
        showMessage={activeIndex === 0}
        lookAt={keeper?.gesture === 'present' ? 0.8 : null}
      />

      <Banderitas bayCount={shelves.length} height={height} />
      <AmbientDust runWidth={runWidth} height={height} centre={centre} />

      <ContactShadows
        position={[centre, -1.42, 3]}
        opacity={0.28}
        scale={runWidth}
        blur={2.4}
        far={10}
        color="#8C8378"
      />

      <AisleCamera
        activeIndex={activeIndex}
        bayCount={shelves.length}
        onShelfChange={onShelfChange}
        height={height}
        fov={FOV}
        zoomRequest={zoomRequest}
        mode={shelves[activeIndex]?.isCounter ? 'counter' : 'shelf'}
      />
    </RoomContext.Provider>
  )
}

export default function ShelfScene3D({ shelves, activeIndex, selectedSku, onSelect, onShelfChange, onFailure, keeper, zoomRequest, isDark = false }) {
  if (!Array.isArray(shelves) || shelves.length === 0) return null

  const room = isDark ? ROOM.dark : ROOM.light

  return (
    <Canvas
      aria-hidden="true"
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 8, 30], fov: FOV }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
    >
      <color attach="background" args={[room.wall]} />
      <fog attach="fog" args={[room.wall, room.fog[0], room.fog[1]]} />
      <Suspense fallback={null}>
        <CanvasFailureBridge onFailure={onFailure} />
        <Aisle
          shelves={shelves}
          activeIndex={activeIndex}
          selectedSku={selectedSku}
          onSelect={onSelect}
          onShelfChange={onShelfChange}
          keeper={keeper}
          zoomRequest={zoomRequest}
          room={room}
        />
      </Suspense>
    </Canvas>
  )
}
