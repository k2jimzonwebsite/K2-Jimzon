import React, { useState, useEffect } from 'react'
import { getAvailableTours } from './tourData'
import {
  SparkleIcon,
  BoxIcon,
  XIcon,
  ArrowIcon,
  PlayIcon,
  PlaneIcon,
  BarcodeIcon,
  GlobeIcon,
} from '../../ui/icons'

const CARD_THEMES = {
  rose: {
    accent: '#e11d48',
    border: 'rgba(244, 63, 94, 0.3)',
    bg: 'rgba(244, 63, 94, 0.06)',
    iconBg: 'rgba(244, 63, 94, 0.15)',
    text: '#fda4af',
  },
  emerald: {
    accent: '#059669',
    border: 'rgba(16, 185, 129, 0.3)',
    bg: 'rgba(16, 185, 129, 0.06)',
    iconBg: 'rgba(16, 185, 129, 0.15)',
    text: '#6ee7b7',
  },
  sky: {
    accent: '#0284c7',
    border: 'rgba(14, 165, 233, 0.3)',
    bg: 'rgba(14, 165, 233, 0.06)',
    iconBg: 'rgba(14, 165, 233, 0.15)',
    text: '#7dd3fc',
  },
  amber: {
    accent: '#d97706',
    border: 'rgba(245, 158, 11, 0.3)',
    bg: 'rgba(245, 158, 11, 0.06)',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    text: '#fcd34d',
  },
  purple: {
    accent: '#9333ea',
    border: 'rgba(168, 85, 247, 0.3)',
    bg: 'rgba(168, 85, 247, 0.06)',
    iconBg: 'rgba(168, 85, 247, 0.15)',
    text: '#d8b4fe',
  },
  indigo: {
    accent: '#4f46e5',
    border: 'rgba(99, 102, 241, 0.3)',
    bg: 'rgba(99, 102, 241, 0.06)',
    iconBg: 'rgba(99, 102, 241, 0.15)',
    text: '#a5b4fc',
  },
  teal: {
    accent: '#0d9488',
    border: 'rgba(20, 184, 166, 0.3)',
    bg: 'rgba(20, 184, 166, 0.06)',
    iconBg: 'rgba(20, 184, 166, 0.15)',
    text: '#5eead4',
  },
  slate: {
    accent: '#475569',
    border: 'rgba(148, 163, 184, 0.3)',
    bg: 'rgba(148, 163, 184, 0.06)',
    iconBg: 'rgba(148, 163, 184, 0.15)',
    text: '#cbd5e1',
  },
}

function getTourIcon(tourId) {
  switch (tourId) {
    case 'cross_border_lifecycle':
      return <PlaneIcon size={20} />
    case 'monthly_count':
      return <BarcodeIcon size={20} />
    case 'channel_integration_lifecycle':
      return <GlobeIcon size={20} />
    case 'new_product_intake':
    case 'pasabuy_lifecycle':
      return <SparkleIcon size={20} />
    case 'inventory_handover':
      return <ArrowIcon size={20} />
    default:
      return <BoxIcon size={20} />
  }
}

const CATEGORIES = [
  { id: 'all', label: 'All Operations (8)' },
  { id: 'intake', label: 'Intake and Products (2)' },
  { id: 'operations', label: 'Warehouse and Logistics (3)' },
  { id: 'fulfillment', label: 'Orders and Channels (3)' },
]

/**
 * TourSelectionModal
 * Displays all 8 operational lifecycles for staff to choose and launch.
 */
export default function TourSelectionModal({
  isOpen = false,
  onClose = () => {},
  onSelectTour = () => {},
}) {
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const allTours = getAvailableTours()
  const filteredTours = allTours.filter((tour) => {
    if (activeCategory === 'intake') {
      return ['new_product_intake', 'existing_stock_intake'].includes(tour.id)
    }
    if (activeCategory === 'operations') {
      return ['cross_border_lifecycle', 'inventory_handover', 'monthly_count'].includes(tour.id)
    }
    if (activeCategory === 'fulfillment') {
      return ['new_order', 'pasabuy_lifecycle', 'channel_integration_lifecycle'].includes(tour.id)
    }
    return true
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-selection-title"
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-white/15 bg-gradient-to-b from-[#181d28] to-[#0c1017] p-5 text-white shadow-2xl shadow-black/90 sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <PlayIcon size={16} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Admin BOS Interactive Walkthroughs
              </span>
            </div>
            <h2
              id="tour-selection-title"
              className="mt-1 font-serif text-xl font-bold text-white sm:text-2xl"
            >
              Choose an Operations Walkthrough
            </h2>
            <p className="mt-1 text-xs text-white/60">
              Select a guided walkthrough. The screen highlights each button and guides you step-by-step through our warehouse, store, and order procedures.
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

        {/* Category Navigation Pills */}
        <div className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`min-h-11 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* The 8 Workflow Cards Grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2 custom-scrollbar">
          {filteredTours.map((tour) => {
            const cardTheme = CARD_THEMES[tour.theme] || CARD_THEMES.emerald
            return (
              <div
                key={tour.id}
                style={{
                  borderColor: cardTheme.border,
                  backgroundColor: cardTheme.bg,
                }}
                className="flex flex-col justify-between rounded-xl border p-4 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        backgroundColor: cardTheme.iconBg,
                        color: cardTheme.text,
                        borderColor: cardTheme.border,
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border"
                    >
                      {getTourIcon(tour.id)}
                    </span>
                    <span
                      style={{
                        backgroundColor: cardTheme.iconBg,
                        color: cardTheme.text,
                        borderColor: cardTheme.border,
                      }}
                      className="rounded-full border px-2.5 py-0.5 text-xs font-bold"
                    >
                      {tour.badge || `${tour.steps?.length || 5} Steps`}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-white">
                    {tour.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/40 font-mono">
                    {tour.category}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-white/70 line-clamp-3">
                    {tour.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTour(tour.id)
                    onClose()
                  }}
                  style={{
                    backgroundColor: cardTheme.accent,
                  }}
                  className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer hover:opacity-90 active:scale-[0.98] shadow-md shadow-black/40"
                >
                  <PlayIcon size={14} />
                  <span>Play Walkthrough</span>
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/40">
          <span>Press Esc at any time to exit a guided walkthrough.</span>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
