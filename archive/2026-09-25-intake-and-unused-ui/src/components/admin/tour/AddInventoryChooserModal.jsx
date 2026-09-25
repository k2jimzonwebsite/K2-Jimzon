import React, { useEffect } from 'react'
import {
  BarcodeIcon,
  SparkleIcon,
  UploadIcon,
  XIcon,
  ArrowIcon,
  BoxIcon,
} from '../../ui/icons'

/**
 * AddInventoryChooserModal
 * Asks staff how they would like to add inventory:
 * 1. Automatically: Barcode Laser Scan & FEFO Expiry Intake (Restock existing catalog SKU)
 * 2. Manually: ChatGPT Prompt Studio & Smart Paste (Brand-new Italian provision)
 */
export default function AddInventoryChooserModal({
  isOpen = false,
  secure = false,
  onClose = () => {},
  onSelectAutomaticQuick = () => {},
  onSelectAutomaticTour = () => {},
  onSelectManualSmartPaste = () => {},
  onSelectManualForm = () => {},
  onSelectManualTour = () => {},
}) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intake-method-title"
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-gradient-to-b from-[#181d28] to-[#0c1017] p-6 text-white shadow-2xl shadow-black/90 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue/20 text-blue border border-blue/30">
                <BoxIcon size={16} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue">
                Inventory Intake Selection
              </span>
            </div>
            <h2
              id="intake-method-title"
              className="mt-1 font-serif text-xl font-bold text-white sm:text-2xl"
            >
              How would you like to add inventory?
            </h2>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">
              Choose an existing catalog SKU to restock, or start a reviewed listing for a new product.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Intake Method Chooser"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Dual Choice Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Card 1: Automatically (Barcode Laser Scan & FEFO Expiry) */}
          <div className="flex flex-col justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5 transition-all hover:border-emerald-400 hover:bg-emerald-950/25">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <BarcodeIcon size={20} />
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  Existing Catalog SKU
                </span>
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-white">
                Automatically via Barcode
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                Restock incoming physical units for products already in our master catalog. Scan EAN-13 barcode, record FEFO expiry date, and bin stock into warehouse.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-white/60">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Instant EAN-13 barcode match</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>FEFO expiry lot tracking</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Immediate sellable balance update</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onSelectAutomaticQuick()
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-500 active:scale-[0.98] cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <BarcodeIcon size={16} />
                <span>Scan & Intake Now →</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onSelectAutomaticTour()
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-[0.98] cursor-pointer"
              >
                <SparkleIcon size={14} />
                <span>Start Guided Tour (5 steps)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Manually (ChatGPT Studio & Smart Paste) */}
          <div className="flex flex-col justify-between rounded-xl border border-rose-500/30 bg-rose-950/15 p-5 transition-all hover:border-rose-400 hover:bg-rose-950/25">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <SparkleIcon size={20} />
                </span>
                <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 text-xs font-bold text-rose-300">
                  New Product
                </span>
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-white">
                {secure ? 'Create a reviewed listing' : 'Manually via ChatGPT Studio'}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                {secure ? 'Scan the barcode, check the package, and upload evidence. Use manual product JSON or an enabled paid content provider, then review every field before saving a Draft.' : 'Use our ChatGPT prompt formula to draft specs, then paste JSON into Smart Paste.'}
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-white/60">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>{secure ? 'Barcode lookup with manual fallback' : 'Interactive ChatGPT prompt formula'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>{secure ? 'Staff photos and field review' : 'Smart Paste JSON schema ingestion'}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>{secure ? 'Draft before stock or publication' : 'Standard manual editor fallback'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (secure) onSelectManualForm()
                  else onSelectManualSmartPaste()
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-rose-500 active:scale-[0.98] cursor-pointer shadow-lg shadow-rose-950/50"
              >
                <UploadIcon size={16} />
                <span>{secure ? 'Start New Product →' : 'Smart Paste JSON →'}</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    if (secure) onSelectManualSmartPaste()
                    else onSelectManualForm()
                  }}
                  className="flex-1 min-h-11 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-center"
                >
                  {secure ? 'Review JSON' : 'Manual Form'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onSelectManualTour()
                  }}
                  className="flex-1 min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <SparkleIcon size={13} />
                  <span>Guided Tour</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/40">
          <span>You can cancel or switch intake methods at any time.</span>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
