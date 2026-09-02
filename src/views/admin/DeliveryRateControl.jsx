import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminBffEnabled,
  getAdminDeliveryControlBff,
  publishDeliveryCostBff,
  setDeliveryCourierStateBff,
  setDeliverySourceStateBff,
  testAdminDeliveryQuoteBff,
  upsertDeliveryCourierBff,
} from '../../services/adminBffService'
import {
  DELIVERY_OUTCOMES,
  PILOT_CHANNELS,
  formatDeliveryFee,
  resolveDeliveryQuote,
} from '../../lib/deliveryQuote'
import {
  EmptyState, MetricRail, SectionHeading, StateBanner, StatusPill, WorkspaceIntro,
  primaryButton, secondaryButton,
} from './AdminWorkspaceUi'

// The workbook's colour key, kept identical so staff who learned it there read the
// dashboard the same way: green may be communicated, amber needs a call, red stops.
const OUTCOME_TONE = {
  STANDARD_FEE: 'success',
  PICKUP_ZERO: 'success',
  MANUAL_COURIER_QUOTE: 'warning',
  DATA_CONFLICT_STOP: 'danger',
  INPUT_ERROR: 'danger',
  PLATFORM_CHARGED_EXTERNAL: 'neutral',
  UNAVAILABLE: 'neutral',
}

const TABS = [
  ['tester', 'Quote tester'],
  ['rates', 'Rates'],
  ['couriers', 'Couriers'],
  ['localities', 'Localities'],
  ['sources', 'Evidence'],
]

const EMPTY_QUOTE_INPUTS = {
  channel: 'Website',
  service: 'K2 Standard Delivery',
  originId: 'WAREHOUSE_A',
  localityId: '',
  parcelCount: 1,
  weightG: 1000,
  weightBasis: 'MEASURED',
  oversize: false,
  remoteArea: false,
  specialProtection: false,
  merchandiseSubtotalMinor: 0,
  recalculationConfirmed: false,
  quoteDate: '',
}

const operationKey = () =>
  typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : ''

/** Asia/Manila calendar date. Effective intervals are compared as plain dates. */
function manilaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const at = (type) => parts.find((part) => part.type === type)?.value
  return `${at('year')}-${at('month')}-${at('day')}`
}

const peso = (minor) => (Number.isInteger(minor) ? formatDeliveryFee(minor) : '—')

function pesoInputToMinor(value) {
  const parsed = Number.parseFloat(String(value).replace(/,/g, ''))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
}

function Th({ children, align = 'left' }) {
  return (
    <th scope="col" className={`whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/40 text-${align}`}>
      {children}
    </th>
  )
}

function Td({ children, align = 'left', mono = false, className = '' }) {
  return (
    <td className={`px-3 py-2.5 align-top text-sm text-white/75 text-${align} ${mono ? 'font-mono tabular-nums' : ''} ${className}`}>
      {children}
    </td>
  )
}

function DataTable({ head, children, caption }) {
  return (
    <div className="overflow-x-auto rounded-adm border border-adm-line bg-adm-surface">
      <table className="w-full min-w-[52rem] border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="border-b border-adm-line bg-white/[0.02]">{head}</thead>
        <tbody className="divide-y divide-adm-line">{children}</tbody>
      </table>
    </div>
  )
}

