import { useEffect, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import { CrimsonButton, GhostButton, TrustBadge } from '../components/ui/bits'
import { CheckIcon, InboxIcon } from '../components/ui/icons'
import { guestBffEnabled, listGuestOrders } from '../services/guestCommerceService'
import { readOrderReceiptAccess } from '../services/orderReceiptService'
import OrderConversation from '../components/shop/OrderConversation'

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
  const [remotePaymentStatus, setRemotePaymentStatus] = useState(null)

  useEffect(() => {
    if (order) {
      setRestoredOrder(order)
      setRestoreState('ready')
      return undefined
    }
    if (!guestBffEnabled()) {
      const saved = readOrderReceiptAccess()
      if (saved) {
        setRestoredOrder({ id: saved.reference, orderId: saved.id, accessKey: saved.accessKey,
          total: saved.total, count: saved.count, status: saved.status,
          paymentStatus: saved.paymentStatus, paymentMethod: saved.paymentMethod })
        setRestoreState('ready')
      } else setRestoreState('unavailable')
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
  const paymentStatus = remotePaymentStatus || currentOrder?.paymentStatus
  const paymentMethod = currentOrder?.paymentMethod
  const hasReceivingMethod = paymentMethod === 'gcash' || paymentMethod === 'maribank'
  const savedAccess = readOrderReceiptAccess()
  const orderAccess = currentOrder?.orderId && currentOrder?.accessKey
    ? { id: currentOrder.orderId, accessKey: currentOrder.accessKey, paymentMethod }
    : savedAccess?.reference === currentOrder?.id ? savedAccess : null

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

      {paymentStatus !== 'verified' && currentOrder.paymentMethod !== 'cod' && (
        <section aria-labelledby="payment-qr-title" className="mt-6 rounded-2xl border border-line bg-paper p-5 text-left shadow-sm sm:p-7">
          <h2 id="payment-qr-title" className="font-serif text-xl font-semibold">Pay by QR transfer</h2>
          <p className="mt-2 text-base text-navy-soft">Wait for K2 staff to confirm your order and exact total before sending money. Include reference <strong className="text-navy">{currentOrder.id}</strong> when you send your receipt to staff.</p>
          {hasReceivingMethod ? <>
            <p className="mt-5 text-sm font-semibold text-navy">Selected at checkout: {paymentMethod === 'maribank' ? 'MariBank' : 'GCash'}</p>
            <img className="mx-auto mt-5 h-auto w-full max-w-[360px] rounded-xl border border-line bg-white" src={`/payment/${paymentMethod}-receive-crop.png`} alt={`${paymentMethod === 'maribank' ? 'MariBank' : 'GCash'} receiving QR code and account details`} width={paymentMethod === 'maribank' ? 699 : 541} height={paymentMethod === 'maribank' ? 840 : 811} />
            <a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-crimson underline underline-offset-4" href={`/payment/${paymentMethod}-receive-crop.png`} target="_blank" rel="noopener noreferrer">Open larger QR image</a>
          </> : <p className="mt-5 rounded-xl border border-amber-600/30 bg-amber-50 p-4 text-sm leading-6 text-navy" role="status"><strong>Payment method unavailable.</strong> Ask K2 staff to confirm the receiving account before transferring. Your order request is still saved.</p>}
          <p className="mt-3 text-sm text-navy-soft">After transferring, upload your e-receipt and payment reference below. Payment remains pending until a separate staff reviewer confirms the funds in the receiving account.</p>
        </section>
      )}

      {orderAccess && !guestBffEnabled() && <OrderConversation access={orderAccess} onPaymentStatus={setRemotePaymentStatus} />}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {guestBffEnabled() ? (
          <CrimsonButton onClick={() => go('messages')}>View your messages</CrimsonButton>
        ) : !orderAccess ? (
          <CrimsonButton onClick={() => openStoreChat?.({ origin: 'order_confirmation', question: currentOrder?.id ? `Hi K2, I have a question regarding my order ${currentOrder.id}.` : 'Hi K2, I have a question regarding my order.' })}>
            Chat with staff about this order
          </CrimsonButton>
        ) : null}
        <GhostButton onClick={() => go('home')}>Continue shopping</GhostButton>
        <GhostButton onClick={() => go('pasabuy')}>Request an item from Italy</GhostButton>
      </div>
      <div className="mt-6 flex justify-center"><TrustBadge>Keep your reference number</TrustBadge></div>
    </main>
  )
}
