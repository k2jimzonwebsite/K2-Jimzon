import { useState } from 'react'
import { REFERENCE_FIELDS, referenceOptionLabel } from './referenceTables'

const ADD_NEW = '__k2_add_new__'

/**
 * The editor for a foreign-key column in Sheet mode.
 *
 * A dropdown rather than a text box, because the column stores the id of a row
 * in another table: only an id that exists can be valid, and a list is the only
 * control that cannot produce anything else.
 *
 * Choosing "Add new" turns the cell into a single text input. That is
 * deliberately a different mode rather than a free-text field that sometimes
 * creates: typing is how the duplicate risk enters, so it happens only when a
 * person has explicitly asked to create something, never as a side effect of
 * trying to select.
 */
export default function ReferenceSelectCell({ field, value, state, onSelect, onCreate }) {
  const config = REFERENCE_FIELDS[field]
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const { options = [], loading = false, error = '' } = state || {}

  if (loading) {
    return <span className="block px-2.5 py-1.5 font-mono text-sm text-white/40">Loading…</span>
  }

  // An unreadable table is not an empty one. Say so plainly instead of
  // offering a control that cannot work.
  if (error) {
    return (
      <span
        className="block px-2.5 py-1.5 font-mono text-sm text-amber"
        title={`The ${config.noun} list could not be read: ${error}`}
      >
        Unavailable
      </span>
    )
  }

  const submitNew = async () => {
    const name = draft.trim()
    if (!name) { setCreating(false); setDraft(''); return }
    setBusy(true)
    const result = await onCreate(field, name)
    setBusy(false)
    if (!result.ok) {
      setNote(result.error || `The ${config.noun} could not be added.`)
      return
    }
    setCreating(false)
    setDraft('')
    // Reusing an existing row is a success, but a silent one would look like a
    // new entry was made. Name what actually happened.
    setNote(result.reused ? `Matched the existing "${result.name}".` : '')
    await onSelect(result.id)
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-1 p-1">
        <input
          autoFocus
          value={draft}
          disabled={busy}
          onChange={(event) => { setDraft(event.target.value); setNote('') }}
          onBlur={submitNew}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
            if (event.key === 'Escape') { setCreating(false); setDraft(''); setNote('') }
          }}
          placeholder={`New ${config.noun} name`}
          aria-label={`New ${config.noun} name`}
          className="min-h-11 w-full rounded border border-blue/50 bg-adm-sunken px-2 font-mono text-sm text-white outline-none"
        />
        {note && <span className="px-1 text-xs text-amber">{note}</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <select
        value={value || ''}
        onChange={(event) => {
          setNote('')
          if (event.target.value === ADD_NEW) { setCreating(true); return }
          onSelect(event.target.value || null)
        }}
        aria-label={config.noun}
        className="min-h-11 w-full cursor-pointer bg-transparent px-2 font-mono text-sm text-neutral-200 outline-none"
      >
        <option value="">— none —</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {referenceOptionLabel(option, config.secondaryColumn)}
          </option>
        ))}
        <option value={ADD_NEW}>+ Add {config.noun}…</option>
      </select>
      {note && <span className="px-2 pb-1 text-xs text-forest">{note}</span>}
    </div>
  )
}
