import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../../lib/supabaseClient'

// AI Sourcing review queue. Reads real drafts from `product_drafts` (written by
// the Italy AI feed). Staff check price/stock and approve → a real product is
// created. Honest: empty when no drafts, and approve only writes real columns.

export default function AiDrafts() {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)

  const load = async () => {
    if (!supabase) { setLoading(false); return }
    const { data, error } = await supabase.from('product_drafts')
      .select('*').eq('status', 'pending').order('created_at', { ascending: false })
    if (error) { setTableMissing(true); setLoading(false); return }
    setTableMissing(false); setDrafts(data || []); setLoading(false)
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    load()
    const ch = supabase.channel('public:product_drafts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_drafts' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const approve = async (draft, edited) => {
    const { error } = await supabase.from('products').upsert([{
      sku: draft.sku,
      name: draft.name,
      srp: Number(edited.srp) || 0,
      wholesale_price: Number(edited.wholesale_price) || 0,
      stock_available: Number(edited.stock_available) || 0,
      origin: draft.origin || null,
      size: draft.size || null,
      description: draft.description || null,
      why_buy: draft.why_buy || null,
      why_rare: draft.why_rare || null,
      pairings: Array.isArray(draft.pairings) ? draft.pairings : [],
      status: 'Live',
    }], { onConflict: 'sku' })
    if (error) { alert('Could not publish: ' + error.message); return }
    await supabase.from('product_drafts').update({ status: 'approved' }).eq('id', draft.id)
    setDrafts(prev => prev.filter(d => d.id !== draft.id))
  }

  const reject = async (draft) => {
    await supabase.from('product_drafts').update({ status: 'rejected' }).eq('id', draft.id)
    setDrafts(prev => prev.filter(d => d.id !== draft.id))
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-white/50">Loading drafts…</p>
  }

  if (tableMissing) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-amber/30 bg-amber/10 p-5 text-sm">
        <p className="font-bold text-amber">One-time setup needed</p>
        <p className="text-neutral-300 mt-1">
          Run <span className="font-mono">RUN_THIS_product_drafts.sql</span> in the Supabase SQL editor so this queue has a table to read from. Until then no drafts can arrive.
        </p>
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#161922] p-12 text-center shadow-lg">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue/15 border border-blue/30 text-2xl">🇮🇹</div>
        <h3 className="mt-4 font-serif text-xl font-semibold text-white">Waiting for drafts from Italy</h3>
        <p className="mt-1.5 max-w-sm text-sm text-white/55 leading-relaxed">
          When the Italy AI feed proposes a new product, it appears here for you to review and publish. Nothing to review right now.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {drafts.map((draft) => (
        <DraftCard key={draft.id} draft={draft} onApprove={approve} onReject={reject} />
      ))}
    </div>
  )
}

function DraftCard({ draft, onApprove, onReject }) {
  const [srp, setSrp] = useState(draft.srp ?? 0)
  const [wholesale, setWholesale] = useState(draft.wholesale_price ?? 0)
  const [stock, setStock] = useState(draft.stock_available ?? 0)
  const [busy, setBusy] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const confidence = typeof draft.ai_confidence === 'number' ? draft.ai_confidence : null
  const lowConfidence = confidence != null && confidence < 0.9

  const go = async () => {
    setBusy(true)
    await onApprove(draft, { srp, wholesale_price: wholesale, stock_available: stock })
    setBusy(false)
  }

  const num = 'w-full rounded-lg border border-white/15 bg-black/30 px-3 min-h-11 py-2 text-base text-white tabular-nums focus:border-blue outline-none'

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#161922] shadow-lg">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 px-4 sm:px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">New draft from Italy 🇮🇹</p>
          <p className="font-serif text-lg font-semibold text-white truncate">{draft.name || 'Unnamed product'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lowConfidence && (
            <span className="rounded-lg bg-amber/20 border border-amber/40 px-2 py-1 text-xs font-bold text-amber">⚠ Low AI confidence</span>
          )}
          {draft.sku && <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-mono text-white/60">{draft.sku}</span>}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-sm text-white/55">Check the price and stock, then publish it to your live catalog:</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-white/45">
            Retail SRP (₱)
            <input type="number" min="0" value={srp} onChange={e => setSrp(Number(e.target.value))} className={`${num} mt-1.5`} />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-white/45">
            Wholesale (₱)
            <input type="number" min="0" value={wholesale} onChange={e => setWholesale(Number(e.target.value))} className={`${num} mt-1.5`} />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-white/45">
            Stock (pcs)
            <input type="number" min="0" value={stock} onChange={e => setStock(Number(e.target.value))} className={`${num} mt-1.5`} />
          </label>
        </div>

        {(draft.origin || draft.size || draft.why_buy) && (
          <div className="text-sm text-white/60 space-y-1">
            {draft.origin && <p>📍 {draft.origin}{draft.size ? ` · ${draft.size}` : ''}</p>}
            {draft.why_buy && <p className="text-white/70 leading-relaxed">{draft.why_buy}</p>}
          </div>
        )}

        {draft.raw_json && (
          <div>
            <button onClick={() => setShowRaw(s => !s)} className="text-xs font-semibold text-white/45 hover:text-white transition-colors">
              {showRaw ? '▾ Hide raw AI output' : '▸ Show raw AI output'}
            </button>
            {showRaw && (
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 border border-white/10 p-3 text-xs font-mono leading-relaxed text-white/60">
                {typeof draft.raw_json === 'string' ? draft.raw_json : JSON.stringify(draft.raw_json, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-white/10 pt-4">
          <button onClick={() => onReject(draft)} disabled={busy}
            className="rounded-xl border border-white/15 bg-white/5 min-h-12 px-5 text-sm font-semibold text-white/70 hover:bg-white/10 transition-all disabled:opacity-50">
            Reject
          </button>
          <button onClick={go} disabled={busy}
            className="rounded-xl bg-forest hover:bg-forest/90 min-h-12 px-6 text-sm font-bold text-white shadow-lg transition-all active:scale-[.99] disabled:opacity-50">
            {busy ? 'Publishing…' : '✓ Approve & publish'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
