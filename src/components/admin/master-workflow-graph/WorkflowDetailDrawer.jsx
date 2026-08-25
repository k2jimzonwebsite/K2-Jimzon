import React, { useState } from 'react'
import AiPromptStudioCard from './AiPromptStudioCard'

/**
 * WorkflowDetailDrawer
 * Displays the complete operational SOP, step checklist, rulebook safeguards,
 * barcode test simulator, and direct Admin BOS action triggers for a selected workflow node.
 */
export default function WorkflowDetailDrawer({
  node,
  workflow,
  onNavigate = null,
  onClose = null,
  onPrevNode = null,
  onNextNode = null,
  isFirst = false,
  isLast = false,
  isCompleted = false,
  onToggleComplete = null,
}) {
  const [checkedItems, setCheckedItems] = useState({})
  const [simulated, setSimulated] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)

  if (!node) return null

  const handleCheckboxToggle = (idx) => {
    const next = { ...checkedItems, [idx]: !checkedItems[idx] }
    setCheckedItems(next)

    // If all items are checked, automatically toggle step complete if provided
    const allChecked = node.checklist.every((_, i) => next[i])
    if (allChecked && onToggleComplete && !isCompleted) {
      onToggleComplete(node.id)
    }
  }

  const handleSimulateScan = () => {
    setSimulated(true)
    setTimeout(() => {
      if (onToggleComplete && !isCompleted) {
        onToggleComplete(node.id)
      }
    }, 600)
  }

  const checklistCompletedCount = node.checklist.filter((_, i) => checkedItems[i]).length

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0d131f] p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-extrabold shadow-sm"
            style={{ backgroundColor: workflow.accentColor, color: '#030712' }}
          >
            {node.step}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Step {node.step} of {workflow.nodes.length}
              </span>
              <span className="text-white/30">·</span>
              <span className="text-xs text-sky-400 font-medium">{node.location}</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-white sm:text-2xl">
              {node.title}
            </h3>
          </div>
        </div>

        {/* Action button & Completion toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {onToggleComplete && (
            <button
              type="button"
              onClick={() => onToggleComplete(node.id)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
                isCompleted
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                  : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{isCompleted ? '✓ Step Completed' : 'Mark as Completed'}</span>
            </button>
          )}

          {node.adminJump && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(node.adminJump)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 py-2 text-xs font-bold text-sky-300 transition-all hover:bg-sky-500/25 hover:text-white active:scale-[0.98] cursor-pointer"
            >
              <span>Open Tool in Admin ↗</span>
            </button>
          )}
        </div>
      </div>

      {/* Operational Summary */}
      <div className="mt-5">
        <p className="text-sm leading-relaxed text-white/80">
          {node.summary}
        </p>
      </div>

      {/* Embedded AI Prompt Studio if applicable */}
      {node.hasPromptStudio && (
        <div className="mt-6">
          <AiPromptStudioCard />
        </div>
      )}

      {/* Simulation / Barcode Test Box */}
      {node.simulation && (
        <div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Laser Barcode & Step Simulator
            </h4>
            <button
              type="button"
              onClick={handleSimulateScan}
              className="rounded-lg border border-purple-500/30 bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-200 transition-all hover:bg-purple-500/30 active:scale-[0.97]"
            >
              {simulated ? 'Re-test Barcode Scan' : 'Simulate Scan Test'}
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded bg-black/40 px-2.5 py-1.5 text-white/70 border border-white/10">
              <span className="text-white/40">Test Barcode: </span>
              <span className="text-purple-300 font-bold">{node.simulation.testBarcode}</span>
            </div>
            <div className="flex-1 rounded bg-black/40 px-2.5 py-1.5 text-white/80 border border-white/10 sm:ml-2">
              <span className="text-white/40">Response: </span>
              <span className={simulated ? 'text-emerald-400 font-semibold' : 'text-white/70'}>
                {simulated ? node.simulation.expectedResult : 'Awaiting laser scan trigger...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Checklist */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
            Mandatory Shift Checklist ({checklistCompletedCount}/{node.checklist.length})
          </h4>
          {checklistCompletedCount === node.checklist.length && (
            <span className="text-[11px] font-semibold text-emerald-400">
              All Items Verified ✓
            </span>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {node.checklist.map((item, idx) => (
            <label
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/80 transition-colors hover:bg-white/[0.06] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!checkedItems[idx]}
                onChange={() => handleCheckboxToggle(idx)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-sky-500 focus:ring-sky-500/30"
              />
              <span className={checkedItems[idx] ? 'text-white/40 line-through' : 'text-white/90'}>
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Safety Rules & Invariants */}
      {node.rules && node.rules.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Rulebook Invariants & Safeguards
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-amber-200/80">
            {node.rules.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Failure Recovery & Troubleshooting */}
      {node.troubleshooting && node.troubleshooting.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left text-xs font-semibold text-white/70 transition-colors hover:bg-white/5"
          >
            <span>Troubleshooting & Failure Recovery ({node.troubleshooting.length} scenarios)</span>
            <span className="font-mono text-white/40">{showTroubleshooting ? '▲' : '▼'}</span>
          </button>

          {showTroubleshooting && (
            <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-[#090e17] p-3">
              {node.troubleshooting.map((t, idx) => (
                <div key={idx} className="border-b border-white/5 pb-2 last:border-b-0 last:pb-0 text-xs">
                  <p className="font-semibold text-rose-300">If: {t.issue}</p>
                  <p className="mt-0.5 text-white/70">Action: {t.fix}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onPrevNode}
          disabled={isFirst}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          ← Previous Step
        </button>

        <span className="text-xs font-medium text-white/50">
          Actor: <span className="text-white/80">{node.actor}</span>
        </span>

        <button
          type="button"
          onClick={onNextNode}
          disabled={isLast}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          Next Step →
        </button>
      </div>
    </div>
  )
}
