import * as THREE from 'three'

/**
 * MAP-027 — package faces for the virtual store.
 *
 * Every item on the shelf carries its own front label. Two sources, in order:
 *
 *   1. The product's real photograph, when the catalog has one.
 *   2. A generated label drawn on a 2D canvas.
 *
 * The generated label is drawn with `CanvasTexture` rather than 3D text on
 * purpose. drei's `<Text>` pulls in troika and suspends on a font fetch, which
 * can leave an entire scene suspended and blank; a canvas uses fonts the browser
 * already has and cannot suspend or fail offline.
 *
 * Textures are cached per SKU because a shelf re-renders on every selection and
 * regenerating canvases each time would churn GPU memory.
 */

const cache = new Map()
const failedPhotos = new Set()

const CANVAS_W = 512
const CANVAS_H = 700

/** White-luxury label palette. Kept here so the shelf cannot drift from it. */
const PAPER = '#FBF9F6'
const INK = '#2B2B2B'
const MUTED = '#8C8378'
const ACCENT = '#B84E3A'
const GOLD = '#C6A867'
/** The palette neutral used for unprinted packaging — jar lids and bases. */
const STONE = '#E5DDD2'

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}

/**
 * Draw a product's front-of-pack label.
 *
 * Deliberately restrained: a hairline rule, the brand-ish first word, the
 * product name, and the price. No invented certifications, awards, or claims —
 * a package face is public-facing copy and must not assert anything the catalog
 * has not established.
 */
export function labelTexture(product) {
  const sku = product?.sku || product?.id || 'unknown'
  const key = `label:${sku}`
  if (cache.has(key)) return cache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Soft top band so the face reads as printed stock rather than flat colour.
  const band = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  band.addColorStop(0, 'rgba(0,0,0,0.05)')
  band.addColorStop(0.25, 'rgba(0,0,0,0)')
  ctx.fillStyle = band
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Gold hairline — the one decorative element.
  ctx.fillStyle = GOLD
  ctx.fillRect(64, 120, 84, 3)

  const name = String(product?.name || 'Product').trim()
  const brand = name.split(/\s+/)[0] || 'K2'

  ctx.fillStyle = MUTED
  ctx.font = '600 30px "Source Sans 3", Segoe UI, system-ui, sans-serif'
  ctx.fillText(brand.toUpperCase().slice(0, 14), 64, 100)

  ctx.fillStyle = INK
  ctx.font = '600 46px Fraunces, Georgia, serif'
  const lines = wrap(ctx, name, CANVAS_W - 128)
  lines.forEach((line, index) => ctx.fillText(line, 64, 210 + index * 58))

  const price = Number(product?.srp ?? product?.retail)
  if (Number.isFinite(price) && price > 0) {
    ctx.fillStyle = ACCENT
    ctx.font = '700 52px "Source Sans 3", Segoe UI, system-ui, sans-serif'
    ctx.fillText(`PHP ${price.toLocaleString('en-PH')}`, 64, CANVAS_H - 96)
  }

  ctx.fillStyle = MUTED
  ctx.font = '600 24px "Source Sans 3", Segoe UI, system-ui, sans-serif'
  ctx.fillText('ITALY — MANILA', 64, CANVAS_H - 48)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  cache.set(key, texture)
  return texture
}

/**
 * Load the product photograph as a face texture.
 *
 * Returns null immediately when the catalog has no image, so the caller falls
 * back to the drawn label rather than waiting on a request that will not happen.
 * A load failure resolves to null for the same reason — a broken image must
 * never leave a blank package on the shelf.
 */
export function photoTexture(product, onReady) {
  const source = product?.img || product?.primary_image_url || null
  if (!source || typeof source !== 'string') return null

  const sku = product?.sku || product?.id || source
  const key = `photo:${sku}:${source}`
  if (failedPhotos.has(key)) return null
  if (cache.has(key)) return cache.get(key)

  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  const texture = loader.load(
    source,
    loaded => {
      failedPhotos.delete(key)
      loaded.colorSpace = THREE.SRGBColorSpace
      if (typeof onReady === 'function') onReady()
    },
    undefined,
    () => {
      cache.delete(key)
      failedPhotos.add(key)
      if (typeof onReady === 'function') onReady()
    },
  )
  texture.colorSpace = THREE.SRGBColorSpace
  cache.set(key, texture)
  return texture
}

