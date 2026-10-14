import { useState, useMemo } from 'react'
import { FAQS } from '../../data/site'
import { Kicker } from '../ui/bits'
import { PlusIcon, SearchIcon, PhoneIcon, FacebookIcon, ArrowIcon } from '../ui/icons'

const CATEGORIES = [
  'All',
  'Ordering & Stock',
  'Freshness & Dates',
  'Delivery & Pickup',
  'Pasabuy & Flights',
  'Wholesale & B2B',
]

export default function FaqSection() {
  const [open, setOpen] = useState(0)
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFaqs = useMemo(() => {
    return FAQS.filter(faq => {
      const matchesCategory = activeCategory === 'All' || faq.cat === activeCategory
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch = !query || faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  return (
    <section className="store-section py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <div>
          {/* Subtle Italian architectural SVG motif */}
          <div className="mb-3 flex items-center gap-2" aria-hidden="true">
            <svg width="28" height="12" viewBox="0 0 28 12" fill="none" className="text-crimson">
              <path d="M0 6h10M18 6h10" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
              <polygon points="14,1 18,6 14,11 10,6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-navy-faint">
              Transparent Operations
            </span>
          </div>

          <Kicker>Good to know</Kicker>
          <h2 id="faq-heading" className="mt-3 font-serif text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            Questions, answered honestly.
          </h2>
          <p className="mt-4 text-sm leading-7 text-navy-soft">
            Clear expectations on stock reconciliation, expiry dates, delivery rates, and Italian sourcing before you pay.
          </p>

          {/* Search filter input */}
          <div className="relative mt-6 max-w-sm">
            <label htmlFor="faq-search" className="sr-only">Search questions</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-navy-faint">
              <SearchIcon size={16} />
            </div>
            <input
              id="faq-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic (e.g. stock, expiry, GCash)…"
              className="store-field w-full rounded-xl py-2.5 pr-4 pl-10 text-xs sm:text-sm text-navy placeholder:text-navy-faint/70 focus:outline-none"
            />
          </div>

          {/* Quick contact helper box */}
          <div className="mt-8 rounded-2xl border border-line bg-shell/50 p-5 text-xs text-navy-soft">
            <p className="font-semibold text-navy">Need an immediate answer?</p>
            <p className="mt-1 leading-relaxed">
              Our Manila team confirms product lots, expiry dates, and courier quotes directly.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              <a
                href="tel:09318649654"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-1.5 font-bold text-navy hover:text-crimson hover:border-crimson/30 transition-colors"
              >
                <PhoneIcon size={13} className="text-crimson" />
                <span>0931 864 9654</span>
              </a>
              <a
                href="https://www.facebook.com/FamilyPinItaly"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-[var(--store-surface-bg)] px-3 py-1.5 font-bold text-navy hover:text-crimson hover:border-crimson/30 transition-colors"
              >
                <FacebookIcon size={13} className="text-crimson" />
                <span>Family Pin Italy</span>
                <ArrowIcon size={11} className="opacity-60" />
              </a>
            </div>
          </div>
        </div>

        <div>
          {/* Category Filter Pills */}
          <div className="mb-6 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="FAQ categories">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveCategory(cat)
                    setOpen(-1)
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] ${
                    isActive
                      ? 'bg-navy text-white shadow-sm'
                      : 'border border-line bg-[var(--store-surface-bg)] text-navy-soft hover:text-navy hover:border-navy/30'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Accordion list */}
          <div className="divide-y divide-line border-y border-line" role="region" aria-label="Frequently Asked Questions">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => {
                const isOpen = open === index
                return (
                  <div key={faq.q} data-open={isOpen || undefined} className="faq-item">
                    <button
                      onClick={() => setOpen(isOpen ? -1 : index)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${index}`}
                      className="faq-trigger flex min-h-16 w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:text-crimson focus-visible:outline-2 focus-visible:outline-crimson"
                    >
                      <div className="pr-2">
                        {faq.cat && (
                          <span className="mb-1.5 inline-block rounded border border-crimson/20 bg-crimson-wash px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-crimson">
                            {faq.cat}
                          </span>
                        )}
                        <h3 className="font-serif text-base font-semibold text-navy sm:text-lg">
                          {faq.q}
                        </h3>
                      </div>
                      <span
                        className={`faq-icon mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-navy-soft transition-transform duration-200 ease-out ${
                          isOpen ? 'rotate-45 bg-crimson/10 text-crimson border-crimson/30' : ''
                        }`}
                        aria-hidden="true"
                      >
                        <PlusIcon size={14} />
                      </span>
                    </button>
                    <div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${index}`}
                      className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="faq-answer max-w-2xl pt-1 pb-6 pr-8 text-sm leading-relaxed text-navy-soft">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center">
                <p className="font-serif text-lg font-semibold text-navy">No matching questions found.</p>
                <p className="mt-1 text-sm text-navy-soft">Try searching for other terms like &ldquo;shipping&rdquo;, &ldquo;authenticity&rdquo;, or &ldquo;Pasabuy&rdquo;.</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setActiveCategory('All')
                  }}
                  className="mt-4 rounded-lg border border-line px-4 py-2 text-xs font-bold text-navy hover:bg-shell/80"
                >
                  Clear search filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
