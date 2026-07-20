import { useCallback, useRef, useState } from 'react'

export default function InteractiveReveal({ beforeImage, afterImage }) {
  const [pos, setPos] = useState(50)
  const trackRef = useRef(null)
  const dragging = useRef(false)

  const moveTo = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
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
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5))
    if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5))
  }

  return (
    <div
      ref={trackRef}
      className="relative aspect-auto h-full w-full cursor-ew-resize touch-none select-none overflow-hidden group bg-shell"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="slider"
      aria-label="Drag to compare lifestyle and packaging views"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* Base Layer: Before Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={beforeImage} 
          alt="Product Package" 
          loading="lazy"
          className="h-full w-full object-cover mix-blend-multiply"
          draggable={false}
        />
      </div>

      {/* Top Layer: After Image (Clipped) */}
      {afterImage && (
        <div
          className="absolute inset-0 z-10"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <img 
            src={afterImage} 
            alt="Product Revealed" 
            loading="lazy"
            className="h-full w-full object-cover mix-blend-multiply"
            draggable={false}
          />
        </div>
      )}

      {/* Handle Line */}
      {afterImage && (
        <div
          className="absolute inset-y-0 z-20 w-0.5 bg-paper shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-transform duration-75 ease-out"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-navy shadow-float transition-transform group-hover:scale-110">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Helper Badges */}
      <div className="absolute top-5 left-5 z-30 pointer-events-none transition-opacity duration-300" style={{ opacity: pos > 20 ? 1 : 0 }}>
        <span className="bg-navy/80 backdrop-blur-md text-cream text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg">
          Packaging
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="bg-navy/80 backdrop-blur-md text-cream text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg">
          Interactive • Drag to view
        </span>
      </div>
      <div className="absolute top-5 right-5 z-30 pointer-events-none transition-opacity duration-300" style={{ opacity: pos < 80 ? 1 : 0 }}>
        <span className="bg-paper/90 backdrop-blur-md text-navy text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-lg">
          Lifestyle
        </span>
      </div>
    </div>
  )
}
