import React, { useState, useEffect } from 'react'
import FlightWorkflowDiagram from './FlightWorkflowDiagram'
import CustodyWorkflowDiagram from './CustodyWorkflowDiagram'
import FefoWorkflowDiagram from './FefoWorkflowDiagram'
import FulfillmentWorkflowDiagram from './FulfillmentWorkflowDiagram'
import PasabuyWorkflowDiagram from './PasabuyWorkflowDiagram'

/**
 * WorkflowGuideModal
 * Interactive operations visual guide modal for staff across all K2 Jimzon workflows.
 * Adheres to K2 4-Skill Design Suite and Operations Rulebook.
 */
export default function WorkflowGuideModal({
  isOpen,
  onClose,
  defaultTab = 'flights',
  onNavigate = null,
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab)
  }, [defaultTab])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const tabs = [
    { id: 'flights', label: '✈️ Flights & Cargo', section: 'consignment' },
    { id: 'custody', label: '🤝 Lot Custody', section: 'inventory' },
    { id: 'fefo', label: '⏳ FEFO & Expiry', section: 'inventory' },
    { id: 'fulfillment', label: '📦 Order Packing', section: 'omni_hub' },
    { id: 'pasabuy', label: '🇮🇹 Pasabuy Quotes', section: 'pasabuy_manager' },
  ]

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a0e17] text-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0d131f] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-lg">
              🗺️
            </span>
            <div>
              <h2 className="text-base font-bold text-white sm:text-lg">
                K2 Operations Visual Workflow Guide
              </h2>
              <p className="text-xs text-white/50">
                Authoritative procedures, scan requirements & safeguards for all active shifts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation Rail */}
        <div className="flex shrink-0 overflow-x-auto border-b border-white/10 bg-[#0a0e17] px-4 py-2 custom-scrollbar">
          <div className="flex space-x-1 sm:space-x-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'border border-sky-500/40 bg-sky-500/15 text-sky-400 shadow-sm'
                      : 'border border-transparent text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-5">
          {activeTab === 'flights' && <FlightWorkflowDiagram />}
          {activeTab === 'custody' && <CustodyWorkflowDiagram />}
          {activeTab === 'fefo' && <FefoWorkflowDiagram />}
          {activeTab === 'fulfillment' && <FulfillmentWorkflowDiagram />}
          {activeTab === 'pasabuy' && <PasabuyWorkflowDiagram />}
        </div>

        {/* Footer with Workspace Shortcut */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-[#0d131f] px-5 py-3.5">
          <div className="text-xs text-white/50">
            Source:{' '}
            <span className="font-mono text-white/80">K2 Operations Rulebook §1–§24</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigate && currentTab.section && (
              <button
                onClick={() => {
                  onNavigate(currentTab.section)
                  onClose()
                }}
                className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-400 transition-all hover:bg-sky-500/20"
              >
                <span>Open {currentTab.label.split(' ')[1]} Workspace</span>
                <span>→</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
