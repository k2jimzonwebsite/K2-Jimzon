import { useCallback, useRef, useState } from 'react'
import ProductArt from './ProductArt'
import ProductVisual from './ProductVisual'
import { applyImageFallback } from '../lib/imageFallback'

// Drag/swipe reveal: base packaging on the left of the handle,
// after-use view on the right. Pointer events only — no media, no libs.
export default function BeforeAfterSlider({ product }) {
  const [pos, setPos] = useState(58)
  const trackRef = useRef(null)
  const dragging = useRef(false)

  const moveTo = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(96, Math.max(4, pct)))
  }, [])

  const onPointerDown = (e) => {
    e.stopPropagation()
    dragging.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    moveTo(e.clientX)
  }
  const onPointerMove = (e) => {
    if (dragging.current) moveTo(e.clientX)
  }
  const onPointerUp = (e) => {
    dragging.current = false
    try {
      if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // ignore
    }
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setPos((p) => Math.max(4, p - 6))
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setPos((p) => Math.min(96, p + 6))
    }
  }

  return (
    <div
      ref={trackRef}
      className="relative aspect-square w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl border border-line bg-shell shadow-card"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="slider"
      aria-label="Drag to compare base product and after use"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* After layer (base): opened / after use */}
      <div className="absolute inset-0 bg-shell">
        {product.afterImage ? (
          <img
            src={product.afterImage}
            alt="After use"
            onError={applyImageFallback}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <ProductArt product={product} mode="open" className="absolute inset-0" />
        )}
      </div>

      {/* Before layer (clipped): the real sealed packaging with solid backing */}
      <div
        className="absolute inset-0 bg-shell overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {product.img ? (
          <ProductVisual product={product} className="h-full w-full" pad="p-8" />
        ) : (
          <ProductArt product={product} mode="sealed" className="absolute inset-0" />
        )}
      </div>

      {/* Handle */}
      <div
        className="absolute inset-y-0 z-20 w-[2px] bg-paper shadow-[0_0_10px_rgba(0,0,0,0.35)]"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-navy shadow-card transition-transform duration-150 active:scale-[0.95]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
          </svg>
        </div>
      </div>

      {/* Captions */}
      <div
        className="pointer-events-none absolute left-3 top-3 z-30 transition-opacity duration-200"
        style={{ opacity: pos > 20 ? 1 : 0 }}
      >
        <span className="rounded-full bg-navy/85 backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-cream shadow-sm">
          Base product
        </span>
      </div>
      <div
        className="pointer-events-none absolute right-3 top-3 z-30 transition-opacity duration-200"
        style={{ opacity: pos < 80 ? 1 : 0 }}
      >
        <span className="rounded-full bg-paper/90 backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-navy ring-1 ring-navy/10 shadow-sm">
          After use
        </span>
      </div>

      {/* Helper hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center opacity-70 transition-opacity duration-200">
        <span className="rounded-full bg-navy/75 backdrop-blur-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cream shadow-sm">
          Drag left / right
        </span>
      </div>
    </div>
  )
}
