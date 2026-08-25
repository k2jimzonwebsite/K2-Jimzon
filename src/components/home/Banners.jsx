import { useStore } from '../../context/StoreContext'
import { RedButton, GhostButton, Kicker } from '../ui/bits'
import { ArrowIcon, BriefcaseIcon, PlaneIcon } from '../ui/icons'

function PasabuyBanner() {
  const { go } = useStore()
  return (
    <section className="store-section pb-6">
      <div className="store-panel relative overflow-hidden rounded-2xl bg-[var(--store-surface-bg)] border border-[var(--store-surface-border)] px-6 py-9 text-navy sm:px-9 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:px-12 md:py-12">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-gold/20" aria-hidden />
        <div className="absolute -right-5 -top-12 h-44 w-44 rounded-full border border-gold/20" aria-hidden />
        <div className="relative">
          <Kicker className="flex items-center gap-2 text-crimson"><PlaneIcon size={14} /> Pasabuy Requests</Kicker>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight text-navy md:text-4xl">
            Looking for a specific item from Italy? We can source it for you.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-navy-soft">
            Tell us what you need. We check availability in Italian stores and send you a clear quote to approve before we buy.
          </p>
        </div>
        <RedButton onClick={() => go('pasabuy')} className="relative mt-7 px-7 md:mt-0">
          Send a Pasabuy request <ArrowIcon size={15} />
        </RedButton>
      </div>
    </section>
  )
}

function WholesaleStrip() {
  const { go } = useStore()
  return (
    <section className="store-section pb-6">
      <div className="grid gap-6 border-y border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] px-1 py-8 sm:px-6 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-wash text-blue"><BriefcaseIcon size={20} /></span>
        <div>
          <Kicker className="text-blue">Wholesale & Food Service</Kicker>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-navy md:text-3xl">
            Wholesale supply for cafés and restaurants.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-soft">
            Order case packs, whole beans, or pantry staples with volume pricing and regular delivery across Metro Manila.
          </p>
        </div>
        <GhostButton onClick={() => go('wholesale')} className="border-blue/30 text-blue">
          Inquire about wholesale <ArrowIcon size={15} />
        </GhostButton>
      </div>
    </section>
  )
}

export { PasabuyBanner, WholesaleStrip }
