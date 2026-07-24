// Small colour helpers for the "chameleon" ambient tint.

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return [h, s, l]
}

export function hslToRgbStr(h, s, l) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return `${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}`
}

/**
 * Turn a (possibly muted) "r, g, b" string into a vivid, mid-lightness tint so
 * even dull photos read as a clear colour. Falls back to a saturated colour
 * derived from the product's curated `hue` when no photo colour is available.
 */
export function vividTint(rgbStr, hue = 40) {
  if (!rgbStr) return hslToRgbStr(hue, 0.72, 0.55)
  const [r, g, b] = rgbStr.split(',').map((n) => parseInt(n, 10))
  const [h, s, l] = rgbToHsl(r, g, b)
  const s2 = Math.min(1, s * 1.7 + 0.18)          // punch up saturation
  const l2 = Math.min(0.6, Math.max(0.44, l))     // keep it mid so it's vivid, not muddy
  return hslToRgbStr(h, s2, l2)
}
