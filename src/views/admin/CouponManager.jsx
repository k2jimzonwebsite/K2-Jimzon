import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { PlusIcon, StarIcon, XIcon } from '../../components/ui/icons'
import {
  adminBffEnabled, archiveCouponBff, createCouponBff, getAdminCoupons, setCouponStateBff,
} from '../../services/adminBffService'
import { EmptyState, MetricRail, SectionHeading, StateBanner, StatusPill, WorkspaceIntro } from './AdminWorkspaceUi'

const EMPTY = {
  code: '', description: '', discount_type: 'percentage', discount_value: '10',
  min_spend: '0', max_redemptions: '100', starts_at: '', ends_at: '',
  is_active: false, is_hunt: false, clue: '', reason: '',
}
const PROJECTION = 'id,code,description,discount_type,discount_value,min_spend,max_redemptions,redemption_count,starts_at,ends_at,is_active,is_hunt,clue,archived_at,created_at,updated_at'
const safeLegacyError = 'Coupon records could not be updated safely. Refresh and try again.'

function operationKey() {
  return typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : ''
}

function stateFor(coupon) {
  const exhausted = coupon.max_redemptions != null && coupon.redemption_count >= coupon.max_redemptions
  const expired = coupon.ends_at && Date.parse(coupon.ends_at) <= Date.now()
  if (coupon.archived_at) return { label: 'Archived', tone: 'neutral', exhausted, expired }
  if (exhausted) return { label: 'Limit reached', tone: 'danger', exhausted, expired }
  if (expired) return { label: 'Expired', tone: 'warning', exhausted, expired }
  if (coupon.is_active && coupon.starts_at && Date.parse(coupon.starts_at) > Date.now()) return { label: 'Scheduled', tone: 'info', exhausted, expired }
  if (coupon.is_active) return { label: 'Active', tone: 'success', exhausted, expired }
  return { label: 'Inactive', tone: 'neutral', exhausted, expired }
}

