import { useEffect, useId, useRef, useState } from 'react'

// The owner's sheet is displayed through SVG viewports, never redrawn.
// Keep the raster source until the owner supplies layered vector artwork.
const artwork = '/brand/k2-owner-sheet.webp'
// Pixel-boundary stencil measured from the owner's aircraft, not an approximate polygon.
const aircraft = 'M190 55h3v1h-3zM189 56h4v1h-4zM189 57h5v1h-5zM188 58h6v1h-6zM188 59h6v1h-6zM188 60h6v1h-6zM188 61h6v1h-6zM188 62h6v1h-6zM188 63h6v1h-6zM188 64h6v1h-6zM187 65h7v1h-7zM187 66h7v1h-7zM187 67h7v1h-7zM187 68h7v1h-7zM187 69h7v1h-7zM185 70h10v1h-10zM183 71h13v1h-13zM181 72h17v1h-17zM179 73h20v1h-20zM177 74h23v1h-23zM176 75h25v1h-25zM174 76h28v1h-28zM172 77h14v1h-14zM187 77h17v1h-17zM172 78h12v1h-12zM187 78h6v1h-6zM195 78h10v1h-10zM172 79h9v1h-9zM187 79h6v1h-6zM196 79h10v1h-10zM172 80h6v1h-6zM187 80h6v1h-6zM198 80h9v1h-9zM172 81h4v1h-4zM187 81h6v1h-6zM200 81h8v1h-8zM187 82h6v1h-6zM201 82h6v1h-6zM187 83h6v1h-6zM203 83h4v1h-4zM187 84h6v1h-6zM205 84h2v1h-2zM187 85h6v1h-6zM187 86h5v1h-5zM186 87h6v1h-6zM185 88h8v1h-8zM183 89h11v1h-11zM183 90h12v1h-12zM183 91h13v1h-13zM183 92h13v1h-13zM186 93h10v1h-10z'
let arrivalPlayed = false

export default function BrandMark({ variant = 'compact', animate = false }) {
  const id = useId().replaceAll(':', '')
  const root = useRef(null)
  const plane = useRef(null)
  const flight = useRef(null)
  const trail = useRef(null)
  const trace = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const globe = variant === 'globe'

  useEffect(() => {
    if (globe || !loaded) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => { flight.current?.cancel(); trace.current?.cancel() }
    const onVisibility = () => { if (document.hidden) stop() }
    const frame = requestAnimationFrame(() => {
      if (!animate || arrivalPlayed || reduced.matches || document.hidden) return
      arrivalPlayed = true
      root.current?.setAttribute('data-arrival', 'played')
      trace.current = trail.current?.animate([
        { strokeDashoffset: 1, opacity: 0 },
        { opacity: .9, offset: .2 },
        { strokeDashoffset: 0, opacity: 0 },
      ], { duration: 720, easing: 'cubic-bezier(.23, 1, .32, 1)' })
      flight.current = plane.current?.animate([
        { opacity: 0 }, { opacity: 0, offset: .5 },
        { opacity: .8, offset: .78 }, { opacity: 0 },
      ], { duration: 720, easing: 'ease-out' })
    })
    reduced.addEventListener('change', stop)
    document.addEventListener('visibilitychange', onVisibility)
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) stop()
    })
    observer.observe(root.current)
    return () => {
      cancelAnimationFrame(frame)
      stop()
      observer.disconnect()
      reduced.removeEventListener('change', stop)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [animate, globe, loaded])

  const acknowledge = event => {
    if (globe || event.pointerType !== 'mouse' || !loaded ||
      !matchMedia('(hover: hover) and (pointer: fine)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      flight.current?.playState === 'running') return
    flight.current = plane.current?.animate([
      { opacity: 0 }, { opacity: .65, offset: .4 }, { opacity: 0 },
    ], { duration: 180, easing: 'ease-out' })
  }

  return (
    <svg ref={root} data-brand-mark={variant} aria-hidden="true" focusable="false"
      viewBox={globe ? '0 0 320 290' : '0 0 230 230'}
      width={globe ? 112 : 36} height={globe ? 102 : 36}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
      onPointerEnter={acknowledge}>
      <defs>
        <clipPath id={id + '-edge'}>
          {globe ? <ellipse cx="160" cy="147" rx="153" ry="137" /> : <circle cx="115" cy="111" r="110" />}
        </clipPath>
        {!globe && <clipPath id={id + '-aircraft'}><path d={aircraft} /></clipPath>}
      </defs>
      <g clipPath={'url(#' + id + '-edge)'}>
        <image href={artwork} width="1254" height="1254"
          x={globe ? -710 : -756} y={globe ? -930 : -725}
          onLoad={() => setLoaded(true)} />
        {!globe && <>
          <path ref={trail} d="M156 142 C174 134 184 115 188 94" pathLength="1"
            fill="none" stroke="#C84836" strokeWidth="2" strokeLinecap="round"
            strokeDasharray="1" style={{ opacity: 0 }} />
          <g ref={plane} data-brand-plane="" style={{ opacity: 0 }} clipPath={'url(#' + id + '-aircraft)'}>
            <rect width="230" height="230" fill="#C84836" />
          </g>
        </>}
      </g>
    </svg>
  )
}
