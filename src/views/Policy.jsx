import { useState, useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import { ALL_POLICIES, getPolicyById } from '../data/policies'
import { ArrowIcon, ShieldIcon } from '../components/ui/icons'

export default function Policy() {
  const { view, go } = useStore()
  const initialPolicyId = ['privacy', 'terms', 'returns'].includes(view) ? view : 'privacy'
  const [activeTab, setActiveTab] = useState(initialPolicyId)

  useEffect(() => {
    if (['privacy', 'terms', 'returns'].includes(view)) {
      setActiveTab(view)
    }
  }, [view])

  const currentPolicy = getPolicyById(activeTab)

  return (
    <main className="store-section max-w-4xl pb-24 pt-10 font-sans md:pb-20 md:pt-14" role="main" aria-label="Customer policies and disclosures">
      <div className="flex items-center gap-3">
        <button
          onClick={() => go('catalog')}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-3.5 text-xs font-semibold text-navy hover:text-crimson transition-colors"
          aria-label="Back to catalog"
        >
          <span className="rotate-180 inline-block"><ArrowIcon size={12} /></span> Back to catalog
        </button>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-crimson">Customer Trust & Standards</span>
      </div>

      <h1 className="mt-4 font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-navy">
        {currentPolicy.title}
      </h1>
      <p className="mt-2 text-sm text-navy-soft">
        Authoritative operating guidance for K2 Jimzon · Direct Italian imports · Updated {currentPolicy.lastUpdated}
      </p>

      {/* Policy switcher tabs - 44px minimum hit area */}
      <nav className="mt-8 flex flex-wrap gap-2 border-b border-line pb-4" aria-label="Policy sections">
        {ALL_POLICIES.map((p) => {
          const isActive = p.id === activeTab
          return (
            <button
              key={p.id}
              onClick={() => {
                setActiveTab(p.id)
                go(p.id)
              }}
              className={`min-h-11 rounded-xl px-5 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-crimson text-white shadow-sm'
                  : 'bg-shell/80 border border-line text-navy-soft hover:bg-shell hover:text-navy'
              }`}
              role="tab"
              aria-selected={isActive}
            >
              {p.title.split('&')[0].trim()}
            </button>
          )
        })}
      </nav>

      {/* Policy Summary Callout */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-forest/25 bg-forest/5 p-5">
        <ShieldIcon size={22} className="mt-0.5 shrink-0 text-forest" />
        <div>
          <h2 className="font-serif text-base font-semibold text-navy">Operating Standard</h2>
          <p className="mt-1 text-sm leading-relaxed text-navy-soft">{currentPolicy.summary}</p>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="mt-10 space-y-8" role="tabpanel" aria-label={currentPolicy.title}>
        {currentPolicy.sections.map((section, idx) => (
          <section key={idx} className="rounded-xl border border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] p-6 shadow-sm">
            <h3 className="font-serif text-lg font-semibold text-navy">
              {section.heading}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-navy-soft whitespace-pre-line">
              {section.content}
            </p>
          </section>
        ))}
      </div>

      {/* Footer support prompt */}
      <div className="mt-12 rounded-xl border border-line bg-shell/50 p-6 text-center text-sm text-navy-soft">
        <p className="font-semibold text-navy">Have questions about an order or item care?</p>
        <p className="mt-1 text-xs">Our Manila staff is happy to clarify batch provenance, ingredients, or courier delivery.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => go('contact')}
            className="min-h-11 rounded-lg bg-navy px-5 text-xs font-bold text-cream hover:bg-navy-deep transition-colors"
          >
            Contact Staff
          </button>
          <button
            onClick={() => go('messages')}
            className="min-h-11 rounded-lg border border-line bg-shell px-5 text-xs font-bold text-navy hover:bg-white transition-colors"
          >
            Guest Messages
          </button>
        </div>
      </div>
    </main>
  )
}
