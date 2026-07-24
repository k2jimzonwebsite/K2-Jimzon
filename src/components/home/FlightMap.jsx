import { useRef, useState, useLayoutEffect } from 'react'
import World from '@svg-maps/world'

const MAP = World.default || World

// Real world-map flight route: Milano (Italy) → Manila (Philippines).
// We render the actual country vectors, measure Italy's and the Philippines'
// real positions, auto-frame the region between them, and fly a plane along the
// great-circle-style arc. Slow, luxury-paced loop.
export default function FlightMap() {
  const italyRef = useRef(null)
  const phRef = useRef(null)
  const [region, setRegion] = useState(null)

  useLayoutEffect(() => {
    const it = italyRef.current
    const ph = phRef.current
    if (!it || !ph) return
    let a, b
    try { a = it.getBBox(); b = ph.getBBox() } catch { return }
    if (!a.width || !b.width) return

    const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 }
    const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 }

    // Frame both countries (extra room on top for the arc + labels)
    const minX = Math.min(a.x, b.x)
    const maxX = Math.max(a.x + a.width, b.x + b.width)
    const minY = Math.min(a.y, b.y)
    const maxY = Math.max(a.y + a.height, b.y + b.height)
    const w = maxX - minX
    const h = maxY - minY
    const padX = w * 0.14
    const padTop = h * 0.6
    const padBot = h * 0.35
    const vbW = w + padX * 2
    const viewBox = `${minX - padX} ${minY - padTop} ${vbW} ${h + padTop + padBot}`

    // Arc lifted above the straight line for a flight-path feel
    const mx = (start.x + end.x) / 2
    const my = (start.y + end.y) / 2
    const dist = Math.hypot(end.x - start.x, end.y - start.y)
    const arc = `M ${start.x} ${start.y} Q ${mx} ${my - dist * 0.3} ${end.x} ${end.y}`

    setRegion({ viewBox, start, end, arc, s: vbW / 70 })
  }, [])

  const s = region ? region.s : 1

  return (
    <svg
      viewBox={region ? region.viewBox : MAP.viewBox}
      className={`h-auto w-full text-navy transition-opacity duration-700 ${region ? 'opacity-100' : 'opacity-0'}`}
      role="img"
      aria-label="Flight route from Milano, Italy to Manila, Philippines shown on a world map"
    >
      {/* Real country vectors — muted, with Italy & Philippines highlighted */}
      {MAP.locations.map((loc) => {
        const hot = loc.id === 'it' || loc.id === 'ph'
        return (
          <path
            key={loc.id}
            ref={loc.id === 'it' ? italyRef : loc.id === 'ph' ? phRef : undefined}
            d={loc.path}
            fill={hot ? '#D4AF37' : 'currentColor'}
            fillOpacity={hot ? 0.92 : 0.09}
            stroke="currentColor"
            strokeOpacity={0.14}
            strokeWidth={0.4}
          />
        )
      })}

      {region && (
        <>
          <path id="k2-route" d={region.arc} fill="none" stroke="#B91C1C" strokeWidth={s * 0.5}
            strokeDasharray={`${s * 0.6} ${s * 2.4}`} strokeLinecap="round" strokeOpacity={0.85} />

          {/* Milano */}
          <circle cx={region.start.x} cy={region.start.y} r={s * 1.3} fill="#D4AF37">
            <animate attributeName="r" values={`${s};${s * 2.2};${s}`} dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={region.start.x} cy={region.start.y} r={s * 0.7} fill="#B59226" />
          <text x={region.start.x} y={region.start.y - s * 2.2} textAnchor="middle" fill="currentColor"
            fontFamily="Fraunces, Georgia, serif" fontWeight="600" fontSize={s * 2}>Milano 🇮🇹</text>

          {/* Manila */}
          <circle cx={region.end.x} cy={region.end.y} r={s * 1.3} fill="#EF4444">
            <animate attributeName="r" values={`${s};${s * 2.2};${s}`} dur="2.6s" begin="1.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
          </circle>
          <circle cx={region.end.x} cy={region.end.y} r={s * 0.7} fill="#B91C1C" />
          <text x={region.end.x} y={region.end.y + s * 3.4} textAnchor="middle" fill="currentColor"
            fontFamily="Fraunces, Georgia, serif" fontWeight="600" fontSize={s * 2}>Manila 🇵🇭</text>

          {/* The plane, flying the real route on a slow loop */}
          <g>
            <g transform={`scale(${s})`}>
              <path d="M2 0 L-1.3 -1.1 L-0.3 0 L-1.3 1.1 Z" fill="#B91C1C" stroke="#FFFDF9" strokeWidth={0.12} strokeLinejoin="round" />
            </g>
            <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" calcMode="linear">
              <mpath href="#k2-route" xlinkHref="#k2-route" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.1;0.5;0.9;1" dur="16s" repeatCount="indefinite" />
          </g>
        </>
      )}
    </svg>
  )
}
