import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { PlusIcon, StarIcon, XIcon } from '../../components/ui/icons'
import { EmptyState, MetricRail, SectionHeading, StateBanner, StatusPill, WorkspaceIntro } from './AdminWorkspaceUi'

const EMPTY = {
  code: '', description: '', discount_type: 'percentage', discount_value: '10',
  min_spend: '0', max_redemptions: '100', starts_at: '', ends_at: '',
  is_active: false, is_hunt: false, clue: '',
}

export default function CouponManager() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    const { data, error: loadError } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (loadError) {
      const missing = loadError.code === '42P01' || /does not exist|schema cache/i.test(loadError.message)
      setError(missing ? 'Coupon storage is not installed yet. Run migration 20260804_restore_coupons_and_consignment_scanning.sql, then reload this page.' : loadError.message)
    } else {
      setCoupons(data || [])
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const metrics = useMemo(() => {
    const now = Date.now()
    return {
      active: coupons.filter(c => c.is_active && !c.archived_at && (!c.starts_at || Date.parse(c.starts_at) <= now) && (!c.ends_at || Date.parse(c.ends_at) > now)).length,
      scheduled: coupons.filter(c => c.is_active && c.starts_at && Date.parse(c.starts_at) > now).length,
      archived: coupons.filter(c => c.archived_at).length,
      redemptions: coupons.reduce((sum, coupon) => sum + Number(coupon.redemption_count || 0), 0),
    }
  }, [coupons])

  const update = key => event => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm(current => ({ ...current, [key]: value }))
  }

  const createCoupon = async event => {
    event.preventDefault(); setWorking(true); setError(''); setNotice('')
    const startsAt = form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString()
    const endsAt = form.ends_at ? new Date(form.ends_at).toISOString() : null
    if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
      setError('End date must be later than the start date.'); setWorking(false); return
    }
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_spend: Number(form.min_spend || 0),
      max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: form.is_active,
      is_hunt: form.is_hunt,
      clue: form.is_hunt ? form.clue.trim() || null : null,
    }
    const { error: createError } = await supabase.from('coupons').insert(payload)
    setWorking(false)
    if (createError) { setError(createError.message); return }
    setForm(EMPTY); setShowCreate(false); setNotice(`Coupon ${payload.code} saved${payload.is_active ? ' and activated' : ' as an inactive draft'}.`); await load()
  }

  const toggle = async coupon => {
    setWorking(true); setError(''); setNotice('')
    const { error: toggleError } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id)
    setWorking(false)
    if (toggleError) { setError(toggleError.message); return }
    setNotice(`${coupon.code} ${coupon.is_active ? 'paused' : 'activated'}.`); await load()
  }

  const archive = async coupon => {
    if (!window.confirm(`Archive ${coupon.code}? It will stop validating immediately and remain in the audit history.`)) return
    setWorking(true); setError(''); setNotice('')
    const { error: archiveError } = await supabase.from('coupons').update({ is_active: false, archived_at: new Date().toISOString() }).eq('id', coupon.id)
    setWorking(false)
    if (archiveError) { setError(archiveError.message); return }
    setNotice(`${coupon.code} archived.`); await load()
  }

  const input = 'adm-input min-h-11 text-base sm:text-sm'

  return <div className="mx-auto max-w-[1600px] space-y-5 text-white">
    <WorkspaceIntro eyebrow="Promotions" title="Coupons & vouchers" description="Create controlled discount codes with spend rules, redemption limits, activation windows, and an audit trail. Codes are validated individually and are never publicly enumerable." actions={<button onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center gap-2 rounded-adm-sm bg-gold px-4 text-sm font-bold text-adm-bg"><PlusIcon size={15} /> Create coupon</button>} />

    {(error || notice) && <StateBanner tone={error ? 'danger' : 'success'}>{error || notice}</StateBanner>}

    <MetricRail items={[
      { label: 'Active now', value: metrics.active, tone: 'text-forest' },
      { label: 'Scheduled', value: metrics.scheduled, tone: 'text-blue' },
      { label: 'Recorded uses', value: metrics.redemptions },
      { label: 'Archived', value: metrics.archived },
    ]} />

    <section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
      <div className="p-4"><SectionHeading title="Promotion register" description="Activation is reversible; archive replaces destructive deletion so historical codes remain auditable." count={coupons.length} /></div>
      {loading ? <div className="h-56 animate-pulse bg-white/[0.03]" role="status" /> : coupons.length === 0 ? <EmptyState icon={StarIcon} title="No production coupons yet" description="Create an inactive draft first, review its limits and dates, then activate it deliberately." /> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-y border-adm-line bg-adm-sunken text-[11px] uppercase tracking-wider text-white/45"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Rule</th><th className="px-4 py-3">Window</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">State</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-adm-line">{coupons.map(coupon => {
            const exhausted = coupon.max_redemptions != null && coupon.redemption_count >= coupon.max_redemptions
            const expired = coupon.ends_at && Date.parse(coupon.ends_at) <= Date.now()
            const state = coupon.archived_at ? ['Archived', 'neutral'] : exhausted ? ['Limit reached', 'danger'] : expired ? ['Expired', 'warning'] : coupon.is_active ? ['Active', 'success'] : ['Inactive', 'neutral']
            return <tr key={coupon.id} className="hover:bg-white/[0.025]"><td className="px-4 py-4"><p className="font-mono text-sm font-bold text-gold">{coupon.code}</p><p className="mt-1 max-w-xs text-xs text-white/45">{coupon.description || 'No description'}</p>{coupon.is_hunt && <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue">Voucher hunt</p>}</td><td className="px-4 py-4"><p className="font-semibold">{coupon.discount_type === 'percentage' ? `${Number(coupon.discount_value)}% off` : `₱${Number(coupon.discount_value).toLocaleString()} off`}</p><p className="mt-1 text-xs text-white/45">Minimum ₱{Number(coupon.min_spend || 0).toLocaleString()}</p></td><td className="px-4 py-4 text-xs text-white/55"><p>{new Date(coupon.starts_at).toLocaleString()}</p><p className="mt-1">{coupon.ends_at ? `to ${new Date(coupon.ends_at).toLocaleString()}` : 'No end date'}</p></td><td className="px-4 py-4 font-mono text-xs"><span className="font-bold text-white">{coupon.redemption_count}</span> / {coupon.max_redemptions ?? 'Unlimited'}</td><td className="px-4 py-4"><StatusPill tone={state[1]}>{state[0]}</StatusPill></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button disabled={working || Boolean(coupon.archived_at) || expired || exhausted} onClick={() => toggle(coupon)} className="min-h-10 rounded-adm-sm border border-adm-line bg-white/5 px-3 text-xs font-semibold disabled:opacity-35">{coupon.is_active ? 'Pause' : 'Activate'}</button><button disabled={working || Boolean(coupon.archived_at)} onClick={() => archive(coupon)} className="min-h-10 rounded-adm-sm border border-crimson/30 bg-crimson/10 px-3 text-xs font-semibold text-crimson disabled:opacity-35">Archive</button></div></td></tr>
          })}</tbody>
        </table></div>
      )}
    </section>

    {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="coupon-create-title">
      <form onSubmit={createCoupon} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-adm border border-adm-line bg-adm-surface shadow-adm-float">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-adm-line bg-adm-surface px-5 py-4"><div><h2 id="coupon-create-title" className="font-serif text-xl font-bold">Create coupon</h2><p className="mt-1 text-xs text-white/45">New coupons default to inactive unless you deliberately publish them.</p></div><button type="button" onClick={() => setShowCreate(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-adm-sm hover:bg-white/5"><XIcon /></button></header>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Coupon code"><input className={`${input} font-mono uppercase`} value={form.code} onChange={update('code')} minLength="3" maxLength="40" required /></Field>
          <Field label="Description"><input className={input} value={form.description} onChange={update('description')} required /></Field>
          <Field label="Discount type"><select className={input} value={form.discount_type} onChange={update('discount_type')}><option value="percentage">Percentage</option><option value="fixed">Fixed PHP amount</option></select></Field>
          <Field label={form.discount_type === 'percentage' ? 'Discount percent' : 'Discount amount (PHP)'}><input className={input} type="number" min="0.01" max={form.discount_type === 'percentage' ? '100' : undefined} step="0.01" value={form.discount_value} onChange={update('discount_value')} required /></Field>
          <Field label="Minimum spend (PHP)"><input className={input} type="number" min="0" step="0.01" value={form.min_spend} onChange={update('min_spend')} required /></Field>
          <Field label="Maximum redemptions"><input className={input} type="number" min="1" value={form.max_redemptions} onChange={update('max_redemptions')} placeholder="Blank means unlimited" /></Field>
          <Field label="Starts at"><input className={input} type="datetime-local" value={form.starts_at} onChange={update('starts_at')} /></Field>
          <Field label="Ends at"><input className={input} type="datetime-local" value={form.ends_at} onChange={update('ends_at')} /></Field>
          <label className="flex min-h-11 items-center gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-sm"><input type="checkbox" checked={form.is_hunt} onChange={update('is_hunt')} /> Voucher-hunt campaign</label>
          <label className="flex min-h-11 items-center gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-sm"><input type="checkbox" checked={form.is_active} onChange={update('is_active')} /> Activate immediately</label>
          {form.is_hunt && <Field label="Public hunt clue" className="sm:col-span-2"><textarea className={`${input} min-h-20 resize-y`} value={form.clue} onChange={update('clue')} required /></Field>}
        </div>
        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-adm-line bg-adm-surface px-5 py-4"><button type="button" onClick={() => setShowCreate(false)} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold">Cancel</button><button type="submit" disabled={working} className="min-h-11 rounded-adm-sm bg-gold px-5 text-sm font-bold text-adm-bg disabled:opacity-40">{working ? 'Saving…' : 'Save coupon'}</button></footer>
      </form>
    </div>}
  </div>
}

function Field({ label, className = '', children }) { return <label className={`block text-xs font-semibold text-white/60 ${className}`}>{label}<span className="mt-1.5 block">{children}</span></label> }
