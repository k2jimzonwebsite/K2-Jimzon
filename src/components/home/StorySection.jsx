import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { LIFESTYLE } from '../../data/site'
import { Kicker } from '../ui/bits'

const STEPS = [
  ['market', 'Sourced from Italian shelves', 'Our buyers shop directly in Italian grocery stores, pharmacies, and trusted local markets.'],
  ['plane', 'Flown to Manila', 'Catalog goods and approved Pasabuy items are packed carefully and flown on regular scheduled cargo.'],
  ['warehouse', 'Delivered to your home', 'We inspect every box upon arrival, stock items in Manila, and ship them straight to your doorstep.'],
]

export default function StorySection() {
  const [activeStep, setActiveStep] = useState(0)
  const reducedMotion = useReducedMotion()

  return (
    <section className="store-section py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:h-fit">
          <Kicker>How it works</Kicker>
          <h2 className="mt-3 max-w-lg font-serif text-4xl font-semibold leading-[1.02] tracking-tight text-navy md:text-5xl">
            From an Italian shelf to your kitchen.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-navy-soft">
            Everything you see is backed by real physical inventory in Manila and scheduled sourcing trips to Italy.
          </p>
        </div>

        <ol className="story-journey border-t border-line" aria-label="K2 sourcing journey">
          {STEPS.map(([image, title, body], index) => (
            <li key={title}>
              <button
                type="button"
                aria-pressed={activeStep === index}
                onClick={() => setActiveStep(index)}
                onFocus={() => setActiveStep(index)}
                onPointerEnter={(event) => event.pointerType === 'mouse' && setActiveStep(index)}
                className="story-step group relative grid w-full grid-cols-[2.5rem_1fr] gap-4 border-b border-line py-7 text-left sm:grid-cols-[4rem_10rem_1fr] sm:items-center sm:gap-5 md:py-9"
              >
                <span className="story-step-number font-serif text-3xl font-semibold text-crimson/80">0{index + 1}</span>
                <span className="story-step-image hidden aspect-square w-full overflow-hidden rounded-lg bg-[var(--product-img-bg)] sm:block">
                  <motion.img
                    src={LIFESTYLE[image]}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    animate={reducedMotion ? undefined : { scale: activeStep === index ? 1.045 : 1 }}
                    transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full w-full object-cover"
                  />
                </span>
                <span>
                  <span className="block font-serif text-xl font-semibold text-navy md:text-2xl">{title}</span>
                  <span className="mt-2 block text-sm leading-7 text-navy-soft">{body}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
