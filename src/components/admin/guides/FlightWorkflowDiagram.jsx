import React, { useState } from 'react'

/**
 * FlightWorkflowDiagram
 * Visual interactive workflow for Milan Packing Scan -> Transit -> Manila Receiving -> Receipt Reconciliation.
 * Adheres to K2 Jimzon 4-Skill Design Suite and Operations Rulebook §7, §9.
 */
export default function FlightWorkflowDiagram({ activeStep = null, onSelectStep = null }) {
  const [selected, setSelected] = useState(activeStep || 0)

  const steps = [
    {
      id: 'milan_packing',
      num: 1,
      title: 'Milan Packing Scan',
      location: 'Milan Hub (MXP)',
      tag: 'Origin Verification',
      color: '#38bdf8', // sky
      short: 'Scan each item into designated flight cargo box.',
      rules: [
        'Staff scan manufacturer barcode or K2 internal SKU for every single physical unit.',
        'Items are placed into a numbered, trackable cargo box (e.g. BOX-2026-08-A).',
        'Box manifest line expected vs scanned counts are updated in real time.',
      ],
      caution: 'Wrong or unrecognized items trigger an immediate scan exception.',
    },
    {
      id: 'transit',
      num: 2,
      title: 'Sealed & In Transit',
      location: 'Air Cargo (MXP -> MNL)',
      tag: 'Flight Movement',
      color: '#e5a93c', // amber
      short: 'Box is sealed and international flight manifest is locked.',
      rules: [
        'Italy coordinator confirms physical departure and flight number.',
        'Manifest lines become read-only to prevent backdated changes.',
        'Tracking milestone is recorded in the flight consignment ledger.',
      ],
      caution: 'No items can be added or removed while in transit status.',
    },
    {
      id: 'manila_scan',
      num: 3,
      title: 'Manila Receiving Scan',
      location: 'Manila Receiving Hub',
      tag: 'Physical Recount',
      color: '#a855f7', // purple
      short: 'Hub staff open box and independently scan every unit.',
      rules: [
        'Manila scan is an independent physical recount — never auto-copies Milan numbers.',
        'Camera or USB laser scanner records unit counts against expected manifest.',
        'Damaged packaging, broken seals, or suspicious items are flagged immediately.',
      ],
      caution: 'Never rely on box labels alone; physical barcode scans are mandatory.',
    },
    {
      id: 'reconciliation',
      num: 4,
      title: 'Discrepancy & Batch Finalization',
      location: 'Inventory Master',
      tag: 'Stock Custody',
      color: '#10b981', // emerald
      short: 'Classify variances and accept verified stock into inventory lots.',
      rules: [
        'Overages, shortages, and damages are classified into immutable exception records.',
        'Verified units are written to product_batches with expiry, hub, custodian, and box ID.',
        'Consignment is marked Finalized and available stock updates across Storefront/Admin.',
      ],
      caution: 'Finalization is irreversible and creates audited inventory lot records.',
    },
  ]

  const activeIdx = activeStep !== null ? activeStep : selected
  const activeData = steps[activeIdx] || steps[0]

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d131f] p-4 text-white shadow-xl sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400">
              Flight Consignment & Receiving Workflow
            </h3>
          </div>
          <p className="text-xs text-white/60">
            Operations Rulebook §7, §9 — Milan Packing to Manila Hub Reconciliation
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70">
          Step {activeData.num} of {steps.length}
        </span>
      </div>

      {/* SVG Timeline Diagram (Desktop/Tablet) */}
      <div className="hidden md:block">
        <svg viewBox="0 0 760 110" className="w-full select-none overflow-visible">
          <defs>
            <linearGradient id="flightLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="33%" stopColor="#e5a93c" />
              <stop offset="66%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="diagramGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Base Connection Line */}
          <line x1="60" y1="40" x2="700" y2="40" stroke="#1f293d" strokeWidth="4" strokeLinecap="round" />
          <line
            x1="60"
            y1="40"
            x2={60 + (activeIdx * (640 / (steps.length - 1)))}
            y2="40"
            stroke="url(#flightLineGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Steps */}
          {steps.map((step, idx) => {
            const x = 60 + idx * (640 / (steps.length - 1))
            const isActive = idx === activeIdx
            const isPast = idx < activeIdx

            return (
              <g
                key={step.id}
                onClick={() => {
                  setSelected(idx)
                  if (onSelectStep) onSelectStep(idx)
                }}
                className="cursor-pointer transition-transform duration-200 hover:scale-105"
              >
                {/* Outer Glow for Active */}
                {isActive && (
                  <circle
                    cx={x}
                    y="40"
                    r="22"
                    fill="none"
                    stroke={step.color}
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    filter="url(#diagramGlow)"
                    className="animate-pulse"
                  />
                )}

                {/* Node Circle */}
                <circle
                  cx={x}
                  cy="40"
                  r={isActive ? "16" : "13"}
                  fill={isActive ? step.color : isPast ? "#1e293b" : "#0d131f"}
                  stroke={step.color}
                  strokeWidth={isActive ? "3" : "2"}
                />

                {/* Node Number */}
                <text
                  x={x}
                  y="45"
                  textAnchor="middle"
                  fill={isActive ? "#0d131f" : isPast ? "#94a3b8" : step.color}
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {step.num}
                </text>

                {/* Step Title Label */}
                <text
                  x={x}
                  y="74"
                  textAnchor="middle"
                  fill={isActive ? "#ffffff" : "#94a3b8"}
                  fontSize="11"
                  fontWeight={isActive ? "bold" : "500"}
                  fontFamily="sans-serif"
                >
                  {step.title}
                </text>

                {/* Location Subtext */}
                <text
                  x={x}
                  y="90"
                  textAnchor="middle"
                  fill={isActive ? step.color : "#64748b"}
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {step.location}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Mobile Step Selector Pills */}
      <div className="grid grid-cols-2 gap-2 md:hidden">
        {steps.map((step, idx) => {
          const isActive = idx === activeIdx
          return (
            <button
              key={step.id}
              onClick={() => {
                setSelected(idx)
                if (onSelectStep) onSelectStep(idx)
              }}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all ${
                isActive
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-white/5 bg-white/[0.02] text-white/60 hover:bg-white/5'
              }`}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor: isActive ? step.color : '#1e293b',
                  color: isActive ? '#0d131f' : '#94a3b8',
                }}
              >
                {step.num}
              </span>
              <span className="truncate text-xs font-medium">{step.title}</span>
            </button>
          )
        })}
      </div>

      {/* Active Step Details Panel */}
      <div className="mt-4 rounded-lg border border-white/10 bg-[#121927] p-4 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-[#0d131f]"
              style={{ backgroundColor: activeData.color }}
            >
              {activeData.num}
            </span>
            <h4 className="text-sm font-bold text-white">{activeData.title}</h4>
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
              {activeData.tag}
            </span>
          </div>
          <span className="text-xs font-medium" style={{ color: activeData.color }}>
            📍 {activeData.location}
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-white/80">{activeData.short}</p>

        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Standard Procedure & Validation Checks:
          </div>
          <ul className="space-y-1">
            {activeData.rules.map((rule, rIdx) => (
              <li key={rIdx} className="flex items-start gap-2 text-xs text-white/70">
                <span className="mt-0.5 text-emerald-400">✓</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        {activeData.caution && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-200">
            <span className="shrink-0 font-bold">⚠️ Safeguard:</span>
            <span>{activeData.caution}</span>
          </div>
        )}
      </div>
    </div>
  )
}
