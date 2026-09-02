import React, { useState } from 'react'

/**
 * CustodyWorkflowDiagram
 * Visual interactive workflow for Custody Transfer Offer -> Pending In-Transfer -> Receiver Recount -> Acceptance/Rejection.
 * Adheres to Operations Rulebook §10 and System Brain §3 (Custody Truth).
 */
export default function CustodyWorkflowDiagram({ activeStep = null, onSelectStep = null }) {
  const [selected, setSelected] = useState(activeStep || 0)

  const steps = [
    {
      id: 'offer',
      num: 1,
      title: 'Transfer Offer Initiated',
      actor: 'Current Custodian (Sender)',
      tag: 'Custody Offer',
      color: '#38bdf8', // sky
      short: 'Sender selects lot, exact quantity, destination hub, and recipient staff.',
      rules: [
        'Sender must physically hold sufficient unreserved, unexpired units.',
        'Recipient staff and destination hub must be explicitly selected from active registry.',
        'Transfer reason (e.g. Hub Rebalance, Event Stock, Storefront Display) is mandatory.',
      ],
      caution: 'Sender action alone NEVER transfers ownership—it only creates an offer.',
    },
    {
      id: 'in_transit',
      num: 2,
      title: 'In-Transfer Holding State',
      actor: 'Logistics / Courier Handover',
      tag: 'Transit Lock',
      color: '#e5a93c', // amber
      short: 'Units are decremented from sender availability and locked in in_transfer status.',
      rules: [
        'The transferred quantity is immediately deducted from sender sellable stock.',
        'Stock remains locked to prevent double-reservation while in transit between hubs.',
        'Transfer operation key and timestamp are logged to immutable custody audit ledger.',
      ],
      caution: 'Neither sender nor receiver can sell units while in in_transfer status.',
    },
    {
      id: 'recount',
      num: 3,
      title: 'Receiver Physical Recount',
      actor: 'Destination Custodian (Receiver)',
      tag: 'Physical Verification',
      color: '#a855f7', // purple
      short: 'Receiver inspects package condition, counts units, and checks expiry dates.',
      rules: [
        'Receiver physically verifies lot barcode, expiry date, and unit count against the offer.',
        'Damaged or broken seals must be documented with photos before resolution.',
        'Recount ensures physical presence before digital custody is claimed.',
      ],
      caution: 'Never accept a digital custody transfer before counting the physical box.',
    },
    {
      id: 'resolution',
      num: 4,
      title: 'Receiver Accept / Reject',
      actor: 'Destination Custodian (Receiver)',
      tag: 'Custody Settlement',
      color: '#10b981', // emerald
      short: 'Receiver explicitly accepts (custody updates) or rejects (returns to sender).',
      rules: [
        'Accept: units update custodian and hub in product_batches with immutable event.',
        'Reject: units return to sender custody with required discrepancy reason.',
        'System guarantees zero stranded units and absolute custody accountability.',
      ],
      caution: 'Acceptance makes the recipient solely accountable for all future batch counts.',
    },
  ]

  const activeIdx = activeStep !== null ? activeStep : selected
  const activeData = steps[activeIdx] || steps[0]

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d131f] p-4 text-white shadow-xl sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              Exact-Lot Custody Transfer Workflow
            </h3>
          </div>
          <p className="text-xs text-white/60">
            Operations Rulebook §10 — Two-Party Handshake & Immutable Physical Custody
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
          Step {activeData.num} of {steps.length}
        </span>
      </div>

      {/* SVG Flow Diagram (Desktop) */}
      <div className="hidden md:block">
        <svg viewBox="0 0 760 110" className="w-full select-none overflow-visible">
          <defs>
            <linearGradient id="custodyLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="33%" stopColor="#e5a93c" />
              <stop offset="66%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Base Connection Line */}
          <line x1="60" y1="40" x2="700" y2="40" stroke="#1f293d" strokeWidth="4" strokeLinecap="round" />
          <line
            x1="60"
            y1="40"
            x2={60 + (activeIdx * (640 / (steps.length - 1)))}
            y2="40"
            stroke="url(#custodyLineGrad)"
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
                <circle
                  cx={x}
                  cy="40"
                  r={isActive ? "16" : "13"}
                  fill={isActive ? step.color : isPast ? "#1e293b" : "#0d131f"}
                  stroke={step.color}
                  strokeWidth={isActive ? "3" : "2"}
                />

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

                <text
                  x={x}
                  y="90"
                  textAnchor="middle"
                  fill={isActive ? step.color : "#64748b"}
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {step.actor}
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

      {/* Active Step Details */}
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
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">
              {activeData.tag}
            </span>
          </div>
          <span className="text-xs font-medium" style={{ color: activeData.color }}>
            👤 {activeData.actor}
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-white/80">{activeData.short}</p>

        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Custody Rules & Non-Negotiables:
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
