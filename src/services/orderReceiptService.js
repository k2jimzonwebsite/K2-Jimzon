import { getSupabaseClient } from '../lib/lazySupabaseClient'

const LAST_ORDER_KEY = 'k2-last-order-receipt-v1'
const MAX_RECEIPT_BYTES = 3 * 1024 * 1024
const RECEIPT_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf'])

export function saveOrderReceiptAccess(order) {
  try { window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order)) } catch { /* private browser storage */ }
}

export function readOrderReceiptAccess() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LAST_ORDER_KEY) || 'null')
    if (saved?.id && saved?.accessKey && saved?.reference) return saved
  } catch { /* malformed or unavailable storage */ }
  return null
}

export async function getOrderConversation(access) {
  const client = await getSupabaseClient()
  if (!client || !access?.id || !access?.accessKey) return { ok: false, error: 'Order conversation unavailable.' }
  const { data, error } = await client.rpc('get_order_conversation_v1', {
    p_order_id: access.id, p_order_key: access.accessKey,
  })
  if (error || !data?.ok) return { ok: false, error: 'We could not load this order conversation. Please try again.' }
  return { ok: true, data }
}

export async function sendOrderMessage(access, message, requestKey) {
  const client = await getSupabaseClient()
  if (!client || !access?.id || !access?.accessKey) return { ok: false, error: 'Order conversation unavailable.' }
  const { data, error } = await client.rpc('submit_order_message_v1', {
    p_order_id: access.id,
    p_order_key: access.accessKey,
    p_message: message,
    p_request_key: requestKey,
  })
  if (error || !data?.ok) return { ok: false, error: 'Message could not be sent. Please try again.' }
  return { ok: true, data }
}

export function validateReceipt(file, reference) {
  if (!reference?.trim() || reference.trim().length > 100) return 'Enter the payment reference shown on your receipt.'
  if (!file) return 'Choose a receipt image or PDF first.'
  if (!RECEIPT_TYPES.has(file.type)) return 'Use a PNG, JPEG, or PDF receipt.'
  if (file.size < 16 || file.size > MAX_RECEIPT_BYTES) return 'Choose a receipt between 16 bytes and 3 MB.'
  return ''
}

function fileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = () => reject(new Error('READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

export async function submitOrderReceipt(access, file, reference, requestKey) {
  const validationError = validateReceipt(file, reference)
  if (validationError) return { ok: false, error: validationError }
  const client = await getSupabaseClient()
  if (!client || !access?.id || !access?.accessKey) return { ok: false, error: 'Order receipt upload unavailable.' }
  try {
    const base64 = await fileAsBase64(file)
    const { data, error } = await client.rpc('submit_order_payment_receipt_v1', {
      p_order_id: access.id,
      p_order_key: access.accessKey,
      p_payment_reference: reference.trim(),
      p_media_type: file.type,
      p_base64: base64,
      p_request_key: requestKey,
    })
    if (error || !data?.ok) return { ok: false, error: 'Receipt could not be saved. Keep the file and try again.' }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Receipt could not be read. Choose the file again.' }
  }
}
