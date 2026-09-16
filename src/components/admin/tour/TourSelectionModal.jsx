import React from 'react'
import { SPOTLIGHT_TOURS } from './tourData'
import { SparkleIcon, BoxIcon, XIcon, ArrowIcon } from '../../ui/icons'

/**
 * TourSelectionModal
 * Allows staff to choose between Manual Inventory (with ChatGPT) vs Automatic Barcode Scan intake.
 */
export default function TourSelectionModal({
  isOpen = false,
  onClose = () => {},
  onSelectTour = () => {},
}) {
  if (!isOpen) return null

  const manualTour = SPOTLIGHT_TOURS.manual_inventory
  const autoTour = SPOTLIGHT_TOURS.auto_inventory

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-selection-title"
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-gradient-to-b from-[#181d28] to-[#0c1017] p-6 text-white shadow-2xl shadow-black/90 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <SparkleIcon size={16} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Admin BOS Interactive SOPs
              </span>
            </div>
            <h2
              id="tour-selection-title"
              className="mt-1 font-serif text-xl font-bold text-white sm:text-2xl"
            >
              Choose an Operations Walkthrough
            </h2>
            <p className="mt-1 text-xs text-white/60">
              Select a guided spotlight tour. The screen will highlight each exact button and guide you step-by-step through our Italian inventory workflows.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tour Chooser"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* The Two Workflow Choices */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Card 1: Manual Adding Inventory (with ChatGPT) */}
          <div className="flex flex-col justify-between rounded-xl border border-rose-500/30 bg-rose-950/15 p-5 transition-all hover:border-rose-400 hover:bg-rose-950/25">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <SparkleIcon size={20} />
                </span>
                <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 text-xs font-bold text-rose-300">
                  5 Steps · ~15 mins
                </span>
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-white">
                {manualTour.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                For brand-new Italian items arriving without an existing SKU. Learn how to generate specifications in ChatGPT, copy prompts, and paste JSON into Smart Paste.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-white/60">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>Interactive ChatGPT prompt formula</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>1-click prompt copying to clipboard</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>Smart Paste JSON schema validation</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectTour('manual_inventory')
                onClose()
              }}
              className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-rose-500 active:scale-[0.98] cursor-pointer shadow-lg shadow-rose-950/50"
            >
              <span>Start Manual Intake Tour</span>
              <ArrowIcon size={16} />
            </button>
          </div>

          {/* Card 2: Automatic Adding Inventory */}
          <div className="flex flex-col justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5 transition-all hover:border-emerald-400 hover:bg-emerald-950/25">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <BoxIcon size={20} />
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  5 Steps · ~5 mins
                </span>
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-white">
                {autoTour.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                For restocking products already in our catalog. Learn how to laser-scan manufacturer barcodes, verify SKU match, record FEFO expiry dates, and bin physical stock.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-white/60">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Laser EAN-13 barcode scanning</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Manufacturer FEFO expiry registration</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Physical shelf bin placement rules</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectTour('auto_inventory')
                onClose()
              }}
              className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-500 active:scale-[0.98] cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <span>Start Automatic Intake Tour</span>
              <ArrowIcon size={16} />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/40">
          <span>You can cancel or exit a walkthrough tour at any time with Esc.</span>
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
