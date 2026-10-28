import { useRef, useState } from 'react'
import { editableDeliveryAddress, validateAddressBookCommand, validateDeliveryAddress } from '../../../shared/customer-address-book.js'
import { useDeliveryArea } from '../../hooks/useDeliveryArea'
import DeliveryAreaFields from '../DeliveryAreaFields'
import { field, primary, secondary } from './accountUi'

const fieldErrors = { displayName: 'Enter your name for your profile.', label: 'Add a short label, such as Home or Work.',
  recipientName: 'Enter the full name of the person receiving the parcel.', phone: 'Enter a valid mobile number, such as 09… or a full number beginning with +.',
  street: 'Enter the house or unit number and street.', postalCode: 'Use a four-digit Philippine postal code, or leave it blank.',
  landmark: 'Keep the landmark within 120 characters.', destination: 'Choose the complete delivery area, including the barangay.' }

function AddressEditor({ initial, profileName, onSave, onCancel, locked, offline }) {
  const [draft, setDraft] = useState(() => initial || { id: crypto.randomUUID(), label: 'Home', recipientName: profileName || '',
    phone: '', street: '', postalCode: '', landmark: '', destination: null })
  const [ownName, setOwnName] = useState(profileName || '')
  const [error, setError] = useState(null)
  const recipientEdited = useRef(Boolean(initial))
  const area = useDeliveryArea({ initialDestination: initial?.destination || null, enabled: !offline })
  const update = key => event => {
    if (key === 'recipientName') recipientEdited.current = true
    setDraft(current => ({ ...current, [key]: event.target.value })); setError(null)
  }
  const input = (key, label, properties = {}) => <label className="block text-sm font-semibold text-navy" htmlFor={`address-${key}`}>
    {label}<input id={`address-${key}`} className={field} value={draft[key]} onChange={update(key)}
      aria-invalid={error?.field === key || undefined} aria-describedby={error?.field === key ? 'address-field-error' : undefined} {...properties} />
  </label>
  const submit = event => {
    event.preventDefault(); setError(null)
    try {
      const displayName = profileName?.trim() || ownName.trim()
      if (!displayName) throw Object.assign(new Error('REQUEST_INVALID'), { field: 'displayName' })
      const address = validateDeliveryAddress({ ...editableDeliveryAddress(draft), destination: area.destination })
      void onSave(address, displayName)
    } catch (failure) { setError({ field: failure.field, message: fieldErrors[failure.field] || 'Check the address details before saving.' }) }
  }
  return <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
    <fieldset className="min-w-0 space-y-4" disabled={locked || offline}>
      {!profileName && <label htmlFor="address-profile-name" className="block text-sm font-semibold text-navy">Your name
        <input id="address-profile-name" className={field} autoComplete="name" maxLength={140} value={ownName} onChange={event => {
          const value = event.target.value; setOwnName(value)
          if (!recipientEdited.current) setDraft(current => ({ ...current, recipientName: value }))
        }} required />
        <span className="mt-2 block text-sm font-normal text-navy-soft">Used for your profile. Change the recipient below if the parcel is for someone else.</span>
      </label>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {input('label', 'Address label', { maxLength: 40, autoComplete: 'off', required: true })}
        {input('recipientName', 'Recipient full name', { maxLength: 140, autoComplete: 'shipping name', required: true })}
      </div>
      {input('phone', 'Delivery contact number', { type: 'tel', inputMode: 'tel', maxLength: 40, autoComplete: 'shipping tel', required: true })}
      <p className="text-sm leading-6 text-navy-soft">For the recipient or courier to use. This does not change your verified sign-in contact.</p>
      <label htmlFor="address-street" className="block text-sm font-semibold text-navy">House, unit and street
        <textarea id="address-street" className={`${field} min-h-24 resize-y`} value={draft.street} onChange={update('street')}
          maxLength={240} autoComplete="shipping street-address" aria-invalid={error?.field === 'street' || undefined} required />
      </label>
      <DeliveryAreaFields area={area} idPrefix="account-address-area" disabled={locked || offline} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {input('postalCode', 'Postal code (optional)', { maxLength: 4, inputMode: 'numeric', autoComplete: 'shipping postal-code' })}
        {input('landmark', 'Landmark (optional)', { maxLength: 120, autoComplete: 'off' })}
      </div>
    </fieldset>
    {error && <p id="address-field-error" role="alert" className="text-sm font-semibold text-crimson">{error.message}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" className={primary} disabled={locked || offline || area.loading}>{locked ? 'Saving…' : 'Save address'}</button>
      <button type="button" className={secondary} onClick={onCancel} disabled={locked}>Cancel</button>
    </div>
  </form>
}

export default function CustomerDeliveryAddresses({ account, offline, profileName }) {
  const { settingsState } = account
  const book = settingsState.settings?.addressBook
  const [editor, setEditor] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const addresses = book?.addresses || []
  const owner = account.session.user.id
  const activeOwner = useRef(owner)
  activeOwner.current = owner
  if (!book) return null
  const locked = busy || Boolean(pending)

  const send = async (command, message, wasUncertain = false) => {
    if (offline || busy) return
    setBusy(true); setError(''); setNotice(''); setPending({ command, message, uncertain: wasUncertain })
    const result = await account.saveAddressBook(command)
    if (activeOwner.current !== owner) return
    setBusy(false)
    if (result.ok) { setPending(null); setEditor(null); setRemoving(null); setNotice(message); return }
    const definitive = ['ADDRESS_BOOK_INVALID', 'ADDRESS_BOOK_CONFLICT', 'ADDRESS_BOOK_OPERATION_CONFLICT', 'REQUEST_REJECTED'].includes(result.code)
    if (definitive && !wasUncertain) setPending(null)
    else setPending({ command, message, uncertain: true })
    setError(result.error || 'This address change could not be confirmed. Retry the saved change or check your latest addresses.')
  }
  const change = (next, defaultAddressId, displayName, message) => {
    try {
      const command = validateAddressBookCommand({ operation: 'addresses', operationId: crypto.randomUUID(), expectedRevision: book.revision,
        displayName: displayName || settingsState.settings.displayName || profileName, addresses: next.map(editableDeliveryAddress), defaultAddressId })
      void send(command, message)
    } catch { setError('Check your name and address details before saving. You can keep up to ten saved addresses.') }
  }
  const save = (address, displayName) => {
    if (editor.mode === 'edit' && !addresses.some(value => value.id === address.id)) {
      setNotice(''); setError('This address was removed elsewhere. Your draft is still here. Cancel and add it as a new address if needed.'); return
    }
    const next = editor.mode === 'edit' ? addresses.map(value => value.id === address.id ? address : value) : [...addresses, address]
    change(next, book.defaultAddressId || address.id, displayName, 'Address saved.')
  }
  const checkLatest = async () => {
    setBusy(true)
    const result = await account.refreshSettings()
    if (activeOwner.current !== owner) return
    setBusy(false)
    if (!result.ok) { setError(result.error || 'The latest addresses could not be checked. Keep this saved change and try again.'); return }
    const current = result.data?.addressBook
    if (!pending) { setError(''); setNotice('Latest saved addresses loaded. Review your draft before saving.'); return }
    if (!current) return
    const command = pending.command
    let same = false
    try {
      same = current.lastOperationId === command.operationId && current.lastOperationRevision === command.expectedRevision
        && JSON.stringify(current.addresses.map(address => validateDeliveryAddress(editableDeliveryAddress(address)))) === JSON.stringify(command.addresses)
        && current.defaultAddressId === command.defaultAddressId
    } catch { setError('The latest address details could not be verified. Keep this saved change and try again.'); return }
    if (same) { setPending(null); setEditor(null); setRemoving(null); setError(''); setNotice(pending.message) }
    else if (current.revision > command.expectedRevision) {
      setPending(null); setError('A newer address list is saved. Review these latest addresses before making another change.')
    } else setError('This change is still unconfirmed. Retry the original saved change before starting another.')
  }
  return <section aria-labelledby="delivery-addresses-title" className="scroll-mt-32 border-t border-line py-8">
    <h2 id="delivery-addresses-title" className="font-serif text-2xl font-semibold text-navy">Delivery addresses</h2>
    <p className="mt-2 max-w-[65ch] text-sm leading-6 text-navy-soft">Save recipient and delivery details for your next order. Your default is ready at checkout; you still review the current delivery charge. Existing orders keep their submitted details.</p>
    {offline && <p role="status" className="mt-3 text-sm text-navy-soft">Reconnect before changing saved addresses. Your current draft stays here.</p>}
    {!addresses.length && !editor && <p className="mt-4 text-sm leading-6 text-navy-soft">No delivery addresses saved yet. Add one once, then choose it when you shop.</p>}
    <div className="mt-4 divide-y divide-line">{addresses.map(address => <article key={address.id} className="py-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-bold text-navy">{address.label}</h3>{address.id === book.defaultAddressId && <span className="text-sm font-bold text-forest">Default</span>}</div>
      <p className="mt-2 break-words text-sm font-semibold text-navy">{address.recipientName}</p><p className="mt-1 text-sm text-navy-soft">{address.phone}</p>
      <p className="mt-2 max-w-[65ch] break-words text-sm leading-6 text-navy-soft">{address.formattedAddress}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={secondary} disabled={locked || offline} onClick={() => { setEditor({ mode: 'edit', address }); setRemoving(null); setError(''); setNotice('') }}>Edit {address.label}</button>
        {address.id !== book.defaultAddressId && <button type="button" className={secondary} disabled={locked || offline} onClick={() => change(addresses, address.id, null, 'Default address updated.')}>Make {address.label} default</button>}
        <button type="button" className={secondary} disabled={locked || offline} onClick={() => { setRemoving(address.id); setEditor(null); setError('') }}>Remove {address.label}</button>
      </div>
      {removing === address.id && <div className="mt-4" role="group" aria-label={`Remove ${address.label}`}>
        <p className="text-sm leading-6 text-navy-soft">Remove this saved address?{address.id === book.defaultAddressId && addresses.length > 1 ? ` ${addresses.find(value => value.id !== address.id).label} will become your default.` : ''} Submitted orders stay unchanged.</p>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={primary} disabled={locked || offline} onClick={() => {
          const next = addresses.filter(value => value.id !== address.id)
          change(next, address.id === book.defaultAddressId ? next[0]?.id || null : book.defaultAddressId, null, 'Address removed.')
        }}>Confirm removal</button><button type="button" className={secondary} disabled={locked} onClick={() => setRemoving(null)}>Keep address</button></div>
      </div>}
    </article>)}</div>
    {!editor && <button type="button" className={`${secondary} mt-3`} disabled={locked || offline || addresses.length >= 10} onClick={() => { setEditor({ mode: 'add' }); setRemoving(null); setError(''); setNotice('') }}>Add delivery address</button>}
    {editor && <AddressEditor key={editor.address?.id || 'new-address'} initial={editor.address} profileName={settingsState.settings.displayName || profileName}
      locked={locked} offline={offline} onSave={save} onCancel={() => { setEditor(null); setError('') }} />}
    {notice && <p role="status" className="mt-4 text-sm font-semibold text-forest">{notice}</p>}
    {error && <div className="mt-4" role="alert"><p className="text-sm font-semibold text-crimson">{error}</p>
      {pending && <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={primary} disabled={busy || offline} onClick={() => void send(pending.command, pending.message, true)}>Retry saved change</button>
        <button type="button" className={secondary} disabled={busy || offline} onClick={() => void checkLatest()}>Check latest addresses</button></div>}
      {!pending && <button type="button" className={`${secondary} mt-3`} disabled={busy || offline} onClick={() => void checkLatest()}>Check latest addresses</button>}
    </div>}
  </section>
}
