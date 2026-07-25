import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

// ============================================================================
// PIN-gated product deletion.
//
// Deletion is permanent and cascades to batches and custody rows, so this
// screen does three things before it will proceed:
//   1. names every product about to be destroyed — no "3 items" abstraction
//   2. requires the operator's own 4-digit PIN
//   3. verifies that PIN server-side via delete_products_with_pin(), which
//      snapshots each row into product_deletions before removing it
//
// The PIN never reaches the browser. If the operator hasn't set one, this
// refuses and points them at Staff & Roles rather than silently allowing it.
// ============================================================================

export default function DeleteProductsModal({ products = [], onClose, onDeleted }) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pinState, setPinState] = useState('checking') // checking | ready | missing | offline
  const inputRef = useRef(null)

  const count = products.length
  const isBulk = count > 1

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!supabase) { if (!cancelled) setPinState('offline'); return }
      const { data, error: rpcError } = await supabase.rpc('has_delete_pin')
      if (cancelled) return
      if (rpcError) {
        setPinState('missing')
        setError(
          rpcError.message.includes('does not exist')
            ? 'Delete PIN not installed — run migration 20260725_delete_pin_and_product_status.sql in Supabase.'
            : rpcError.message
        )
        return
      }
      setPinState(data ? 'ready' : 'missing')
      if (!data) setError('You have not set a delete PIN yet. Set one under Staff & Roles first.')
    }
    check()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (pinState === 'ready') inputRef.current?.focus()
  }, [pinState])

  const handleDelete = async () => {
    if (pin.length !== 4) return setError('Enter your 4-digit PIN.')
    setBusy(true)
    setError('')

    const skus = products.map(p => p.sku).filter(Boolean)

    if (!supabase) {
      setBusy(false)
      return setError('No database connection — cannot delete.')
    }

    const { data, error: rpcError } = await supabase.rpc('delete_products_with_pin', {
      skus,
      candidate_pin: pin,
    })

    setBusy(false)

    if (rpcError) {
      setPin('')
      return setError(
        rpcError.message.includes('Invalid delete PIN')
          ? 'That PIN is not correct.'
          : rpcError.message
      )
    }

    onDeleted?.(skus, Number(data) || 0)
    onClose()
  }

  const blocked = pinState !== 'ready'

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md sm:p-4">
      <div className="flex w-full sm:max-w-md max-h-[92dvh] flex-col overflow-hidden bg-adm-surface border border-crimson/40 rounded-t-adm sm:rounded-adm text-white shadow-adm-float">

        <div className="shrink-0 border-b border-adm-line bg-crimson/10 px-3.5 py-3">
          <h2 className="text-base font-bold text-crimson">
            Delete {count} product{count !== 1 ? 's' : ''}?
          </h2>
          <p className="text-xs text-white/60 mt-0.5 leading-snug">
            Permanent. Batches and staff custody records for {isBulk ? 'these SKUs' : 'this SKU'} go with {isBulk ? 'them' : 'it'}.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3">
          {/* Name every casualty explicitly. */}
          <div className="rounded-adm-sm border border-adm-line bg-adm-sunken divide-y divide-adm-line max-h-48 overflow-y-auto">
            {products.map(p => (
              <div key={p.sku} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.name || 'Untitled product'}</p>
                  <p className="text-xs font-mono text-white/45 truncate">{p.sku}</p>
                </div>
                <span className="shrink-0 text-xs font-mono text-white/45">
                  {p.stock_available ?? 0} pcs
                </span>
              </div>
            ))}
          </div>

          {products.some(p => (p.stock_available ?? 0) > 0) && (
            <div className="rounded-adm-sm border border-amber/40 bg-amber/10 p-3 text-sm text-amber leading-snug">
              ⚠️ {isBulk ? 'Some of these' : 'This product'} still {isBulk ? 'have' : 'has'} stock on hand. Deleting will not adjust any counts — reconcile inventory first if that matters.
            </div>
          )}

          {error && (
            <div className="rounded-adm-sm border border-crimson/40 bg-crimson/10 p-3 text-sm text-crimson font-semibold leading-snug">
              ⚠️ {error}
            </div>
          )}

          {pinState === 'checking' && (
            <p className="text-sm text-white/50 text-center py-2">Checking your delete PIN…</p>
          )}

          {pinState === 'ready' && (
            <div>
              <label htmlFor="delete-pin" className="adm-label">Your 4-digit delete PIN</label>
              <input
                id="delete-pin"
                ref={inputRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter' && pin.length === 4 && !busy) handleDelete() }}
                placeholder="••••"
                className="w-full rounded-adm-sm border border-adm-line bg-adm-raised px-3 min-h-[52px] text-center text-2xl font-mono tracking-[0.5em] text-white outline-none focus:border-crimson"
              />
              <p className="mt-1.5 text-xs text-white/40 leading-snug">
                This deletion will be logged against your account.
              </p>
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 items-center gap-2 border-t border-adm-line bg-adm-sunken px-3.5 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-adm-sm bg-white/5 border border-adm-line text-sm font-semibold text-neutral-200 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy || blocked || pin.length !== 4}
            className="flex-1 min-h-[44px] rounded-adm-sm bg-crimson hover:bg-crimson-deep text-sm font-bold text-white transition-colors disabled:opacity-40"
          >
            {busy ? 'Deleting…' : `Delete ${count} product${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
