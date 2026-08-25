import React, { useState, useMemo } from 'react'
import { WORKFLOWS } from './workflowData'
import WorkflowSvgCanvas from './WorkflowSvgCanvas'
import WorkflowDetailDrawer from './WorkflowDetailDrawer'
import { MapIcon, SearchIcon, CheckIcon } from '../../ui/icons'

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
  const [completedSteps, setCompletedSteps] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

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

  const handleToggleComplete = (nodeId) => {
    setCompletedSteps((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    )
  }

  const handleResetProgress = () => {
    setCompletedSteps([])
  }

  const workflowList = Object.values(WORKFLOWS)

  // Calculate completion percentage for current workflow
  const currentWfCompletedCount = activeWorkflow.nodes.filter((n) =>
    completedSteps.includes(n.id)
  ).length
  const progressPercent = Math.round(
    (currentWfCompletedCount / activeWorkflow.nodes.length) * 100
  )

  // Search filter across workflow nodes
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return activeWorkflow.nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.actor.toLowerCase().includes(q) ||
        n.location.toLowerCase().includes(q) ||
        (n.checklist && n.checklist.some((c) => c.toLowerCase().includes(q))) ||
        (n.rules && n.rules.some((r) => r.toLowerCase().includes(q)))
    )
  }, [activeWorkflow, searchQuery])

  return (
    <div className="flex flex-col gap-6 text-white pb-12">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <MapIcon size={18} />
              </span>
              <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl text-white">
                Master Operations Workflow Graph
              </h2>
            </div>
            <p className="mt-1 text-xs text-white/60 sm:text-sm">
              Authoritative step-by-step visual guides, 2-factor scan requirements, and AI Studio prompt engineering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter steps, barcodes, roles..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder-white/40 focus:border-sky-500/50 focus:bg-white/[0.07] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/40 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {onClose && isModal && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                Close Guide
              </button>
            )}
          </div>
        </div>

        {/* Workflow Switcher Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          {workflowList.map((wf) => {
            const isSelected = wf.id === activeWorkflowId
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => handleSelectWorkflow(wf.id)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/20 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-400/40'
                    : 'border-white/10 bg-[#0c121e] text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{wf.title}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-normal text-white/60">
                  {wf.nodes.length} steps
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Workflow Header Banner with Shift Progress */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111c33] to-[#0f172a] p-5 lg:flex-row lg:items-center lg:justify-between shadow-xl">
        <div className="flex items-start gap-3.5">
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

        {/* Shift Progress & Stats */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs">
          <div>
            <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-white/40 mb-1">
              <span>Shift Progress</span>
              <span className="font-bold text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="block text-[10px] uppercase tracking-wider text-white/40">Scans Required</span>
            <span className="text-sm font-bold text-sky-400">{activeWorkflow.stats.scansRequired}</span>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="block text-[10px] uppercase tracking-wider text-white/40">Est. Time</span>
            <span className="text-xs font-medium text-white/80">{activeWorkflow.stats.estTime}</span>
          </div>

          {currentWfCompletedCount > 0 && (
            <button
              type="button"
              onClick={handleResetProgress}
              className="text-[10px] text-white/40 hover:text-rose-400 transition-colors ml-2"
              title="Reset verified shift checklist"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filter notice if search active */}
      {filteredNodes && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-2 text-xs text-sky-300 flex items-center justify-between">
          <span>Found {filteredNodes.length} step(s) matching &quot;{searchQuery}&quot;</span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[11px] underline text-sky-400 hover:text-white"
          >
            Show All Steps
          </button>
        </div>
      )}

      {/* Interactive Visual SVG Graph Canvas */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50">
            Interactive Visual Flow Map (Click any step to inspect)
          </span>
          <span className="text-[11px] text-sky-400 font-medium">
            Current: Step {currentNode?.step} of {activeWorkflow.nodes.length}
          </span>
        </div>

        <WorkflowSvgCanvas
          workflow={activeWorkflow}
          activeNodeId={activeNodeId}
          onSelectNode={setActiveNodeId}
          completedSteps={completedSteps}
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
        isCompleted={completedSteps.includes(currentNode?.id)}
        onToggleComplete={handleToggleComplete}
      />
    </div>
  )
}
