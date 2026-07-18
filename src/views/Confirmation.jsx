import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import { CrimsonButton, GhostButton, TrustBadge } from '../components/ui/bits'
import { CheckIcon, SyncIcon } from '../components/ui/icons'

export default function Confirmation() {
  const { order, go } = useStore()

  if (!order) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-base text-navy-soft">Your pantry is missing out on all the Italian goodness. Let's fix that.</p>
        <GhostButton className="mt-6" onClick={() => go('home')}>Back to the shop</GhostButton>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-24 pt-14 text-center md:pb-16">
      <div className="rise mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest text-white shadow-float relative before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-forest/40">
        <CheckIcon size={30} className="relative z-10" />
      </div>
      <h1 className="rise mt-5 font-serif text-3xl font-semibold tracking-tight" style={{ animationDelay: '80ms' }}>
        Payment received
      </h1>
      <p className="rise mt-2 text-base text-navy-soft" style={{ animationDelay: '140ms' }}>
        Order <span className="font-semibold text-navy">{order.id}</span> · {order.count}{' '}
        {order.count === 1 ? 'item' : 'items'} · {peso(order.total)}
        {order.wholesale && ' · wholesale'}
      </p>

      <div className="rise mt-8 rounded-3xl border border-line bg-cream/90 backdrop-blur-md p-6 text-left shadow-card" style={{ animationDelay: '200ms' }}>
        <h2 className="font-serif text-base font-semibold">Your order</h2>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-forest">
          <SyncIcon size={15} /> Stock updated across every channel
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-navy-soft">
          Shopee, Lazada, the website, and the wholesale portal now show the same
          counts. Nobody had to edit a spreadsheet.
        </p>

        <ol className="mt-6 space-y-0">
          {[
            ['Packing at the Manila warehouse', 'Today, within 4 hours', true],
            ['Handed to courier', 'Tomorrow morning', false],
            ['Delivered', 'Metro Manila: 1–2 days', false],
          ].map(([label, when, active], i, arr) => (
            <li key={label} className="relative flex gap-4 pb-6 last:pb-0">
              {i < arr.length - 1 && (
                <span className="absolute left-[7px] top-5 h-full w-px bg-line" aria-hidden="true" />
              )}
              <span
                className={
                  'relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ' +
                  (active ? 'border-forest bg-forest' : 'border-line bg-paper')
                }
              />
              <div>
                <p className={'text-base font-semibold ' + (active ? '' : 'text-navy-soft')}>{label}</p>
                <p className="text-sm text-navy-faint">{when}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rise mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: '260ms' }}>
        <CrimsonButton onClick={() => go('home')}>Continue shopping</CrimsonButton>
        <GhostButton onClick={() => go('admin')}>See it land in the admin board</GhostButton>
      </div>
      <div className="mt-6 flex justify-center">
        <TrustBadge>Official receipt sent to your email</TrustBadge>
      </div>
    </main>
  )
}