/**
 * A shelf-edge price talker.
 *
 * The printed strip a supermarket clips to the front of the plank. It carries
 * only what the catalog already states — name, size, price — because a talker
 * is public-facing pricing and must not assert a promotion, a saving, or a unit
 * price the business has not published.
 */
export function talkerTexture(product) {
  const sku = product?.sku || product?.id || 'unknown'
  const price = Number(product?.srp ?? product?.retail)
  const key = `talker:${sku}:${price}`
  if (cache.has(key)) return cache.get(key)

  const width = 512
  const height = 160
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, width, 6)

  const name = String(product?.short || product?.name || '').trim()
  ctx.fillStyle = INK
  ctx.font = '600 34px "Source Sans 3", Segoe UI, system-ui, sans-serif'
  ctx.fillText(clip(ctx, name, width - 190), 20, 62)

  const size = String(product?.size || '').trim()
  if (size) {
    ctx.fillStyle = MUTED
    ctx.font = '500 26px "Source Sans 3", Segoe UI, system-ui, sans-serif'
    ctx.fillText(clip(ctx, size, width - 190), 20, 106)
  }

  if (Number.isFinite(price) && price > 0) {
    ctx.fillStyle = ACCENT
    ctx.font = '700 46px "Source Sans 3", Segoe UI, system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`₱${price.toLocaleString('en-PH')}`, width - 20, 82)
    ctx.textAlign = 'left'
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

/** Trim a string to the width it is allowed to occupy, with an ellipsis. */
function clip(ctx, value, maxWidth) {
  if (ctx.measureText(value).width <= maxWidth) return value
  let text = value
  while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1)
  }
  return `${text}…`
}

/**
 * Materials for one package, shared across its facings.
 *
 * A well-stocked shelf stands the same product four times over. Building a
 * material set per facing would quadruple the GPU state for no visual gain, so
 * they are cached per SKU and disposed with the scene.
 *
 * Round packages get their own entry because the label has to wrap the curved
 * side, which needs a separately-wrapped clone of the same image.
 */
const materialCache = new Map()

export function packageMaterials(product, faceMap, { round = false, soldOut = false } = {}) {
  const sku = product?.sku || product?.id || 'unknown'
  const key = `mat:${sku}:${round ? 'round' : 'box'}:${soldOut ? 'out' : 'in'}:${faceMap?.uuid || 'none'}`
  if (materialCache.has(key)) return materialCache.get(key)

  const opacity = soldOut ? 0.5 : 1
  const carton = new THREE.MeshStandardMaterial({
    color: '#F4F0EA',
    roughness: 0.72,
    transparent: soldOut,
    opacity,
  })

  let materials
  if (round) {
    // The label wraps the curved side; the lid and base stay unprinted.
    const wrapped = faceMap ? faceMap.clone() : null
    if (wrapped) {
      wrapped.wrapS = THREE.RepeatWrapping
      wrapped.needsUpdate = true
    }
    const side = new THREE.MeshStandardMaterial({
      map: wrapped,
      roughness: 0.5,
      transparent: soldOut,
      opacity,
    })
    const lid = new THREE.MeshStandardMaterial({
      color: STONE,
      roughness: 0.5,
      metalness: 0.15,
      transparent: soldOut,
      opacity,
    })
    materials = [side, lid, lid]
  } else {
    const face = new THREE.MeshStandardMaterial({
      map: faceMap,
      roughness: 0.55,
      transparent: soldOut,
      opacity,
    })
    materials = [carton, carton, carton, carton, face, carton]
  }

  materialCache.set(key, materials)
  return materials
}

/** Release cached GPU textures and materials. Called when the store unmounts. */
export function disposePackageTextures() {
  for (const texture of cache.values()) texture.dispose?.()
  cache.clear()
  failedPhotos.clear()
  for (const materials of materialCache.values()) {
    for (const material of materials) {
      material.map?.dispose?.()
      material.dispose?.()
    }
  }
  materialCache.clear()
}
