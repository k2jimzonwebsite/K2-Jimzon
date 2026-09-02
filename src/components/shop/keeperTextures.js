import * as THREE from 'three'

/**
 * MAP-027 — the shopkeeper's painted features.
 *
 * The 3D character is built from primitives, but her face is drawn flat and
 * stands on a plane in front of the head. This is how stylised 3D characters
 * are normally made: modelling anime eyes as geometry gives you an uncanny
 * doll, while a drawn face on a simple head reads as the character the
 * illustration promised. It also keeps her unmistakably a drawing, which is the
 * honest way to put a face on the counter — MAP-027 forbids simulating the
 * presence of a specific person.
 *
 * Canvas rather than an image file, for the same reason as every other texture
 * in this store: the production CSP forbids external asset hosts, and the shop
 * has to render offline.
 */

const cache = new Map()

const INK = '#2B2B2B'
const HAIR = '#3A2A22'
const BLUSH = '#E89B86'
const GOLD = '#C6A867'

export const MOUTH_SIZE = 128
const SIZE = 512

/**
 * The face patch is wider than it is tall (1.55 rad across, 1.30 down), so a
 * square canvas stretched onto it smears every feature sideways. The canvas is
 * cut to the same ratio and the drawing is scaled into it, so the art lands
 * undistorted while the code keeps drawing in convenient coordinates.
 */
const FACE_ASPECT = 1.55 / 1.3
const FACE_H = Math.round(SIZE / FACE_ASPECT)

/**
 * Anime face proportions.
 *
 * The proportions are calibrated so the eyes, brows, blush, and nose sit
 * comfortably on the front of the head sphere without being clipped by the hair
 * or visor.
 */
const EYE = { left: 162, right: 350, y: 242, rx: 68, ry: 84 }

/**
 * One anime eye.
 *
 * `openness` scales the vertical extent for the blink. Below a threshold the
 * whole eye collapses to a stylized anime lash line.
 */
function drawEye(ctx, cx, openness) {
  const { y: cy, rx } = EYE
  const ry = EYE.ry * openness

  if (openness < 0.18) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 14
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - rx * 0.9, cy)
    ctx.quadraticCurveTo(cx, cy + 18, cx + rx * 0.9, cy)
    ctx.stroke()
    // Outer wing flick on closed eye
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(cx + rx * 0.8, cy)
    ctx.lineTo(cx + rx + 16, cy - 8)
    ctx.stroke()
    return
  }

  ctx.save()
  // Sclera (White of eye)
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.clip()

  // Sclera upper shadow
  ctx.fillStyle = 'rgba(215, 205, 195, 0.35)'
  ctx.beginPath()
  ctx.ellipse(cx, cy - ry * 0.65, rx * 1.1, ry * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()

  // Multi-gradient Anime Iris (chestnut -> warm amber -> golden rim)
  const iris = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry)
  iris.addColorStop(0, '#1E110A')
  iris.addColorStop(0.3, '#3D2415')
  iris.addColorStop(0.65, '#825228')
  iris.addColorStop(0.9, '#C98B43')
  iris.addColorStop(1, '#F3C579')
  ctx.fillStyle = iris
  ctx.beginPath()
  ctx.ellipse(cx, cy + ry * 0.05, rx * 0.86, ry * 0.92, 0, 0, Math.PI * 2)
  ctx.fill()

  // Inner golden light arc
  ctx.fillStyle = 'rgba(245, 198, 118, 0.45)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + ry * 0.48, rx * 0.62, ry * 0.36, 0, 0, Math.PI * 2)
  ctx.fill()

  // Iris dark outer border
  ctx.strokeStyle = 'rgba(32, 18, 12, 0.65)'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.ellipse(cx, cy + ry * 0.05, rx * 0.86, ry * 0.92, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Deep dark pupil
  ctx.fillStyle = '#120A06'
  ctx.beginPath()
  ctx.ellipse(cx, cy + ry * 0.08, rx * 0.38, ry * 0.46, 0, 0, Math.PI * 2)
  ctx.fill()

  // Glossy Catchlights
  // Primary top-left shine
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.ellipse(cx - rx * 0.34, cy - ry * 0.36, rx * 0.28, ry * 0.26, -0.3, 0, Math.PI * 2)
  ctx.fill()

  // Secondary bottom-right sparkle
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.ellipse(cx + rx * 0.34, cy + ry * 0.42, rx * 0.16, ry * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()

  // Tiny ambient reflection
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.ellipse(cx - rx * 0.22, cy + ry * 0.48, rx * 0.1, ry * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1.0

  ctx.restore()

  // Double Eyelid Crease
  ctx.strokeStyle = 'rgba(215, 160, 130, 0.85)'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - rx * 0.7, cy - ry * 1.15)
  ctx.quadraticCurveTo(cx, cy - ry * 1.35, cx + rx * 0.7, cy - ry * 1.1)
  ctx.stroke()

  // Upper Eyelash Line: thick stylized anime eyeliner with winged flick
  ctx.strokeStyle = INK
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - rx - 4, cy - ry * 0.48)
  ctx.quadraticCurveTo(cx, cy - ry * 1.28, cx + rx + 4, cy - ry * 0.44)
  ctx.stroke()

  // Elegant wing flick
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(cx + rx + 2, cy - ry * 0.46)
  ctx.lineTo(cx + rx + 26, cy - ry * 0.88)
  ctx.stroke()

  // Lower lash accent
  ctx.strokeStyle = 'rgba(43, 43, 43, 0.65)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(cx - rx * 0.4, cy + ry * 0.98)
  ctx.quadraticCurveTo(cx + rx * 0.35, cy + ry * 1.12, cx + rx * 0.85, cy + ry * 0.78)
  ctx.stroke()
}

