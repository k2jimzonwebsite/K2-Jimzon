/**
 * MAP-027 — the shopkeeper's anatomy, and the room's framing.
 *
 * These numbers used to live inside the JSX, where nothing could check them.
 * That is precisely how the character shipped 34 cm tall: the store draws at
 * 13 cm per scene unit, the figure was laid out in units by eye, and a doll in
 * a two-metre shelf run looks exactly like a correctly-built character until
 * someone renders it.
 *
 * Everything here is a plain function over numbers, so the scale and the camera
 * framing are assertable without a browser or a GPU — which matters more than
 * usual for a 3D scene, where the failure mode is visual and silent.
 */

/**
 * The store's scale, taken from the module that sizes the goods.
 *
 * Re-exported rather than redeclared: the room, the furniture and the people in
 * it have to be measured with the same ruler as the products on the shelves, and
 * two constants that merely happen to agree today will not agree forever.
 */
export { CM_PER_UNIT } from './productDimensions.js'
import { CM_PER_UNIT as SCALE, CM_PER_UNIT } from './productDimensions.js'

export const UNITS_PER_CM = 1 / SCALE

/** Centimetres to scene units. */
export const cm = (value) => value / SCALE

/** The floor plane. Everything in the room is measured up from here. */
export const FLOOR_Y = -1.45

/** The lens. One source, so the camera and the framing maths cannot disagree. */
export const FOV = 42

/** Shared lateral interpolation rate for the camera and the aisle clerk. */
export const AISLE_TRAVEL_RATE = 4

/**
 * The shopkeeper, in centimetres from the floor.
 *
 * A 165 cm figure with a deliberately enlarged head — about six heads tall,
 * which is the stylised-but-adult proportion rather than the three-head chibi a
 * naive build lands on.
 */
export const KEEPER = Object.freeze({
  totalCm: 165,
  // A 30 cm head on a 165 cm body is about five and a half heads tall. That is
  // the stylised anime proportion — a realistic seven-head figure reads as a
  // small adult in the distance, not as a character.
  headRadiusCm: 15,
  headCm: 148,
  neckCm: 134,
  shoulderCm: 130,
  torsoCm: 112,
  hipCm: 88,
})

/**
 * The speech cloud above her head.
 *
 * Declared here rather than in the component because the framing has to leave
 * room for it. Held apart, the two drifted immediately: the cloud sat five
 * units above the top of the shot and was invisible. One definition, and the
 * camera is solved from it.
 */
export const CLOUD = Object.freeze({
  centreCm: 174,
  heightCm: 44,
  widthCm: 132,
  offsetXCm: 30,
})

/** The highest thing the counter scene has to hold. */
export const COUNTER_CONTENT_TOP_CM = CLOUD.centreCm + CLOUD.heightCm / 2

/** How far up the counter the greeting shot starts. */
export const COUNTER_FRAME_BASE_CM = 45

/** Counter dimensions, also in real centimetres. */
export const COUNTER = Object.freeze({
  heightCm: 92,
  depthCm: 62,
  widthCm: 210,
})

/**
 * Where the camera has to sit for the whole room to be in shot.
 *
 * The first version used a fixed distance of 15 aimed at the middle of the bay.
 * That framed y from 2.4 upward, so the floor at -1.45, the counter plinth and
 * the shopkeeper's legs were all below the bottom edge. The distance is now
 * solved from what must be visible instead of chosen by eye.
 *
 * Only the vertical extent matters: a perspective camera's vertical field of
 * view is fixed, so this is correct at every viewport aspect ratio.
 */
export function computeFraming({
  height, fov = FOV, floorY = FLOOR_Y, headroom = 2.6, underhang = 1.6, mode = 'shelf',
}) {
  // The counter is a character scene, not a shelf run, and framing it like one
  // was the whole problem: at the shelf distance her head was 9.5% of the frame
  // — about 79 px, with 14 px eyes — while eight units of empty marble sat
  // below the counter. No amount of drawing detail survives that. The counter
  // therefore frames the person, from just below the floor to over her speech cloud.
  const bottom = mode === 'counter'
    ? floorY - 0.35
    : floorY - underhang
  const top = mode === 'counter'
    ? floorY + COUNTER_CONTENT_TOP_CM / CM_PER_UNIT + 0.4
    : height + headroom

  const span = top - bottom
  return {
    target: (bottom + top) / 2,
    distance: span / (2 * Math.tan((fov * Math.PI) / 360)),
    bottom,
    top,
  }
}

/** What a camera at this distance actually shows, vertically. */
export function visibleHeight(distance, fov = FOV) {
  return 2 * distance * Math.tan((fov * Math.PI) / 360)
}

/**
 * Zoom bounds.
 *
 * Bounded so the customer can never pull back out of the room or push through
 * a wall. `1` is the framing above; below `1` moves closer.
 */
export const ZOOM_MIN = 0.3
// Wide enough that pulling right back reveals the floor and the whole counter,
// which is what makes the tighter default framing safe.
export const ZOOM_MAX = 1.7
export const clampZoom = (value) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value))
