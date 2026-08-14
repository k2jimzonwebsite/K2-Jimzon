import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { adminBffEnabled, getAdminLots } from '../../services/adminBffService'
import { AlertIcon, BellIcon, CheckIcon, XIcon } from '../../components/ui/icons'

function expiryState(dateString) {
  if (!dateString) return null
  const expiry = Date.parse(`${dateString}T00:00:00Z`)
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(expiry)) return null
  const daysLeft = Math.round((expiry - today) / 86_400_000)
  return { daysLeft, status: daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'critical' : daysLeft <= 90 ? 'warning' : 'fresh' }
}

const TONE = {
  expired: 'border-crimson/40 bg-crimson/12 text-red-300',
  critical: 'border-crimson/40 bg-crimson/12 text-red-300',
  warning: 'border-amber/40 bg-amber/12 text-amber',
}

export default function DailyTaskNotificationDrawer({ isOpen, onClose, onNavigate }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined
    const controller = new AbortController()
    let active = true
    async function load() {
      setLoading(true); setError('')
      if (adminBffEnabled()) {
        const result = await getAdminLots('', controller.signal)
        if (!active || result.aborted) return
        if (!result.ok) setError(result.error)
        else setBatches((result.data?.lots || []).map((lot) => ({
          ...lot, expiry_date: lot.expiry_date || lot.best_before_date,
          quantity: lot.quantity, ...expiryState(lot.expiry_date || lot.best_before_date),
        })).filter((lot) => ['expired', 'critical', 'warning'].includes(lot.status)))
      } else if (supabase) {
        const result = await supabase.from('v_expiring_batches')
          .select('id,sku,product_name,box_code,hub,custodian,channel,quantity,expiry_date,days_left,status')
          .in('status', ['expired', 'critical', 'warning'])
        if (!active) return
        if (result.error) setError('Expiry alerts could not be loaded. Refresh and try again.')
        else setBatches(result.data || [])
      } else setError('Inventory service is unavailable.')
      if (active) setLoading(false)
    }
    load()
    return () => { active = false; controller.abort() }
  }, [isOpen])

  if (!isOpen) return null
  const daysText = (days) => days == null ? 'Date unavailable' : days < 0 ? `Expired ${-days}d ago` : days === 0 ? 'Expires today' : `${days}d left`
  const review = () => { onNavigate?.('inventory'); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm" onClick={onClose} role="presentation">
      <aside role="dialog" aria-modal="true" aria-labelledby="expiry-alert-title" className="flex h-full w-full max-w-md flex-col border-l border-adm-line bg-adm-surface text-white shadow-adm-float" onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-adm-line bg-adm-sunken px-5 py-4">
          <div><h2 id="expiry-alert-title" className="flex items-center gap-2 text-lg font-bold"><BellIcon />Expiry alerts</h2><p className="mt-1 text-sm text-white/65">Review eligibility and clearance in FEFO order.</p></div>
          <button type="button" onClick={onClose} aria-label="Close expiry alerts" className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm text-white/70 transition-[background-color,color,transform] duration-150 hover:bg-white/8 hover:text-white active:scale-[0.97]"><XIcon /></button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {error && <div role="alert" className="flex gap-2 rounded-adm-sm border border-crimson/40 bg-crimson/10 p-3 text-sm text-red-200"><AlertIcon className="mt-0.5 shrink-0" />{error}</div>}
          {loading ? [0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-adm-sm bg-white/6 motion-reduce:animate-none" />)
            : batches.length === 0 && !error ? <div className="py-16 text-center"><CheckIcon className="mx-auto text-forest" size={28} /><p className="mt-3 font-semibold text-white">No expiry action due</p><p className="mx-auto mt-1 max-w-[32ch] text-sm text-white/60">No positive-stock lot is currently expired or within the 90-day review window.</p></div>
              : batches.map((lot) => <article key={lot.id} className="rounded-adm-sm border border-adm-line bg-adm-surface p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-white">{lot.product_name || lot.sku}</h3><p className="mt-0.5 text-xs font-semibold text-white/55">SKU {lot.sku}</p></div><span className={`shrink-0 rounded-adm-sm border px-2 py-1 text-xs font-bold ${TONE[lot.status] || TONE.warning}`}>{daysText(lot.days_left ?? lot.daysLeft)}</span></div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm"><div><dt className="text-xs text-white/55">Physical</dt><dd className="font-semibold tabular-nums">{lot.quantity} units</dd></div><div><dt className="text-xs text-white/55">Expiry</dt><dd className="font-semibold tabular-nums">{lot.expiry_date}</dd></div><div><dt className="text-xs text-white/55">Box / hub</dt><dd className="truncate font-semibold">{[lot.box_code, lot.hub].filter(Boolean).join(' · ') || 'Unassigned'}</dd></div><div><dt className="text-xs text-white/55">Custodian</dt><dd className="truncate font-semibold">{lot.custodian || 'Unassigned'}</dd></div></dl>
                <button type="button" onClick={review} className="mt-3 min-h-11 w-full rounded-adm-sm border border-adm-line px-3 text-sm font-semibold text-white/80 transition-[background-color,transform] duration-150 hover:bg-white/7 active:scale-[0.98]">Review in Product Master</button>
              </article>)}
        </div>
      </aside>
    </div>
  )
}
