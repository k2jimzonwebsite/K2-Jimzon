import { useEffect, useMemo, useRef, useState } from 'react'
import { useGlobeCms } from '../../data/globeCms'
import { products } from '../../data/products'
import { StarIcon } from '../../components/ui/icons'
import { adminBffEnabled, commandAdminGlobeCmsBff, getAdminGlobeCmsBff } from '../../services/adminBffService'

const SOURCES = [['verified_marketplace', 'Verified marketplace'], ['website_customer', 'Website customer'], ['wholesale_customer', 'Wholesale customer'], ['pasabuy_customer', 'Pasabuy customer'], ['owner_record', 'Owner record']]
const RIGHTS = [['customer_consent', 'Customer consent'], ['marketplace_publication', 'Marketplace publication'], ['contractual_permission', 'Contractual permission'], ['owner_record', 'Owner record']]
const CONTROL = 'w-full min-h-[44px] rounded-adm-sm border border-adm-line bg-adm-raised px-3 text-base text-white focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30'

function blankReview(review) {
  return {
    name: review?.name || '', channel: review?.channel || '', stars: review?.stars || 5,
    text: review?.text || '', item: review?.item || '', productId: review?.productId || null,
    reviewDate: review?.reviewDate || new Date().toISOString().slice(0, 10),
    sourceKind: review?.sourceKind || 'verified_marketplace', sourceReference: review?.sourceReference || '',
    rightsBasis: review?.rightsBasis || 'customer_consent', reason: '',
  }
}

export default function GlobeCms({ canManagePublicClaims = false }) {
  return <GlobeCmsWorkspace canManagePublicClaims={canManagePublicClaims} />
}

