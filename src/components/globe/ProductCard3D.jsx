import * as THREE from 'three'
import { useMemo, useRef, useState, useEffect } from 'react'

const GLOBE_RADIUS = 6.0
const CARD_WIDTH = 1.8
const CARD_HEIGHT = 2.4

export default function ProductCard3D({ index, position, scale = 1, product, onSelect, onHover, onHoverOut }) {
  const meshRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [texture, setTexture] = useState(null)

  // Load product image as texture
  useEffect(() => {
    let active = true

    // Start with a placeholder canvas colored with the product's hue
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 500
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const hue = product.hue ?? 0
      ctx.fillStyle = `hsl(${hue}, 12%, 90%)`
      ctx.fillRect(0, 0, 400, 500)
      // Draw product name as text on placeholder
      ctx.fillStyle = `hsl(${hue}, 20%, 35%)`
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const words = (product.short || product.name).split(' ')
      words.forEach((word, i) => {
        ctx.fillText(word, 200, 200 + i * 32)
      })
    }
    const initialTex = new THREE.CanvasTexture(canvas)
    initialTex.minFilter = THREE.LinearMipmapLinearFilter
    initialTex.generateMipmaps = true
    setTexture(initialTex)

    // Load the actual product image
    const imgSrc = product.heroImage || product.img
    if (imgSrc) {
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(
        imgSrc,
        (loadedTex) => {
          if (!active) return
          loadedTex.minFilter = THREE.LinearMipmapLinearFilter
          loadedTex.generateMipmaps = true
          setTexture(loadedTex)
        },
        undefined,
        () => {
          // Image failed to load — keep placeholder
          console.warn('Failed to load image for', product.id)
        }
      )
    }

    return () => { active = false }
  }, [product])

  // Orient the card so it faces outward from the globe center
  const rotationQuaternion = useMemo(() => {
    const dummy = new THREE.Object3D()
    dummy.position.copy(position)
    dummy.lookAt(position.clone().multiplyScalar(2))
    return dummy.quaternion.clone()
  }, [position])

  // Curved plane geometry to match the sphere surface
  const geometry = useMemo(() => {
    const width = CARD_WIDTH * scale
    const height = CARD_HEIGHT * scale
    const geo = new THREE.PlaneGeometry(width, height, 32, 32)
    const pos = geo.attributes.position

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)

      const theta = x / GLOBE_RADIUS
      const phi = y / GLOBE_RADIUS

      const newX = GLOBE_RADIUS * Math.sin(theta) * Math.cos(phi)
      const newY = GLOBE_RADIUS * Math.sin(phi)
      const newZ = GLOBE_RADIUS * Math.cos(theta) * Math.cos(phi) - GLOBE_RADIUS

      pos.setXYZ(i, newX, newY, newZ)
    }

    geo.computeVertexNormals()
    return geo
  }, [scale])

  return (
    <mesh
      position={position}
      quaternion={rotationQuaternion}
      ref={meshRef}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(product)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
        if (onHover) onHover(product)
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
        if (onHoverOut) onHoverOut()
      }}
    >
      {texture && (
        <meshBasicMaterial
          map={texture}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      )}
    </mesh>
  )
}