export default function CouponManager() {
  const secure = adminBffEnabled()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [createKey, setCreateKey] = useState('')
  const [createStartsAt, setCreateStartsAt] = useState('')
  const [pendingAction, setPendingAction] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    if (secure) {
      const result = await getAdminCoupons()
      if (!result.ok) setError(result.error)
      else { setCoupons(result.data?.coupons || []); setError('') }
      setLoading(false)
      return
    }
    if (!supabase) { setError('Coupon storage is not configured.'); setLoading(false); return }
    const { data, error: loadError } = await supabase.from('coupons').select(PROJECTION).order('created_at', { ascending: false }).limit(500)
    if (loadError) {
      const missing = loadError.code === '42P01' || /does not exist|schema cache/i.test(loadError.message || '')
      setError(missing ? 'Coupon storage is not installed yet.' : 'Coupon records could not be loaded safely.')
    } else { setCoupons(data || []); setError('') }
    setLoading(false)
  }, [secure])

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
    setCreateKey(operationKey())
  }

  const openCreate = () => {
    setForm(EMPTY); setCreateKey(operationKey()); setCreateStartsAt(new Date().toISOString()); setError(''); setNotice(''); setShowCreate(true)
  }

  const createCoupon = async event => {
    event.preventDefault(); setWorking(true); setError(''); setNotice('')
    const startsAt = form.starts_at ? new Date(form.starts_at).toISOString() : createStartsAt
    const endsAt = form.ends_at ? new Date(form.ends_at).toISOString() : null
    if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
      setError('End date must be later than the start date.'); setWorking(false); return
    }
    if (form.reason.trim().length < 10) {
      setError('Record a specific reason of at least 10 characters.'); setWorking(false); return
    }
    const discountVal = Number(form.discount_value)
    if (!discountVal || discountVal <= 0 || Number.isNaN(discountVal)) {
      setError('Discount value must be a positive number greater than zero.'); setWorking(false); return
    }
    if (form.discount_type === 'percentage' && (discountVal < 1 || discountVal > 100)) {
      setError('Percentage discount must be between 1% and 100%.'); setWorking(false); return
    }
    if (form.discount_type === 'fixed' && discountVal > 50000) {
      setError('Fixed discount cannot exceed ₱50,000 per coupon.'); setWorking(false); return
    }
    const minSpendVal = Number(form.min_spend || 0)
    if (minSpendVal < 0 || Number.isNaN(minSpendVal)) {
      setError('Minimum spend cannot be a negative amount.'); setWorking(false); return
    }
    const maxRedemptionsVal = form.max_redemptions ? Number(form.max_redemptions) : null
    if (maxRedemptionsVal !== null && (maxRedemptionsVal < 1 || !Number.isInteger(maxRedemptionsVal))) {
      setError('Max redemptions must be an integer of at least 1.'); setWorking(false); return
    }
    const command = {
      code: form.code.trim().toUpperCase(), description: form.description.trim(),
      discountType: form.discount_type, discountValue: discountVal,
      minSpend: minSpendVal,
      maxRedemptions: maxRedemptionsVal,
      startsAt, endsAt, isActive: form.is_active, isHunt: form.is_hunt,
      clue: form.is_hunt ? form.clue.trim() || null : null, reason: form.reason.trim(),
    }
    let result
    if (secure) result = await createCouponBff(command, createKey || operationKey())
    else {
      const { reason: _reason, ...withoutReason } = command
      const payload = {
        code: withoutReason.code, description: withoutReason.description,
        discount_type: withoutReason.discountType, discount_value: withoutReason.discountValue,
        min_spend: withoutReason.minSpend, max_redemptions: withoutReason.maxRedemptions,
        starts_at: withoutReason.startsAt, ends_at: withoutReason.endsAt,
        is_active: withoutReason.isActive, is_hunt: withoutReason.isHunt, clue: withoutReason.clue,
      }
      const direct = await supabase.from('coupons').insert(payload)
      result = direct.error ? { ok: false, error: safeLegacyError } : { ok: true }
    }
    setWorking(false)
    if (!result.ok) { setError(result.error); return }
    setForm(EMPTY); setCreateKey(''); setCreateStartsAt(''); setShowCreate(false)
    setNotice(`Coupon ${command.code} saved${command.isActive ? ' and activated' : ' as an inactive draft'}.`)
    await load()
  }

  const openAction = (coupon, type) => {
    setError(''); setNotice('')
    setPendingAction({ coupon, type, reason: '', key: operationKey() })
  }

  const confirmAction = async event => {
    event.preventDefault()
    if (!pendingAction || pendingAction.reason.trim().length < 10) return
    setWorking(true); setError(''); setNotice('')
    const { coupon, type, reason, key } = pendingAction
    let result
    if (secure) {
      result = type === 'archive'
        ? await archiveCouponBff({ couponId: coupon.id, reason: reason.trim() }, key)
        : await setCouponStateBff({ couponId: coupon.id, active: type === 'activate', reason: reason.trim() }, key)
    } else {
      const direct = type === 'archive'
        ? await supabase.from('coupons').update({ is_active: false, archived_at: new Date().toISOString() }).eq('id', coupon.id)
        : await supabase.from('coupons').update({ is_active: type === 'activate' }).eq('id', coupon.id)
      result = direct.error ? { ok: false, error: safeLegacyError } : { ok: true }
    }
    setWorking(false)
    if (!result.ok) { setError(result.error); return }
    setPendingAction(null)
    setNotice(`${coupon.code} ${type === 'archive' ? 'archived' : type === 'activate' ? 'activated' : 'paused'}.`)
    await load()
  }

  const input = 'adm-input min-h-11 text-base sm:text-sm'

  return <div className="mx-auto max-w-[1600px] space-y-5 text-white">
    <WorkspaceIntro eyebrow="Promotions" title="Coupons & vouchers" description="Create controlled discount codes with spend rules, redemption limits, activation windows, and attributable changes. Codes are validated individually and are never publicly enumerable." actions={<button onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-adm-sm bg-gold px-4 text-sm font-bold text-adm-bg"><PlusIcon size={15} /> Create coupon</button>} />

    {(error || notice) && <StateBanner tone={error ? 'danger' : 'success'}>{error || notice}</StateBanner>}

    <MetricRail items={[
      { label: 'Active now', value: metrics.active, tone: 'text-forest' },
      { label: 'Scheduled', value: metrics.scheduled, tone: 'text-blue' },
      { label: 'Recorded uses', value: metrics.redemptions },
      { label: 'Archived', value: metrics.archived },
    ]} />

    <section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
      <div className="p-4"><SectionHeading title="Promotion register" description="Activation is reversible; archive replaces deletion so historical codes remain auditable." count={coupons.length} /></div>
      {loading ? <div className="space-y-2 border-t border-adm-line p-4" role="status" aria-label="Loading coupons">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 rounded-adm-sm bg-white/[0.04]" />)}</div> : coupons.length === 0 ? <EmptyState icon={StarIcon} title="No production coupons yet" description="Create an inactive draft first, review its limits and dates, then activate it deliberately." /> : <>
        <div className="space-y-3 border-t border-adm-line p-3 sm:hidden">{coupons.map(coupon => <CouponCard key={coupon.id} coupon={coupon} working={working} onAction={openAction} />)}</div>
        <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-y border-adm-line bg-adm-sunken text-xs uppercase tracking-wider text-white/55"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Rule</th><th className="px-4 py-3">Window</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">State</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-adm-line">{coupons.map(coupon => <CouponRow key={coupon.id} coupon={coupon} working={working} onAction={openAction} />)}</tbody>
        </table></div>
      </>}
    </section>

    {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="coupon-create-title">
      <form onSubmit={createCoupon} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-adm border border-adm-line bg-adm-surface shadow-adm-float">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-adm-line bg-adm-surface px-5 py-4"><div><h2 id="coupon-create-title" className="font-sans text-xl font-bold">Create coupon</h2><p className="mt-1 text-sm text-white/55">Start inactive unless this campaign is already approved.</p></div><button type="button" onClick={() => setShowCreate(false)} aria-label="Close create coupon" className="flex h-11 w-11 items-center justify-center rounded-adm-sm hover:bg-white/5"><XIcon /></button></header>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Coupon code"><input className={`${input} font-mono uppercase`} value={form.code} onChange={update('code')} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,39}" minLength="3" maxLength="40" autoCapitalize="characters" required /></Field>
          <Field label="Description"><input className={input} value={form.description} onChange={update('description')} minLength="3" maxLength="300" required /></Field>
          <Field label="Discount type"><select className={input} value={form.discount_type} onChange={update('discount_type')}><option value="percentage">Percentage</option><option value="fixed">Fixed PHP amount</option></select></Field>
          <Field label={form.discount_type === 'percentage' ? 'Discount percent' : 'Discount amount (PHP)'}><input className={input} type="number" inputMode="decimal" min="0.01" max={form.discount_type === 'percentage' ? '100' : '1000000'} step="0.01" value={form.discount_value} onChange={update('discount_value')} required /></Field>
          <Field label="Minimum spend (PHP)"><input className={input} type="number" inputMode="decimal" min="0" max="10000000" step="0.01" value={form.min_spend} onChange={update('min_spend')} required /></Field>
          <Field label="Maximum redemptions"><input className={input} type="number" inputMode="numeric" min="1" max="1000000" value={form.max_redemptions} onChange={update('max_redemptions')} placeholder="Blank means unlimited" /></Field>
          <Field label="Starts at"><input className={input} type="datetime-local" value={form.starts_at} onChange={update('starts_at')} /></Field>
          <Field label="Ends at"><input className={input} type="datetime-local" value={form.ends_at} onChange={update('ends_at')} /></Field>
          <label className="flex min-h-11 items-center gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-sm"><input type="checkbox" checked={form.is_hunt} onChange={update('is_hunt')} /> Voucher-hunt campaign</label>
          <label className="flex min-h-11 items-center gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-sm"><input type="checkbox" checked={form.is_active} onChange={update('is_active')} /> Activate immediately</label>
          {form.is_hunt && <Field label="Public hunt clue" className="sm:col-span-2"><textarea className={`${input} min-h-20 resize-y`} value={form.clue} onChange={update('clue')} minLength="3" maxLength="300" required /></Field>}
          <Field label="Reason for creating this promotion" className="sm:col-span-2"><textarea className={`${input} min-h-24 resize-y`} value={form.reason} onChange={update('reason')} minLength="10" maxLength="500" aria-describedby="coupon-reason-help" required /><span id="coupon-reason-help" className="mt-1.5 block text-sm font-normal text-white/55">Record the campaign, approver, or business purpose. This becomes audit evidence in secure mode.</span></Field>
        </div>
        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-adm-line bg-adm-surface px-5 py-4"><button type="button" onClick={() => setShowCreate(false)} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold">Cancel</button><button type="submit" disabled={working || form.reason.trim().length < 10} className="min-h-11 rounded-adm-sm bg-gold px-5 text-sm font-bold text-adm-bg disabled:opacity-40">{working ? 'Saving…' : 'Save coupon'}</button></footer>
      </form>
    </div>}

    {pendingAction && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="coupon-action-title">
      <form onSubmit={confirmAction} className="w-full max-w-lg rounded-adm border border-adm-line bg-adm-surface shadow-adm-float">
        <header className="flex items-start justify-between border-b border-adm-line px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-gold">Coupon decision</p><h2 id="coupon-action-title" className="mt-1 font-sans text-xl font-bold">{pendingAction.type === 'archive' ? 'Archive' : pendingAction.type === 'activate' ? 'Activate' : 'Pause'} {pendingAction.coupon.code}</h2><p className="mt-2 text-sm text-white/60">{pendingAction.type === 'archive' ? 'Archiving stops validation immediately and cannot be undone from this screen.' : 'The change affects whether checkout can validate this code.'}</p></div><button type="button" onClick={() => setPendingAction(null)} aria-label="Close coupon decision" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-adm-sm hover:bg-white/5"><XIcon /></button></header>
        <div className="p-5"><Field label="Decision reason"><textarea autoFocus className={`${input} min-h-28 resize-y`} value={pendingAction.reason} onChange={event => setPendingAction(current => ({ ...current, reason: event.target.value, key: operationKey() }))} minLength="10" maxLength="500" aria-describedby="coupon-action-help" required /><span id="coupon-action-help" className="mt-1.5 block text-sm font-normal text-white/55">At least 10 characters. State what changed and who approved it.</span></Field></div>
        <footer className="flex justify-end gap-2 border-t border-adm-line px-5 py-4"><button type="button" onClick={() => setPendingAction(null)} className="min-h-11 rounded-adm-sm border border-adm-line px-4 text-sm font-semibold">Cancel</button><button type="submit" disabled={working || pendingAction.reason.trim().length < 10} className={`min-h-11 rounded-adm-sm px-5 text-sm font-bold disabled:opacity-40 ${pendingAction.type === 'archive' ? 'bg-crimson text-white' : 'bg-gold text-adm-bg'}`}>{working ? 'Recording…' : `Confirm ${pendingAction.type}`}</button></footer>
      </form>
    </div>}
  </div>
}