/**
 * The face panel texture.
 *
 * Cached per expression and per blink step.
 */
export function faceTexture(expression = 'idle', openness = 1) {
  const step = openness > 0.66 ? 1 : openness > 0.18 ? 0.5 : 0
  const key = `face:${expression}:${step}`
  if (cache.has(key)) return cache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = FACE_H
  const ctx = canvas.getContext('2d')
  ctx.scale(1, FACE_H / SIZE)

  // Eyebrows, stylized and expressive
  const lift = expression === 'delighted' ? -18 : expression === 'listening' ? -8 : 0
  ctx.strokeStyle = HAIR
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(106, 138 + lift)
  ctx.quadraticCurveTo(162, 114 + lift, 216, 134 + lift)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(296, 134 + lift)
  ctx.quadraticCurveTo(350, 114 + lift, 406, 138 + lift)
  ctx.stroke()

  // Draw Eyes
  drawEye(ctx, EYE.left, step)
  drawEye(ctx, EYE.right, step)

  // Soft Anime Blush on cheeks with micro-stripes
  ctx.fillStyle = BLUSH
  ctx.globalAlpha = 0.52
  ctx.beginPath()
  ctx.ellipse(92, 335, 48, 24, -0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(420, 335, 48, 24, 0.1, 0, Math.PI * 2)
  ctx.fill()

  // Diagonal blush stripes
  ctx.strokeStyle = '#D47363'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(76, 335); ctx.lineTo(92, 345)
  ctx.moveTo(96, 332); ctx.lineTo(112, 342)
  ctx.moveTo(400, 335); ctx.lineTo(416, 345)
  ctx.moveTo(420, 332); ctx.lineTo(436, 342)
  ctx.stroke()
  ctx.globalAlpha = 1.0

  // Delicate Anime Button Nose
  ctx.strokeStyle = 'rgba(195, 140, 108, 0.85)'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(258, 310)
  ctx.lineTo(254, 326)
  ctx.stroke()
  ctx.fillStyle = 'rgba(195, 140, 108, 0.85)'
  ctx.beginPath()
  ctx.arc(252, 326, 3.5, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

/** Visemes, in opening order. Cycling these is what reads as speech. */
export const MOUTH_SHAPES = ['closed', 'narrow', 'mid', 'wide', 'grin', 'line']

/**
 * Separate mouth texture on a 128x128 canvas.
 *
 * Having the mouth rendered on its own small texture avoids blowing up the face
 * texture cache while cycling speech visemes.
 */
export function mouthTexture(shape = 'closed') {
  const key = `mouth:${shape}`
  if (cache.has(key)) return cache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = MOUTH_SIZE
  canvas.height = MOUTH_SIZE
  const ctx = canvas.getContext('2d')

  const cx = 64
  const cy = 64
  const lips = '#8A4A42'
  const inner = '#7A3B36'
  const tongue = '#E8837C'

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const openMouth = (rx, ry) => {
    ctx.fillStyle = inner
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = tongue
    ctx.beginPath()
    ctx.ellipse(cx, cy + ry * 0.44, rx * 0.6, ry * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()
    // Upper teeth edge
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - rx * 0.7, cy - ry * 0.4)
    ctx.quadraticCurveTo(cx, cy - ry * 0.2, cx + rx * 0.7, cy - ry * 0.4)
    ctx.stroke()
  }

  switch (shape) {
    case 'narrow': openMouth(16, 10); break
    case 'mid': openMouth(24, 18); break
    case 'wide': openMouth(32, 28); break
    case 'grin':
      ctx.fillStyle = inner
      ctx.beginPath()
      ctx.moveTo(cx - 36, cy - 8)
      ctx.quadraticCurveTo(cx, cy + 38, cx + 36, cy - 8)
      ctx.quadraticCurveTo(cx, cy + 2, cx - 36, cy - 8)
      ctx.fill()
      ctx.fillStyle = tongue
      ctx.beginPath()
      ctx.ellipse(cx, cy + 16, 18, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(cx - 24, cy - 4)
      ctx.quadraticCurveTo(cx, cy + 1, cx + 24, cy - 4)
      ctx.stroke()
      break
    case 'line':
      ctx.strokeStyle = lips
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(cx - 24, cy)
      ctx.lineTo(cx + 24, cy)
      ctx.stroke()
      break
    case 'closed':
    default:
      ctx.strokeStyle = lips
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(cx - 28, cy - 4)
      ctx.quadraticCurveTo(cx, cy + 18, cx + 28, cy - 4)
      ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

/**
 * A speech cloud, the way a game draws one.
 *
 * Overlapping lobes rather than a rounded rectangle, with a tail of shrinking
 * bubbles pointing down at her.
 */
export function speechCloudTexture(message) {
  const text = String(message || '').trim()
  if (!text) return null
  const key = `cloud:${text}`
  if (cache.has(key)) return cache.get(key)

  const width = 1024
  const height = 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // The body is a run of overlapping circles (lobes)
  const lobes = [
    [250, 200, 150], [430, 150, 132], [610, 150, 132], [790, 200, 150],
    [300, 300, 140], [512, 320, 155], [724, 300, 140],
    [180, 260, 110], [844, 260, 110],
  ]

  const paint = (inset, fill) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    for (const [x, y, r] of lobes) {
      ctx.moveTo(x + r - inset, y)
      ctx.arc(x, y, r - inset, 0, Math.PI * 2)
    }
    // Tail: three bubbles stepping down toward her head
    for (const [x, y, r] of [[430, 408, 40], [392, 452, 26], [364, 484, 15]]) {
      ctx.moveTo(x + r - inset * 0.5, y)
      ctx.arc(x, y, Math.max(3, r - inset * 0.5), 0, Math.PI * 2)
    }
    ctx.fill()
  }

  paint(0, 'rgba(198, 168, 103, 0.92)')
  paint(7, 'rgba(255, 253, 249, 0.98)')

  ctx.fillStyle = '#2B2B2B'
  ctx.textAlign = 'center'
  ctx.font = '600 44px "Source Sans 3", Segoe UI, system-ui, sans-serif'

  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > 620 && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)

  const shown = lines.slice(0, 4)
  const startY = 246 - ((shown.length - 1) * 56) / 2
  shown.forEach((entry, index) => ctx.fillText(entry, 512, startY + index * 56))

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

/**
 * The cap badge.
 */
export function capBadgeTexture() {
  const key = 'cap-badge'
  if (cache.has(key)) return cache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, 512, 256)
  ctx.fillStyle = GOLD
  ctx.font = '700 150px Fraunces, Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('K2', 256, 136)

  ctx.strokeStyle = GOLD
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(176, 210)
  ctx.lineTo(336, 210)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

export function disposeKeeperTextures() {
  for (const texture of cache.values()) texture.dispose?.()
  cache.clear()
}

