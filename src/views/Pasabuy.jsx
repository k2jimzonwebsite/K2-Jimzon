import { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { RedButton, TrustBadge, TuscanCard, Kicker } from '../components/ui/bits'
import { CheckIcon, PlaneIcon } from '../components/ui/icons'

const STATUS_TONE = {
  'Request received': 'bg-shell text-navy-soft',
  'Quoted — ₱1,850': 'bg-blue-wash text-blue',
  'Buying in Italy': 'bg-crimson/10 text-crimson',
  'In Manila warehouse': 'bg-forest-wash text-forest',
}

export default function Pasabuy() {
  const { requests, addRequest } = useStore()
  const [item, setItem] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!item.trim()) return
    addRequest(item.trim())
    setItem('')
    setSent(true)
    setTimeout(() => setSent(false), 3500)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 md:pb-16">
      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
        {/* Left: pitch + form */}
        <div>
          <Kicker className="rise flex items-center gap-2">
            <PlaneIcon size={14} /> Customer-requested imports
          </Kicker>
          <h1 className="rise mt-3 font-serif text-4xl font-semibold leading-[1.06] tracking-tight md:text-5xl" style={{ animationDelay: '80ms' }}>
            Pasabuy,
            <br />
            <em className="font-normal">without the group chat.</em>
          </h1>
          <p className="rise mt-5 max-w-md text-base leading-relaxed text-navy-soft" style={{ animationDelay: '160ms' }}>
            Tell us what you need from Italy. We quote it within 24 hours, buy it
            ourselves, consolidate it with our monthly shipment, and deliver it to
            your door — tracked at every step.
          </p>

          <form onSubmit={submit} className="rise mt-8 max-w-md" style={{ animationDelay: '240ms' }}>
            <label className="mb-1.5 block text-sm font-semibold">
              What should we bring home for you?
            </label>
            <textarea
              value={item}
              onChange={(e) => setItem(e.target.value)}
              rows={3}
              placeholder={'e.g. "Pan di Stelle biscuits, 3 boxes" or a link to any Italian store'}
              className="w-full resize-none rounded-lg border border-line bg-cream/50 backdrop-blur-sm px-4 py-3 text-base shadow-card placeholder:text-navy-faint focus:border-crimson/60 focus:outline-none"
            />
            <RedButton type="submit" className="mt-3 w-full py-4 text-base" disabled={!item.trim()}>
              Request a quote — free, no commitment
            </RedButton>
            {sent && (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-forest">
                <CheckIcon size={15} /> Request received — quote lands in your inbox within 24 hours.
              </p>
            )}
          </form>

          <div className="mt-8 flex flex-wrap gap-2">
            <TrustBadge>Quoted upfront</TrustBadge>
            <TrustBadge>Bought by us in Italy</TrustBadge>
            <TrustBadge>Flies with our own shipment</TrustBadge>
          </div>
        </div>

        {/* Right: how it works + live request tracker */}
        <div className="space-y-6">
          <TuscanCard tricolor className="rise" style={{ animationDelay: '200ms' }}>
            <div className="p-6">
              <h2 className="font-serif text-lg font-semibold">How it works</h2>
              <ol className="mt-4 space-y-4">
                {[
                  ['You request', 'Name the product, paste a link, or describe it from memory.'],
                  ['We quote in 24h', 'Landed price to your door — item, freight share, nothing hidden.'],
                  ['We buy it in Italy', 'Our own buyers pick it up. It flies with the monthly consignment.'],
                  ['Delivered & tracked', 'Same courier and tracking as any K2 order.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest/10 font-serif text-sm font-semibold text-forest">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-base font-semibold">{title}</p>
                      <p className="text-sm leading-relaxed text-navy-soft">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </TuscanCard>

          <TuscanCard className="rise p-6" style={{ animationDelay: '280ms' }}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-semibold">Your requests</h2>
              <span className="text-xs text-navy-faint">Next flight: 22 Jul, Milan</span>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.item}</p>
                    <p className="text-xs text-navy-faint tabular">{r.id} · {r.eta}</p>
                  </div>
                  <span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ' + (STATUS_TONE[r.status] ?? 'bg-shell text-navy-soft')}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </TuscanCard>
        </div>
      </div>
    </main>
  )
}
