import React, { useEffect, useState } from 'react'
import { getDownstream, getUpstream } from './workflowGraph'

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
  onSelectNode = null,
}) {
  const [checkedItems, setCheckedItems] = useState({})
  const [simulated, setSimulated] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)

  useEffect(() => {
    setCheckedItems({})
    setSimulated(false)
    setShowTroubleshooting(false)
  }, [node?.id])

  if (!node) return null

  const handleCheckboxToggle = (idx) => {
    const next = { ...checkedItems, [idx]: !checkedItems[idx] }
    setCheckedItems(next)

  }

  const handleSimulateScan = () => {
    setSimulated((current) => !current)
  }

  const checklistCompletedCount = node.checklist.filter((_, i) => checkedItems[i]).length
  const upstream = getUpstream(node.id)
  const downstream = getDownstream(node.id)

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0d131f] p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-extrabold shadow-sm"
            style={{ backgroundColor: workflow.accentColor, color: '#030712' }}
          >
            {node.step ?? '•'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {node.step == null ? 'Graph entry' : `Step ${node.step}`} · {workflow.title}
              </span>
              <span className="text-white/30">·</span>
              <span className="text-xs text-sky-400 font-medium">{node.location}</span>
            </div>
            <h3 className="font-sans text-xl font-bold text-white sm:text-2xl">
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
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                isCompleted
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                  : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{isCompleted ? 'Reviewed in guide' : 'Mark guide step reviewed'}</span>
            </button>
          )}

          {node.adminJump && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(node.adminJump)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 py-2 text-xs font-bold text-sky-300 transition-[transform,background-color,color] hover:bg-sky-500/25 hover:text-white active:scale-[0.98] cursor-pointer"
            >
              <span>{node.jumpLabel || 'Open real Admin screen'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Operational Summary */}
      <div className="mt-5">
        <p className="text-sm leading-relaxed text-white/80">
          {node.summary}
        </p>
        <p className="mt-3 rounded-adm-sm border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">
          Guide only: checking or rehearsing this step does not write or verify a real record. Complete the action in the named Admin screen and confirm the server result there.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <GraphContextList title="Where did this come from?" items={upstream} onSelectNode={onSelectNode} empty="This is the single graph entry." />
        <GraphContextList title="What can you do here?" items={downstream} onSelectNode={onSelectNode} empty="This is a terminal operational outcome." />
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Grounding evidence</h4>
          <ul className="mt-3 space-y-2">
            {(node.grounding || []).map((evidence) => (
              <li key={`${evidence.kind}:${evidence.ref}`} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/35">{evidence.kind}</span>
                <code className="mt-1 block break-all text-xs text-white/70">{evidence.ref}</code>
              </li>
            ))}
            {!node.grounding?.length && <li className="text-xs leading-5 text-white/45">No repository grounding is recorded for this node.</li>}
          </ul>
          {node.adminJump && onNavigate && (
            <button type="button" onClick={() => onNavigate(node.adminJump)} className="mt-3 min-h-11 w-full rounded-adm-sm border border-sky-500/30 bg-sky-500/10 px-3 text-xs font-bold text-sky-300 hover:bg-sky-500/20">Jump to real screen ↗</button>
          )}
        </div>
      </div>

      {/* Training example — never an operational write or verification */}
      {node.simulation && (
        <div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Training example
            </h4>
            <button
              type="button"
              onClick={handleSimulateScan}
              className="min-h-11 rounded-lg border border-purple-500/30 bg-purple-500/20 px-3 py-2 text-xs font-bold text-purple-200 transition-[transform,background-color] hover:bg-purple-500/30 active:scale-[0.97]"
            >
              {simulated ? 'Reset example response' : 'Show expected record shape'}
            </button>
          </div>

          <p className="mt-2 text-xs leading-5 text-white/55">
            This is a fictional rehearsal value. It does not call a scanner, provider, database command, or customer channel.
          </p>

          <div className="mt-3 flex flex-col gap-2 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded bg-black/40 px-2.5 py-1.5 text-white/70 border border-white/10">
              <span className="text-white/40">Example input: </span>
              <span className="text-purple-300 font-bold">{node.simulation.testBarcode}</span>
            </div>
            <div className="flex-1 rounded bg-black/40 px-2.5 py-1.5 text-white/80 border border-white/10 sm:ml-2">
              <span className="text-white/40">Expected shape: </span>
              <span className={simulated ? 'text-emerald-400 font-semibold' : 'text-white/70'}>
                {simulated ? node.simulation.expectedResult : 'Select “Show expected record shape” to rehearse this guide step.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Checklist */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
            Guide rehearsal checklist ({checklistCompletedCount}/{node.checklist.length})
          </h4>
          {checklistCompletedCount === node.checklist.length && (
            <span className="text-xs font-semibold text-emerald-400">
              All guide items reviewed
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

function GraphContextList({ title, items, onSelectNode, empty }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300">{title}</h4>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <button key={`${item.from}->${item.to}`} type="button" onClick={() => onSelectNode?.(item.node?.id)} disabled={!item.node} className="min-h-11 w-full rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-left hover:border-sky-400/30 hover:bg-sky-500/8 disabled:opacity-50">
            <span className="block text-xs font-semibold text-white/85">{item.node?.title || 'Unknown node'}</span>
            <span className="mt-0.5 block text-xs text-white/45">{item.label || item.kind}{item.condition ? ` · ${item.condition}` : ''}</span>
          </button>
        ))}
        {!items.length && <p className="text-xs leading-5 text-white/45">{empty}</p>}
      </div>
    </div>
  )
}
