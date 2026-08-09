import { useId } from 'react'
import { useReducedMotion } from 'motion/react'

// A lightweight editorial route map. It keeps the home bundle small while
// restoring the Milano-to-Manila motion that communicates the sourcing flow.
export default function FlightMap() {
  const reduceMotion = useReducedMotion()
  const routeId = `k2-route-${useId().replace(/:/g, '')}`

  return (
    <svg viewBox="0 0 600 300" className="h-auto w-full text-navy" role="img" aria-label="Animated sourcing route from Milano, Italy to Manila, Philippines">
      <g fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1">
        <path d="M20 75h560M20 150h560M20 225h560" />
        <path d="M110 24v252M220 24v252M330 24v252M440 24v252M550 24v252" />
      </g>

      <g fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1.2">
        <path d="M42 76 70 53l48 7 24 24 38 7 19 26-13 32-34 11-20 33-39-5-18-30-31-17-12-35Z" />
        <path d="m188 53 40-23 57 16 20 28-20 19-17 29-26 7-15 39-29-20-3-34-24-27Z" />
        <path d="m274 72 54-31 75 4 42 22 63 10 45 38-17 25-49 2-21 24-55 5-36 30-38-15-27-35-39-19-23-34Z" />
        <path d="m449 206 42-13 34 14 18 27-24 22-43-8-33-21Z" />
        <path d="m510 158 10 6-5 18-8-12Zm21 19 7 7-4 14-8-9Z" />
      </g>

      <path
        id={routeId}
        d="M205 105 Q355 18 508 190"
        fill="none"
        stroke="var(--color-crimson)"
        strokeWidth="2.4"
        strokeDasharray="2 9"
        strokeLinecap="round"
      >
        {!reduceMotion && <animate attributeName="stroke-dashoffset" values="0;-44" dur="4s" repeatCount="indefinite" />}
      </path>

      {!reduceMotion ? (
        <g data-testid="animated-flight-plane">
          <path d="M9 0 -6-5-1 0-6 5Z" fill="var(--color-crimson-deep)" stroke="var(--store-surface-bg)" strokeWidth="0.7" strokeLinejoin="round" />
          <animateMotion dur="10s" repeatCount="indefinite" rotate="auto" calcMode="linear">
            <mpath href={`#${routeId}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.1;0.5;0.9;1" dur="10s" repeatCount="indefinite" />
        </g>
      ) : (
        <g transform="translate(354 63) rotate(27)">
          <path d="M9 0 -6-5-1 0-6 5Z" fill="var(--color-crimson-deep)" stroke="var(--store-surface-bg)" strokeWidth="0.7" strokeLinejoin="round" />
        </g>
      )}

      <RoutePoint x="205" y="105" labelY="88" label="Milano" color="var(--color-gold)" animate={!reduceMotion} />
      <RoutePoint x="508" y="190" labelY="215" label="Manila" color="var(--color-crimson)" animate={!reduceMotion} />
    </svg>
  )
}

function RoutePoint({ x, y, labelY, label, color, animate }) {
  return (
    <g>
      <circle cx={x} cy={y} r="6" fill={color}>
        {animate && <animate attributeName="r" values="5;10;5" dur="2.8s" repeatCount="indefinite" />}
        {animate && <animate attributeName="opacity" values="1;0.35;1" dur="2.8s" repeatCount="indefinite" />}
      </circle>
      <circle cx={x} cy={y} r="2.5" fill="var(--store-surface-bg)" />
      <text x={x} y={labelY} textAnchor="middle" fill="currentColor" fontFamily="Archivo, Segoe UI, sans-serif" fontSize="15" fontWeight="700">{label}</text>
    </g>
  )
}
