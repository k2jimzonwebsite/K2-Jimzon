import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminBffEnabled,
  extendReservationBff,
  getAdminReservationsBff,
  releaseExpiredReservationsBff,
} from '../../services/adminBffService'
import { RESERVATION_POLICY, extensionRefusalReason } from '../../lib/reservationPolicy'
import {
  EmptyState, MetricRail, SectionHeading, StateBanner, StatusPill, WorkspaceIntro,
  primaryButton, secondaryButton,
} from './AdminWorkspaceUi'

// MAP-023 stock holds. A frequent operational screen, so it favours density and
// scanability over decoration: no motion on the rows, one clear count at the top,
// and the only two actions staff actually take.

const EXTENSION_CHOICES = [
  ['30 min', 30],
  ['1 hour', 60],
  ['4 hours', 240],
  ['1 day', 1440],
  ['3 days', 4320],
  ['7 days', 10080],
]

const operationKey = () =>
  typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : ''

/** Human countdown. Overdue reads as overdue, never as a negative number. */
function remaining(row) {
  if (row.is_overdue) return 'Overdue'
  const mins = Number(row.minutes_remaining)
  if (!Number.isFinite(mins)) return 'Unknown'
  if (mins < 60) return `${mins} min`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`
}

function urgencyTone(row) {
  if (row.is_overdue) return 'danger'
  return Number(row.minutes_remaining) <= 10 ? 'warning' : 'neutral'
}

export default function ReservationHolds() {
  const secure = adminBffEnabled()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [extend, setExtend] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    if (!secure) {
      setError('Stock holds require the secure admin BFF.')
      setLoading(false)
      return
    }
    const result = await getAdminReservationsBff()
    if (!result.ok) setError(result.error)
    else { setData(result.data); setError('') }
    setLoading(false)
  }, [secure])

  useEffect(() => { load() }, [load])

  const rows = data?.reservations || []
  const overdue = data?.overdueCount || 0

  const metrics = useMemo(() => [
    { label: 'Active holds', value: String(rows.length) },
    {
      label: 'Overdue',
      value: String(overdue),
      tone: overdue ? 'text-crimson' : 'text-white',
      detail: overdue ? 'Stock still counted as held' : 'Nothing past its deadline',
    },
    {
      label: 'Lapsing within 10 min',
      value: String(rows.filter((r) => !r.is_overdue && Number(r.minutes_remaining) <= 10).length),
    },
    { label: 'Default hold', value: `${RESERVATION_POLICY.defaultHoldMinutes} min` },
  ], [rows, overdue])

  const runRelease = async () => {
    setWorking(true); setError(''); setNotice('')
    const result = await releaseExpiredReservationsBff({
      limit: 500,
      reason: 'Staff released every hold whose deadline had already passed.',
    }, operationKey())
    if (!result.ok) setError(result.error)
    else {
      const count = result.data?.result?.released_count ?? 0
      setNotice(count === 0
        ? 'Nothing was overdue. No stock moved.'
        : `${count} expired hold${count === 1 ? '' : 's'} released. Those units are sellable again.`)
      await load()
    }
    setWorking(false)
  }

  const runExtend = async () => {
    if (!extend) return
    const refusal = extensionRefusalReason(extend.minutes)
    if (refusal) { setError(refusal); return }
    if (extend.reason.trim().length < 10) {
      setError('Record why this hold is being extended, in at least ten characters.')
      return
    }
    setWorking(true); setError(''); setNotice('')
    const result = await extendReservationBff({
      reservationId: extend.id,
      minutes: extend.minutes,
      reason: extend.reason.trim(),
    }, operationKey())
    if (!result.ok) setError(result.error)
    else { setNotice(`Hold on ${extend.sku} extended.`); setExtend(null); await load() }
    setWorking(false)
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-white/45">Loading stock holds…</p>
  }

  return (
    <div className="space-y-5">
      <WorkspaceIntro
        eyebrow="MAP-023"
        title="Stock holds"
        description="A cart holds nothing. Clicking purchase holds the exact lots for 30 minutes. Confirmation deducts them; an expired hold returns them to the sellable pool."
        status={overdue ? `${overdue} overdue` : 'None overdue'}
        statusTone={overdue ? 'danger' : 'success'}
        actions={
          <button type="button" className={secondaryButton} onClick={load} disabled={working}>
            Refresh
          </button>
        }
      />

      {error && <StateBanner tone="danger" role="alert">{error}</StateBanner>}
      {notice && <StateBanner tone="success">{notice}</StateBanner>}

      <MetricRail items={metrics} />

      {/* K2 has no scheduled-job infrastructure, so this screen must not imply
          automation it does not have. Saying so is cheaper than a staff member
          assuming stock frees itself overnight. */}
      <StateBanner tone="warning">
        Expired holds are <strong>not</strong> released automatically — K2 has no scheduled jobs yet.
        Until that exists, someone has to run the release below, or those units stay counted as held.
      </StateBanner>

      <SectionHeading
        title="Active holds"
        count={rows.length}
        description="Soonest to lapse first."
        action={
          <button type="button" className={primaryButton} onClick={runRelease} disabled={working || !overdue}>
            {working ? 'Working…' : `Release ${overdue} expired`}
          </button>
        }
      />

      {extend && (
        <div className="space-y-3 rounded-adm border border-blue/40 bg-blue/[0.06] p-4">
          <h4 className="text-sm font-semibold text-white">Extend the hold on {extend.sku}</h4>
          <div className="flex flex-wrap gap-1.5">
            {EXTENSION_CHOICES.map(([labelText, minutes]) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setExtend({ ...extend, minutes })}
                className={
                  'adm-btn min-h-9 px-3 text-sm ' +
                  (extend.minutes === minutes
                    ? 'bg-blue/20 font-semibold text-white'
                    : 'border border-adm-line text-white/60 hover:text-white')
                }
              >
                {labelText}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="adm-label">Why this hold is being extended</span>
            <input
              className="adm-input"
              placeholder="Customer confirmed payment is being sent this afternoon."
              value={extend.reason}
              onChange={(e) => setExtend({ ...extend, reason: e.target.value })}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} onClick={runExtend} disabled={working}>
              {working ? 'Extending…' : 'Extend hold'}
            </button>
            <button type="button" className={secondaryButton} onClick={() => setExtend(null)} disabled={working}>
              Cancel
            </button>
          </div>
          <p className="text-xs leading-relaxed text-white/50">
            Between 30 minutes and 7 days. The extension is recorded against your account.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No stock is on hold"
          description="Holds appear here the moment a customer submits a purchase."
        />
      ) : (
        <div className="overflow-x-auto rounded-adm border border-adm-line bg-adm-surface">
          <table className="w-full min-w-[44rem] border-collapse">
            <caption className="sr-only">Active stock holds</caption>
            <thead className="border-b border-adm-line bg-white/[0.02]">
              <tr>
                {['SKU', 'Qty', 'Time left', 'Deadline', 'Extended', 'Action'].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/40 ${i === 5 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-line">
              {rows.map((row) => (
                <tr key={row.id} className={row.is_overdue ? 'bg-crimson/[0.05]' : ''}>
                  <td className="px-3 py-2.5 font-mono text-sm text-white">{row.sku}</td>
                  <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-white/75">{row.quantity}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={urgencyTone(row)}>{remaining(row)}</StatusPill>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-white/50">
                    {row.expires_at ? new Date(row.expires_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-white/60">
                    {row.extension_count > 0 ? `${row.extension_count}×` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={working || row.is_overdue}
                      title={row.is_overdue ? 'An expired hold cannot be extended. Create a new reservation.' : undefined}
                      onClick={() => setExtend({ id: row.id, sku: row.sku, minutes: 30, reason: '' })}
                    >
                      Extend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-adm-line pt-4 text-xs leading-relaxed text-white/40">
        Pasabuy and wholesale commitments do not appear here. Those run through live chat and become
        history records on the customer rather than timed claims on stock.
      </p>
    </div>
  )
}
