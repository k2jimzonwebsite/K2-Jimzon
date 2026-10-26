import { useState } from 'react'
import * as motion from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { LIFESTYLE } from '../../data/site'
import { Kicker } from '../ui/bits'
import { ArrowIcon } from '../ui/icons'

const applyImageFallback = (e) => {
  const img = e?.currentTarget
  if (!img || img.dataset.fb) return
  img.dataset.fb = '1'
  img.src = '/images/placeholder.svg'
}

const STEPS = [
  {
    image: 'market',
    title: 'Sourced directly from Italian shelves',
    coords: 'MILANO · 45°28′ N, 9°11′ E',
    badge: 'Origin Verification',
    body: 'Our personal buyers in Milan shop directly from licensed supermarket chains (Esselunga, Conad, Coop) and regional Italian distributors, securing genuine European goods with original Italian packaging and lot codes.',
  },
  {
    image: 'plane',
    title: 'Freight agreed before purchase',
    coords: 'TRANSIT · MXP ➔ MNL (10,400 KM)',
    badge: 'Quoted sea or air option',
    body: 'For Pasabuy requests, we check availability in Italy and quote the product, the agreed sea or air shipping option, and timing before purchase. Review and approve your quote before we buy.',
  },
  {
    image: 'warehouse',
    title: 'Physical stock inspection & fast doorstep delivery',
    coords: 'MANILA HUB · 14°35′ N, 120°58′ E',
    badge: 'Single Master Inventory',
    body: 'Every box is opened, checked for Best-Before dates, and registered into our single master inventory. When you order, staff verify the physical lot in Manila before issuing your payment QR.',
  },
]

export default function StorySection() {
  const [activeStep, setActiveStep] = useState(0)
  const reducedMotion = useReducedMotion()

  return (
    <section className="store-section relative py-16 md:py-24" aria-labelledby="story-heading">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 items-start">
        <div className="lg:sticky lg:top-32 lg:h-fit">
          {/* Subtle Italian architectural motif */}
          <div className="mb-3 flex items-center gap-2" aria-hidden="true">
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className="text-crimson">
              <line x1="0" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
              <polygon points="12,1 16,6 12,11 8,6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
              <line x1="16" y1="6" x2="24" y2="6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-navy-faint">
              Transit Pipeline
            </span>
          </div>

          <Kicker>The sourcing journey</Kicker>
          <h2 id="story-heading" className="mt-3 max-w-lg font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-navy sm:text-5xl">
            From an Italian shelf straight to your home.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-navy-soft">
            No drop-shipping uncertainty, no near-expiry mystery batches. Every item is physically handled by our own team from Milan to Manila.
          </p>

          {/* Sourcing telemetry strip */}
          <div className="mt-8 rounded-xl border border-line bg-shell/40 p-4 text-xs font-mono text-navy-soft">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <span className="text-[11px] uppercase tracking-wider text-navy-faint">Active Route</span>
              <span className="font-bold text-navy flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-crimson animate-pulse" />
                MXP (Milan) ➔ MNL (Manila)
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-navy-faint">Inventory Model</span>
              <span className="font-semibold text-navy">Single Physical Master Stock</span>
            </div>
          </div>
        </div>

        {/* Steps with connecting vertical SVG trajectory */}
        <div className="relative">
          <ol className="story-journey relative" aria-label="K2 sourcing journey">
            {STEPS.map((step, index) => {
              const isActive = activeStep === index
              const isPassed = activeStep > index
              return (
                <li key={step.title} className="relative pb-10 last:pb-0">
                  {/* Vertical connecting SVG transit line */}
                  {index < STEPS.length - 1 && (
                    <div
                      className="absolute left-[1.125rem] top-12 bottom-0 w-0.5 -translate-x-1/2 sm:left-[1.35rem]"
                      aria-hidden="true"
                    >
                      <svg className="h-full w-2" viewBox="0 0 8 100" preserveAspectRatio="none" fill="none">
                        <line
                          x1="4"
                          y1="0"
                          x2="4"
                          y2="100"
                          stroke={isPassed ? 'var(--color-crimson, #9E2A2B)' : 'currentColor'}
                          strokeOpacity={isPassed ? '0.7' : '0.15'}
                          strokeWidth="2"
                          strokeDasharray={isPassed ? 'none' : '3 3'}
                        />
                      </svg>
                    </div>
                  )}

                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveStep(index)}
                    onFocus={() => setActiveStep(index)}
                    onPointerEnter={(event) => event.pointerType === 'mouse' && setActiveStep(index)}
                    className={`story-step group relative flex w-full items-start gap-4 rounded-2xl border p-5 sm:p-6 text-left transition-all duration-200 active:scale-[0.99] ${
                      isActive
                        ? 'border-crimson/30 bg-[var(--store-surface-bg)] shadow-md'
                        : 'border-line/70 bg-shell/25 hover:border-line hover:bg-shell/45'
                    }`}
                  >
                    {/* Step waypoint beacon badge */}
                    <div className="relative mt-0.5 shrink-0">
                      <div
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full font-serif font-bold text-sm sm:text-base transition-colors ${
                          isActive
                            ? 'bg-crimson text-white shadow-sm'
                            : isPassed
                            ? 'bg-forest/15 text-forest border border-forest/30'
                            : 'bg-shell border border-line text-navy-soft'
                        }`}
                      >
                        0{index + 1}
                      </div>
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-crimson">
                          {step.coords}
                        </span>
                        <span className="rounded bg-line/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-navy-soft">
                          {step.badge}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl font-semibold text-navy leading-snug group-hover:text-crimson transition-colors">
                        {step.title}
                      </h3>

                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-navy-soft">
                        {step.body}
                      </p>
                    </div>

                    {/* Step thumbnail image */}
                    <div className="hidden md:block shrink-0 w-24 h-24 sm:w-28 sm:h-28 overflow-hidden rounded-xl border border-line/60 bg-[var(--product-img-bg)]">
                      <motion.img
                        src={LIFESTYLE[step.image]}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        onError={applyImageFallback}
                        animate={reducedMotion ? undefined : { scale: isActive ? 1.06 : 1 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
