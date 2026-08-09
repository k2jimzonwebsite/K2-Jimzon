import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GlobeCore from './GlobeCore'

const getCameraZ = () => typeof window !== 'undefined' && window.innerWidth < 768 ? 28.8 : 16.5

function CameraController({ targetZ }) {
  useFrame((state) => {
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      targetZ.current,
      0.05
    )
  })
  return null
}

export default function ProductGlobe({ products, onSelect }) {
  const containerRef = useRef(null)

  const targetZ = useRef(getCameraZ())
  const rotationState = useRef({ x: 0, y: 0 })
  const velocityState = useRef({ x: 0, y: 0.002 })
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const lastInteractionTime = useRef(Date.now() - 3000)
  const pointerPos = useRef({ x: 0, y: 0 })

  const [isMouseDown, setIsMouseDown] = useState(false)
  const [tooltipInfo, setTooltipInfo] = useState(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    const updateCamera = () => { targetZ.current = getCameraZ() }
    window.addEventListener('resize', updateCamera)
    return () => window.removeEventListener('resize', updateCamera)
  }, [])

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    isDragging.current = true
    setIsMouseDown(true)
    lastMouse.current = { x: e.clientX, y: e.clientY }
    lastInteractionTime.current = Date.now()
  }

  const handlePointerMove = (e) => {
    pointerPos.current = { x: e.clientX, y: e.clientY }
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`
    }

    if (!isDragging.current) return

    const deltaX = e.clientX - lastMouse.current.x
    const deltaY = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }

    velocityState.current.y += deltaX * 0.005
    velocityState.current.x += deltaY * 0.005

    lastInteractionTime.current = Date.now()
  }

  const handlePointerUp = (e) => {
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    isDragging.current = false
    setIsMouseDown(false)
    lastInteractionTime.current = Date.now()
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full touch-pan-y select-none ${isMouseDown ? 'cursor-grabbing' : 'cursor-grab'}`}
      role="application"
      aria-label="Interactive product review globe. Drag horizontally to rotate and tap a product to read reviews."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, getCameraZ()], fov: 45, near: 0.1 }}>
        <CameraController targetZ={targetZ} />
        <Suspense fallback={null}>
          <GlobeCore
            products={products}
            rotationState={rotationState}
            velocityState={velocityState}
            isDragging={isDragging}
            lastInteraction={lastInteractionTime}
            onSelect={onSelect}
            onHover={(product) => setTooltipInfo(product?.short || product?.name)}
            onHoverOut={() => setTooltipInfo(null)}
          />
        </Suspense>
      </Canvas>

      {/* Tooltip follows cursor */}
      {tooltipInfo && (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed top-0 left-0 z-50 bg-navy text-cream px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shadow-float"
          style={{
            borderRadius: '32px',
            willChange: 'transform',
            transform: `translate(${pointerPos.current.x + 16}px, ${pointerPos.current.y + 16}px)`,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {tooltipInfo}
        </div>
      )}
    </div>
  )
}
