import { useEffect, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { getAdminProductMasterBff } from '../../services/adminBffService'
import { applyStoreCategoryBatch, getStoreCategory, resolveStoreCategoryName, storeCategoryEntries } from '../../lib/storeCategories'
import { primaryButton, secondaryButton } from './AdminWorkspaceUi'

export default function BulkStoreCategoryDialog({ products, allProducts, recovery, actorId, canManageProducts, onClose, onSaved }) {
  const [choosingProducts] = useState(products.length === 0)
  const [selection, setSelection] = useState(() => products.map(p => ({ ...p })))
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [progress, setProgress] = useState({ saved: [], skipped: [], remaining: selection, error: '' })
  const [busy, setBusy] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const running = useRef(false), scope = useRef(null), mounted = useRef(false)
  if (scope.current?.actorId !== actorId || scope.current?.canManageProducts !== canManageProducts) scope.current = { actorId, canManageProducts }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const entries = storeCategoryEntries(allProducts)
  const blocked = busy || recovery.working || !!recovery.pending || recovery.storageBlocked || !canManageProducts || !actorId
  const candidates = allProducts.filter(product => `${product.name || ''} ${product.sku}`.toLowerCase().includes(search.trim().toLowerCase()))
  const toggleProduct = (product) => {
    if (blocked || attempted) return
    const next = selection.some(entry => entry.sku === product.sku)
      ? selection.filter(entry => entry.sku !== product.sku) : [...selection, { ...product }]
    setSelection(next)
    setProgress({ saved: [], skipped: [], remaining: next, error: '' })
  }
  const apply = async () => {
    if (blocked || running.current || !selection.length) return
    let destination
    try { destination = resolveStoreCategoryName(category, entries) }
    catch (failure) { setProgress(previous => ({ ...previous, error: failure.message })); return }
    const identity = scope.current
    const isCurrent = () => mounted.current && scope.current === identity && identity.canManageProducts
    running.current = true; setBusy(true); setAttempted(true)
    const result = await applyStoreCategoryBatch({ products: progress.remaining, category: destination,
      read: getAdminProductMasterBff, save: recovery.save, isCurrent,
      onProgress: next => setProgress({ ...next, saved: [...progress.saved, ...next.saved], skipped: [...progress.skipped, ...next.skipped] }),
    })
    running.current = false
    if (!isCurrent()) return
    setBusy(false)
    setProgress({ ...result, saved: [...progress.saved, ...result.saved], skipped: [...progress.skipped, ...result.skipped] })
    if (result.saved.length) onSaved()
  }
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
    <AdminDialog onClose={onClose} closeDisabled={busy || recovery.working} labelledBy="bulk-store-category-title">
      <div className="max-h-[90dvh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:rounded-adm">
        <div className="flex items-start justify-between gap-4"><h2 id="bulk-store-category-title" className="text-xl font-semibold">{choosingProducts ? 'Create store category' : 'Set store category'}</h2><button type="button" className={secondaryButton} disabled={busy || recovery.working} onClick={onClose}>Close</button></div>
        <p className="text-sm text-white/80">Choose an existing shelf or type a new name for {selection.length} selected products. It appears in the storefront when an assigned product is listed there, including sold-out listings for Pasabuy.</p>
        <label className="block space-y-2 text-sm"><span>Store category</span><input list="store-category-suggestions" className="adm-input min-h-11 w-full text-base" value={category} maxLength={120} disabled={blocked || attempted} onChange={event => { setCategory(event.target.value); setProgress(previous => ({ ...previous, error: '' })) }} placeholder="Choose or type a category" />
          <datalist id="store-category-suggestions">{entries.map(entry => <option key={entry.name} value={entry.name} />)}</datalist>
        </label>
        {choosingProducts && <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-semibold">Assign products</legend>
          <label className="block"><span className="sr-only">Find products to assign</span><input type="search" className="adm-input min-h-11 w-full text-base" value={search} disabled={blocked || attempted} onChange={event => setSearch(event.target.value)} placeholder="Search product name or SKU" /></label>
          <div className="max-h-60 overflow-y-auto divide-y divide-adm-line">
            {candidates.map(product => <label key={product.sku} className="flex min-h-11 cursor-pointer items-center gap-3 py-3 text-sm">
              <input type="checkbox" className="h-5 w-5 shrink-0 accent-blue" aria-label={`Assign ${product.name || product.sku} (${product.sku})`} checked={selection.some(entry => entry.sku === product.sku)} disabled={blocked || attempted} onChange={() => toggleProduct(product)} />
              <span className="min-w-0 break-words"><span className="block font-semibold">{product.name || product.sku}</span><span className="text-white/70">{product.sku} · {getStoreCategory(product)}</span></span>
            </label>)}
            {!candidates.length && <p className="py-3 text-sm text-white/70">No products match this search.</p>}
          </div>
        </fieldset>}
        <p className="text-sm text-white/70">Stock, prices and publication stay as they are. Each product saves separately; if one cannot be confirmed, the batch stops.</p>
        <div className="max-h-60 overflow-y-auto divide-y divide-adm-line" aria-label="Selected category assignments">
          {selection.map(product => <div className="py-3 text-sm" key={product.sku}><p className="break-words font-semibold">{product.name || product.sku}</p><p className="break-words text-xs text-white/70">{product.sku} · {getStoreCategory(product)} → {category.trim() || 'Choose a category'}</p>
            {attempted && <p className="mt-1 text-xs text-white/80">{progress.saved.includes(product.sku) ? 'Saved' : progress.skipped.includes(product.sku) ? 'Already assigned' : 'Awaiting confirmation or not sent'}</p>}
          </div>)}
        </div>
        <p role="status" className="text-sm font-semibold text-white/90">{progress.saved.length} saved · {progress.skipped.length} already assigned · {progress.remaining.length} remaining{busy ? ' · Saving…' : ''}</p>
        {(progress.error || recovery.error) && <p role="alert" className="break-words text-sm text-crimson">{progress.error || recovery.error}</p>}
        {recovery.pending && <p className="text-sm text-white/80">Close this panel and review the pending product decision before another batch. Retry that original request; its result is still unconfirmed.</p>}
        {attempted && progress.error && !recovery.pending && <p className="text-sm text-white/80">Close and refresh the inventory before selecting the remaining products again.</p>}
        {!attempted && <button type="button" className={primaryButton} disabled={blocked || !category.trim() || !selection.length} onClick={apply}>Apply to {selection.length} {selection.length === 1 ? 'product' : 'products'}</button>}
        {busy && <p className="text-sm text-white/70">Keep this panel open while the batch saves. Closing the page stops unsent products; any unconfirmed request remains in pending product decisions.</p>}
      </div>
    </AdminDialog>
  </div>
}
