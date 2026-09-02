import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { providerErrorIncludes } from '../../lib/safeUiError'
import {
  adminBffEnabled, commandAdminProductMasterBff, getAdminStaffAccessBff,
} from '../../services/adminBffService'
import { AdminDialog } from '../../components/ui/AdminDialog'

// ============================================================================
// PIN-gated product deletion.
//
// Deletion is permanent and is allowed only for unused setup mistakes with no
// inventory or operational history. This screen does three things first:
//   1. names every product about to be destroyed — no "3 items" abstraction
//   2. requires the operator's own 4-digit PIN
//   3. verifies that PIN server-side via delete_products_with_pin_v2(), which
//      snapshots each row into product_deletions before removing it
//
// The PIN is sent only to the protected RPC and never stored or returned in
// browser state. Missing setup refuses and points the Admin to Staff & Roles.
// ============================================================================

export default function DeleteProductsModal({ products = [], onClose, onDeleted }) {
  const secure = adminBffEnabled()
  const [pin, setPin] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pinState, setPinState] = useState('checking') // checking | ready | missing | offline
  const inputRef = useRef(null)
  const requestIdRef = useRef(crypto.randomUUID())

  const count = products.length
  const isBulk = count > 1

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (secure) {
        const response = await getAdminStaffAccessBff()
        if (cancelled) return
        if (!response.ok) {
          setPinState('missing')
          setError(response.error || 'Delete PIN status could not be checked. Refresh and try again.')
        } else {
          setPinState(response.staffAccess?.hasDeletePin ? 'ready' : 'missing')
          if (!response.staffAccess?.hasDeletePin) setError('You have not set a delete PIN yet. Set one under Staff & Roles first.')
        }
        return
      }
      if (!supabase) { if (!cancelled) setPinState('offline'); return }
      const { data, error: rpcError } = await supabase.rpc('has_delete_pin')
      if (cancelled) return
      if (rpcError) {
        setPinState('missing')
        setError(
          providerErrorIncludes(rpcError, 'does not exist')
            ? 'The secure product-deletion service is not available yet. Refresh after the Admin update finishes.'
            : providerErrorIncludes(rpcError, 'K2_AAL2_REQUIRED')
              ? 'Verify your authenticator again before deleting a product.'
              : providerErrorIncludes(rpcError, 'K2_ADMIN_REQUIRED')
                ? 'Only an Admin can permanently delete a product.'
                : 'Delete PIN status could not be checked. Refresh and try again.'
        )
        return
      }
      setPinState(data ? 'ready' : 'missing')
      if (!data) setError('You have not set a delete PIN yet. Set one under Staff & Roles first.')
    }
    check()
    return () => { cancelled = true }
  }, [secure])

  useEffect(() => {
    if (pinState === 'ready') inputRef.current?.focus()
  }, [pinState])

  const handleDelete = async () => {
    if (pin.length !== 4) return setError('Enter your 4-digit PIN.')
    if (reason.trim().length < 8) return setError('Enter a specific reason of at least 8 characters.')
    setBusy(true)
    setError('')

    const skus = products.map(p => p.sku).filter(Boolean)

    if (secure) {
      const response = await commandAdminProductMasterBff('delete', {
        skus, pin, reason: reason.trim(),
      }, requestIdRef.current)
      setBusy(false)
      if (!response.ok) {
        setPin('')
        return setError(response.error || 'The deletion was refused. Nothing was removed.')
      }
      const result = response.result || {}
      if (!result.ok) {
        setPin('')
        const messages = {
          INVALID_PIN: `That PIN is not correct.${Number.isInteger(result.attempts_remaining) ? ` ${result.attempts_remaining} attempt${result.attempts_remaining === 1 ? '' : 's'} remaining.` : ''}`,
          PIN_LOCKED: 'Delete PIN is temporarily locked after repeated attempts. Wait 15 minutes and try again.',
          PIN_NOT_SET: 'Set your Delete PIN under Staff & Roles first.',
          PRODUCT_HAS_HISTORY: 'A selected product has stock, listings, or operational history and cannot be permanently deleted. Mark it Discontinued instead.',
        }
        return setError(messages[result.code] || 'The deletion was refused. Nothing was removed.')
      }
      onDeleted?.(skus, Number(result.deleted_count) || 0)
      onClose()
      return
    }

    if (!supabase) {
      setBusy(false)
      return setError('No database connection — cannot delete.')
    }

    const { data, error: rpcError } = await supabase.rpc('delete_products_with_pin_v2', {
      p_skus: skus,
      p_candidate_pin: pin,
      p_reason: reason.trim(),
      p_request_id: requestIdRef.current,
    })

    setBusy(false)

    if (rpcError) {
      setPin('')
      return setError(
        providerErrorIncludes(rpcError, 'does not exist')
          ? 'The secure product-deletion service is not available yet. Refresh after the Admin update finishes.'
          : providerErrorIncludes(rpcError, 'K2_AAL2_REQUIRED')
            ? 'Verify your authenticator again before deleting a product.'
            : 'The deletion could not be completed. Nothing was removed.'
      )
    }

    if (!data?.ok) {
      setPin('')
      const messages = {
        INVALID_PIN: `That PIN is not correct.${Number.isInteger(data?.attempts_remaining) ? ` ${data.attempts_remaining} attempt${data.attempts_remaining === 1 ? '' : 's'} remaining.` : ''}`,
        PIN_LOCKED: 'Delete PIN is temporarily locked after repeated attempts. Wait 15 minutes and try again.',
        PIN_NOT_SET: 'Set your Delete PIN under Staff & Roles first.',
        INVALID_REASON: 'Enter a specific reason between 8 and 500 characters.',
        INVALID_PRODUCTS: 'The selected product list is invalid. Close and try again.',
        PRODUCT_NOT_FOUND: 'One or more products no longer exist. Refresh inventory before retrying.',
        PRODUCT_HAS_HISTORY: 'A selected product has stock, listings, or operational history and cannot be permanently deleted. Mark it Discontinued instead.',
        IDEMPOTENCY_CONFLICT: 'The deletion details changed during retry. Close this window and start again.',
        OPERATION_IN_PROGRESS: 'This deletion is already being processed. Wait, then refresh inventory.',
      }
      return setError(messages[data?.code] || 'The deletion was refused. Nothing was removed.')
    }

    onDeleted?.(skus, Number(data.deleted_count) || 0)
    onClose()
  }

  const blocked = pinState !== 'ready'

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md sm:p-4">
      <AdminDialog onClose={onClose} closeDisabled={busy} labelledBy="delete-products-title">
      <div className="flex w-full sm:max-w-md max-h-[92dvh] flex-col overflow-hidden bg-adm-surface border border-crimson/40 rounded-t-adm sm:rounded-adm text-white shadow-adm-float">

        <div className="shrink-0 border-b border-adm-line bg-crimson/10 px-3.5 py-3">
          <h2 id="delete-products-title" className="text-base font-bold text-crimson">
            Delete {count} product{count !== 1 ? 's' : ''}?
          </h2>
          <p className="text-xs text-white/60 mt-0.5 leading-snug">
            Permanent. Only unused products with no stock, listings, or operational history can be deleted.
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
              {isBulk ? 'Some of these products have' : 'This product has'} stock on hand and will be refused. Reconcile the stock, or mark the product Discontinued.
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
            <div className="space-y-3">
              <div>
                <label htmlFor="delete-reason" className="adm-label">Reason for permanent deletion</label>
                <textarea
                  id="delete-reason"
                  value={reason}
                  onChange={(e) => { setReason(e.target.value.slice(0, 500)); setError('') }}
                  rows={3}
                  maxLength={500}
                  placeholder="Example: Duplicate draft created during catalog setup"
                  className="w-full resize-y rounded-adm-sm border border-adm-line bg-adm-raised px-3 py-2.5 text-base text-white placeholder:text-white/35 outline-none focus:border-crimson"
                />
                <p className="mt-1 text-xs text-white/40">Required for the deletion audit record.</p>
              </div>
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
            disabled={busy || blocked || pin.length !== 4 || reason.trim().length < 8}
            className="flex-1 min-h-[44px] rounded-adm-sm bg-crimson hover:bg-crimson-deep text-sm font-bold text-white transition-colors disabled:opacity-40"
          >
            {busy ? 'Deleting…' : `Delete ${count} product${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
      </AdminDialog>
    </div>
  )
}
