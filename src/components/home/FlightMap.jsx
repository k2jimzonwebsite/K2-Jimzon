import { useId, useState } from 'react'
import { useReducedMotion, motion, AnimatePresence } from 'motion/react'

const WAYPOINTS = {
  milano: {
    id: 'milano',
    title: 'Milano Sourcing',
    subtitle: 'Northern Italy',
    detail: 'Bought directly from Italian markets, local shops, and verified wholesale partners in Italy.',
    x: 205,
    y: 105,
  },
  transit: {
    id: 'transit',
    title: 'In Flight & Transit',
    subtitle: 'Air & sea cargo',
    detail: 'Packed carefully to protect freshness in the tropical climate and flown directly to Manila.',
    x: 355,
    y: 65,
  },
  manila: {
    id: 'manila',
    title: 'Manila Hub',
    subtitle: 'Ready to dispatch',
    detail: 'Checked by hand, stored in temperature-controlled spaces, and delivered to your doorstep.',
    x: 508,
    y: 190,
  },
}

export default function FlightMap() {
  const reduceMotion = useReducedMotion()
  const routeId = `k2-route-${useId().replace(/:/g, '')}`
  const [activePoint, setActivePoint] = useState('manila')

  const current = WAYPOINTS[activePoint]

  return (
    <div className="relative">
      <svg viewBox="0 0 600 300" className="h-auto w-full text-navy" role="img" aria-label="Sourcing route from Milano, Italy to Manila, Philippines">
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

        {/* Parabolic flight arc */}
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

        {/* Milano Waypoint */}
        <InteractiveWaypoint
          x={205}
          y={105}
          labelY={88}
          label="Milano"
          isSelected={activePoint === 'milano'}
          onClick={() => setActivePoint('milano')}
          color="var(--color-gold)"
          animate={!reduceMotion}
        />

        {/* Transit Waypoint */}
        <InteractiveWaypoint
          x={355}
          y={65}
          labelY={48}
          label="In Transit"
          isSelected={activePoint === 'transit'}
          onClick={() => setActivePoint('transit')}
          color="var(--color-forest)"
          animate={!reduceMotion}
        />

        {/* Manila Waypoint */}
        <InteractiveWaypoint
          x={508}
          y={190}
          labelY={215}
          label="Manila"
          isSelected={activePoint === 'manila'}
          onClick={() => setActivePoint('manila')}
          color="var(--color-crimson)"
          animate={!reduceMotion}
        />
      </svg>

      {/* Interactive Waypoint Info Drawer */}
      <div className="mt-3 rounded-lg border border-[var(--store-surface-border)] bg-shell/50 p-3 text-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-start justify-between gap-3"
          >
            <div>
              <p className="font-semibold text-navy">
                {current.title} <span className="font-normal text-navy-faint">({current.subtitle})</span>
              </p>
              <p className="mt-0.5 text-navy-soft leading-relaxed">{current.detail}</p>
            </div>
            <span className="shrink-0 rounded bg-navy/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-faint">
              Step {current.id === 'milano' ? '1' : current.id === 'transit' ? '2' : '3'} of 3
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function InteractiveWaypoint({ x, y, labelY, label, color, isSelected, onClick, animate }) {
  return (
    <g onClick={onClick} className="cursor-pointer group">
      <circle cx={x} cy={y} r={isSelected ? 9 : 6} fill={color} className="transition-all duration-200">
        {animate && !isSelected && <animate attributeName="r" values="5;9;5" dur="2.8s" repeatCount="indefinite" />}
        {animate && !isSelected && <animate attributeName="opacity" values="1;0.4;1" dur="2.8s" repeatCount="indefinite" />}
      </circle>
      <circle cx={x} cy={y} r={isSelected ? 3.5 : 2.5} fill="var(--store-surface-bg)" />
      <text
        x={x}
        y={labelY}
        textAnchor="middle"
        fill="currentColor"
        fontFamily="'Source Sans 3', 'Segoe UI', sans-serif"
        fontSize={isSelected ? '15' : '13'}
        fontWeight={isSelected ? '800' : '600'}
        className="transition-all duration-150 group-hover:fill-crimson"
      >
        {label}
      </text>
    </g>
  )
}
