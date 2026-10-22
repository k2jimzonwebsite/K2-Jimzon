import { useEffect, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { getAdminProductFamiliesBff } from '../../services/adminBffService'
import { cleanFamilyText, validateFamilyPayload } from '../../lib/productFamilies'
import { validFamilyRead } from '../../lib/productFamilyRecovery'
import { primaryButton, secondaryButton } from './AdminWorkspaceUi'

const displayProductStatus = status => status === 'Active' ? 'Live' : status

export function PendingProductFamilyDecision({ recovery, onReview }) {
  if (!recovery.pending && !recovery.storageBlocked) return null
  return <section aria-label="Pending product variations" className="space-y-3 border-b border-adm-line py-4">
    <h2 className="text-lg font-semibold text-white">Pending product variations</h2>
    {recovery.pending ? <><p className="text-sm text-white/80">The original grouping is saved in this browser until its outcome is confirmed.</p>
      <button type="button" className={secondaryButton} onClick={onReview}>Review pending product variations</button></>
      : <p role="alert" className="text-sm text-crimson">{recovery.error}</p>}
  </section>
}

export default function ProductFamilyEditor({ selectedSkus, actorId, canManageProducts, recovery, onClose, onSaved }) {
  const [family, setFamily] = useState(null), [familyId, setFamilyId] = useState(''), [name, setName] = useState('')
  const [axes, setAxes] = useState([]), [members, setMembers] = useState([]), [newAxis, setNewAxis] = useState('')
  const [loading, setLoading] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const generation = useRef(0), currentScope = useRef(null), baseline = useRef(null)
  const selectionKey = selectedSkus.join(',')
  if (currentScope.current?.actorId !== actorId || currentScope.current?.selectionKey !== selectionKey || currentScope.current?.canManageProducts !== canManageProducts) currentScope.current = { actorId, selectionKey, canManageProducts }
  const saved = recovery.pending ? JSON.parse(recovery.pending.payloadText) : null
  const draftState = JSON.stringify({ familyId, name, axes, members, newAxis })
  const hasUnsavedDraft = ready && !saved && baseline.current !== draftState
  const requestClose = () => {
    if (hasUnsavedDraft && !window.confirm('Discard your unsaved product variation edits? Closing now will lose these changes.')) return
    onClose()
  }
  const applyRead = read => {
    const nextFamilyId = read.family?.id || crypto.randomUUID()
    const nextName = read.family?.name || ''
    const nextAxes = read.family?.axes || []
    const rows = new Map((read.family?.members || []).map(member => [member.sku, member]))
    for (const product of read.products) if (!rows.has(product.sku)) rows.set(product.sku, {
      sku: product.sku, name: product.name, status: product.status, websiteStatus: product.websiteStatus, options: {},
    })
    const nextMembers = [...rows.values()]
    baseline.current = JSON.stringify({ familyId: nextFamilyId, name: nextName, axes: nextAxes, members: nextMembers, newAxis: '' })
    setFamily(read.family); setFamilyId(nextFamilyId); setName(nextName)
    setAxes(nextAxes); setNewAxis(''); setMembers(nextMembers); setReady(true)
  }
  const load = async () => {
    const scope = currentScope.current, sequence = ++generation.current
    setLoading(true); setReady(false); setError('')
    const read = await getAdminProductFamiliesBff(selectedSkus)
    if (scope !== currentScope.current || sequence !== generation.current) return
    setLoading(false)
    if (!validFamilyRead(read, selectedSkus)) { setError(read.error || 'The complete grouping could not be loaded. Retry before making a decision.'); return }
    applyRead(read)
  }
  useEffect(() => {
    if (!recovery.pending && canManageProducts && selectedSkus.length) void load()
    return () => { generation.current++ }
  }, [actorId, selectionKey, canManageProducts])
  const blocked = !canManageProducts || loading || recovery.working || recovery.storageBlocked || !!saved || !ready
  const finish = result => {
    if (result.ok) { onSaved(); onClose() }
    else if (result.nonApplied) { applyRead(result.snapshot); setNotice('The previous grouping did not apply. Review these current members before saving a new decision.') }
  }
  const save = async (ungroup = false) => {
    if (blocked) return
    try {
      const body = { familyId, expectedVersion: family?.version || 0, name: ungroup ? (family?.name || name) : cleanFamilyText(name), axes: ungroup ? [] : axes,
        members: ungroup ? [] : members.map(member => ({ sku: member.sku, options: Object.fromEntries(axes.map(axis => [axis, cleanFamilyText(member.options[axis])])) })) }
      if (!ungroup && !body.members.length) throw Error()
      validateFamilyPayload(body); setError(''); finish(await recovery.save(body))
    } catch { setError('Enter a mother product name and a value for every SKU and variation type. Use unique combinations and one consistent spelling for each value.') }
  }
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
    <AdminDialog onClose={requestClose} closeDisabled={recovery.working} labelledBy="product-family-title">
      <div className="max-h-[90dvh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:rounded-adm">
        <div className="flex items-start justify-between gap-4"><h2 id="product-family-title" className="text-xl font-semibold">Product variations</h2><button type="button" className={secondaryButton} disabled={recovery.working} onClick={requestClose}>Close</button></div>
        <p className="text-sm text-white/80">Group related SKUs for customers. Each keeps its own price, stock and product details. Only variation types with different values appear in the storefront.</p>
        {!canManageProducts && <p role="alert" className="text-sm text-crimson">Only the original Admin or SuperAdmin can resolve this grouping.</p>}
        {notice && <p role="status" className="text-sm text-white/90">{notice}</p>}
        {saved ? <div className="space-y-3">
          <p className="text-sm text-white/80">This is the original saved request. Retry confirms it without creating another decision.</p>
          <p className="break-words font-semibold">{saved.name}</p>
          <ul className="space-y-2 text-sm text-white/80">{saved.members.map(member => <li className="break-words" key={member.sku}>{member.sku} · {saved.axes.map(axis => member.options[axis]).join(' · ')}</li>)}</ul>
          {saved.members.length === 0 && <p className="text-sm">Remove all members from this mother product.</p>}
          <button type="button" className={primaryButton} disabled={recovery.working || !canManageProducts} onClick={async () => finish(await recovery.retry())}>Retry saved variations</button>
          {recovery.canReconcile && <button type="button" className={secondaryButton} disabled={recovery.working || !canManageProducts} onClick={async () => finish(await recovery.reviewLatest())}>Review latest grouping</button>}
        </div> : <>
          {loading && <p role="status" className="text-sm text-white/80">Loading complete product grouping…</p>}
          {!loading && !ready && <button type="button" className={secondaryButton} disabled={!canManageProducts} onClick={load}>Retry grouping read</button>}
          {family?.taxonomyConsistent === false && <p role="alert" className="text-sm text-crimson">These SKUs no longer share a brand and category. Remove inconsistent members or ungroup them before saving.</p>}
          {ready && <form onSubmit={event => { event.preventDefault(); void save() }} className="space-y-5">
            <fieldset disabled={blocked} className="min-w-0 space-y-5 disabled:opacity-60">
              <label className="block space-y-2 text-sm"><span>Mother product name</span><input required maxLength={120} className="adm-input min-h-11 w-full" value={name} onChange={event => setName(event.target.value)} /></label>
              <div className="flex flex-wrap items-end gap-2">
                <label className="block min-w-0 flex-1 space-y-2 text-sm"><span>Variation type</span><input maxLength={40} className="adm-input min-h-11 w-full" value={newAxis} placeholder="For example, Weight or Flavour" onChange={event => setNewAxis(event.target.value)} /></label>
                <button type="button" className={secondaryButton} disabled={axes.length >= 6 || !newAxis.trim()} onClick={() => {
                  const axis = cleanFamilyText(newAxis)
                  if (axes.some(value => value.toLowerCase() === axis.toLowerCase())) { setError('That variation type is already present.'); return }
                  setAxes([...axes, axis]); setNewAxis(''); setError('')
                }}>Add type</button>
              </div>
              {axes.length > 0 && <div className="flex flex-wrap gap-2">{axes.map(axis => <button type="button" key={axis} className={secondaryButton} aria-label={`Remove ${axis}`} onClick={() => setAxes(axes.filter(value => value !== axis))}>{axis} · Remove</button>)}</div>}
              <div className="divide-y divide-adm-line">{members.map(member => <div key={member.sku} className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{member.name}</p><p className="break-words text-xs text-white/70">{member.sku}</p><p className="mt-1 break-words text-xs text-white/55">{displayProductStatus(member.status)} · Website {member.websiteStatus}</p></div>
                  <button type="button" className={secondaryButton} aria-label={`Remove SKU ${member.sku}`} onClick={() => setMembers(members.filter(row => row.sku !== member.sku))}>Remove</button></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{axes.map(axis => <label key={axis} className="block min-w-0 space-y-2 text-sm"><span>{axis}</span><input required maxLength={80} aria-label={`${axis} for ${member.sku}`} className="adm-input min-h-11 w-full" value={member.options[axis] || ''} onChange={event => setMembers(members.map(row => row.sku === member.sku ? { ...row, options: { ...row.options, [axis]: event.target.value } } : row))} /></label>)}</div>
              </div>)}</div>
              <div className="flex flex-wrap gap-3"><button type="submit" className={primaryButton} disabled={!members.length}>Save variations</button>
                {family && <button type="button" className={secondaryButton} onClick={() => {
                  const count = family.members.length
                  const noun = count === 1 ? 'SKU' : 'SKUs'
                  if (window.confirm(`Remove this grouping for ${count} ${noun}? Product facts, prices, stock and order history stay with each SKU.`)) void save(true)
                }}>Ungroup all members</button>}</div>
            </fieldset>
          </form>}
        </>}
        {(error || recovery.error) && <p role="alert" className="break-words text-sm text-crimson">{error || recovery.error}</p>}
      </div>
    </AdminDialog>
  </div>
}