function CouponActions({ coupon, working, state, onAction }) {
  return <div className="flex flex-wrap justify-end gap-2"><button disabled={working || Boolean(coupon.archived_at) || state.expired || state.exhausted} onClick={() => onAction(coupon, coupon.is_active ? 'pause' : 'activate')} className="min-h-11 rounded-adm-sm border border-adm-line bg-white/5 px-3 text-sm font-semibold disabled:opacity-35">{coupon.is_active ? 'Pause' : 'Activate'}</button><button disabled={working || Boolean(coupon.archived_at)} onClick={() => onAction(coupon, 'archive')} className="min-h-11 rounded-adm-sm border border-crimson/30 bg-crimson/10 px-3 text-sm font-semibold text-crimson disabled:opacity-35">Archive</button></div>
}

function CouponRow({ coupon, working, onAction }) {
  const state = stateFor(coupon)
  return <tr className="hover:bg-white/[0.025]"><td className="px-4 py-4"><p className="font-mono text-sm font-bold text-gold">{coupon.code}</p><p className="mt-1 max-w-xs text-sm text-white/55">{coupon.description || 'No description'}</p>{coupon.is_hunt && <p className="mt-1 text-xs font-bold uppercase tracking-wider text-blue">Voucher hunt</p>}</td><td className="px-4 py-4"><p className="font-semibold">{coupon.discount_type === 'percentage' ? `${Number(coupon.discount_value)}% off` : `₱${Number(coupon.discount_value).toLocaleString()} off`}</p><p className="mt-1 text-sm text-white/55">Minimum ₱{Number(coupon.min_spend || 0).toLocaleString()}</p></td><td className="px-4 py-4 text-sm text-white/65"><p>{new Date(coupon.starts_at).toLocaleString()}</p><p className="mt-1">{coupon.ends_at ? `to ${new Date(coupon.ends_at).toLocaleString()}` : 'No end date'}</p></td><td className="px-4 py-4 text-sm tabular-nums"><strong>{coupon.redemption_count}</strong> / {coupon.max_redemptions ?? 'Unlimited'}</td><td className="px-4 py-4"><StatusPill tone={state.tone}>{state.label}</StatusPill></td><td className="px-4 py-4"><CouponActions coupon={coupon} working={working} state={state} onAction={onAction} /></td></tr>
}

