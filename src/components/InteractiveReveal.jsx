import { useCallback, useRef, useState } from 'react'
import { recoverOriginalImage, storefrontImage } from '../lib/storefrontMedia'

const onImageFallback = (e) => {
  const img = e?.currentTarget
  if (!img || img.dataset.fb) return
  img.dataset.fb = '1'
  img.src = '/images/placeholder.svg'
}

export default function InteractiveReveal({ beforeImage, afterImage }) {
  const [pos, setPos] = useState(50)
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
      setPos((p) => Math.max(4, p - 5))
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setPos((p) => Math.min(96, p + 5))
    }
  }

  return (
    <div
      ref={trackRef}
      className="interactive-reveal group relative aspect-auto h-full w-full cursor-ew-resize touch-none select-none overflow-hidden bg-shell"
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
      {/* Base Layer: Before Image */}
      <div className="absolute inset-0 z-0 bg-shell flex items-center justify-center p-6 sm:p-8">
        <img 
          src={storefrontImage(beforeImage)}
          alt="Base product"
          onError={event => { if (!recoverOriginalImage(event, beforeImage)) onImageFallback(event) }}
          loading="lazy"
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>

      {/* Top Layer: After Image (Clipped) */}
      {afterImage && (
        <div
          className="absolute inset-0 z-10 bg-shell overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <img 
            src={storefrontImage(afterImage)}
            alt="After use"
            onError={event => { if (!recoverOriginalImage(event, afterImage)) onImageFallback(event) }}
            loading="lazy"
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* Handle Line */}
      {afterImage && (
        <div
          className="absolute inset-y-0 z-20 w-0.5 bg-paper shadow-[0_0_10px_rgba(0,0,0,0.35)]"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-navy shadow-card transition-transform duration-150 active:scale-[0.95]">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Helper Badges */}
      <div className="absolute top-5 left-5 z-30 pointer-events-none transition-opacity duration-300" style={{ opacity: pos > 20 ? 1 : 0 }}>
        <span className="bg-navy/85 backdrop-blur-md text-cream text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg">
          Base product
        </span>
      </div>
      <div className="interactive-reveal-hint absolute inset-x-0 bottom-4 z-30 flex justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="bg-navy/80 backdrop-blur-md text-cream text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg">
          Interactive • Drag to view
        </span>
      </div>
      <div className="absolute top-5 right-5 z-30 pointer-events-none transition-opacity duration-300" style={{ opacity: pos < 80 ? 1 : 0 }}>
        <span className="bg-paper/90 backdrop-blur-md text-navy text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg">
          After use
        </span>
      </div>
    </div>
  )
}
