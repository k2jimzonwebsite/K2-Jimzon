import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import { CrimsonButton, GhostButton, TrustBadge } from '../components/ui/bits'
import { CheckIcon, InboxIcon } from '../components/ui/icons'
import { guestBffEnabled } from '../services/guestCommerceService'

export default function Confirmation() {
  const { order, go } = useStore()

  if (!order) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-base text-navy-soft">There is no current order request.</p>
        <GhostButton className="mt-6" onClick={() => go('home')}>Back to the shop</GhostButton>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-14 text-center md:pb-20 md:pt-20">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest text-white shadow-card">
        <CheckIcon size={30} />
      </div>
      <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight">Order request received</h1>
      <p className="mt-2 text-base text-navy-soft">
        Reference <span className="font-semibold text-navy">{order.id}</span> · {order.count}{' '}
        {order.count === 1 ? 'item' : 'items'} · estimated {peso(order.total)}
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-paper p-6 text-left shadow-sm sm:p-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-forest">
          <InboxIcon size={16} /> Saved for staff review
        </p>
        <p className="mt-2 text-sm leading-relaxed text-navy-soft">
          No payment was taken and stock has not been reserved yet. K2 staff will verify availability, confirm the final total, and contact you with the next step.
        </p>
        <ol className="mt-6 space-y-4">
          {[
            ['Request submitted', 'Complete'],
            ['Stock and delivery review', 'Next'],
            ['Payment instructions', 'After confirmation'],
            ['Packing and courier handoff', 'After payment verification'],
          ].map(([label, state], index) => (
            <li key={label} className="flex gap-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-forest text-white' : 'border border-line bg-paper text-navy-soft'}`}>
                {index + 1}
              </span>
              <div><p className="text-base font-semibold">{label}</p><p className="text-sm text-navy-soft">{state}</p></div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {guestBffEnabled() && <CrimsonButton onClick={() => go('messages')}>Open secure messages</CrimsonButton>}
        <GhostButton onClick={() => go('home')}>Continue shopping</GhostButton>
        <GhostButton onClick={() => go('pasabuy')}>Request an Italy item</GhostButton>
      </div>
      <div className="mt-6 flex justify-center"><TrustBadge>Keep your reference number</TrustBadge></div>
    </main>
  )
}
