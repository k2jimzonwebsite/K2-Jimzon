import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import StoreKeeper3D, { SpeechCloud } from './StoreKeeper3D'
import { AISLE_TRAVEL_RATE, ANIME_CLOUD_LIFT_CM, cm } from './keeperRig'
import { labelTexture } from './packageTexture'
import { clerkPose } from './clerkPoses'

const MODEL_URL = '/models/k2-clerk-anime.glb'
class ModelBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function HeldItem({ product, reading }) {
  const map = useMemo(() => product ? labelTexture(product) : null, [product])
  if (!product && !reading) return null
  return (
    <group position={[0, 1.10, .34]} rotation={[reading ? -.3 : 0, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={reading ? [.25, .18, .025] : [.20, .25, .085]} />
        <meshStandardMaterial color={reading ? '#493829' : '#eee2c9'} roughness={.8} />
      </mesh>
      <mesh position={[0, 0, reading ? .014 : .045]}>
        <planeGeometry args={reading ? [.22, .15] : [.185, .235]} />
        <meshBasicMaterial map={reading ? null : map} color={reading ? '#f7edda' : '#ffffff'} toneMapped={false} />
      </mesh>
    </group>
  )
}

function ModelClerk({ position, scale = 1, gesture, expression, talking, product, activityKey, showMessage, message }) {
  const { scene } = useGLTF(MODEL_URL)
  const root = useRef(null)
  const life = useRef(0)
  const blink = useRef({ next: 3, elapsed: 0 })
  const pose = clerkPose(gesture, Boolean(product))
  const { model, joints } = useMemo(() => {
    const model = scene.clone(true)
    const joints = {}
    model.traverse(node => {
      if (node.userData.joint) joints[node.userData.joint] = node
      if (node.isMesh) { node.castShadow = true; node.receiveShadow = false }
    })
    return { model, joints }
  }, [scene])
  useEffect(() => { life.current = 0 }, [gesture, product?.sku, product?.id, activityKey])
  const placed = useRef(false)
  useEffect(() => {
    if (!placed.current && root.current) {
      root.current.position.set(...position)
      placed.current = true
    }
  }, [position])

  useFrame((_, delta) => {
    if (!root.current || document.hidden) return
    const dt = Math.min(delta, .05)
    life.current += dt
    const t = life.current
    const dx = position[0] - root.current.position.x
    const moving = Math.abs(dx) > .08
    const ease = Math.min(1, delta * AISLE_TRAVEL_RATE)
    root.current.position.x += dx * ease
    root.current.position.z += (position[2] - root.current.position.z) * ease
    root.current.position.y = position[1] + (moving ? Math.abs(Math.sin(t * 8)) * cm(1.5) : Math.sin(t * 1.6) * cm(.45))
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, moving ? Math.sign(dx) * .28 : 0, 7, dt)
    const turn = (node, angles) => {
      if (!node) return
      for (const [i, axis] of ['x', 'y', 'z'].entries()) node.rotation[axis] = THREE.MathUtils.damp(node.rotation[axis], angles[i], 10, dt)
    }
    const wave = pose.name === 'wave' && t < 2.6 ? Math.sin(t * 10) * .22 : 0
    const right = pose.name === 'wave' && t >= 2.6 ? clerkPose('rest').right : pose.right
    turn(joints.RightArm, [right[0], right[1], right[2] + wave])
    turn(joints.LeftArm, pose.left)
    turn(joints.RightElbow, [pose.elbows[0], 0, 0])
    turn(joints.LeftElbow, [pose.elbows[1], 0, 0])
    const nod = pose.name === 'happy' && t < 1.1 ? Math.sin(t * 10) * .08 : 0
    turn(joints.Head, [pose.head[0] + nod, pose.head[1], pose.head[2]])
    turn(joints.RightLeg, [moving ? Math.sin(t * 8) * .22 : 0, 0, 0])
    turn(joints.LeftLeg, [moving ? -Math.sin(t * 8) * .22 : 0, 0, 0])
    blink.current.elapsed += dt
    const phase = blink.current.elapsed - blink.current.next
    const openness = phase >= 0 && phase < .18 ? Math.max(.08, Math.abs(phase / .09 - 1)) : 1
    if (phase >= .18) { blink.current.elapsed = 0; blink.current.next = 2.5 + Math.random() * 4 }
    for (const eye of [joints.LeftEye, joints.RightEye]) if (eye) eye.scale.y = openness
    if (joints.Mouth) joints.Mouth.scale.y = talking ? 1 + Math.abs(Math.sin(t * 13)) * .8 : expression === 'delighted' ? 1.35 : 1
  })

  return (
    <group ref={root} scale={scale} userData={{ clerkPose: pose.name }}>
      <group scale={cm(100)} dispose={null}>
        <primitive object={model} />
        <HeldItem product={pose.name === 'presenting' ? product : null} reading={pose.name === 'reading'} />
      </group>
      {showMessage && <SpeechCloud message={message} liftCm={ANIME_CLOUD_LIFT_CM} />}
    </group>
  )
}

export default function AnimeClerk(props) {
  const fallback = <StoreKeeper3D {...props} />
  return <ModelBoundary fallback={fallback}><Suspense fallback={fallback}><ModelClerk {...props} /></Suspense></ModelBoundary>
}
