import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import { AlertIcon, CheckIcon, GlobeIcon } from '../../components/ui/icons'
import { peso } from '../../data/products'
import { adminBffEnabled, createSupplierBff, getAdminProcurementBff } from '../../services/adminBffService'

const INPUT = 'min-h-[44px] w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-base text-white outline-none focus:border-blue focus:ring-2 focus:ring-blue/30'

export default function Suppliers({ canCreateSupplier = false, secureMode }) {
  const secure = secureMode ?? adminBffEnabled()
  const [procurement, setProcurement] = useState({ suppliers: [], purchaseOrders: [], purchaseOrderCreationAvailable: false, receivingAvailable: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async (signal) => {
    setLoading(true); setError('')
    if (secure) {
      const response = await getAdminProcurementBff(signal)
      if (response.aborted) return
      if (!response.ok) setError(response.error || 'Supplier records could not be loaded.')
      else setProcurement(response.procurement)
    } else if (!supabase) setError('Supabase is not configured.')
    else {
      const [supplierResult, orderResult] = await Promise.all([
        supabase.from('suppliers').select('id,name,contact_email,lead_time_days,performance_score,outstanding_balance').order('name'),
        supabase.from('purchase_orders').select('id,supplier_id,po_number,status,total_amount,expected_delivery,created_at,suppliers(name),po_lines(id,sku,quantity,unit_cost)').order('created_at', { ascending: false }),
      ])
      if (supplierResult.error || orderResult.error) setError(safeUiError('SUPPLIER_LOAD_FAILED'))
      else setProcurement({
        suppliers: (supplierResult.data || []).map((row) => ({ id: row.id, name: row.name, contactEmail: row.contact_email, leadTimeDays: row.lead_time_days, performanceScore: row.performance_score, outstandingBalance: row.outstanding_balance })),
        purchaseOrders: (orderResult.data || []).map((row) => ({ id: row.id, supplierId: row.supplier_id, supplierName: row.suppliers?.name, poNumber: row.po_number, status: row.status, totalAmount: row.total_amount, expectedDelivery: row.expected_delivery, createdAt: row.created_at, lines: row.po_lines || [] })),
        purchaseOrderCreationAvailable: false, receivingAvailable: false,
      })
    }
    setLoading(false)
  }, [secure])

  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort() }, [load])

  async function createSupplier(value) {
    setError(''); setNotice('')
    if (secure) {
      const response = await createSupplierBff(value)
      if (!response.ok) { setError(response.error || 'The supplier was not saved.'); return false }
    } else {
      const { error: saveError } = await supabase.from('suppliers').insert({ name: value.name, contact_email: value.contactEmail || null, lead_time_days: value.leadTimeDays })
      if (saveError) { setError(safeUiError('SUPPLIER_SAVE_FAILED')); return false }
    }
    setShowForm(false); setNotice('Supplier saved with an attributable reason.'); await load(); return true
  }

  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <header className="rounded-adm border border-adm-line bg-adm-surface p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue">Italy purchasing records</p><h2 className="mt-1 font-sans text-2xl font-bold text-white">Suppliers & purchase orders</h2><p className="mt-1 max-w-2xl text-sm text-white/55">Verified supplier records and saved commitments only. Live price scraping, purchase-order creation, and receiving are not enabled here.</p></div><button disabled={!canCreateSupplier} onClick={() => setShowForm(true)} className="min-h-[44px] rounded-adm-sm bg-blue px-5 text-sm font-bold text-white disabled:opacity-50">Add supplier</button></div></header>
    {!secure && <div className="rounded-adm-sm border border-gold/35 bg-gold/10 p-3 text-sm text-gold">Transitional staff database path. The named server boundary remains inactive until coordinated cutover.</div>}
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-adm-sm border p-3 text-sm ${error ? 'border-crimson/40 bg-crimson/10 text-crimson' : 'border-forest/40 bg-forest/10 text-forest'}`}>{error ? <AlertIcon size={17} /> : <CheckIcon size={17} />}<span>{error || notice}</span></div>}
    <section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface" aria-labelledby="supplier-directory-title"><div className="border-b border-adm-line bg-adm-sunken px-4 py-3"><h2 id="supplier-directory-title" className="text-sm font-semibold text-white">Supplier directory</h2></div>{loading ? <Loading /> : procurement.suppliers.length === 0 ? <Empty icon title="No suppliers recorded" body="Add a verified supplier with an attributable source before creating a purchase order." /> : <SupplierList rows={procurement.suppliers} />}</section>
    <section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface" aria-labelledby="purchase-orders-title"><div className="border-b border-adm-line bg-adm-sunken px-4 py-3"><h2 id="purchase-orders-title" className="text-sm font-semibold text-white">Purchase orders</h2><p className="mt-1 text-xs text-white/45">Creation and batch-aware receiving remain unavailable.</p></div>{loading ? <Loading /> : procurement.purchaseOrders.length === 0 ? <Empty title="No purchase orders recorded" body="No supplier commitment has been saved in the canonical register." /> : <PurchaseOrderList rows={procurement.purchaseOrders} />}</section>
    {showForm && <SupplierDialog onCancel={() => setShowForm(false)} onSave={createSupplier} />}
  </div>
}

function SupplierList({ rows }) {
  return <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-white/[0.03] text-xs uppercase text-white/45"><tr><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Lead time</th><th className="px-4 py-3">Performance</th><th className="px-4 py-3 text-right">Outstanding</th></tr></thead><tbody className="divide-y divide-adm-line">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-semibold text-white">{row.name}</td><td className="px-4 py-3 text-white/55">{row.contactEmail || 'Not recorded'}</td><td className="px-4 py-3 text-white/55">{row.leadTimeDays ?? '—'} days</td><td className="px-4 py-3 text-white/55">{row.performanceScore == null ? 'Not measured' : `${row.performanceScore}/100`}</td><td className="px-4 py-3 text-right font-mono text-white">{peso(Number(row.outstandingBalance || 0))}</td></tr>)}</tbody></table></div><div className="divide-y divide-adm-line md:hidden">{rows.map((row) => <article key={row.id} className="space-y-2 p-4"><h3 className="font-semibold text-white">{row.name}</h3><p className="break-all text-sm text-white/55">{row.contactEmail || 'Contact not recorded'}</p><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-white/40">Lead time</dt><dd>{row.leadTimeDays ?? '—'} days</dd></div><div><dt className="text-white/40">Outstanding</dt><dd className="font-mono">{peso(Number(row.outstandingBalance || 0))}</dd></div></dl></article>)}</div></>
}

function PurchaseOrderList({ rows }) {
  return <div className="divide-y divide-adm-line">{rows.map((row) => <article key={row.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-mono font-semibold text-white">{row.poNumber}</h3><span className="rounded-full bg-blue/15 px-2 py-1 text-xs font-semibold text-blue">{row.status}</span></div><p className="mt-1 text-sm text-white/55">{row.supplierName || 'Supplier not recorded'} · {row.lines?.length || 0} lines · expected {row.expectedDelivery || 'not recorded'}</p></div><div className="text-left sm:text-right"><p className="font-mono text-white">{peso(Number(row.totalAmount || 0))}</p><p className="text-xs text-white/40">Receiving unavailable here</p></div></article>)}</div>
}

function SupplierDialog({ onCancel, onSave }) {
  const [value, setValue] = useState({ name: '', contactEmail: '', leadTimeDays: '14', reason: '' })
  const [saving, setSaving] = useState(false)
  const closeRef = useRef(null)
  useEffect(() => { closeRef.current?.focus(); const key = (event) => { if (event.key === 'Escape' && !saving) onCancel() }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [saving, onCancel])
  const update = (field) => (event) => setValue((current) => ({ ...current, [field]: event.target.value }))
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 sm:items-center sm:p-4" role="presentation"><form aria-labelledby="supplier-dialog-title" onSubmit={async (event) => { event.preventDefault(); setSaving(true); const ok = await onSave({ ...value, leadTimeDays: Number(value.leadTimeDays) }); if (!ok) setSaving(false) }} className="w-full space-y-4 rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:max-w-md sm:rounded-adm" role="dialog" aria-modal="true"><div className="flex items-start justify-between gap-4"><div><h2 id="supplier-dialog-title" className="font-sans text-xl font-bold">Add verified supplier</h2><p className="mt-1 text-sm text-white/50">This records identity only; it does not approve pricing or create a purchase order.</p></div><button ref={closeRef} type="button" onClick={onCancel} aria-label="Close supplier dialog" className="grid h-11 w-11 place-items-center rounded-adm-sm border border-adm-line">×</button></div><label className="block text-sm font-semibold text-white/70">Supplier name<input className={`${INPUT} mt-1`} required minLength={2} maxLength={120} value={value.name} onChange={update('name')} /></label><label className="block text-sm font-semibold text-white/70">Contact email<input className={`${INPUT} mt-1`} type="email" maxLength={254} value={value.contactEmail} onChange={update('contactEmail')} /></label><label className="block text-sm font-semibold text-white/70">Expected lead time in days<input className={`${INPUT} mt-1`} type="number" min="0" max="365" required value={value.leadTimeDays} onChange={update('leadTimeDays')} /></label><label className="block text-sm font-semibold text-white/70">Reason and source<textarea className={`${INPUT} mt-1 min-h-[88px] resize-y py-3`} required minLength={3} maxLength={500} value={value.reason} onChange={update('reason')} /></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="min-h-[44px] rounded-adm-sm border border-adm-line px-4 font-semibold">Cancel</button><button disabled={saving} type="submit" className="min-h-[44px] rounded-adm-sm bg-blue px-4 font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save supplier'}</button></div></form></div>
}

function Loading() { return <div className="space-y-2 p-4" aria-label="Loading procurement records">{[1, 2].map((row) => <div key={row} className="h-16 animate-pulse rounded-adm-sm bg-adm-raised motion-reduce:animate-none" />)}</div> }
function Empty({ icon = false, title, body }) { return <div className="p-10 text-center">{icon && <GlobeIcon size={26} className="mx-auto text-white/35" />}<p className="mt-3 text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs text-white/45">{body}</p></div> }