function CouponCard({ coupon, working, onAction }) {
  const state = stateFor(coupon)
  return <article className="rounded-adm-sm border border-adm-line bg-adm-sunken p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-base font-bold text-gold">{coupon.code}</p><p className="mt-1 text-sm leading-6 text-white/65">{coupon.description || 'No description'}</p></div><StatusPill tone={state.tone}>{state.label}</StatusPill></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-white/50">Discount</dt><dd className="mt-1 font-semibold">{coupon.discount_type === 'percentage' ? `${Number(coupon.discount_value)}%` : `₱${Number(coupon.discount_value).toLocaleString()}`}</dd></div><div><dt className="text-white/50">Uses</dt><dd className="mt-1 font-semibold tabular-nums">{coupon.redemption_count} / {coupon.max_redemptions ?? 'Unlimited'}</dd></div><div className="col-span-2"><dt className="text-white/50">Window</dt><dd className="mt-1 leading-6">{new Date(coupon.starts_at).toLocaleString()}<br />{coupon.ends_at ? `to ${new Date(coupon.ends_at).toLocaleString()}` : 'No end date'}</dd></div></dl><div className="mt-4 border-t border-adm-line pt-3"><CouponActions coupon={coupon} working={working} state={state} onAction={onAction} /></div></article>
}

function Field({ label, className = '', children }) {
  return <label className={`block text-sm font-semibold text-white/70 ${className}`}>{label}<span className="mt-1.5 block">{children}</span></label>
}
