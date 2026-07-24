import { useEffect, useState } from 'react'

/**
 * Extracts an average "product" color from an image and returns it as an
 * "r, g, b" string (usable in `rgba(...)`), or null if it can't be read.
 *
 * Robust by design:
 *  - Skips near-white / near-black / transparent pixels so we get the item's
 *    color, not the studio background.
 *  - If the image is cross-origin without CORS headers the canvas becomes
 *    "tainted" and reading pixels throws — we catch that and return null so the
 *    caller can fall back (e.g. to the product's curated `hue`).
 */
export function useDominantColor(src) {
  const [color, setColor] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!src) {
      setColor(null)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return
      try {
        const W = 24, H = 24
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, W, H)
        const { data } = ctx.getImageData(0, 0, W, H)

        let r = 0, g = 0, b = 0, wsum = 0
        for (let i = 0; i < data.length; i += 4) {
          const rr = data[i], gg = data[i + 1], bb = data[i + 2], aa = data[i + 3]
          if (aa < 200) continue                         // transparent
          const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
          if (max > 250 && min > 244) continue           // pure-white background
          if (max < 22) continue                         // near-black edge
          // Weight vivid (saturated) pixels more so we lock onto the product's
          // real colour, not a muddy grey average of the whole photo.
          const wgt = 1 + (max - min) * 0.06
          r += rr * wgt; g += gg * wgt; b += bb * wgt; wsum += wgt
        }

        if (!cancelled) {
          setColor(wsum > 0 ? `${Math.round(r / wsum)}, ${Math.round(g / wsum)}, ${Math.round(b / wsum)}` : null)
        }
      } catch (_) {
        if (!cancelled) setColor(null) // tainted canvas → let caller fall back
      }
    }

    img.onerror = () => { if (!cancelled) setColor(null) }
    img.src = src

    return () => { cancelled = true }
  }, [src])

  return color
}