export function GlobeCmsWorkspace({ canManagePublicClaims = false, secureMode = adminBffEnabled() }) {
  const legacy = useGlobeCms()
  const [tab, setTab] = useState('products')
  const [state, setState] = useState({ status: secureMode ? 'loading' : 'ready', cms: null, message: '' })
  const [dialog, setDialog] = useState(null)

  async function load(signal) {
    if (!secureMode || !canManagePublicClaims) return
    setState((current) => ({ ...current, status: 'loading', message: '' }))
    const response = await getAdminGlobeCmsBff(signal)
    if (response.aborted) return
    setState(response.ok ? { status: 'ready', cms: response.cms, message: '' } : { status: 'error', cms: null, message: response.error || 'Globe CMS could not be loaded.' })
  }

  useEffect(() => {
    if (!secureMode || !canManagePublicClaims) return undefined
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [secureMode, canManagePublicClaims])

  async function command(action, payload) {
    setState((current) => ({ ...current, status: 'working', message: '' }))
    const response = await commandAdminGlobeCmsBff(action, payload)
    if (!response.ok) {
      setState((current) => ({ ...current, status: 'error', message: response.error || 'The change was not saved.' }))
      return false
    }
    await load()
    setState((current) => ({ ...current, message: 'Change saved and recorded in the audit history.' }))
    return true
  }

  if (!canManagePublicClaims) return <Empty title="Admin access required" body="Only an Admin can moderate public review claims or change the Globe display." />

  const cms = secureMode ? state.cms : { globeProducts: legacy.globeProducts, reviews: legacy.reviews }
  const busy = secureMode ? ['loading', 'working'].includes(state.status) : legacy.isLoading
  const error = secureMode ? (state.status === 'error' ? state.message : '') : legacy.cmsError

  return (
    <section aria-labelledby="globe-cms-title">
      <div className="mb-5 rounded-adm-sm border border-blue/30 bg-blue/10 px-4 py-3 text-base text-white/75">
        <h2 id="globe-cms-title" className="font-semibold text-white">Public claim control</h2>
        <p className="mt-1">Review copy stays private until evidence is recorded and an Admin publishes it. Corrections return published copy to draft.</p>
      </div>
      {error && <div role="alert" className="mb-4 rounded-adm-sm border border-crimson/30 bg-crimson/10 px-4 py-3 text-base text-crimson">{error}</div>}
      {state.message && state.status !== 'error' && <div role="status" className="mb-4 rounded-adm-sm border border-forest/30 bg-forest/10 px-4 py-3 text-base text-forest">{state.message}</div>}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-adm-sm border border-adm-line bg-adm-sunken p-1" role="tablist" aria-label="Globe CMS sections">
        {[["products", "Globe products"], ["reviews", "Review claims"]].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-[44px] rounded-adm-sm px-4 text-base font-semibold ${tab === id ? 'bg-adm-raised text-white' : 'text-white/70 hover:text-white'}`}>{label}</button>)}
      </div>
      {busy && !cms ? <LoadingRows /> : tab === 'products'
        ? <GlobeProductsPanel rows={cms?.globeProducts || []} disabled={busy} onToggle={(row) => secureMode ? setDialog({ row }) : legacy.toggleGlobeProduct(row.productId)} />
        : <ReviewsPanel rows={cms?.reviews || []} disabled={busy} secureMode={secureMode} command={command} />}
      {dialog && <ReasonDialog title={`${dialog.row.enabled ? 'Remove' : 'Show'} product on Globe?`} actionLabel={dialog.row.enabled ? 'Remove from Globe' : 'Show on Globe'} onCancel={() => setDialog(null)} onConfirm={async (reason) => {
        const row = dialog.row
        const ok = await command('globe_config_update', { productId: row.productId, enabled: !row.enabled, hero: row.heroImage ? { url: row.heroImage, objectPath: null } : null, displayOrder: row.displayOrder, version: row.version, reason })
        if (ok) setDialog(null)
        return ok
      }} />}
    </section>
  )
}

function LoadingRows() {
  return <div aria-label="Loading Globe CMS" className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-adm-sm border border-adm-line bg-adm-raised motion-reduce:animate-none" />)}</div>
}

function GlobeProductsPanel({ rows, disabled, onToggle }) {
  const enabled = rows.filter((row) => row.enabled).length
  return <div><div className="mb-4"><h3 className="font-sans text-xl font-semibold">Products on Globe</h3><p className="text-base text-white/45">{enabled} of {rows.length} products visible</p></div>
    {!rows.length ? <Empty title="No Globe configuration" body="No products are currently configured for the storefront Globe." /> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{rows.map((row) => {
      const product = products.find((entry) => entry.id === row.productId)
      return <article key={row.productId} className={`flex items-center gap-3 rounded-adm-sm border p-3 ${row.enabled ? 'border-forest/30 bg-forest/10' : 'border-adm-line bg-adm-surface'}`}>
        <div className="h-14 w-14 flex-none overflow-hidden rounded-adm-sm bg-adm-raised">{product?.img ? <img src={product.img} alt="" className="h-full w-full object-contain p-1" /> : <div className="grid h-full place-items-center text-sm text-white/45">{row.productId.slice(0, 3)}</div>}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-base font-semibold">{product?.short || product?.name || row.productId}</p><p className="text-sm text-white/45">{row.enabled ? 'Visible publicly' : 'Hidden'} · v{row.version || 1}</p></div>
        <button type="button" disabled={disabled} onClick={() => onToggle(row)} aria-label={`${row.enabled ? 'Remove' : 'Show'} ${product?.short || row.productId} on Globe`} className={`relative h-11 w-14 flex-none rounded-full border disabled:opacity-50 ${row.enabled ? 'border-forest bg-forest' : 'border-adm-line bg-adm-raised'}`}><span className={`absolute top-[9px] h-6 w-6 rounded-full bg-white transition-[left] motion-reduce:transition-none ${row.enabled ? 'left-[27px]' : 'left-[3px]'}`} /></button>
      </article>
    })}</div>}
  </div>
}

function ReviewsPanel({ rows, disabled, secureMode, command }) {
  const [editing, setEditing] = useState(null)
  const [dialog, setDialog] = useState(null)
  const counts = useMemo(() => rows.reduce((all, row) => ({ ...all, [row.status || 'legacy']: (all[row.status || 'legacy'] || 0) + 1 }), {}), [rows])
  async function save(values) {
    if (!secureMode) return false
    const ok = await command(editing?.id ? 'review_update' : 'review_create', editing?.id ? { ...values, id: editing.id, version: editing.version } : values)
    if (ok) setEditing(null)
    return ok
  }
  return <div>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-sans text-xl font-semibold">Review claims</h3><p className="text-base text-white/45">{counts.published || 0} published · {counts.draft || 0} draft · {counts.withdrawn || 0} withdrawn</p></div><button type="button" disabled={disabled || !secureMode} onClick={() => setEditing({})} className="min-h-[44px] rounded-adm-sm bg-crimson px-4 text-base font-semibold text-white disabled:opacity-50">Add attributable draft</button></div>
    {editing && <ReviewForm initial={editing.id ? editing : null} disabled={disabled} onCancel={() => setEditing(null)} onSave={save} />}
    {!rows.length ? <Empty title="No review claims" body="Create a draft only when its source and publication rights can be recorded." /> : <div className="space-y-3">{rows.map((review) => <article key={review.id} className="rounded-adm-sm border border-adm-line bg-adm-surface p-4"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><Status status={review.status} /><span className="text-sm text-white/45">v{review.version || 1} · {review.reviewDate || review.date}</span></div>
      <div className="mt-2 flex gap-0.5 text-gold" aria-label={`${review.stars} of 5 stars`}>{Array.from({ length: review.stars }).map((_, index) => <StarIcon key={index} size={12} />)}</div>
      <blockquote className="mt-2 text-base leading-relaxed text-white/80">“{review.text}”</blockquote><p className="mt-2 text-sm text-white/60"><span className="font-semibold text-white">{review.name}</span> · {review.channel} · {review.item}</p>
      {secureMode && <p className="mt-2 break-words text-sm text-white/45">Evidence: {review.sourceKind?.replaceAll('_', ' ')} · {review.sourceReference} · {review.rightsBasis?.replaceAll('_', ' ')}</p>}
    </div>{secureMode && <div className="flex flex-wrap gap-2 sm:max-w-[220px] sm:justify-end"><button type="button" disabled={disabled} onClick={() => setEditing(review)} className="min-h-[44px] rounded-adm-sm border border-adm-line px-3 text-sm font-semibold disabled:opacity-50">Edit</button>{review.status !== 'published' && <button type="button" disabled={disabled} onClick={() => setDialog({ type: 'publish', review })} className="min-h-[44px] rounded-adm-sm bg-forest px-3 text-sm font-semibold text-white disabled:opacity-50">Publish</button>}{review.status !== 'withdrawn' && <button type="button" disabled={disabled} onClick={() => setDialog({ type: 'withdraw', review })} className="min-h-[44px] rounded-adm-sm border border-crimson/40 px-3 text-sm font-semibold text-crimson disabled:opacity-50">Withdraw</button>}</div>}</div></article>)}</div>}
    {dialog && <ReasonDialog title={dialog.type === 'publish' ? 'Publish this review claim?' : 'Withdraw this review claim?'} actionLabel={dialog.type === 'publish' ? 'Publish claim' : 'Withdraw claim'} onCancel={() => setDialog(null)} onConfirm={async (reason) => { const ok = await command(`review_${dialog.type}`, { id: dialog.review.id, version: dialog.review.version, reason }); if (ok) setDialog(null); return ok }} />}
  </div>
}

function ReviewForm({ initial, disabled, onSave, onCancel }) {
  const [value, setValue] = useState(() => blankReview(initial))
  const update = (key) => (event) => setValue((current) => ({ ...current, [key]: event.target.value }))
  return <form onSubmit={(event) => { event.preventDefault(); onSave({ ...value, stars: Number(value.stars), productId: value.productId || null }) }} className="mb-5 space-y-4 rounded-adm-sm border border-blue/30 bg-blue/10 p-4 sm:p-5">
    <div><h4 className="font-semibold">{initial ? 'Correct review draft' : 'New attributable draft'}</h4><p className="mt-1 text-sm text-white/55">Saving never publishes. A published claim returns to draft when corrected.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Reviewer display name"><input required minLength={2} maxLength={80} value={value.name} onChange={update('name')} className={CONTROL} /></Field><Field label="Channel"><input required minLength={2} maxLength={80} value={value.channel} onChange={update('channel')} placeholder="Shopee · verified" className={CONTROL} /></Field><Field label="Product"><select value={value.productId || ''} onChange={update('productId')} className={CONTROL}><option value="">General review</option>{products.map((product) => <option key={product.id} value={product.id}>{product.short || product.name}</option>)}</select></Field><Field label="Item label"><input required minLength={2} maxLength={120} value={value.item} onChange={update('item')} className={CONTROL} /></Field><Field label="Review date"><input required type="date" max={new Date().toISOString().slice(0, 10)} value={value.reviewDate} onChange={update('reviewDate')} className={CONTROL} /></Field><Field label="Rating"><select value={value.stars} onChange={update('stars')} className={CONTROL}>{[5, 4, 3, 2, 1].map((stars) => <option key={stars} value={stars}>{stars} stars</option>)}</select></Field></div>
    <Field label="Review text"><textarea required minLength={10} maxLength={1200} rows={4} value={value.text} onChange={update('text')} className={`${CONTROL} min-h-[112px] resize-y py-3`} /></Field>
    <div className="grid gap-4 border-t border-adm-line pt-4 sm:grid-cols-2"><Field label="Source type"><select value={value.sourceKind} onChange={update('sourceKind')} className={CONTROL}>{SOURCES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Rights basis"><select value={value.rightsBasis} onChange={update('rightsBasis')} className={CONTROL}>{RIGHTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field></div>
    <Field label="Private source reference" hint="Order reference, marketplace URL, or internal evidence reference. Never shown publicly."><input required minLength={3} maxLength={120} value={value.sourceReference} onChange={update('sourceReference')} className={CONTROL} /></Field><Field label="Reason for this change"><textarea required minLength={3} maxLength={500} rows={2} value={value.reason} onChange={update('reason')} className={`${CONTROL} resize-y py-3`} /></Field>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="min-h-[44px] rounded-adm-sm border border-adm-line px-4 font-semibold">Cancel</button><button disabled={disabled} type="submit" className="min-h-[44px] rounded-adm-sm bg-crimson px-4 font-semibold text-white disabled:opacity-50">Save as draft</button></div>
  </form>
}

function Field({ label, hint, children }) { return <label className="block text-sm font-semibold text-white/75"><span>{label}</span>{hint && <span className="mt-1 block font-normal text-white/45">{hint}</span>}<span className="mt-1 block">{children}</span></label> }
function Status({ status = 'legacy' }) { const tone = status === 'published' ? 'border-forest/30 bg-forest/10 text-forest' : status === 'withdrawn' ? 'border-crimson/30 bg-crimson/10 text-crimson' : 'border-gold/30 bg-gold/10 text-gold'; return <span className={`rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-wide ${tone}`}>{status}</span> }
function Empty({ title, body }) { return <div className="rounded-adm-sm border border-dashed border-adm-line bg-adm-surface px-5 py-10 text-center"><h3 className="font-semibold text-white">{title}</h3><p className="mx-auto mt-2 max-w-xl text-base text-white/45">{body}</p></div> }

function ReasonDialog({ title, actionLabel, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event) => { if (event.key === 'Escape' && !working) onCancel() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [working, onCancel])
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) onCancel() }}><div role="dialog" aria-modal="true" aria-labelledby="claim-dialog-title" className="w-full rounded-t-adm bg-adm-surface p-5 shadow-adm-lg sm:max-w-lg sm:rounded-adm">
    <div className="flex items-start justify-between gap-4"><div><h3 id="claim-dialog-title" className="text-xl font-semibold">{title}</h3><p className="mt-1 text-sm text-white/55">This reason is retained in the private audit history.</p></div><button ref={closeRef} type="button" disabled={working} onClick={onCancel} aria-label="Close dialog" className="grid h-11 w-11 place-items-center rounded-adm-sm border border-adm-line text-xl">×</button></div>
    <label className="mt-5 block text-sm font-semibold text-white/75">Reason<textarea required minLength={3} maxLength={500} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className={`${CONTROL} mt-1 resize-y py-3`} /></label>
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={working} onClick={onCancel} className="min-h-[44px] rounded-adm-sm border border-adm-line px-4 font-semibold">Cancel</button><button type="button" disabled={working || reason.trim().length < 3} onClick={async () => { setWorking(true); const ok = await onConfirm(reason.trim()); if (!ok) setWorking(false) }} className="min-h-[44px] rounded-adm-sm bg-crimson px-4 font-semibold text-white disabled:opacity-50">{working ? 'Saving…' : actionLabel}</button></div>
  </div></div>
}
