import { useCallback, useEffect, useRef, useState } from 'react'
import { prefillCheckoutDetails } from '../../shared/customer-address-book.js'

const initialForm = pending => pending ? { ...pending, name: pending.customerName || '', phone: pending.phone || '',
  street: pending.street || pending.address || '', barangay: pending.barangay || '', city: pending.city || '', address: pending.address || '',
  paymentMethod: pending.paymentMethod || 'gcash', note: (pending.note || '').replace(/^\[Payment: [^\]]+\]\s*/, '') }
  : { name: '', email: '', phone: '', street: '', barangay: '', city: '', address: '', paymentMethod: 'gcash', note: '' }
const fresh = (owner, pending) => ({ owner, form: initialForm(pending), deliveryTouched: Boolean(pending), emailTouched: false,
  selectedId: '', destinationSeed: null, areaVersion: 0 })

export function useCheckoutDetails(account, pendingCheckout) {
  const owner = account?.session?.user?.id || null
  const settings = account?.settingsState?.settings
  const email = account?.session?.user?.email
  const phone = account?.session?.user?.phone
  const [draft, setDraft] = useState(() => fresh(owner, pendingCheckout))
  const currentIdentity = useRef({ owner, pendingCheckout })
  currentIdentity.current = { owner, pendingCheckout }
  // A render for another identity must never expose the previous actor's draft
  // while waiting for an effect. The private held-order snapshot is immutable.
  const forOwner = current => current.owner === owner ? current
    : current.owner === null && owner !== null ? { ...current, owner } : fresh(owner, pendingCheckout)
  const visible = forOwner(draft)
  useEffect(() => {
    setDraft(current => {
      const base = current.owner === owner ? current : current.owner === null && owner !== null ? { ...current, owner } : fresh(owner, pendingCheckout)
      if (pendingCheckout) return { ...base, form: initialForm(pendingCheckout), deliveryTouched: true }
      if (!owner || !settings) return base
      const result = prefillCheckoutDetails(base.form, settings, { email: base.emailTouched ? null : email, phone }, base.deliveryTouched)
      if (base.deliveryTouched) return { ...base, form: result.form }
      const changed = base.selectedId !== result.addressId || JSON.stringify(base.destinationSeed) !== JSON.stringify(result.destination)
      return { ...base, form: result.form, selectedId: result.addressId, destinationSeed: result.destination,
        areaVersion: base.areaVersion + Number(changed) }
    })
  }, [owner, settings, email, phone, pendingCheckout])

  const setForm = useCallback(update => setDraft(current => {
    const identity = currentIdentity.current
    const base = current.owner === identity.owner ? current : current.owner === null && identity.owner !== null
      ? { ...current, owner: identity.owner } : fresh(identity.owner, identity.pendingCheckout)
    return { ...base, form: typeof update === 'function' ? update(base.form) : update }
  }), [])
  const update = key => event => {
    const value = event.target.value
    setDraft(current => {
      const base = forOwner(current), deliveryField = ['name', 'phone', 'address'].includes(key)
      return { ...base, form: { ...base.form, [key]: value }, emailTouched: base.emailTouched || key === 'email',
        deliveryTouched: base.deliveryTouched || deliveryField, selectedId: deliveryField ? '' : base.selectedId }
    })
  }
  const touchArea = () => setDraft(current => ({ ...forOwner(current), deliveryTouched: true, selectedId: '' }))
  const useSavedAddress = id => {
    const address = settings?.addressBook?.addresses?.find(value => value.id === id)
    setDraft(current => {
      const base = forOwner(current)
      return { ...base, form: { ...base.form, name: address?.recipientName || '', phone: address?.phone || '', address: address?.formattedAddress || '' },
        deliveryTouched: true, selectedId: address?.id || '', destinationSeed: address?.destination || null, areaVersion: base.areaVersion + 1 }
    })
  }
  return { form: visible.form, setForm, update, touchArea, useSavedAddress, selectedAddressId: visible.selectedId,
    destinationSeed: visible.destinationSeed, areaSelectionKey: `${owner || 'guest'}:${visible.areaVersion}` }
}
