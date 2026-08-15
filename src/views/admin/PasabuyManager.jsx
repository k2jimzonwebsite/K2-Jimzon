import { useCallback, useEffect, useMemo, useState } from 'react'
import { peso } from '../../data/products'
import { supabase } from '../../lib/supabaseClient'
import { ArrowIcon, InboxIcon } from '../../components/ui/icons'
import PasabuyWorkflowDiagram from '../../components/admin/guides/PasabuyWorkflowDiagram'
import {
  adminBffEnabled, getAdminPasabuy, savePasabuyQuoteBff, transitionPasabuyBff,
} from '../../services/adminBffService'
import {
  EmptyState,
  MetricRail,
  SectionHeading,
  StateBanner,
  StatusPill,
  WorkspaceIntro,
  primaryButton,
  secondaryButton,
} from './AdminWorkspaceUi'

const STATUS_LABELS = {
  request_received: 'Request received', researching: 'Researching', quoted: 'Quoted',
  approved: 'Approved for sourcing', purchasing: 'Purchasing', purchased: 'Purchased',
  in_transit: 'In transit', arrived: 'Arrived for receiving', delivered: 'Delivered',
  expired: 'Quote expired', cancelled: 'Cancelled',
}

const NEXT = {
  request_received: ['researching', 'cancelled'],
  researching: ['quoted', 'cancelled'],
  quoted: ['approved', 'researching', 'expired', 'cancelled'],
  approved: ['purchasing', 'cancelled'],
  purchasing: ['purchased', 'cancelled'],
  purchased: ['in_transit'], in_transit: ['arrived'], arrived: ['delivered'],
}

const CLOSED = new Set(['delivered', 'expired', 'cancelled'])
const REVIEW = new Set(['request_received', 'researching'])
const SOURCING = new Set(['approved', 'purchasing', 'purchased', 'in_transit', 'arrived'])

const DEFAULT_QUOTE = {
  itemCost: '10', fxRate: '62.50', fxSource: '', weightKg: '0.5',
  shippingMethod: 'air', airRate: '14', seaRate: '4', customsPercent: '12',
  handlingPhp: '0', marginPercent: '40', finalPrice: '', validDays: '7',
  priceRationale: '',
}

function latestQuoteFor(request) {
  return [...(request?.pasabuy_quotes || [])].sort((a, b) => Number(b.version) - Number(a.version))[0] || null
}

function ageLabel(value) {
  if (!value) return 'Age unavailable'
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000))
  if (hours < 24) return `${hours}h old`
  return `${Math.floor(hours / 24)}d old`
}

function quoteDeadline(quote) {
  if (!quote?.valid_until) return null
  const delta = new Date(quote.valid_until).getTime() - Date.now()
  const days = Math.ceil(Math.abs(delta) / 86400000)
  return delta < 0 ? { expired: true, label: `Expired ${days}d ago` } : { expired: false, label: `${days}d remaining` }
}

function statusTone(status) {
  if (['expired', 'cancelled'].includes(status)) return 'danger'
  if (['delivered'].includes(status)) return 'success'
  if (['quoted', 'approved', 'purchasing'].includes(status)) return 'warning'
  if (['purchased', 'in_transit', 'arrived'].includes(status)) return 'info'
  return 'neutral'
}

