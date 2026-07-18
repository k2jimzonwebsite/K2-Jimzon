import { useCallback, useRef, useState } from 'react'
import ProductArt from './ProductArt'
import ProductVisual from './ProductVisual'

// Drag/swipe reveal: sealed export packaging on the left of the handle,
// "what's inside" on the right. Pointer events only — no media, no libs.
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
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    moveTo(e.clientX)
  }
  const onPointerMove = (e) => {
    if (dragging.current) moveTo(e.clientX)
  }
  const onPointerUp = () => {
    dragging.current = false
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(4, p - 6))
    if (e.key === 'ArrowRight') setPos((p) => Math.min(96, p + 6))
  }

  return (
    <div
      ref={trackRef}
      className="relative aspect-square w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-lg border border-line shadow-card"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="slider"
      aria-label="Drag to reveal what's inside the packaging"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* After layer (base): opened */}
      <ProductArt product={product} mode="open" className="absolute inset-0" />

      {/* Before layer (clipped): the real sealed packaging when we have a photo */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {product.img ? (
          <ProductVisual product={product} className="absolute inset-0" pad="p-8" />
        ) : (
          <ProductArt product={product} mode="sealed" className="absolute inset-0" />
        )}
      </div>

      {/* Handle */}
      <div
        className="absolute inset-y-0 z-10 w-[2px] bg-navy"
        style={{ left: `${pos}%` }}
        aria-hidden="true"
      >
        <div className="absolute left-[50%] top-[50%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-navy text-white shadow-float transition-transform hover:scale-110 active:scale-95">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l6-6-6-6" />
            <path d="M9 18l-6-6 6-6" />
          </svg>
        </div>
      </div>

      {/* Captions */}
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-navy/85 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
        Sealed for export
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-navy ring-1 ring-navy/10">
        What's inside
      </span>
    </div>
  )
}
