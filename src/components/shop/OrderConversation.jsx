import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getOrderConversation, sendOrderMessage, submitOrderReceipt, validateReceipt,
} from '../../services/orderReceiptService'
import { hasFinalOrderCharge } from '../../lib/orderChargeState'

function stamp(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function OrderConversation({ access, chargeFinal = false, onPaymentStatus, onChargeRead }) {
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [messageNotice, setMessageNotice] = useState('')
  const [reference, setReference] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [receiptNotice, setReceiptNotice] = useState('')
  const uploadKey = useRef('')
  const messageKey = useRef('')
  const active = useRef(false)
  const readSequence = useRef(0)
  const [chargeRead, setChargeRead] = useState(false)

  const load = useCallback(async (background = false) => {
    if (!active.current) return
    const sequence = ++readSequence.current
    if (!background) setLoading(true)
    const result = await getOrderConversation(access)
    if (!active.current || sequence !== readSequence.current) return
    if (result.ok) {
      setConversation(result.data)
      setChargeRead(result.data.delivery_review_required === false && hasFinalOrderCharge(result.data))
      onChargeRead?.(result.data)
      onPaymentStatus?.(result.data.payment_status || null)
      setLoadError('')
    } else {
      setChargeRead(false)
      onChargeRead?.(null)
      onPaymentStatus?.(null)
      setLoadError(result.error)
    }
    if (!background) setLoading(false)
  }, [access?.id, access?.accessKey, onPaymentStatus, onChargeRead])

  useEffect(() => {
    active.current = true
    load()
    return () => { active.current = false; readSequence.current += 1 }
  }, [load])
  useEffect(() => {
    if (!conversation) return undefined
    const timer = window.setInterval(() => { if (!document.hidden) load(true) }, 8000)
    return () => window.clearInterval(timer)
  }, [Boolean(conversation), load])

  const send = async (event) => {
    event.preventDefault()
    const content = message.trim()
    if (!content || sending || !conversation) return
    if (!messageKey.current) messageKey.current = crypto.randomUUID()
    setSending(true)
    setMessageNotice('')
    const result = await sendOrderMessage(access, content, messageKey.current)
    setSending(false)
    if (!result.ok) { setMessageNotice(result.error); return }
    messageKey.current = ''
    setMessage('')
    setMessageNotice('Message received by K2 staff.')
    await load(true)
  }

  const upload = async (event) => {
    event.preventDefault()
    if (uploading || !chargeFinal || !chargeRead || !['awaiting_instructions', 'evidence_submitted', 'failed'].includes(conversation?.payment_status)) return
    const validationError = validateReceipt(file, reference)
    if (validationError) { setReceiptNotice(validationError); return }
    if (!uploadKey.current) uploadKey.current = crypto.randomUUID()
    setUploading(true)
    setReceiptNotice('')
    const result = await submitOrderReceipt(access, file, reference, uploadKey.current)
    setUploading(false)
    if (!result.ok) { setReceiptNotice(result.error); return }
    uploadKey.current = ''
    setFile(null)
    setReference('')
    setReceiptNotice('Receipt received for staff review. Payment remains pending until staff verify the funds.')
    await load(true)
  }

  return (
    <section aria-labelledby="order-conversation-title" className="mt-6 rounded-2xl border border-line bg-paper p-5 text-left shadow-sm sm:p-7">
      <h2 id="order-conversation-title" className="font-serif text-xl font-semibold">Your order conversation</h2>
      <p className="mt-2 text-sm leading-6 text-navy-soft">Your order already started this conversation. Write to K2 here whenever you need to ask about the total, transfer, or delivery.</p>
      {loading && <p role="status" className="mt-4 text-sm text-navy-soft">Loading your order messages…</p>}
      {loadError && <p role="alert" className="mt-4 rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-sm text-crimson">{loadError}</p>}
      {conversation && <>
        <div aria-label="Messages about this order" aria-live="polite" className="mt-5 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-line bg-shell p-3">
          {(conversation.messages || []).map((item, index) => <div key={item.id || index} className={`max-w-[92%] rounded-xl p-3 text-sm ${item.direction === 'inbound' ? 'ml-auto bg-crimson text-white' : 'border border-line bg-paper text-navy'}`}>
            <p className="whitespace-pre-wrap break-words">{item.content}</p>
            <p className="mt-1 text-xs opacity-75">{stamp(item.created_at)}</p>
          </div>)}
        </div>
        <form onSubmit={send} className="mt-5">
          <label htmlFor="order-message" className="block text-sm font-semibold">Message K2 about this order</label>
          <textarea id="order-message" className="store-field mt-2 min-h-24 w-full resize-y px-4 py-3 text-base" value={message} onChange={event => { setMessage(event.target.value); messageKey.current = '' }} maxLength={2000} placeholder="Write your message to K2 staff" />
          <button type="submit" disabled={sending || !message.trim()} className="mt-3 min-h-11 rounded-lg bg-crimson px-5 text-sm font-semibold text-white disabled:opacity-45">{sending ? 'Sending…' : 'Send order message'}</button>
          {messageNotice && <p role="status" className="mt-2 text-sm text-navy-soft">{messageNotice}</p>}
        </form>
      </>}
      {conversation && chargeFinal && chargeRead && access.paymentMethod !== 'cod' && ['awaiting_instructions', 'evidence_submitted', 'failed'].includes(conversation.payment_status) && ['submitted', 'confirmed'].includes(conversation.order_status) && <form onSubmit={upload} className="mt-6 border-t border-line pt-5">
        <h3 className="font-serif text-lg font-semibold">Send your e-receipt</h3>
        <p className="mt-1 text-sm leading-6 text-navy-soft">Upload only after K2 staff confirm your exact total and you make the transfer. Your file goes to this order for staff review.</p>
        <label htmlFor="order-payment-reference" className="mt-4 block text-sm font-semibold">Payment reference</label>
        <input id="order-payment-reference" className="store-field mt-2 min-h-11 w-full px-4 text-base" value={reference} onChange={event => { setReference(event.target.value); uploadKey.current = '' }} maxLength={100} placeholder="Transaction or confirmation number" />
        <label htmlFor="order-receipt-file" className="mt-4 block text-sm font-semibold">Upload e-receipt</label>
        <input id="order-receipt-file" type="file" accept="image/png,image/jpeg,application/pdf" className="store-field mt-2 min-h-11 w-full p-2 text-sm" onChange={event => { setFile(event.target.files?.[0] || null); uploadKey.current = '' }} />
        <p className="mt-1 text-xs text-navy-soft">PNG, JPEG or PDF · up to 3 MB · private staff review</p>
        <button type="submit" disabled={uploading} className="mt-4 min-h-11 rounded-lg bg-crimson px-5 text-sm font-semibold text-white disabled:opacity-45">{uploading ? 'Uploading…' : 'Submit receipt for staff review'}</button>
        {receiptNotice && <p role="status" className="mt-3 text-sm text-navy-soft">{receiptNotice}</p>}
      </form>}
    </section>
  )
}
