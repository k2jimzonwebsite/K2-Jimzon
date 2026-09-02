import React, { useState } from 'react'

/**
 * FulfillmentWorkflowDiagram
 * Visual interactive workflow for Order Confirmation -> FEFO Reservation -> Order-First Packing Scan -> Courier Waybill -> Dispatch.
 * Adheres to Operations Rulebook §12, §13, §14.
 */
export default function FulfillmentWorkflowDiagram({ activeStep = null, onSelectStep = null }) {
  const [selected, setSelected] = useState(activeStep || 0)

  const steps = [
    {
      id: 'order_reserved',
      num: 1,
      title: 'Order Confirmed & FEFO Reserved',
      actor: 'System / Sales Channel',
      tag: 'Exact Reservation',
      color: '#38bdf8', // sky
      short: 'Order enters fulfillment queue and reserves oldest eligible lots.',
      rules: [
        'FEFO engine assigns specific lot IDs with sufficient quantity and freshness (>30d).',
        'Customer delivery method (Metro Manila Same-Day, LBC Express, Pickup) is verified.',
        'Reserved units are locked to prevent double-selling across competing channels.',
      ],
      caution: 'Orders without confirmed payment or approved terms cannot enter the packing queue.',
    },
    {
      id: 'packing_scan',
      num: 2,
      title: 'Order-First Unit Packing Scan',
      actor: 'Packing Staff',
      tag: '1:1 Unit Scan',
      color: '#a855f7', // purple
      short: 'Staff opens the specific order and scans every required unit individually.',
      rules: [
        'Workflow is strictly order-first: select the order before scanning items.',
        'Scan quantity 5 five times (1 scan per physical piece) to guarantee accuracy.',
        'Barcode mismatch or wrong SKU triggers an immediate audible/visual block.',
      ],
      caution: 'Never bypass unit scanning by typing manual numbers unless authorized by Admin.',
    },
    {
      id: 'waybill_tag',
      num: 3,
      title: 'Waybill & K2 QR Generation',
      actor: 'Fulfillment Lead',
      tag: 'Courier Booking',
      color: '#e5a93c', // amber
      short: 'Courier shipping label or K2 internal packing QR is printed and attached.',
      rules: [
        'Direct website orders receive an internal K2 packing QR until courier booking.',
        'Shopee/Lazada/TikTok orders attach verified marketplace waybills.',
        'Tracking number and courier carrier (Lalamove, J&T, LBC, Grab) are persisted.',
      ],
      caution: 'Never mark an order Shipped before the courier waybill is physically attached.',
    },
    {
      id: 'dispatch',
      num: 4,
      title: 'Courier Handover & Dispatched',
      actor: 'Hub Logistics Staff',
      tag: 'Settlement & Dispatched',
      color: '#10b981', // emerald
      short: 'Package is handed to courier rider and tracking link is sent to customer.',
      rules: [
        'Rider signs manifest or handover receipt is documented.',
        'Order state transitions from Packed -> Dispatched in canonical records.',
        'Customer receives automated tracking notification with live courier link.',
      ],
      caution: 'Handover is final; any transit failure enters the Exception Resolution queue.',
    },
  ]

  const activeIdx = activeStep !== null ? activeStep : selected
  const activeData = steps[activeIdx] || steps[0]

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d131f] p-4 text-white shadow-xl sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">
              Order Fulfillment & Packing Pipeline
            </h3>
          </div>
          <p className="text-xs text-white/60">
            Operations Rulebook §12–14 — Order-First Packing, Unit Scans & Courier Handover
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
          Step {activeData.num} of {steps.length}
        </span>
      </div>

      {/* SVG Flow Diagram */}
      <div className="hidden md:block">
        <svg viewBox="0 0 760 110" className="w-full select-none overflow-visible">
          <defs>
            <linearGradient id="fulfLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="33%" stopColor="#a855f7" />
              <stop offset="66%" stopColor="#e5a93c" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          <line x1="60" y1="40" x2="700" y2="40" stroke="#1f293d" strokeWidth="4" strokeLinecap="round" />
          <line
            x1="60"
            y1="40"
            x2={60 + (activeIdx * (640 / (steps.length - 1)))}
            y2="40"
            stroke="url(#fulfLineGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />

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

      {/* Mobile Selector Pills */}
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
      <div className="mt-4 rounded-lg border border-white/10 bg-[#121927] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
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
            Fulfillment Protocols & Non-Negotiables:
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
