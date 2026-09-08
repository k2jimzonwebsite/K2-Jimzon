import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import ImageUploadDropzone from '../../components/ui/ImageUploadDropzone'
import { adminBffEnabled, assignProductMediaBff } from '../../services/adminBffService'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { useRetainedFulfillmentCommand } from './useRetainedFulfillmentCommand'

const legacyItem = (url) => (url ? { url, objectPath: null } : null)

export default function PhotoManagerModal({ product, onClose, onSave }) {
  const secureMode = adminBffEnabled()
  const requiresPrimary = Boolean(product.published || ['Live', 'Published'].includes(String(product.status || '')))
  const closeButtonRef = useRef(null)
  const activeRef = useRef(true)
  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false } }, [])
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [dirty, setDirty] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [cleanupPending, setCleanupPending] = useState(false)
  const [primary, setPrimary] = useState(() => legacyItem(product.primary_image_url))
  const [afterUse, setAfterUse] = useState(() => legacyItem(product.lifestyle_images?.[0]))
  const [samples, setSamples] = useState(() => (product.secondary_images || []).map(legacyItem))
  const [uploads, setUploads] = useState({})
  const uploading = Object.values(uploads).some(Boolean)
  const uploadState = (field, busy) => setUploads(current => ({ ...current, [field]: busy }))
  const operation = useRetainedFulfillmentCommand(async (command, key) => {
    if (secureMode) {
      const result = await assignProductMediaBff(command, key)
      // Assignment is recorded, but cleanup still belongs to this exact receipt.
      return result.ok && result.cleanupPending
        ? { ...result, ok: false, code: 'PRODUCT_MEDIA_CLEANUP_PENDING' } : result
    }
    const { error: saveError } = await supabase.from('products').update({
      primary_image_url: command.primary?.url || null,
      image_url: command.primary?.url || null,
      lifestyle_images: command.lifestyle.map(item => item.url),
      secondary_images: command.secondary.map(item => item.url),
    }).eq('sku', command.sku)
    return saveError ? { ok: false, code: 'ADMIN_SERVICE_UNAVAILABLE', error: safeUiError('PRODUCT_SAVE_FAILED') } : { ok: true }
  }, secureMode, 'product photo assignments')
  const saving = operation.busy
  const locked = operation.locked
  const closeDisabled = saving || uploading || (operation.uncertain && secureMode && !cleanupPending)

  const change = (setter) => (value) => {
    if (locked) return
    setter(value)
    setDirty(true)
    setConfirmClose(false)
    setError('')
  }

  const requestClose = () => {
    if (closeDisabled) return
    if (operation.uncertain && !secureMode) { onClose(); return }
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  const handleSave = async () => {
    if (saving || uploading || (operation.uncertain && !secureMode)) return
    const trimmedReason = reason.trim()
    if (requiresPrimary && !primary) {
      setError('A published product must keep a primary photo. Add one before saving.')
      return
    }
    if (secureMode && trimmedReason.length < 3) {
      setError('Add a short reason for this product-media change.')
      return
    }
    setError('')
    const result = await operation.run({ sku: product.sku, primary,
      lifestyle: afterUse ? [afterUse] : [], secondary: samples, reason: trimmedReason })
    if (!result || (!result.ok && !result.cleanupPending)) return
    setCleanupPending(Boolean(result.cleanupPending))
    setDirty(false)
    try {
      await onSave?.()
    } catch {
      if (activeRef.current) setError('Photos are saved, but the product register could not refresh. Close and refresh the register before another change.')
      return
    }
    if (activeRef.current && !result.cleanupPending) onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <AdminDialog onClose={requestClose} closeDisabled={closeDisabled} initialFocusRef={closeButtonRef} labelledBy="photo-manager-title" describedBy="photo-manager-help">
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-adm border border-adm-line bg-adm-surface text-white shadow-2xl sm:max-h-[90dvh] sm:rounded-adm">
        <header className="flex items-start justify-between gap-4 border-b border-adm-line bg-black/35 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="font-mono text-xs text-blue">SKU {product.sku}</p>
            <h2 id="photo-manager-title" className="mt-1 text-xl font-semibold">Product photos</h2>
            <p id="photo-manager-help" className="mt-1 text-sm leading-5 text-white/60">Choose the storefront primary, after-use, and supporting photos.</p>
          </div>
          <button ref={closeButtonRef} type="button" disabled={closeDisabled} onClick={requestClose} aria-label="Close product photos" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-adm-sm border border-adm-line text-white/70 transition-[background-color,color,transform] duration-150 hover:bg-white/5 hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {!secureMode && <div className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm leading-5 text-amber-100">Secure media commands are not active on this environment. Saving uses the transitional staff database path.</div>}
          <fieldset disabled={locked} className="space-y-6">
          <ImageUploadDropzone onUploadingChange={busy => uploadState("primary", busy)} label="Primary storefront photo" existingUrls={primary ? [primary.url] : []} onMediaChange={change(setPrimary)} />
          <ImageUploadDropzone onUploadingChange={busy => uploadState("lifestyle", busy)} label="After-use photo" existingUrls={afterUse ? [afterUse.url] : []} onMediaChange={change(setAfterUse)} />
          <ImageUploadDropzone onUploadingChange={busy => uploadState("secondary", busy)} label="Supporting photos — up to 5" multiple maxFiles={5} existingUrls={samples.map((item) => item.url)} onMediaChange={change(setSamples)} />

          {secureMode && (
            <label className="block text-sm font-semibold text-white/75">
              Change reason <span aria-hidden="true" className="text-red-300">*</span>
              <textarea value={reason} onChange={(event) => { setReason(event.target.value); setDirty(true); setError('') }} maxLength={500} rows={3} required aria-describedby="photo-reason-help" className="adm-input mt-2 min-h-24 resize-y text-base" />
              <span id="photo-reason-help" className="mt-1 block text-xs font-normal text-white/55">Recorded with the signed assignment for audit and recovery.</span>
            </label>
          )}

          </fieldset>
          {!cleanupPending && operation.error && <div role="alert" className="rounded-adm-sm border border-amber/40 bg-amber/10 p-3 text-sm text-amber-100">{operation.error}</div>}
          {error && <div role="alert" className="rounded-adm-sm border border-crimson/35 bg-crimson/10 p-3 text-sm text-red-200">{error}</div>}
          {cleanupPending && <div role="status" className="rounded-adm-sm border border-amber/40 bg-amber/10 p-3 text-sm leading-5 text-amber-100">Photos are saved. An unused old file still needs cleanup; retry to finish safely.</div>}
          {requiresPrimary && !primary && !error && <div role="status" className="rounded-adm-sm border border-amber/40 bg-amber/10 p-3 text-sm text-amber-100">This product is published and must keep a primary photo.</div>}
          {confirmClose && (
            <div role="alertdialog" aria-label="Discard unsaved photo changes" className="rounded-adm-sm border border-amber/40 bg-amber/10 p-3">
              <p className="text-sm font-semibold text-amber-100">Discard these unsaved photo changes?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setConfirmClose(false)} className="min-h-11 rounded-adm-sm border border-adm-line px-4 font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-white/5 active:scale-[0.98]">Keep editing</button>
                <button type="button" onClick={onClose} className="min-h-11 rounded-adm-sm bg-crimson px-4 font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-crimson/90 active:scale-[0.98]">Discard changes</button>
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-adm-line bg-black/35 p-4 sm:px-5">
          <div aria-live="polite" className="sr-only">{saving ? 'Saving product photos' : ''}</div>
          <div className="flex gap-2">
            <button type="button" onClick={requestClose} disabled={closeDisabled} className="min-h-11 flex-1 rounded-adm-sm border border-adm-line px-4 font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-white/5 active:scale-[0.98] disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void handleSave()} disabled={saving || uploading || (operation.uncertain && !secureMode) || (!dirty && !cleanupPending) || (requiresPrimary && !primary) || (secureMode && reason.trim().length < 3)} className="min-h-11 flex-[1.4] rounded-adm-sm bg-forest px-4 font-bold text-navy transition-[background-color,transform] duration-150 hover:bg-forest/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
              {saving ? 'Saving…' : uploading ? 'Wait for photo upload' : cleanupPending ? 'Retry file cleanup' : operation.uncertain ? secureMode ? 'Retry same command' : 'Reconcile product photos first' : 'Save photo assignment'}
            </button>
          </div>
        </footer>
      </div>
      </AdminDialog>
    </div>
  )
}
