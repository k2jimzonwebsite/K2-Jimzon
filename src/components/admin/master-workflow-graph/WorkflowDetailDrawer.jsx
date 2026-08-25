import React from 'react'
import AiPromptStudioCard from './AiPromptStudioCard'

/**
 * WorkflowDetailDrawer
 * Displays the complete operational SOP, step checklist, rulebook safeguards,
 * and direct Admin BOS action triggers for a selected workflow node.
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
}) {
  if (!node) return null

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
              <span className="text-xs text-white/60">📍 {node.location}</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-white sm:text-2xl">
              {node.title}
            </h3>
          </div>
        </div>

        {/* Action button to relevant screen */}
        {node.adminJump && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(node.adminJump)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 py-2.5 text-xs font-bold text-sky-300 transition-all hover:bg-sky-500/25 hover:text-white active:scale-98 cursor-pointer"
          >
            <span>🚀 {node.jumpLabel || 'Open Tool in Admin'}</span>
          </button>
        )}
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

      {/* Step-by-Step Checklist */}
      <div className="mt-6">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
          <span>📋</span> Mandatory Shift Checklist
        </h4>
        <div className="mt-3 space-y-2">
          {node.checklist.map((item, idx) => (
            <label
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/80 transition-colors hover:bg-white/[0.06] cursor-pointer"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-sky-500 focus:ring-sky-500/30"
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Safety Rules & Invariants */}
      {node.rules && node.rules.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <span>⚠️</span> Rulebook Invariants & Safeguards
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

        <span className="text-xs text-white/40">
          {node.actor}
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
