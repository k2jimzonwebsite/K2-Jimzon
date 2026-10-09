import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { peso } from '../data/products'
import { CrimsonButton, GhostButton, TrustBadge } from '../components/ui/bits'
import { CheckIcon, InboxIcon } from '../components/ui/icons'
import { acceptGuestExpressDelivery, guestBffEnabled, listGuestOrders } from '../services/guestCommerceService'
import { readOrderReceiptAccess } from '../services/orderReceiptService'
import OrderConversation from '../components/shop/OrderConversation'
import { hasFinalOrderCharge } from '../lib/orderChargeState'
import ExpressDeliveryApproval from '../components/shop/ExpressDeliveryApproval'

function receiptOrder(saved) {
  let paymentMethod = null
  try { paymentMethod = window.localStorage.getItem(`k2-payment-choice:${saved.public_reference}`) } catch { /* browser storage may be unavailable */ }
  return {
    id: saved.public_reference,
    total: hasFinalOrderCharge(saved) ? Number(saved.total_amount) : null,
    shippingQuoteStatus: saved.shipping_quote_status,
    deliveryReviewRequired: saved.delivery_review_required,
    count: Number(saved.item_count || 0),
    wholesale: false,
    status: saved.status,
    paymentStatus: saved.payment_status,
    paymentMethod,
    expressQuote: saved.express_quote,
  }
}

export default function Confirmation() {
  const { order, go, openStoreChat } = useStore()
  const [restoredOrder, setRestoredOrder] = useState(order)
  const [restoreState, setRestoreState] = useState(order ? 'ready' : 'loading')
  const [remotePaymentStatus, setRemotePaymentStatus] = useState(null)
  const [refreshError, setRefreshError] = useState('')
  const [chargeRead, setChargeRead] = useState(null)
  const readSequence = useRef(0)
  const refresh = useCallback(async () => {
    const sequence = ++readSequence.current
    setChargeRead(null)
    const result = await listGuestOrders()
    if (sequence !== readSequence.current) return
    const rows = result.ok && Array.isArray(result.data) ? result.data : []
    const ref = order?.id || restoredOrder?.id
    const saved = ref ? rows.find(row => row.public_reference === ref) : rows[0]
    if (!saved) { setRefreshError(result.error || 'This order could not be refreshed. Its saved reference is kept.'); return }
    setRestoredOrder(current => ({ ...(current || order), ...receiptOrder(saved) }))
    setChargeRead(saved.delivery_review_required === false ? saved.public_reference : null)
    setRemotePaymentStatus(null); setRefreshError(''); setRestoreState('ready')
  }, [order, restoredOrder?.id])

  useEffect(() => {
    const sequence = ++readSequence.current
    setChargeRead(null)
    setRemotePaymentStatus(null)
    setRefreshError('')
    if (order) {
      setRestoredOrder(order)
      setRestoreState('ready')
    }
    if (!guestBffEnabled()) {
      const saved = readOrderReceiptAccess()
      if (saved) {
        setRestoredOrder({ id: saved.reference, orderId: saved.id, accessKey: saved.accessKey,
          total: saved.total, count: saved.count, status: saved.status,
          paymentStatus: saved.paymentStatus, paymentMethod: saved.paymentMethod,
          shippingQuoteStatus: saved.shippingQuoteStatus })
        setRestoreState('ready')
      } else setRestoreState('unavailable')
      return undefined
    }

    let active = true
    listGuestOrders().then((result) => {
      if (!active || sequence !== readSequence.current) return
      const rows = result.ok && Array.isArray(result.data) ? result.data : []
      const latest = order?.id ? rows.find(row => row.public_reference === order.id) : rows[0]
      if (latest?.public_reference) {
        setRestoredOrder({ ...order, ...receiptOrder(latest) })
        setChargeRead(latest.delivery_review_required === false ? latest.public_reference : null)
        setRestoreState('ready')
      } else {
        if (order) setRefreshError(result.error || 'This order could not be refreshed. Its saved reference is kept.')
        if (!order) setRestoreState(result.ok ? 'empty' : 'unavailable')
      }
    })
    return () => { active = false; readSequence.current += 1 }
  }, [order])

  const currentOrder = order && restoredOrder?.id !== order.id ? order : restoredOrder || order
  const paymentStatus = remotePaymentStatus || currentOrder?.paymentStatus
  const paymentMethod = currentOrder?.paymentMethod
  const hasReceivingMethod = paymentMethod === 'gcash' || paymentMethod === 'maribank'
  const reviewRequired = currentOrder?.deliveryReviewRequired === true
  const pendingDelivery = chargeRead !== currentOrder?.id || !hasFinalOrderCharge(currentOrder)
  const readConversationCharge = useCallback(saved => {
    if (!saved || saved.public_reference !== currentOrder?.id) { setChargeRead(null); return }
    setRestoredOrder(current => ({ ...current, total: hasFinalOrderCharge(saved) ? Number(saved.total_amount) : null,
      shippingQuoteStatus: saved.shipping_quote_status, deliveryReviewRequired: saved.delivery_review_required,
      status: saved.order_status, paymentStatus: saved.payment_status }))
    setChargeRead(saved.delivery_review_required === false ? saved.public_reference : null)
  }, [currentOrder?.id])
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
        {' '}· {reviewRequired ? 'Total needs staff review' : pendingDelivery ? 'Delivery quote pending — no final total yet' : `total ${peso(currentOrder.total)}`}
      </p>

      {guestBffEnabled() && <><GhostButton className="mt-4" onClick={refresh}>Refresh order status</GhostButton>
        {refreshError && <p className="mt-3 text-base text-crimson" role="alert">{refreshError}</p>}
        {!reviewRequired && (currentOrder.expressQuote || currentOrder.shippingQuoteStatus === 'pending_quote') && <ExpressDeliveryApproval
          key={currentOrder.id} reference={currentOrder.id} quote={currentOrder.expressQuote} identity="guest"
          onSubmit={acceptGuestExpressDelivery} onRefresh={refresh}
          onAccepted={receipt => { setRestoredOrder(current => ({ ...current, total: receipt.totalAmount, shippingQuoteStatus: receipt.shippingQuoteStatus })); return refresh() }} />}
      </>}

      <div className="mt-8 rounded-2xl border border-line bg-paper p-6 text-left shadow-sm sm:p-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-forest">
          <InboxIcon size={16} /> Saved for staff review
        </p>
        <p className="mt-2 text-sm leading-relaxed text-navy-soft">
          {reviewRequired ? 'This order needs staff review before its total can be confirmed. Your recorded payment history is kept. Message K2 staff before transferring money.' : 'No payment was charged. Our staff will verify inventory in Manila, review your order and total, and contact you before you transfer.'}
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

      {!pendingDelivery && ['submitted', 'confirmed'].includes(currentOrder.status) && paymentStatus === 'awaiting_instructions' && currentOrder.paymentMethod !== 'cod' && (
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

      {orderAccess && !guestBffEnabled() && <OrderConversation key={`${orderAccess.id}:${orderAccess.accessKey}`} access={orderAccess} chargeFinal={!pendingDelivery} onPaymentStatus={setRemotePaymentStatus} onChargeRead={readConversationCharge} />}

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
