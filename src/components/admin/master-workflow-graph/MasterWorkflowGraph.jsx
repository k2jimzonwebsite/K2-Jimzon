import React, { useState } from 'react'
import { WORKFLOWS } from './workflowData'
import WorkflowSvgCanvas from './WorkflowSvgCanvas'
import WorkflowDetailDrawer from './WorkflowDetailDrawer'

/**
 * MasterWorkflowGraph
 * The central visual operations map for K2 Jimzon administrators and warehouse staff.
 * Renders SVG node-based flowcharts, step checklists, safeguards, and AI prompt engineering tools.
 */
export default function MasterWorkflowGraph({
  initialWorkflowId = 'new_inventory',
  onNavigate = null,
  onClose = null,
  isModal = false,
}) {
  const [activeWorkflowId, setActiveWorkflowId] = useState(initialWorkflowId)
  const activeWorkflow = WORKFLOWS[activeWorkflowId] || WORKFLOWS.new_inventory

  const [activeNodeId, setActiveNodeId] = useState(activeWorkflow.nodes[0]?.id)

  const handleSelectWorkflow = (wfId) => {
    setActiveWorkflowId(wfId)
    const targetWf = WORKFLOWS[wfId] || WORKFLOWS.new_inventory
    setActiveNodeId(targetWf.nodes[0]?.id)
  }

  const activeNodeIndex = activeWorkflow.nodes.findIndex((n) => n.id === activeNodeId)
  const currentNode = activeWorkflow.nodes[activeNodeIndex] || activeWorkflow.nodes[0]

  const handlePrevNode = () => {
    if (activeNodeIndex > 0) {
      setActiveNodeId(activeWorkflow.nodes[activeNodeIndex - 1].id)
    }
  }

  const handleNextNode = () => {
    if (activeNodeIndex < activeWorkflow.nodes.length - 1) {
      setActiveNodeId(activeWorkflow.nodes[activeNodeIndex + 1].id)
    }
  }

  const workflowList = Object.values(WORKFLOWS)

  const content = (
    <div className="flex flex-col gap-6 text-white">
      {/* Top Workflow Selector Tabs */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🗺️</span>
              <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                Master Operations Workflow Graph
              </h2>
            </div>
            <p className="mt-1 text-xs text-white/60 sm:text-sm">
              Authoritative step-by-step visual guides, scan requirements, and AI Studio prompt engineering.
            </p>
          </div>

          {onClose && isModal && (
            <button
              onClick={onClose}
              className="self-end rounded-lg border border-white/15 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white sm:self-auto cursor-pointer"
            >
              ✕ Close Guide
            </button>
          )}
        </div>

        {/* Workflow Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          {workflowList.map((wf) => {
            const isSelected = wf.id === activeWorkflowId
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => handleSelectWorkflow(wf.id)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/20 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-400/40'
                    : 'border-white/10 bg-[#0c121e] text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-base">{wf.icon}</span>
                <span>{wf.title}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-normal text-white/60">
                  {wf.nodes.length} steps
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Workflow Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111c33] to-[#0f172a] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-2xl shadow-sm">
            {activeWorkflow.icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                {activeWorkflow.badge}
              </span>
              <span className="text-xs text-white/40">{activeWorkflow.category}</span>
            </div>
            <h3 className="mt-1 font-serif text-lg font-bold text-white sm:text-xl">
              {activeWorkflow.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-white/70 max-w-3xl">
              {activeWorkflow.description}
            </p>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="flex shrink-0 items-center gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-white/40">Total Steps</span>
            <span className="text-sm font-bold text-white">{activeWorkflow.stats.steps}</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-white/40">Scans Required</span>
            <span className="text-sm font-bold text-sky-400">{activeWorkflow.stats.scansRequired}</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-white/40">Key Roles</span>
            <span className="text-xs font-medium text-white/80">{activeWorkflow.stats.roles.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Interactive Visual SVG Graph Canvas */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50">
            Interactive Visual Flow Map (Click any step to inspect)
          </span>
          <span className="text-[11px] text-sky-400">
            Current: Step {currentNode?.step} of {activeWorkflow.nodes.length}
          </span>
        </div>

        <WorkflowSvgCanvas
          workflow={activeWorkflow}
          activeNodeId={activeNodeId}
          onSelectNode={setActiveNodeId}
        />
      </div>

      {/* Selected Step Drilldown Detail Drawer */}
      <WorkflowDetailDrawer
        node={currentNode}
        workflow={activeWorkflow}
        onNavigate={onNavigate}
        onPrevNode={handlePrevNode}
        onNextNode={handleNextNode}
        isFirst={activeNodeIndex === 0}
        isLast={activeNodeIndex === activeWorkflow.nodes.length - 1}
      />
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-6">
        <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#070b12] shadow-2xl">
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar">
            {content}
          </div>
        </div>
      </div>
    )
  }

  return <div className="w-full">{content}</div>
}
