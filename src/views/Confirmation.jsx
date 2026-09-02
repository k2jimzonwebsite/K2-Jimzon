import { useEffect, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import { CrimsonButton, GhostButton, TrustBadge } from '../components/ui/bits'
import { CheckIcon, InboxIcon } from '../components/ui/icons'
import { guestBffEnabled, listGuestOrders } from '../services/guestCommerceService'

function receiptOrder(saved) {
  return {
    id: saved.public_reference,
    total: Number(saved.total_amount || 0),
    count: Number(saved.item_count || 0),
    wholesale: false,
    status: saved.status,
    paymentStatus: saved.payment_status,
  }
}

export default function Confirmation() {
  const { order, go } = useStore()
  const [restoredOrder, setRestoredOrder] = useState(order)
  const [restoreState, setRestoreState] = useState(order ? 'ready' : 'loading')

  useEffect(() => {
    if (order) {
      setRestoredOrder(order)
      setRestoreState('ready')
      return undefined
    }
    if (!guestBffEnabled()) {
      setRestoreState('unavailable')
      return undefined
    }

    let active = true
    listGuestOrders().then((result) => {
      if (!active) return
      const latest = result.ok && Array.isArray(result.data) ? result.data[0] : null
      if (latest?.public_reference) {
        setRestoredOrder(receiptOrder(latest))
        setRestoreState('ready')
      } else {
        setRestoreState(result.ok ? 'empty' : 'unavailable')
      }
    })
    return () => { active = false }
  }, [order])

  const currentOrder = order || restoredOrder

  if (!currentOrder) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {restoreState === 'loading' ? 'Loading order request' : restoreState === 'empty' ? 'No order request found' : 'Order request status unavailable'}
        </h1>
        <p className="mt-3 text-base text-navy-soft" role={restoreState === 'unavailable' ? 'alert' : undefined}>
          {restoreState === 'loading'
            ? 'Checking the orders authorized for this browser…'
            : restoreState === 'empty'
              ? 'This browser does not have a saved order request.'
              : 'We could not restore a receipt for this browser. Use your reference number when contacting K2 staff.'}
        </p>
        <GhostButton className="mt-6" onClick={() => go('home')}>Back to the catalog</GhostButton>
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
        Reference <span className="font-semibold text-navy">{currentOrder.id}</span>
        {currentOrder.count > 0 && <> · {currentOrder.count} {currentOrder.count === 1 ? 'item' : 'items'}</>}
        {' '}· estimated {peso(currentOrder.total)}
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-paper p-6 text-left shadow-sm sm:p-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-forest">
          <InboxIcon size={16} /> Saved for staff review
        </p>
        <p className="mt-2 text-sm leading-relaxed text-navy-soft">
          No payment was charged. Our staff will check inventory in Manila, calculate exact delivery options, and contact you with payment details.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-navy-soft">
          There is no self-service cancellation or return. Message K2 staff; each request is reviewed case by case.
        </p>
        <ol className="mt-6 space-y-4">
          {[
            ['Request submitted', 'Received'],
            ['Stock and delivery review', 'Next step'],
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
        {guestBffEnabled() && <CrimsonButton onClick={() => go('messages')}>View your messages</CrimsonButton>}
        <GhostButton onClick={() => go('home')}>Continue shopping</GhostButton>
        <GhostButton onClick={() => go('pasabuy')}>Request an item from Italy</GhostButton>
      </div>
      <div className="mt-6 flex justify-center"><TrustBadge>Keep your reference number</TrustBadge></div>
    </main>
  )
}
