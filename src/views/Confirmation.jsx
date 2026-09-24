import { useEffect, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import { CrimsonButton, GhostButton, TrustBadge } from '../components/ui/bits'
import { CheckIcon, InboxIcon } from '../components/ui/icons'
import { guestBffEnabled, listGuestOrders } from '../services/guestCommerceService'

function receiptOrder(saved) {
  let paymentMethod = null
  try { paymentMethod = window.localStorage.getItem(`k2-payment-choice:${saved.public_reference}`) } catch { /* browser storage may be unavailable */ }
  return {
    id: saved.public_reference,
    total: Number(saved.total_amount || 0),
    count: Number(saved.item_count || 0),
    wholesale: false,
    status: saved.status,
    paymentStatus: saved.payment_status,
    paymentMethod,
  }
}

export default function Confirmation() {
  const { order, go, openStoreChat } = useStore()
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
  const [chosenMethod, setChosenMethod] = useState(order?.paymentMethod || 'gcash')

  useEffect(() => {
    if (currentOrder?.paymentMethod) setChosenMethod(currentOrder.paymentMethod)
  }, [currentOrder?.paymentMethod])

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
          No payment was charged. Our staff will verify inventory in Manila, review your order and total, and contact you before you transfer.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-navy-soft">
          There is no self-service cancellation or return. Message K2 staff; each request is reviewed case by case.
        </p>
        <ol className="mt-6 space-y-4">
          {[
            ['Request submitted', 'Received'],
            ['Stock and order review', 'Next step'],
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

      {currentOrder.paymentStatus !== 'verified' && currentOrder.paymentMethod !== 'cod' && (
        <section aria-labelledby="payment-qr-title" className="mt-6 rounded-2xl border border-line bg-paper p-5 text-left shadow-sm sm:p-7">
          <h2 id="payment-qr-title" className="font-serif text-xl font-semibold">Pay by QR transfer</h2>
          <p className="mt-2 text-base text-navy-soft">Wait for K2 staff to confirm your order and exact total before sending money. Include reference <strong className="text-navy">{currentOrder.id}</strong> when you send your receipt to staff.</p>
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Choose where to pay</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {[['gcash', 'GCash'], ['maribank', 'MariBank']].map(([method, label]) => (
                <label key={method} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-base font-semibold ${chosenMethod === method ? 'border-crimson bg-crimson/[0.03]' : 'border-line'}`}>
                  <input type="radio" name="payment-qr" value={method} checked={chosenMethod === method} onChange={() => setChosenMethod(method)} className="accent-crimson" />{label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className={`mx-auto mt-5 aspect-square w-full max-w-[360px] overflow-hidden rounded-xl border border-line bg-white ${chosenMethod === 'maribank' ? 'payment-qr-maribank' : 'payment-qr-gcash'}`} role="img" aria-label={`${chosenMethod === 'maribank' ? 'MariBank' : 'GCash'} receiving QR code`} />
          <a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-crimson underline underline-offset-4" href={`/payment/${chosenMethod === 'maribank' ? 'maribank' : 'gcash'}-receive.png`} target="_blank" rel="noopener noreferrer">Open original QR image</a>
          <p className="mt-3 text-sm text-navy-soft">After transferring, send your payment reference and receipt to K2 staff. Payment remains pending until a separate staff reviewer confirms the funds in the receiving account.</p>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {guestBffEnabled() ? (
          <CrimsonButton onClick={() => go('messages')}>View your messages</CrimsonButton>
        ) : (
          <CrimsonButton onClick={() => openStoreChat?.({ origin: 'order_confirmation', question: currentOrder?.id ? `Hi K2, I have a question regarding my order ${currentOrder.id}.` : 'Hi K2, I have a question regarding my order.' })}>
            Chat with staff about this order
          </CrimsonButton>
        )}
        <GhostButton onClick={() => go('home')}>Continue shopping</GhostButton>
        <GhostButton onClick={() => go('pasabuy')}>Request an item from Italy</GhostButton>
      </div>
      <div className="mt-6 flex justify-center"><TrustBadge>Keep your reference number</TrustBadge></div>
    </main>
  )
}
