import { useState } from 'react'
import { FAQS } from '../../data/site'
import { Kicker } from '../ui/bits'
import { PlusIcon } from '../ui/icons'

export default function FaqSection() {
  const [open, setOpen] = useState(0)

  return (
    <section className="store-section py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
        <div>
          <Kicker>Good to know</Kicker>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-navy md:text-4xl">Questions, answered honestly.</h2>
          <p className="mt-4 text-sm leading-7 text-navy-soft">Clear expectations now make every later confirmation easier.</p>
        </div>
        <div className="border-t border-line">
          {FAQS.map((faq, index) => {
            const isOpen = open === index
            return (
              <div key={faq.q} data-open={isOpen || undefined} className="faq-item border-b border-line">
                <button
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="faq-trigger flex min-h-16 w-full items-center justify-between gap-5 py-4 text-left"
                >
                  <span className="font-serif text-lg font-semibold text-navy">{faq.q}</span>
                  <span className={`faq-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-navy-soft ${isOpen ? 'rotate-45' : ''}`}><PlusIcon size={15} /></span>
                </button>
                <div id={`faq-answer-${index}`} className={`faq-answer-grid grid ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden"><p className="faq-answer max-w-2xl pb-6 pr-12 text-sm leading-7 text-navy-soft">{faq.a}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
