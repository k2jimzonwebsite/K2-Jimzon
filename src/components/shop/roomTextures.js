import * as THREE from 'three'

/**
 * MAP-027 — procedural room materials for the virtual store.
 *
 * Everything here is drawn on a 2D canvas at runtime. No image files, no CDN,
 * no HDR: the production CSP forbids external asset hosts, and a store that
 * cannot render offline is not a store. Textures are cached and disposed with
 * the scene.
 */

const cache = new Map()

/**
 * Veined white marble.
 *
 * Drawn rather than tiled from a photo so the veining never repeats visibly
 * across a long shelf run. Deterministic per seed so a shelf looks identical
 * between visits instead of reshuffling under the customer.
 */
export function marbleTexture(seed = 1, { width = 1024, height = 512 } = {}) {
  const key = `marble:${seed}:${width}x${height}`
  if (cache.has(key)) return cache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Deterministic PRNG. An unseeded generator would reshuffle the veining on
  // every mount, so the same shelf would look different on each visit.
  let state = seed * 9301 + 49297
  const rand = () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }

  const base = ctx.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, '#FFFFFF')
  base.addColorStop(0.5, '#F7F4EF')
  base.addColorStop(1, '#FBF9F6')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  // Broad soft veins first, then finer ones on top — the layering is what stops
  // it reading as scribbled lines.
  const passes = [
    { count: 5, width: 9, alpha: 0.05, colour: '#9E958A' },
    { count: 9, width: 3.2, alpha: 0.08, colour: '#8C8378' },
    { count: 14, width: 1.1, alpha: 0.10, colour: '#6E675E' },
  ]

  for (const pass of passes) {
    ctx.strokeStyle = pass.colour
    ctx.globalAlpha = pass.alpha
    ctx.lineWidth = pass.width
    ctx.lineCap = 'round'
    for (let i = 0; i < pass.count; i += 1) {
      const y0 = rand() * height
      ctx.beginPath()
      ctx.moveTo(-40, y0)
      let x = -40
      let y = y0
      while (x < width + 40) {
        const nx = x + 60 + rand() * 110
        const ny = y + (rand() - 0.5) * 90
        ctx.quadraticCurveTo(x + 30, y + (rand() - 0.5) * 60, nx, ny)
        x = nx
        y = ny
      }
      ctx.stroke()
    }
  }

  // A faint warm wash keeps the stone from going blue-grey under cool light.
  ctx.globalAlpha = 0.05
  ctx.fillStyle = '#C6A867'
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

/** A category sign for the top of each shelf bay. */
export function signTexture(label) {
  const key = `sign:${label}`
  if (cache.has(key)) return cache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, 1024, 256)
  ctx.fillStyle = '#C6A867'
  ctx.fillRect(0, 228, 1024, 4)

  ctx.fillStyle = '#2B2B2B'
  ctx.font = '600 84px Fraunces, Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText(String(label || '').slice(0, 28), 512, 140)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

/**
 * Calacatta wall marble.
 *
 * The stone the room is actually clad in. Where `marbleTexture` draws the fine
 * grain of a shelf board, this is architectural scale: few veins, wide, with
 * the gold-brown secondary veining that reads as Italian rather than as generic
 * white stone. It is the single biggest thing separating a luxury import hall
 * from a beige box, which is why the walls are clad rather than painted.
 *
 * Drawn at 1024 and stretched across a whole wall, so the veins stay large. A
 * tiled small texture would read as wallpaper.
 */
export function wallMarbleTexture(seed = 7, { width = 1024, height = 1024 } = {}) {
  const key = `wall-marble:${seed}:${width}x${height}`
  if (cache.has(key)) return cache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  let state = seed * 7717 + 13
  const rand = () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }

  const base = ctx.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, '#FFFFFF')
  base.addColorStop(0.42, '#FBF8F3')
  base.addColorStop(1, '#F4EFE7')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  /** One vein, drawn as a wandering ribbon with feathered edges. */
  const vein = (colour, alpha, thickness, drift) => {
    ctx.strokeStyle = colour
    ctx.globalAlpha = alpha
    ctx.lineWidth = thickness
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const startY = rand() * height
    ctx.beginPath()
    ctx.moveTo(-60, startY)
    let x = -60
    let y = startY
    while (x < width + 60) {
      const nx = x + 90 + rand() * 150
      const ny = y + (rand() - 0.5) * drift
      ctx.bezierCurveTo(x + 40, y + (rand() - 0.5) * drift * 0.6, nx - 40, ny - (rand() - 0.5) * drift * 0.6, nx, ny)
      x = nx
      y = ny
    }
    ctx.stroke()
  }

  // A handful of broad grey veins carry the composition.
  for (let i = 0; i < 4; i += 1) vein('#B9AFA2', 0.2, 16 + rand() * 22, 190)
  for (let i = 0; i < 6; i += 1) vein('#8C8378', 0.16, 5 + rand() * 8, 220)
  // Then the warm secondary veining that makes it Calacatta rather than Carrara.
  for (let i = 0; i < 5; i += 1) vein('#C6A867', 0.22, 3 + rand() * 6, 240)
  for (let i = 0; i < 10; i += 1) vein('#6E675E', 0.1, 1 + rand() * 2.5, 260)

  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

export function disposeRoomTextures() {
  for (const texture of cache.values()) texture.dispose?.()
  cache.clear()
}
