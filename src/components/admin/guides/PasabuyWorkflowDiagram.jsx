import React, { useState } from 'react'

/**
 * PasabuyWorkflowDiagram
 * Visual interactive workflow for Customer Inquiry -> Landed Cost -> Owner Quote -> Confirmation -> Milan Sourcing & Flight.
 * Adheres to Operations Rulebook §8, §17 and System Brain §2.
 */
export default function PasabuyWorkflowDiagram({ activeStep = null, onSelectStep = null }) {
  const [selected, setSelected] = useState(activeStep || 0)

  const steps = [
    {
      id: 'inquiry',
      num: 1,
      title: 'Customer Request & Item Specs',
      actor: 'Customer / Chat Staff',
      tag: 'Demand Intake',
      color: '#38bdf8', // sky
      short: 'Customer submits photos, brand, exact size/shade/variant, and target delivery timeframe.',
      rules: [
        'Collect high-resolution packaging photo, exact Italian brand, and variant specification.',
        'Capture delivery destination and urgency (Standard Flight vs Expedited).',
        'Staff creates a formal Pasabuy Request record with unique PR-ID.',
      ],
      caution: 'Vague descriptions without clear variant details must be clarified before quoting.',
    },
    {
      id: 'costing',
      num: 2,
      title: 'Landed Cost Computation',
      actor: 'System / Sourcing Assistant',
      tag: 'Cost Formulation',
      color: '#e5a93c', // amber
      short: 'System calculates EUR purchase price + FX conversion + air freight weight + landed buffer.',
      rules: [
        'Italian retail/outlet price in EUR converted at current active EUR-PHP FX rate.',
        'Weight-based air cargo freight (Milan -> Manila) computed dynamically.',
        'Customs, insurance, and handling buffer added to produce base Landed Cost.',
      ],
      caution: 'Computed landed cost is advisory—it sets the hard price floor, not the final quote.',
    },
    {
      id: 'owner_quote',
      num: 3,
      title: 'Owner Authoritative Quote',
      actor: 'Business Owner',
      tag: 'Pricing & Rationale',
      color: '#a855f7', // purple
      short: 'Owner reviews rarity, supplier difficulty, and sets final PHP quote with validity date.',
      rules: [
        'Owner sets final PHP price (must be >= computed landed cost) with documented rationale.',
        'Quote version is locked with an immutable expiration window (typically 3–7 days).',
        'Clear delivery estimate and cancellation/substitution terms are attached.',
      ],
      caution: 'Browser/staff cannot auto-quote Pasabuy—only the owner sets the authoritative price.',
    },
    {
      id: 'customer_confirm',
      num: 4,
      title: 'Customer Confirmation & Deposit',
      actor: 'Customer / Finance',
      tag: 'Order Commitment',
      color: '#10b981', // emerald
      short: 'Customer reviews quote, confirms commitment, and submits payment evidence.',
      rules: [
        'Customer accepts quote terms and sends payment reference (GCash/Bank/Maya).',
        'Finance verifies payment evidence before signaling Italy sourcing.',
        'Request status transitions to Sourcing Queue with locked PHP price.',
      ],
      caution: 'Italy staff will not purchase custom items without verified payment evidence.',
    },
    {
      id: 'sourcing_flight',
      num: 5,
      title: 'Milan Sourcing & Cargo Flight',
      actor: 'Milan Sourcing Team',
      tag: 'Physical Fulfillment',
      color: '#06b6d4', // cyan
      short: 'Item is purchased in Milan, scanned into the next cargo box, and flown to Manila.',
      rules: [
        'Milan buyer purchases exact variant, saves receipt, and inspects quality.',
        'Unit is packed and scanned into next scheduled cargo flight box.',
        'Customer can view real-time flight milestone progress in their order portal.',
      ],
      caution: 'If item is out of stock in Milan, staff immediately trigger refund or substitution.',
    },
  ]

  const activeIdx = activeStep !== null ? activeStep : selected
  const activeData = steps[activeIdx] || steps[0]

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d131f] p-4 text-white shadow-xl sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
              Pasabuy Custom Sourcing & Quoting Lifecycle
            </h3>
          </div>
          <p className="text-xs text-white/60">
            Operations Rulebook §8, §17 — Request Intake to Milan Sourcing & Cargo Flight
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70">
          Step {activeData.num} of {steps.length}
        </span>
      </div>

      {/* SVG Flow Diagram (Desktop) */}
      <div className="hidden md:block">
        <svg viewBox="0 0 760 110" className="w-full select-none overflow-visible">
          <defs>
            <linearGradient id="pasabuyLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="25%" stopColor="#e5a93c" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="75%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          <line x1="50" y1="40" x2="710" y2="40" stroke="#1f293d" strokeWidth="4" strokeLinecap="round" />
          <line
            x1="50"
            y1="40"
            x2={50 + (activeIdx * (660 / (steps.length - 1)))}
            y2="40"
            stroke="url(#pasabuyLineGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {steps.map((step, idx) => {
            const x = 50 + idx * (660 / (steps.length - 1))
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
                  {step.title.split(' ')[0]} {step.title.split(' ')[1]}
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:hidden">
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
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
              {activeData.tag}
            </span>
          </div>
          <span className="text-xs font-medium" style={{ color: activeData.color }}>
            👤 {activeData.actor}
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-white/80">{activeData.short}</p>

        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Workflow Logic & Safeguards:
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
