import React, { useState } from 'react'

/**
 * FefoWorkflowDiagram
 * Visual interactive timeline for FEFO (First-Expired, First-Out), Aging Tiers, and Clearance Rules.
 * Adheres to Operations Rulebook §5, §15 and System Brain §3.
 */
export default function FefoWorkflowDiagram({ activeTier = null, onSelectTier = null }) {
  const [selected, setSelected] = useState(activeTier || 0)

  const tiers = [
    {
      id: 'prime',
      num: 1,
      name: 'Prime Fresh (>90 Days)',
      tag: 'Standard Sellable',
      color: '#10b981', // emerald
      days: '> 90 Days Remaining',
      desc: 'Peak quality authentic Italian import. Default retail and wholesale pricing.',
      rules: [
        'Standard catalog allocation across Storefront, Shopee, Lazada, and TikTok.',
        'FEFO engine picks the oldest available batch within this tier first.',
        'Full price confidence guarantee on cosmetic/culinary items.',
      ],
      action: 'Normal order fulfillment and warehouse storage.',
    },
    {
      id: 'clearance',
      num: 2,
      name: 'Clearance Window (31–89 Days)',
      tag: 'Priority Sell-Through',
      color: '#e5a93c', // amber
      days: '31 – 89 Days Remaining',
      desc: 'Nearing shelf-life limit. Prioritized for rapid dispatch and promotional clearance.',
      rules: [
        'Automated 🔔 bell alert in Admin BOS notifying inventory staff.',
        'Eligible for owner-approved clearance discount / flash sale bundling.',
        'Prioritized in order reservations before younger fresh batches.',
      ],
      action: 'Promote actively on Storefront clearance rail or direct customer offers.',
    },
    {
      id: 'critical',
      num: 3,
      name: 'Critical / Quarantine (0–30 Days)',
      tag: 'Emergency Pull',
      color: '#f43f5e', // rose
      days: '0 – 30 Days Remaining',
      desc: 'Below minimum customer safety window. Strictly prohibited from public sale.',
      rules: [
        'Automatically withdrawn from Storefront and marketplace eligible stock.',
        'Locked from order reservation to prevent accidental shipping to customers.',
        'Requires immediate physical pull, disposal audit, or authorized staff write-off.',
      ],
      action: 'Move to Quarantine Bin immediately; record immutable disposal reason.',
    },
  ]

  const activeIdx = activeTier !== null ? activeTier : selected
  const activeData = tiers[activeIdx] || tiers[0]

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d131f] p-4 text-white shadow-xl sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
              FEFO & Batch Expiry Allocation Rules
            </h3>
          </div>
          <p className="text-xs text-white/60">
            Operations Rulebook §5, §15 — First-Expired, First-Out (FEFO) Lifecycle
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
          Tier {activeData.num} of {tiers.length}
        </span>
      </div>

      {/* Visual Timeline Spectrum */}
      <div className="my-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/40">
          <div
            onClick={() => {
              setSelected(2)
              if (onSelectTier) onSelectTier(2)
            }}
            className="h-full w-[25%] cursor-pointer bg-rose-500/80 transition-opacity hover:opacity-100"
            title="Critical: 0-30 Days"
          />
          <div
            onClick={() => {
              setSelected(1)
              if (onSelectTier) onSelectTier(1)
            }}
            className="h-full w-[35%] cursor-pointer bg-amber-500/80 transition-opacity hover:opacity-100"
            title="Clearance: 31-89 Days"
          />
          <div
            onClick={() => {
              setSelected(0)
              if (onSelectTier) onSelectTier(0)
            }}
            className="h-full w-[40%] cursor-pointer bg-emerald-500/80 transition-opacity hover:opacity-100"
            title="Prime: >90 Days"
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-white/50">
          <span className="text-rose-400 font-semibold">0 Days (Expired)</span>
          <span className="text-amber-400 font-semibold">30 Days</span>
          <span className="text-amber-300 font-semibold">90 Days</span>
          <span className="text-emerald-400 font-semibold">Fresh Stock (&gt;90d)</span>
        </div>
      </div>

      {/* Tier Selector Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {tiers.map((tier, idx) => {
          const isActive = idx === activeIdx
          return (
            <button
              key={tier.id}
              onClick={() => {
                setSelected(idx)
                if (onSelectTier) onSelectTier(idx)
              }}
              className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                isActive
                  ? 'border-white/30 bg-white/10 shadow-lg'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className="rounded px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: `${tier.color}20`,
                    color: tier.color,
                    border: `1px solid ${tier.color}40`,
                  }}
                >
                  {tier.tag}
                </span>
                <span className="text-xs font-mono text-white/40">Tier {tier.num}</span>
              </div>
              <div className="mt-2 text-xs font-bold text-white">{tier.name}</div>
              <div className="text-xs text-white/60">{tier.days}</div>
            </button>
          )
        })}
      </div>

      {/* Active Tier Details */}
      <div className="mt-4 rounded-lg border border-white/10 bg-[#121927] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: activeData.color }}
            />
            <h4 className="text-sm font-bold text-white">{activeData.name}</h4>
          </div>
          <span className="text-xs font-mono font-medium" style={{ color: activeData.color }}>
            {activeData.days}
          </span>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-white/80">{activeData.desc}</p>

        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
            System Allocation & Operational Policy:
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

        <div className="mt-3 flex items-start gap-2 rounded-md border border-white/10 bg-white/5 p-2.5 text-xs text-white/90">
          <span className="shrink-0 font-semibold text-sky-400">⚡ Required Action:</span>
          <span>{activeData.action}</span>
        </div>
      </div>
    </div>
  )
}
