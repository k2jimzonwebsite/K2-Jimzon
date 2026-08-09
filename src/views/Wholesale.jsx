import { useStore } from '../context/StoreContext'
import { LIFESTYLE } from '../data/site'
import { GhostButton, Kicker, RedButton } from '../components/ui/bits'
import { ArrowIcon, BriefcaseIcon, CheckIcon } from '../components/ui/icons'

const REQUIREMENTS = [
  ['Products and quantities', 'List the exact products, case counts, or recurring volume you expect.'],
  ['Delivery requirement', 'Include your area and when the first supply is needed.'],
  ['Business contact', 'Share the business name and the person staff should coordinate with.'],
]

export default function Wholesale() {
  const { go } = useStore()

  return (
    <main className="pb-24 md:pb-20">
      <section className="border-b border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] overflow-hidden text-navy dark:text-cream">
        <div className="store-section grid min-h-[34rem] gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-16 lg:gap-16">
          <div>
            <Kicker className="flex items-center gap-2 text-crimson dark:text-gold"><BriefcaseIcon size={14} /> Business supply</Kicker>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-[1.02] tracking-tight text-navy dark:text-cream sm:text-5xl lg:text-6xl">Wholesale supply,<br /><em className="font-normal text-crimson dark:text-gold">reviewed by a person.</em></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-navy-soft dark:text-cream/70">For cafés, restaurants, resellers, and other business buyers. K2 verifies case quantities, shared Manila stock, delivery needs, and commercial terms before sending a quote.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="mailto:k2jimzonwebsite@gmail.com?subject=K2%20Jimzon%20Wholesale%20Inquiry" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-crimson px-6 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-crimson-deep active:scale-[0.97]">Email wholesale inquiry <ArrowIcon size={15} /></a>
              <GhostButton onClick={() => go('catalog')} className="px-6">Browse catalog</GhostButton>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[var(--store-surface-border)] shadow-sm">
            <img src={LIFESTYLE.venice} alt="Italy sourcing landscape" className="aspect-[4/3] h-full w-full object-cover opacity-90" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--store-surface-bg)] via-[var(--store-surface-bg)]/80 to-transparent p-6 pt-20">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-crimson dark:text-gold">Current operating model</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-navy-soft dark:text-cream/75">Account pricing and self-serve B2B ordering stay disabled until real approval and server-enforced pricing are ready.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="store-section py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <Kicker>Prepare your inquiry</Kicker>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl">What staff needs to quote clearly.</h2>
            <p className="mt-4 text-sm leading-7 text-navy-soft">A complete first message reduces back-and-forth and makes inventory review more useful.</p>
          </div>
          <ol className="border-t border-line">
            {REQUIREMENTS.map(([title, body], index) => <li key={title} className="grid gap-3 border-b border-line py-6 sm:grid-cols-[3rem_1fr]"><span className="font-serif text-2xl text-blue">0{index + 1}</span><div><h3 className="font-serif text-xl font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-navy-soft">{body}</p></div></li>)}
          </ol>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-y border-line bg-paper py-8 sm:flex-row sm:items-center sm:px-6">
          <p className="flex max-w-xl items-start gap-3 text-sm leading-6 text-navy-soft"><CheckIcon size={17} className="mt-0.5 shrink-0 text-forest" /> Special Italy items for a business can start as a Pasabuy request and be reviewed for an appropriate supply route.</p>
          <RedButton onClick={() => go('pasabuy')}>Request a special item <ArrowIcon size={15} /></RedButton>
        </div>
      </section>
    </main>
  )
}
