import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateFibonacciSphere } from './math'
import ProductCard3D from './ProductCard3D'

const GLOBE_RADIUS = 6.0

export default function GlobeCore({ products, rotationState, velocityState, isDragging, lastInteraction, onSelect, onHover, onHoverOut }) {
  const groupRef = useRef(null)

  const cardData = useMemo(() => {
    if (!products || products.length === 0) return []

    // Ensure there are enough cards to form a dense sphere.
    // If the CMS has fewer than 48 items, repeat them. If more, it scales dynamically!
    const targetCount = Math.max(48, products.length)

    const rawPositions = generateFibonacciSphere(targetCount, GLOBE_RADIUS)
    return rawPositions.map((pos, i) => ({
      position: pos,
      scale: 0.6 + Math.random() * 0.7,
      product: products[i % products.length], 
    }))
  }, [products])

  useFrame(() => {
    if (!groupRef.current) return

    // Apply velocity to rotation
    rotationState.current.x += velocityState.current.x
    rotationState.current.y += velocityState.current.y

    // Limit pitch rotation
    rotationState.current.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, rotationState.current.x))

    if (!isDragging.current) {
      // Momentum decay
      velocityState.current.x *= 0.92
      velocityState.current.y *= 0.92

      // Idle rotation
      if (Date.now() - lastInteraction.current > 2000) {
        velocityState.current.y += 0.00015
      }
    } else {
      // Sharp decay while dragging
      velocityState.current.x *= 0.3
      velocityState.current.y *= 0.3
    }

    groupRef.current.rotation.x = rotationState.current.x
    groupRef.current.rotation.y = rotationState.current.y
  })

  return (
    <group ref={groupRef}>
      {cardData.map((data, i) => (
        <ProductCard3D
          key={i}
          index={i}
          position={data.position}
          scale={data.scale}
          product={data.product}
          onSelect={(product) => {
            if (!isDragging.current) onSelect(product)
          }}
          onHover={onHover}
          onHoverOut={onHoverOut}
        />
      ))}
    </group>
  )
}