export default function PasabuyManager() {
  const secureAdmin = adminBffEnabled()
  const [requests, setRequests] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('open')
  const [quote, setQuote] = useState(DEFAULT_QUOTE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [transitionReason, setTransitionReason] = useState('')
  const [showPasabuyGuide, setShowPasabuyGuide] = useState(false)

  const load = useCallback(async () => {
    if (secureAdmin) {
      const result = await getAdminPasabuy()
      if (!result.ok) setError(result.error)
      else {
        const data = result.data?.requests || []
        setRequests(data)
        setSelectedId(current => current || data[0]?.id || null)
      }
      setLoading(false)
      return
    }
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    const { data, error: loadError } = await supabase
      .from('pasabuy_requests')
      .select('*, pasabuy_quotes(*)')
      .order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else {
      setRequests(data || [])
      setSelectedId(current => current || data?.[0]?.id || null)
    }
    setLoading(false)
  }, [secureAdmin])

  useEffect(() => {
    load()
    if (secureAdmin) {
      const timer = window.setInterval(load, 30_000)
      return () => window.clearInterval(timer)
    }
    if (!supabase) return undefined
    const channel = supabase.channel('admin:pasabuy')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pasabuy_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pasabuy_quotes' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load, secureAdmin])

  const selected = requests.find(request => request.id === selectedId) || null
  const latestQuote = useMemo(() => latestQuoteFor(selected), [selected])

  useEffect(() => {
    setTransitionReason('')
    if (!latestQuote) { setQuote(DEFAULT_QUOTE); return }
    setQuote({
      itemCost: String(latestQuote.item_cost_foreign), fxRate: String(latestQuote.fx_rate),
      fxSource: latestQuote.fx_source || '', weightKg: String(latestQuote.weight_kg),
      shippingMethod: latestQuote.shipping_method,
      airRate: latestQuote.shipping_method === 'air' ? String(latestQuote.freight_rate_foreign_per_kg) : '14',
      seaRate: latestQuote.shipping_method === 'sea' ? String(latestQuote.freight_rate_foreign_per_kg) : '4',
      customsPercent: String(latestQuote.customs_tax_percent), handlingPhp: String(latestQuote.handling_php),
      marginPercent: String(latestQuote.margin_percent), finalPrice: String(latestQuote.final_price_php), validDays: '7',
      priceRationale: '',
    })
  }, [selectedId, latestQuote?.id])

  const numbers = {
    itemCost: Number(quote.itemCost) || 0, fxRate: Number(quote.fxRate) || 0,
    weight: Number(quote.weightKg) || 0,
    rate: Number(quote.shippingMethod === 'air' ? quote.airRate : quote.seaRate) || 0,
    customs: Number(quote.customsPercent) || 0, handling: Number(quote.handlingPhp) || 0,
    margin: Number(quote.marginPercent) || 0,
  }
  const itemPhp = numbers.itemCost * numbers.fxRate
  const freightPhp = numbers.weight * numbers.rate * numbers.fxRate
  const taxPhp = (itemPhp + freightPhp) * (numbers.customs / 100)
  const landed = itemPhp + freightPhp + taxPhp + numbers.handling
  const suggested = Math.ceil(landed * (1 + numbers.margin / 100))
  const finalPrice = quote.finalPrice === '' ? suggested : Number(quote.finalPrice) || 0

  const filtered = requests.filter(request => {
    if (filter === 'all') return true
    if (filter === 'closed') return CLOSED.has(request.status)
    if (filter === 'review') return REVIEW.has(request.status)
    if (filter === 'sourcing') return SOURCING.has(request.status)
    return !CLOSED.has(request.status)
  })
  const openRequests = requests.filter(request => !CLOSED.has(request.status))
  const expiringQuotes = openRequests.filter(request => {
    const deadline = quoteDeadline(latestQuoteFor(request))
    if (!deadline || deadline.expired) return false
    return new Date(latestQuoteFor(request).valid_until).getTime() - Date.now() <= 3 * 86400000
  }).length
  const oldestOpenHours = openRequests.reduce((max, request) => Math.max(max, Math.floor((Date.now() - new Date(request.created_at || Date.now()).getTime()) / 3600000)), 0)

  const transition = async toStatus => {
    if (!selected || (!secureAdmin && !supabase)) return
    const reason = secureAdmin ? transitionReason.trim() : 'Updated from admin operations'
    if (!reason) { setError('Record why this Pasabuy case is moving to the next state.'); return }
    setSaving(true); setError(''); setNotice('')
    const result = secureAdmin
      ? await transitionPasabuyBff(selected.id, toStatus, reason)
      : await supabase.rpc('transition_pasabuy_request', {
        p_request_id: selected.id, p_to_status: toStatus, p_reason: reason,
      })
    setSaving(false)
    if (secureAdmin ? !result.ok : result.error) { setError(secureAdmin ? result.error : result.error.message); return }
    setTransitionReason('')
    setNotice(`Moved to ${STATUS_LABELS[toStatus]}.`)
    await load()
  }

  const saveQuote = async () => {
    if (!selected || (!secureAdmin && !supabase)) return
    if (!quote.fxSource.trim()) { setError('Enter the FX source used for this quote.'); return }
    if (finalPrice < landed) { setError('Final price cannot be below the estimated landed cost.'); return }
    if (secureAdmin && !quote.priceRationale.trim()) { setError('Record why the owner selected this final price.'); return }
    setSaving(true); setError(''); setNotice('')
    const validUntil = new Date(Date.now() + (Number(quote.validDays) || 7) * 86400000).toISOString()
    const fxCapturedAt = new Date().toISOString()
    const result = secureAdmin
      ? await savePasabuyQuoteBff({
        requestId: selected.id, itemCostForeign: numbers.itemCost, fxRate: numbers.fxRate,
        fxSource: quote.fxSource.trim(), fxCapturedAt, weightKg: numbers.weight,
        shippingMethod: quote.shippingMethod, freightRateForeignPerKg: numbers.rate,
        customsTaxPercent: numbers.customs, handlingPhp: numbers.handling,
        marginPercent: numbers.margin, finalPricePhp: finalPrice, validUntil,
        priceRationale: quote.priceRationale.trim(),
      })
      : await supabase.rpc('save_pasabuy_quote', {
        p_request_id: selected.id, p_item_cost_foreign: numbers.itemCost,
        p_fx_rate: numbers.fxRate, p_fx_source: quote.fxSource.trim(), p_fx_captured_at: fxCapturedAt,
        p_weight_kg: numbers.weight, p_shipping_method: quote.shippingMethod,
        p_freight_rate_foreign_per_kg: numbers.rate, p_customs_tax_percent: numbers.customs,
        p_handling_php: numbers.handling, p_margin_percent: numbers.margin,
        p_final_price_php: finalPrice, p_valid_until: validUntil,
      })
    setSaving(false)
    if (secureAdmin ? !result.ok : result.error) { setError(secureAdmin ? result.error : result.error.message); return }
    setQuote(current => ({ ...current, priceRationale: '' }))
    setNotice('Quote version saved. It has not been sent to the customer.')
    await load()
  }

  const copyQuote = async () => {
    if (!selected || !latestQuote) return
    const message = `K2 Jimzon Pasabuy ${selected.public_reference}\n${selected.item_title}\nQuantity: ${selected.quantity}\nQuoted price: ${peso(latestQuote.final_price_php)}\nValid until: ${latestQuote.valid_until ? new Date(latestQuote.valid_until).toLocaleDateString() : 'confirm with K2'}\nReply to K2 Jimzon to approve. No payment has been requested yet.`
    try {
      await navigator.clipboard.writeText(message)
      setNotice('Quote message copied. Send it through the customer verified contact channel, then record their response.')
    } catch {
      setError('Clipboard access was blocked. Copy the quote details manually.')
    }
  }

  const q = key => event => setQuote(current => ({ ...current, [key]: event.target.value }))
  const input = 'adm-input min-h-11 text-base sm:text-sm'
  const selectedDeadline = quoteDeadline(latestQuote)

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-12">
      <WorkspaceIntro
        eyebrow="Pasabuy operations"
        title="Request and quote control"
        description="Review customer requests, version every estimate, retain FX evidence, and advance only through valid operational states. Saving or copying a quote does not mark it sent or paid."
        status={loading ? 'Loading request evidence' : `${openRequests.length} open cases`}
        statusTone={openRequests.length ? 'warning' : 'success'}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowPasabuyGuide((v) => !v)}
          className="flex items-center gap-1.5 rounded-adm-sm border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20"
        >
          <span>{showPasabuyGuide ? 'Hide Sourcing Map ▴' : '🗺️ View Pasabuy Sourcing & Quoting Map ▸'}</span>
        </button>
      </div>

      {showPasabuyGuide && (
        <div className="animate-in fade-in duration-200">
          <PasabuyWorkflowDiagram />
        </div>
      )}

      <MetricRail items={[
        { label: 'Open cases', value: loading ? '--' : openRequests.length, detail: 'Intake through arrival', tone: openRequests.length ? 'text-amber' : 'text-white' },
        { label: 'Needs review', value: loading ? '--' : requests.filter(request => REVIEW.has(request.status)).length, detail: 'Request received or research', tone: requests.some(request => REVIEW.has(request.status)) ? 'text-crimson' : 'text-white' },
        { label: 'Quotes expiring', value: loading ? '--' : expiringQuotes, detail: 'Within the next 3 days', tone: expiringQuotes ? 'text-amber' : 'text-white' },
        { label: 'Oldest open', value: loading ? '--' : openRequests.length ? (oldestOpenHours < 24 ? `${oldestOpenHours}h` : `${Math.floor(oldestOpenHours / 24)}d`) : '--', detail: 'Age since submission' },
      ]} />

      {(error || notice) && <StateBanner tone={error ? 'danger' : 'success'}>{error || notice}</StateBanner>}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="min-w-0 space-y-3" aria-label="Pasabuy request queue">
          <SectionHeading title="Priority queue" description="Filter by the work that must happen next." count={filtered.length} />
          <div className="grid grid-cols-2 gap-1 rounded-adm-sm border border-adm-line bg-adm-surface p-1 sm:grid-cols-5 xl:grid-cols-2" aria-label="Filter Pasabuy requests">
            {['open', 'review', 'sourcing', 'closed', 'all'].map(value => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-10 rounded-adm-sm px-3 text-xs font-semibold capitalize transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${filter === value ? 'bg-blue text-white' : 'text-white/50 hover:bg-white/[0.05] hover:text-white'}`}>{value}</button>)}
          </div>
          <div className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
            {loading && <div className="space-y-2 p-3" role="status">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-adm-sm bg-white/[0.05]" />)}</div>}
            {!loading && filtered.length === 0 && <EmptyState icon={InboxIcon} title={`No ${filter} requests`} description="New website submissions will appear here with their real request state." />}
            <div className="divide-y divide-adm-line">
              {filtered.map(request => {
                const requestQuote = latestQuoteFor(request)
                const deadline = quoteDeadline(requestQuote)
                return (
                  <button key={request.id} onClick={() => { setSelectedId(request.id); setError(''); setNotice('') }} aria-current={selectedId === request.id ? 'true' : undefined} className={`w-full px-4 py-3.5 text-left transition-[transform,background-color] duration-150 active:scale-[0.99] ${selectedId === request.id ? 'bg-blue/10' : 'hover:bg-white/[0.025]'}`}>
                    <div className="flex items-start justify-between gap-3"><span className="font-mono text-xs font-semibold text-blue">{request.public_reference || String(request.id).slice(0, 8)}</span><StatusPill tone={statusTone(request.status)}>{STATUS_LABELS[request.status] || request.status}</StatusPill></div>
                    <p className="mt-2 truncate text-sm font-semibold text-white">{request.item_title || 'Untitled request'}</p>
                    <p className="mt-1 truncate text-xs text-white/45">{request.customer_name || 'Customer'} / Qty {request.quantity || 0}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/35"><span>{ageLabel(request.created_at)}</span><span>{request.assigned_to ? 'Assigned' : 'Owner: unassigned'}</span>{deadline && <span className={deadline.expired ? 'text-crimson' : 'text-amber'}>{deadline.label}</span>}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="min-w-0">
          {!selected ? <EmptyState title="Select a Pasabuy case" description="Choose a request to review evidence, calculate a quote, and advance its valid next state." /> : (
            <div className="space-y-5">
              <div className="border-b border-adm-line pb-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-blue">{selected.public_reference}</span><StatusPill tone={statusTone(selected.status)}>{STATUS_LABELS[selected.status] || selected.status}</StatusPill>{selectedDeadline && <StatusPill tone={selectedDeadline.expired ? 'danger' : 'warning'}>{selectedDeadline.label}</StatusPill>}</div><h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{selected.item_title}</h2><p className="mt-1 text-sm text-white/50">{selected.customer_name} / {selected.customer_email || selected.customer_phone || 'Contact unavailable'} / Qty {selected.quantity}</p><p className="mt-2 text-xs text-white/35">Owner: {selected.assigned_to || 'Unassigned'} / Submitted {ageLabel(selected.created_at)}</p>{selected.reference_url && <a className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue underline underline-offset-4" href={selected.reference_url} target="_blank" rel="noreferrer">Open customer reference <ArrowIcon size={14} /></a>}</div>
                  <div className="w-full space-y-2 lg:max-w-lg">
                    {secureAdmin && (NEXT[selected.status] || []).length > 0 && <Field label="Transition reason" hint="Required audit note; describe the evidence or customer decision."><input className={input} maxLength={500} value={transitionReason} onChange={event => setTransitionReason(event.target.value)} placeholder="Why is this case ready to move?" /></Field>}
                    <div className="flex flex-wrap gap-2">{(NEXT[selected.status] || []).map(status => <button key={status} disabled={saving} onClick={() => transition(status)} className={status === 'cancelled' ? `${secondaryButton} text-crimson` : primaryButton}>Move to {STATUS_LABELS[status]}</button>)}</div>
                  </div>
                </div>
              </div>

              <section className="space-y-3">
                <SectionHeading title="Quote assumptions" description="Estimated inputs only. FX source and capture time are stored with every saved version." />
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  <Field label="Item cost (EUR)"><input className={input} type="number" min="0" step="0.01" value={quote.itemCost} onChange={q('itemCost')} /></Field>
                  <Field label="EUR/PHP rate"><input className={input} type="number" min="0.01" step="0.01" value={quote.fxRate} onChange={q('fxRate')} /></Field>
                  <Field label="FX source"><input className={input} value={quote.fxSource} onChange={q('fxSource')} placeholder="Bank or published source" /></Field>
                  <Field label="Weight (kg)"><input className={input} type="number" min="0" step="0.01" value={quote.weightKg} onChange={q('weightKg')} /></Field>
                  <Field label="Route"><select className={input} value={quote.shippingMethod} onChange={q('shippingMethod')}><option value="air">Air</option><option value="sea">Sea</option></select></Field>
                  <Field label={`${quote.shippingMethod === 'air' ? 'Air' : 'Sea'} rate (EUR/kg)`}><input className={input} type="number" min="0" step="0.01" value={quote.shippingMethod === 'air' ? quote.airRate : quote.seaRate} onChange={q(quote.shippingMethod === 'air' ? 'airRate' : 'seaRate')} /></Field>
                  <Field label="Customs/tax estimate %"><input className={input} type="number" min="0" max="100" step="0.1" value={quote.customsPercent} onChange={q('customsPercent')} /></Field>
                  <Field label="Handling (PHP)"><input className={input} type="number" min="0" step="1" value={quote.handlingPhp} onChange={q('handlingPhp')} /></Field>
                </div>
              </section>

              <MetricRail items={[
                { label: 'Item in PHP', value: peso(itemPhp), detail: `${numbers.itemCost} EUR at ${numbers.fxRate}` },
                { label: 'Freight estimate', value: peso(freightPhp), detail: `${numbers.weight}kg by ${quote.shippingMethod}` },
                { label: 'Tax estimate', value: peso(taxPhp), detail: `${numbers.customs}% assumption` },
                { label: 'Estimated landed', value: peso(landed), detail: 'Before target margin', tone: 'text-amber' },
              ]} />

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Target margin %"><input className={input} type="number" step="1" value={quote.marginPercent} onChange={q('marginPercent')} /></Field>
                <Field label="Final quote (PHP)"><input className={input} type="number" min="0" step="1" value={quote.finalPrice === '' ? suggested : quote.finalPrice} onChange={q('finalPrice')} /></Field>
                <Field label="Valid for days"><input className={input} type="number" min="1" max="30" value={quote.validDays} onChange={q('validDays')} /></Field>
              </div>

              {secureAdmin && <Field label="Owner price rationale" hint="Required internal record. Note season, scarcity, delivery difficulty, or another factor behind the selected price."><textarea className={`${input} min-h-24 resize-y py-3`} maxLength={500} value={quote.priceRationale} onChange={q('priceRationale')} placeholder="Why was this final price selected?" /></Field>}

              <div className="flex flex-col justify-between gap-3 border-t border-adm-line pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-white/45">Suggested {peso(suggested)} / Latest saved {latestQuote ? `version ${latestQuote.version}` : 'none'} / Saving does not send</p>
                <div className="flex flex-col gap-2 sm:flex-row"><button onClick={saveQuote} disabled={saving} className={`${primaryButton} bg-amber text-navy hover:bg-amber/90`}>{saving ? 'Saving...' : 'Save new quote version'}</button><button onClick={copyQuote} disabled={!latestQuote} className={`${secondaryButton} border-forest/35 text-forest`}>Copy saved quote message</button></div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return <label className="block text-xs font-semibold text-white/60">{label}<span className="mt-1.5 block">{children}</span>{hint && <span className="mt-1.5 block text-xs font-normal leading-5 text-white/40">{hint}</span>}</label>
}
