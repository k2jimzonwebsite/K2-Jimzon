import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

// Real expiry-alert feed: reads batches expiring soon from v_expiring_batches
// so staff know what to sell/clear first (FEFO). Honest + empty when all fresh.

const TONE = {
  expired: 'bg-crimson/20 text-crimson border-crimson/40',
  critical: 'bg-crimson/20 text-crimson border-crimson/40',
  warning: 'bg-amber/20 text-amber border-amber/40',
}

export default function DailyTaskNotificationDrawer({ isOpen, onClose, onNavigate }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !supabase) return
    let active = true
    setLoading(true)
    supabase
      .from('v_expiring_batches')
      .select('*')
      .in('status', ['expired', 'critical', 'warning'])
      .then(({ data }) => { if (active) { setBatches(data || []); setLoading(false) } })
    return () => { active = false }
  }, [isOpen])

  if (!isOpen) return null

  const daysText = (d) => (d == null ? '' : d < 0 ? `Expired ${-d}d ago` : d === 0 ? 'Expires today' : `${d}d left`)
  const go = (section) => { if (onNavigate) onNavigate(section); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0E121E] text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#09090b] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">🔔 Expiry alerts</h2>
            <p className="text-sm text-white/50">Batches expiring soon — sell these first (FEFO)</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white">✕</button>
        </div>

        {/* Feed */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-white/40">Loading…</p>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center">
              <p className="mb-2 text-3xl">✓</p>
              <p className="text-sm font-medium text-white/70">No expiring stock</p>
              <p className="mt-1 text-xs text-white/40">Everything in your batches is fresh — nothing to clear.</p>
            </div>
          ) : (
            batches.map((b) => (
              <div key={b.id} className="rounded-xl border border-white/10 bg-[#161922] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{b.product_name || b.sku}</p>
                  <span className={'shrink-0 rounded border px-2 py-0.5 text-[11px] font-bold ' + (TONE[b.status] || TONE.warning)}>
                    {daysText(b.days_left)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/55">
                  {b.quantity} pcs · exp {b.expiry_date}
                  {b.box_code ? ` · ${b.box_code}` : ''}
                  {b.hub ? ` · 📍${b.hub}` : ''}
                  {b.custodian ? ` · 🙋${b.custodian}` : ''}
                  {b.channel ? ` · 🛒${b.channel}` : ''}
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button onClick={() => go('coupons')} className="flex-1 rounded-lg bg-crimson/90 py-2 text-xs font-medium text-white transition-colors hover:bg-crimson">
                    Create clearance discount
                  </button>
                  <button onClick={() => go('inventory')} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10">
                    Inventory
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