export default function DeliveryRateControl() {
  const secure = adminBffEnabled()
  const [tables, setTables] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState('tester')
  const [inputs, setInputs] = useState({ ...EMPTY_QUOTE_INPUTS, quoteDate: manilaToday() })
  const [serverQuote, setServerQuote] = useState(null)
  const [priceEdit, setPriceEdit] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    if (!secure) {
      setError('Delivery rate control requires the secure admin BFF.')
      setLoading(false)
      return
    }
    const result = await getAdminDeliveryControlBff()
    if (!result.ok) setError(result.error)
    else { setTables(result.data); setError('') }
    setLoading(false)
  }, [secure])

  useEffect(() => { load() }, [load])

  // The tester previews locally against the same tables and the same function the
  // server runs, so staff get instant feedback; the authoritative outcome still
  // comes from the server before anything is communicated to a customer.
  const preview = useMemo(
    () => (tables ? resolveDeliveryQuote(inputs, tables) : null),
    [inputs, tables],
  )

  const quotableLocalities = useMemo(
    () => (tables?.localityRules || []).filter(
      (rule) => rule.scope === 'EXACT_PILOT' && rule.status === 'PILOT_APPROVED',
    ),
    [tables],
  )

  const metrics = useMemo(() => {
    const options = tables?.courierOptions || []
    const costs = tables?.costRows || []
    const today = manilaToday()
    const activeCosts = costs.filter(
      (row) => row.status === 'ACTIVE_APPROVED'
        && row.effectiveFrom <= today
        && (!row.effectiveTo || row.effectiveTo > today),
    )
    const stale = (tables?.sources || []).filter((source) => source.freshness !== 'CURRENT').length
    return [
      { label: 'Quotable localities', value: String(quotableLocalities.length) },
      {
        label: 'Selectable couriers',
        value: String(options.filter((option) => option.eligibility === 'AUTO_QUOTE_ELIGIBLE').length),
        detail: `${options.length} configured`,
      },
      { label: 'Active rates', value: String(activeCosts.length) },
      {
        label: 'Evidence to review',
        value: String(stale),
        tone: stale ? 'text-amber' : 'text-white',
        detail: stale ? 'Affected routes quote manually' : 'All sources current',
      },
    ]
  }, [tables, quotableLocalities])

  const set = (key) => (event) => {
    const target = event.target
    const value = target.type === 'checkbox' ? target.checked : target.value
    setInputs((current) => ({ ...current, [key]: value }))
    setServerQuote(null)
  }

  const setNumber = (key) => (event) => {
    const raw = event.target.value
    setInputs((current) => ({
      ...current,
      [key]: raw === '' ? null : Number.parseInt(raw, 10),
    }))
    setServerQuote(null)
  }

  const runServerQuote = async () => {
    setWorking(true); setError(''); setNotice('')
    const result = await testAdminDeliveryQuoteBff(inputs)
    if (!result.ok) setError(result.error)
    else setServerQuote(result.data?.quote || null)
    setWorking(false)
  }

  const publishPrice = async () => {
    if (!priceEdit) return
    const amountMinor = pesoInputToMinor(priceEdit.amount)
    if (!amountMinor) { setError('Enter a delivery cost greater than zero.'); return }
    if (priceEdit.reason.trim().length < 10) {
      setError('Record why this rate changed, in at least ten characters.')
      return
    }
    setWorking(true); setError(''); setNotice('')
    const result = await publishDeliveryCostBff({
      costId: priceEdit.costId,
      optionId: priceEdit.optionId,
      originId: priceEdit.originId,
      localityId: priceEdit.localityId,
      profileId: priceEdit.profileId,
      sourceId: priceEdit.sourceId,
      completeness: 'PROVIDER_TOTAL_COMPLETE',
      amountMinor,
      approvedByOwner: true,
      effectiveFrom: priceEdit.effectiveFrom,
      notes: priceEdit.reason.trim(),
      reason: priceEdit.reason.trim(),
    }, operationKey())
    if (!result.ok) setError(result.error)
    else {
      setNotice(`New rate published, effective ${priceEdit.effectiveFrom}. Orders already quoted keep their frozen fee.`)
      setPriceEdit(null)
      await load()
    }
    setWorking(false)
  }

  const toggleCourier = async (option, eligibility) => {
    setWorking(true); setError(''); setNotice('')
    const result = await setDeliveryCourierStateBff({
      optionId: option.optionId,
      eligibility,
      approved: eligibility === 'AUTO_QUOTE_ELIGIBLE' ? true : option.approved,
      reason: `Staff set ${option.providerName} ${option.serviceName} to ${eligibility}.`,
    }, operationKey())
    if (!result.ok) setError(result.error)
    else {
      setNotice(
        eligibility === 'AUTO_QUOTE_ELIGIBLE'
          ? `${option.providerName} is now selectable. Every route it covers needs a current cost row, or that route quotes manually.`
          : `${option.providerName} no longer takes part in automatic quoting.`,
      )
      await load()
    }
    setWorking(false)
  }

  const reviewSource = async (source, freshness) => {
    setWorking(true); setError(''); setNotice('')
    const result = await setDeliverySourceStateBff({
      sourceId: source.sourceId,
      freshness,
      reviewDueOn: source.reviewDueOn || null,
      reason: `Staff marked ${source.sourceId} as ${freshness}.`,
    }, operationKey())
    if (!result.ok) setError(result.error)
    else { setNotice(`${source.sourceId} is now ${freshness}.`); await load() }
    setWorking(false)
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-white/45">Loading delivery rate control…</p>
  }

  const shown = serverQuote || preview
  const outcome = shown?.outcome

  return (
    <div className="space-y-5">
      <WorkspaceIntro
        eyebrow="MAP-023"
        title="Delivery rates & couriers"
        description="The owner-approved controlled pilot. A fee is only ever produced for an exact approved locality with a current, complete, approved cost on every selectable courier. Everything else routes to a manual courier quote — no regional fallback exists."
        status={secure ? 'Signed admin commands' : 'BFF required'}
        statusTone={secure ? 'success' : 'danger'}
        actions={
          <button type="button" className={secondaryButton} onClick={load} disabled={working}>
            Refresh
          </button>
        }
      />

      {error && <StateBanner tone="danger" role="alert">{error}</StateBanner>}
      {notice && <StateBanner tone="success">{notice}</StateBanner>}

      <MetricRail items={metrics} />

      <div className="flex flex-wrap gap-1.5 border-b border-adm-line pb-3" role="tablist" aria-label="Delivery control sections">
        {TABS.map(([id, labelText]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={
              'adm-btn min-h-9 px-3 text-sm transition-[background-color,color] duration-150 ' +
              (tab === id
                ? 'bg-blue/12 font-semibold text-white'
                : 'text-white/50 hover:bg-white/[0.04] hover:text-white')
            }
          >
            {labelText}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {tab === 'tester' && (
        <section className="space-y-4">
          <SectionHeading
            title="Quote tester"
            description="Resolve one order the way the storefront will. Nothing is saved and no customer is charged until you communicate the result."
          />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-3 rounded-adm border border-adm-line bg-adm-surface p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="adm-label">Channel</span>
                  <select className="adm-input" value={inputs.channel} onChange={set('channel')}>
                    <option value="">Select…</option>
                    {['Website', 'Pasabuy', 'Wholesale', 'Marketplace'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="adm-label">Service</span>
                  <select className="adm-input" value={inputs.service} onChange={set('service')}>
                    <option value="">Select…</option>
                    {['K2 Standard Delivery', 'K2 Pickup', 'Platform Delivery'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="adm-label">Exact destination</span>
                  <select className="adm-input" value={inputs.localityId} onChange={set('localityId')}>
                    <option value="">Select an approved locality…</option>
                    {quotableLocalities.map((rule) => (
                      <option key={rule.localityId} value={rule.localityId}>
                        {rule.cityMunicipality} — {rule.barangay}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-white/40">
                    A destination that is not listed here is outside the pilot and must be quoted with the courier.
                  </span>
                </label>
                <label className="block">
                  <span className="adm-label">Parcels</span>
                  <input type="number" min="1" className="adm-input" value={inputs.parcelCount ?? ''} onChange={setNumber('parcelCount')} />
                </label>
                <label className="block">
                  <span className="adm-label">Packed weight (g)</span>
                  <input type="number" min="1" className="adm-input" value={inputs.weightG ?? ''} onChange={setNumber('weightG')} />
                </label>
                <label className="block">
                  <span className="adm-label">Weight basis</span>
                  <select className="adm-input" value={inputs.weightBasis} onChange={set('weightBasis')}>
                    <option value="UNKNOWN">Unknown</option>
                    <option value="MEASURED">Measured</option>
                    <option value="FROZEN_CONSERVATIVE">Frozen conservative estimate</option>
                  </select>
                </label>
                <label className="block">
                  <span className="adm-label">Merchandise subtotal (centavos)</span>
                  <input type="number" min="0" className="adm-input" value={inputs.merchandiseSubtotalMinor ?? ''} onChange={setNumber('merchandiseSubtotalMinor')} />
                </label>
              </div>

              <fieldset className="rounded-adm-sm border border-adm-line p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/40">
                  Exceptions — each must be answered
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    ['oversize', 'Oversize parcel'],
                    ['remoteArea', 'Remote / ODZ area'],
                    ['specialProtection', 'Needs special protection'],
                  ].map(([key, labelText]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-white/70">
                      <input type="checkbox" checked={inputs[key] === true} onChange={set(key)} />
                      {labelText}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-start gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={inputs.recalculationConfirmed === true}
                  onChange={set('recalculationConfirmed')}
                />
                <span>
                  I have confirmed today&rsquo;s date and every input above is current.
                  <span className="mt-0.5 block text-xs text-white/40">
                    Required. Without it the tester returns an input error rather than a fee.
                  </span>
                </span>
              </label>

              <button type="button" className={primaryButton} onClick={runServerQuote} disabled={working}>
                {working ? 'Resolving…' : 'Resolve on the server'}
              </button>
            </div>

            <aside className="space-y-3 rounded-adm border border-adm-line bg-adm-sunken p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-white">Outcome</h4>
                {outcome && <StatusPill tone={OUTCOME_TONE[outcome]}>{outcome.replace(/_/g, ' ')}</StatusPill>}
              </div>
              <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-white">
                {outcome === DELIVERY_OUTCOMES.STANDARD_FEE || outcome === DELIVERY_OUTCOMES.PICKUP_ZERO
                  ? peso(shown.feeMinor)
                  : '—'}
              </p>
              {shown && (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/40">Why</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">{shown.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/40">Next action</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">{shown.nextAction}</p>
                  </div>
                </>
              )}
              <p className="text-xs leading-relaxed text-white/40">
                {serverQuote
                  ? 'Server-resolved. This is the outcome the storefront would produce.'
                  : 'Local preview. Resolve on the server before communicating any amount.'}
              </p>
              {shown?.snapshot && (
                <details className="rounded-adm-sm border border-adm-line bg-adm-surface p-2.5">
                  <summary className="cursor-pointer text-xs font-semibold text-white/60">
                    Snapshot to freeze on the order
                  </summary>
                  <dl className="mt-2 space-y-1 text-xs text-white/55">
                    {[
                      ['Locality', shown.snapshot.localityId],
                      ['Options evaluated', shown.snapshot.optionIds.join(', ')],
                      ['Setting cost', peso(shown.snapshot.maxOptionCostMinor)],
                      ['Rounded to', peso(shown.snapshot.feeMinor)],
                      ['Evidence', shown.snapshot.sourceIds.join(', ')],
                      ['Quoted on', shown.snapshot.quotedAt],
                    ].map(([term, value]) => (
                      <div key={term} className="flex justify-between gap-3">
                        <dt className="shrink-0 text-white/40">{term}</dt>
                        <dd className="text-right font-mono">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </aside>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === 'rates' && (
        <section className="space-y-4">
          <SectionHeading
            title="Active rates"
            count={(tables?.costRows || []).length}
            description="What each courier costs K2 on each approved route. Raising a price never edits a row: it closes the current one and publishes a new one, so an accepted quote can always be explained."
          />
          {priceEdit && (
            <div className="space-y-3 rounded-adm border border-blue/40 bg-blue/[0.06] p-4">
              <h4 className="text-sm font-semibold text-white">
                New rate for {priceEdit.localityLabel} · {priceEdit.optionLabel}
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="adm-label">New cost (PHP)</span>
                  <input
                    className="adm-input" inputMode="decimal" placeholder="95.00"
                    value={priceEdit.amount}
                    onChange={(e) => setPriceEdit({ ...priceEdit, amount: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="adm-label">Effective from</span>
                  <input
                    type="date" className="adm-input" min={manilaToday()}
                    value={priceEdit.effectiveFrom}
                    onChange={(e) => setPriceEdit({ ...priceEdit, effectiveFrom: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="adm-label">Rate identifier</span>
                  <input
                    className="adm-input font-mono" value={priceEdit.costId}
                    onChange={(e) => setPriceEdit({ ...priceEdit, costId: e.target.value.toUpperCase() })}
                  />
                </label>
              </div>
              <label className="block">
                <span className="adm-label">Why this changed</span>
                <input
                  className="adm-input" placeholder="J&amp;T raised the Cebu ordinary rate, confirmed by quick inquiry."
                  value={priceEdit.reason}
                  onChange={(e) => setPriceEdit({ ...priceEdit, reason: e.target.value })}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryButton} onClick={publishPrice} disabled={working}>
                  {working ? 'Publishing…' : 'Publish new rate'}
                </button>
                <button type="button" className={secondaryButton} onClick={() => setPriceEdit(null)} disabled={working}>
                  Cancel
                </button>
              </div>
              <p className="text-xs leading-relaxed text-white/50">
                Orders already quoted keep the fee they were given. K2 absorbs ordinary variance on an accepted standard fee.
              </p>
            </div>
          )}
          {(tables?.costRows || []).length === 0 ? (
            <EmptyState title="No rates yet" description="Publish a cost for an approved locality to start quoting automatically." />
          ) : (
            <DataTable
              caption="Delivery cost rows"
              head={
                <tr>
                  <Th>Locality</Th><Th>Courier</Th><Th align="right">Cost</Th>
                  <Th>Effective</Th><Th>Status</Th><Th>Evidence</Th><Th align="right">Action</Th>
                </tr>
              }
            >
              {(tables?.costRows || []).map((row) => {
                const rule = (tables.localityRules || []).find((l) => l.localityId === row.localityId)
                const option = (tables.courierOptions || []).find((o) => o.optionId === row.optionId)
                const localityLabel = rule ? `${rule.cityMunicipality} — ${rule.barangay}` : row.localityId
                const optionLabel = option ? `${option.providerName} ${option.serviceName}` : row.optionId
                const live = row.status === 'ACTIVE_APPROVED' && !row.effectiveTo
                return (
                  <tr key={row.costId} className={live ? '' : 'opacity-55'}>
                    <Td>
                      {localityLabel}
                      <span className="mt-0.5 block font-mono text-xs text-white/35">{row.localityId}</span>
                    </Td>
                    <Td>{optionLabel}</Td>
                    <Td align="right" mono className="text-white">{peso(row.amountMinor)}</Td>
                    <Td mono>
                      {row.effectiveFrom}
                      <span className="block text-xs text-white/35">
                        {row.effectiveTo ? `until ${row.effectiveTo}` : 'open-ended'}
                      </span>
                    </Td>
                    <Td>
                      <StatusPill tone={live ? 'success' : 'neutral'}>
                        {live ? 'In force' : row.status === 'ACTIVE_APPROVED' ? 'Closed' : row.status}
                      </StatusPill>
                    </Td>
                    <Td mono className="text-xs">{row.sourceId}</Td>
                    <Td align="right">
                      {live && (
                        <button
                          type="button"
                          className={secondaryButton}
                          onClick={() => setPriceEdit({
                            costId: `${row.costId}-R2`,
                            optionId: row.optionId,
                            originId: row.originId,
                            localityId: row.localityId,
                            profileId: row.profileId,
                            sourceId: row.sourceId,
                            amount: (row.amountMinor / 100).toFixed(2),
                            effectiveFrom: manilaToday(),
                            reason: '',
                            localityLabel,
                            optionLabel,
                          })}
                        >
                          Raise price
                        </button>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </DataTable>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === 'couriers' && (
        <section className="space-y-4">
          <SectionHeading
            title="Courier options"
            count={(tables?.courierOptions || []).length}
            description="The list K2 quotes against. The fee charged is the highest cost across every selectable courier on the route, so making one selectable without a current cost for a route removes automatic quoting there rather than under-charging."
          />
          <StateBanner tone="info">
            Adding a courier here does not book anything. Booking, waybills, and tracking remain manual until a provider account and its fee schedule are supplied.
          </StateBanner>
          {(tables?.courierOptions || []).length === 0 ? (
            <EmptyState title="No couriers configured" description="Add a courier option before any route can be quoted." />
          ) : (
            <DataTable
              caption="Courier options"
              head={
                <tr>
                  <Th>Provider</Th><Th>Service</Th><Th>Origin</Th>
                  <Th>Routes priced</Th><Th>Role in quoting</Th><Th align="right">Action</Th>
                </tr>
              }
            >
              {(tables?.courierOptions || []).map((option) => {
                const priced = (tables.costRows || []).filter(
                  (row) => row.optionId === option.optionId && row.status === 'ACTIVE_APPROVED' && !row.effectiveTo,
                ).length
                const selectable = option.eligibility === 'AUTO_QUOTE_ELIGIBLE'
                return (
                  <tr key={option.optionId}>
                    <Td>
                      {option.providerName}
                      <span className="mt-0.5 block font-mono text-xs text-white/35">{option.optionId}</span>
                    </Td>
                    <Td>{option.serviceName}</Td>
                    <Td mono className="text-xs">{option.originId}</Td>
                    <Td align="left" mono>
                      {priced}
                      {selectable && priced < quotableLocalities.length && (
                        <span className="mt-0.5 block text-xs text-amber">
                          {quotableLocalities.length - priced} approved route(s) unpriced
                        </span>
                      )}
                    </Td>
                    <Td>
                      <StatusPill tone={selectable ? 'success' : option.eligibility === 'DISABLED' ? 'neutral' : 'warning'}>
                        {selectable ? 'Priced automatically' : option.eligibility === 'DISABLED' ? 'Disabled' : 'Manual only'}
                      </StatusPill>
                    </Td>
                    <Td align="right">
                      <button
                        type="button"
                        className={secondaryButton}
                        disabled={working}
                        onClick={() => toggleCourier(option, selectable ? 'MANUAL_ONLY' : 'AUTO_QUOTE_ELIGIBLE')}
                      >
                        {selectable ? 'Make manual only' : 'Make selectable'}
                      </button>
                    </Td>
                  </tr>
                )
              })}
            </DataTable>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === 'localities' && (
        <section className="space-y-4">
          <SectionHeading
            title="Destinations"
            count={(tables?.localityRules || []).length}
            description="Only an exact approved locality can price an order. Macro-area values are recorded for planning and can never be quoted."
          />
          <DataTable
            caption="Locality rules"
            head={
              <tr>
                <Th>City / municipality</Th><Th>Barangay</Th><Th>Region</Th>
                <Th>Island group</Th><Th>Role</Th>
              </tr>
            }
          >
            {(tables?.localityRules || []).map((rule) => {
              const quotable = rule.scope === 'EXACT_PILOT' && rule.status === 'PILOT_APPROVED'
              return (
                <tr key={rule.localityId} className={quotable ? '' : 'opacity-60'}>
                  <Td>
                    {rule.cityMunicipality || '—'}
                    <span className="mt-0.5 block font-mono text-xs text-white/35">{rule.localityId}</span>
                  </Td>
                  <Td>{rule.barangay || '—'}</Td>
                  <Td className="text-xs">{rule.region || '—'}</Td>
                  <Td className="text-xs">{rule.islandGroup || '—'}</Td>
                  <Td>
                    <StatusPill tone={quotable ? 'success' : 'neutral'}>
                      {quotable ? 'Quotable' : 'Planning only'}
                    </StatusPill>
                  </Td>
                </tr>
              )
            })}
          </DataTable>
          <p className="text-xs leading-relaxed text-white/45">
            Widening the pilot beyond these localities is a commercial decision. Add a destination only once a courier
            cost for it has been observed and approved, then publish its rate on the Rates tab.
          </p>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {tab === 'sources' && (
        <section className="space-y-4">
          <SectionHeading
            title="Rate evidence"
            count={(tables?.sources || []).length}
            description="Every cost points at the evidence it came from. A source that is no longer current stops pricing orders automatically and routes those routes to a manual quote."
          />
          <DataTable
            caption="Rate sources"
            head={<tr><Th>Source</Th><Th>Kind</Th><Th>Review due</Th><Th>State</Th><Th align="right">Action</Th></tr>}
          >
            {(tables?.sources || []).map((source) => (
              <tr key={source.sourceId}>
                <Td>
                  {source.label}
                  <span className="mt-0.5 block font-mono text-xs text-white/35">{source.sourceId}</span>
                </Td>
                <Td className="text-xs">{source.sourceKind}</Td>
                <Td mono className="text-xs">{source.reviewDueOn || '—'}</Td>
                <Td>
                  <StatusPill tone={source.freshness === 'CURRENT' ? 'success' : 'warning'}>
                    {source.freshness}
                  </StatusPill>
                </Td>
                <Td align="right">
                  <button
                    type="button"
                    className={secondaryButton}
                    disabled={working}
                    onClick={() => reviewSource(source, source.freshness === 'CURRENT' ? 'REVIEW_DUE' : 'CURRENT')}
                  >
                    {source.freshness === 'CURRENT' ? 'Flag for review' : 'Confirm current'}
                  </button>
                </Td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}

      <p className="border-t border-adm-line pt-4 text-xs leading-relaxed text-white/40">
        Automatic quoting covers {PILOT_CHANNELS.join(' and ')} orders only. Marketplace orders keep the platform&rsquo;s own
        delivery charge. K2 never books a courier, generates a waybill, or reports a delivery event without provider evidence.
      </p>
    </div>
  )
}
