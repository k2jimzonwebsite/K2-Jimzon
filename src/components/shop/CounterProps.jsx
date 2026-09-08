import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { COUNTER, FLOOR_Y, cm } from './keeperRig'

/**
 * The three things on the counter you can actually use.
 *
 * Until now the only thing in the room that responded to a click was a product.
 * A shop counter with nothing on it is the tell that a room is scenery: real
 * counters carry the things you are meant to pick up. These are modelled in
 * Blender rather than drawn in code because they are objects with a shape —
 * a bell is a spun dome, not a box — and each one is a door into a flow the
 * store already has:
 *
 *   bell    -> ask K2 staff        (the same chat the shelf question opens)
 *   ledger  -> the store FAQs      (the same approved knowledge sheet)
 *   pad     -> request a pasabuy   (the same route as the header button)
 *   lamp    -> the shop lights     (the same switch as the header toggle)
 *
 * They open nothing new. Adding a fourth flow to a 3D prop would put a
 * capability behind a canvas that is `aria-hidden`, and the store has to work
 * without any of this.
 *
 * The .glb is served from our own origin under /models, so the production CSP
 * that forbids external asset hosts is not involved.
 */

const MODEL_URL = '/models/k2-counter-props.glb'

/** Blender models in metres; the room is drawn at CM_PER_UNIT to the unit. */
const METRES_TO_UNITS = 100 / 13

/**
 * Deliberately larger than life.
 *
 * A counter bell is about 9 cm across. Against a 210 cm counter, at the
 * distance the counter shot is framed from, that is roughly eighteen pixels —
 * correct, and too small to notice or hit. The props are drawn half again as
 * large so they read as objects you can use. Everything else in the room is at
 * true scale; this is the one place the ruler is bent, and only because the
 * alternative is a control nobody can press.
 */
const PROP_SCALE = METRES_TO_UNITS * 1.55

/**
 * Where each prop sits on the counter top.
 *
 * The counter body is centred on z = 1.4 and its top is COUNTER.heightCm above
 * the floor, so the props stand on that plane rather than at an eyeballed
 * height. They are kept to the shopper's right: the clerk stands behind the
 * left of the counter and the props must not be buried behind her.
 */
const TOP_Y = FLOOR_Y + cm(COUNTER.heightCm) + cm(6) / 2

/**
 * `tilt` is what makes a flat prop exist at all here.
 *
 * The counter shot is framed on the shopkeeper, which puts the camera at about
 * counter height — so anything lying flat on the top is seen edge-on and draws
 * as a one-pixel line. The bell survives that because it is tall; the ledger
 * and the pad have to be stood up to face the shopper, the way a shop actually
 * props a book or a form on a small easel. `lift` then raises each one enough
 * that tilting about its base does not sink a corner through the counter.
 */
const PLACEMENTS = [
  {
    id: 'bell',
    node: 'Hotspot_Bell',
    position: [2.3, TOP_Y, 3.05],
    rotation: 0,
    tilt: 0,
    lift: 0,
    label: 'Ring for staff',
    action: 'onAskStaff',
  },
  {
    id: 'ledger',
    node: 'Hotspot_Ledger',
    position: [5.0, TOP_Y, 2.55],
    rotation: -0.16,
    tilt: 0.92,
    lift: 0.72,
    label: 'Store answers',
    action: 'onOpenFaq',
  },
  {
    id: 'pad',
    node: 'Hotspot_Pad',
    position: [7.4, TOP_Y, 2.75],
    rotation: -0.34,
    tilt: 1.12,
    lift: 1.02,
    label: 'Request a pasabuy',
    action: 'onPasabuy',
  },
  {
    // Left end of the counter, past the shopkeeper, where a lamp actually goes.
    id: 'lamp',
    node: 'Hotspot_Lamp',
    position: [-6.4, TOP_Y, 2.6],
    rotation: 0.28,
    tilt: 0,
    lift: 0,
    label: 'Shop lights',
    action: 'onToggleLights',
  },
]

/**
 * A prop that answers to the pointer.
 *
 * Hover lifts it slightly and warms its emissive; the bell also gets a short
 * press-down when clicked, because a counter bell that does not move when you
 * hit it reads as a picture of a bell.
 */
function Prop({ object, placement, onActivate, onHoverLabel }) {
  const group = useRef()
  const [hovered, setHovered] = useState(false)
  const press = useRef(0)

  useFrame((_, delta) => {
    if (!group.current) return
    press.current = Math.max(0, press.current - delta * 3.4)
    const lift = hovered ? 0.16 : 0
    const dip = placement.id === 'bell' ? press.current * 0.34 : 0
    const target = placement.position[1] + placement.lift + lift - dip
    group.current.position.y += (target - group.current.position.y) * Math.min(1, delta * 14)
  })

  return (
    <group
      ref={group}
      position={[placement.position[0], placement.position[1] + placement.lift, placement.position[2]]}
      rotation={[placement.tilt, placement.rotation, 0]}
      scale={PROP_SCALE}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        onHoverLabel(placement.label)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        onHoverLabel(null)
        document.body.style.cursor = ''
      }}
      onClick={(event) => {
        event.stopPropagation()
        press.current = 1
        onActivate(placement.action)
      }}
    >
      <primitive object={object} />
    </group>
  )
}

export default function CounterProps({ actions = {}, onHoverLabel = () => {}, isDark = false }) {
  const { scene } = useGLTF(MODEL_URL)

  // One loaded document, three independent nodes. Cloning per placement keeps
  // the hover transform on one prop from moving the other two.
  const nodes = useMemo(() => {
    const out = {}
    for (const placement of PLACEMENTS) {
      const found = scene.getObjectByName(placement.node)
      if (!found) continue
      const clone = found.clone(true)
      clone.position.set(0, 0, 0)
      clone.rotation.set(0, 0, 0)
      clone.traverse((child) => {
        if (!child.isMesh) return
        child.castShadow = true
        child.receiveShadow = true
        // The bulb is the only part that has to change state, so it gets its
        // own material instance rather than sharing the loaded one.
        if (child.name.startsWith('Lamp_Bulb')) {
          child.material = child.material.clone()
          child.userData.isBulb = true
        }
      })
      out[placement.id] = clone
    }
    return out
  }, [scene])

  // A switch that does not visibly switch is a decoration. With the lights low
  // the shop is lit by its own fittings, so the counter lamp burns; with them up
  // it is daylight and the lamp is off.
  useEffect(() => {
    const lamp = nodes.lamp
    if (!lamp) return
    lamp.traverse((child) => {
      if (!child.userData?.isBulb) return
      child.material.emissiveIntensity = isDark ? 2.6 : 0
      child.material.needsUpdate = true
    })
  }, [nodes, isDark])

  useEffect(() => () => { document.body.style.cursor = '' }, [])

  const activate = (name) => {
    const handler = actions[name]
    if (typeof handler === 'function') handler()
  }

  return (
    <group>
      {PLACEMENTS.map((placement) => (
        nodes[placement.id]
          ? (
            <Prop
              key={placement.id}
              object={nodes[placement.id]}
              placement={placement}
              onActivate={activate}
              onHoverLabel={onHoverLabel}
            />
          )
          : null
      ))}
    </group>
  )
}

useGLTF.preload(MODEL_URL)
