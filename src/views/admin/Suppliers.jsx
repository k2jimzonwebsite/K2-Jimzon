import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { AlertIcon, CheckIcon, GlobeIcon } from '../../components/ui/icons'
import { peso } from '../../data/products'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', leadTime: '14' })

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    const { data, error: loadError } = await supabase.from('suppliers').select('*').order('name')
    if (loadError) setError(loadError.message)
    else { setSuppliers(data || []); setError('') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (event) => {
    event.preventDefault(); setError(''); setNotice('')
    const { error: saveError } = await supabase.from('suppliers').insert({
      name: form.name.trim(), contact_email: form.email.trim() || null,
      lead_time_days: Number(form.leadTime) || 14,
    })
    if (saveError) { setError(saveError.message); return }
    setForm({ name: '', email: '', leadTime: '14' }); setShowForm(false); setNotice('Supplier saved.'); await load()
  }

  const input = 'min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-base text-white outline-none focus:border-blue'
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <div className="rounded-adm border border-adm-line bg-adm-surface p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue">Italy purchasing records</p><h1 className="mt-1 font-sans text-2xl font-bold text-white">Suppliers</h1><p className="mt-1 max-w-2xl text-sm text-white/55">Only saved supplier records appear here. Live price scraping and AI data answers are disabled until source-citing server services are implemented.</p></div><button onClick={() => setShowForm(true)} className="min-h-11 rounded-adm-sm bg-blue px-5 text-sm font-bold text-white">Add supplier</button></div></div>
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-adm-sm border p-3 text-sm ${error ? 'border-crimson/40 bg-crimson/10 text-crimson' : 'border-forest/40 bg-forest/10 text-forest'}`}>{error ? <AlertIcon size={17} /> : <CheckIcon size={17} />}<span>{error || notice}</span></div>}
    <div className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface"><div className="border-b border-adm-line bg-adm-sunken px-4 py-3"><h2 className="text-sm font-semibold text-white">Supplier directory</h2></div>{loading ? <p className="p-8 text-center text-sm text-white/45">Loading suppliers…</p> : suppliers.length === 0 ? <div className="p-10 text-center"><GlobeIcon size={26} className="mx-auto text-white/35" /><p className="mt-3 text-sm font-semibold text-white">No suppliers recorded</p><p className="mt-1 text-xs text-white/45">Add the verified contact before creating a purchase order.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-white/[0.03] text-xs uppercase text-white/45"><tr><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Lead time</th><th className="px-4 py-3">Performance</th><th className="px-4 py-3 text-right">Outstanding</th></tr></thead><tbody className="divide-y divide-adm-line">{suppliers.map(supplier => <tr key={supplier.id}><td className="px-4 py-3 font-semibold text-white">{supplier.name}</td><td className="px-4 py-3 text-white/55">{supplier.contact_email || 'Not recorded'}</td><td className="px-4 py-3 text-white/55">{supplier.lead_time_days ?? '—'} days</td><td className="px-4 py-3 text-white/55">{supplier.performance_score == null ? 'Not measured' : `${supplier.performance_score}/100`}</td><td className="px-4 py-3 text-right font-mono text-white">{peso(Number(supplier.outstanding_balance || 0))}</td></tr>)}</tbody></table></div>}</div>
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" role="dialog" aria-modal="true"><form onSubmit={save} className="w-full max-w-md space-y-4 rounded-adm border border-adm-line bg-adm-surface p-6 text-white"><h2 className="font-sans text-xl font-bold">Add verified supplier</h2><label className="block text-xs font-semibold text-white/60">Supplier name<input className={`${input} mt-1.5`} value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} required /></label><label className="block text-xs font-semibold text-white/60">Contact email<input className={`${input} mt-1.5`} type="email" value={form.email} onChange={e => setForm(current => ({ ...current, email: e.target.value }))} /></label><label className="block text-xs font-semibold text-white/60">Expected lead time in days<input className={`${input} mt-1.5`} type="number" min="0" value={form.leadTime} onChange={e => setForm(current => ({ ...current, leadTime: e.target.value }))} /></label><div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="min-h-11 flex-1 rounded-adm-sm border border-adm-line bg-white/5 text-sm font-semibold">Cancel</button><button type="submit" className="min-h-11 flex-1 rounded-adm-sm bg-blue text-sm font-bold">Save supplier</button></div></form></div>}
  </div>
}
