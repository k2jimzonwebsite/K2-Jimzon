import React, { useState, useMemo } from 'react'
import { WORKFLOW_GUIDE_META, WORKFLOWS, WORKFLOW_SECTIONS } from './workflowData'
import WorkflowSvgCanvas from './WorkflowSvgCanvas'
import WorkflowDetailDrawer from './WorkflowDetailDrawer'
import {
  ALL_NODES, ENTRY_NODE_ID, GRAPH_STATS, getDownstream, getNode, getTerminalNodes,
  getUpstream, tracePaths,
} from './workflowGraph'
import { MapIcon, SearchIcon, CheckIcon, PlaneIcon, BoxIcon, ShieldIcon, BagIcon, SparkleIcon } from '../../ui/icons'

/**
 * MasterWorkflowGraph
 * The central visual operations map for K2 Jimzon administrators and warehouse staff.
 * Divided into distinct operational sections:
 * - Italy & Cross-Border (Cousin in Milan -> Flight Boxes -> Transit)
 * - Manila Intake & Catalog (Unboxing -> Quality Check -> Branching: Existing Stock vs New Product)
 * - Warehouse & Custody (FEFO Lots, Shelf Bins, Handshakes, Cycle Counts)
 * - Orders & Fulfillment (Order Picking, 2-Factor Scans, Packing, Courier Handover, Pasabuy)
 */
export default function MasterWorkflowGraph({
  initialWorkflowId = 'cross_border_lifecycle',
  onNavigate = null,
  onClose = null,
  isModal = false,
}) {
  const [selectedSection, setSelectedSection] = useState('all')
  const [activeWorkflowId, setActiveWorkflowId] = useState(initialWorkflowId)
  const activeWorkflow = WORKFLOWS[activeWorkflowId] || WORKFLOWS.cross_border_lifecycle

  const [activeNodeId, setActiveNodeId] = useState(ENTRY_NODE_ID)
  const [completedSteps, setCompletedSteps] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const terminalNodes = useMemo(() => getTerminalNodes(), [])
  const [traceFromId, setTraceFromId] = useState(ENTRY_NODE_ID)
  const [traceToId, setTraceToId] = useState(terminalNodes[0]?.id || '')
  const [traceEnabled, setTraceEnabled] = useState(false)

  const handleSelectSection = (secId) => {
    setSelectedSection(secId)
    if (secId !== 'all') {
      // Auto-select first workflow in this section if current workflow doesn't belong
      const firstInSec = Object.values(WORKFLOWS).find((w) => w.sectionId === secId)
      if (firstInSec && activeWorkflow.sectionId !== secId) {
        setActiveWorkflowId(firstInSec.id)
        setActiveNodeId(firstInSec.nodes[0]?.id)
      }
    }
  }

  const handleSelectWorkflow = (wfId) => {
    setActiveWorkflowId(wfId)
    const targetWf = WORKFLOWS[wfId] || WORKFLOWS.cross_border_lifecycle
    setActiveNodeId(targetWf.nodes[0]?.id)
  }

  const handleSelectNode = (nodeId) => {
    const target = getNode(nodeId)
    if (!target) return
    setActiveNodeId(nodeId)
    if (target.workflowId && WORKFLOWS[target.workflowId]) setActiveWorkflowId(target.workflowId)
  }

  const currentNode = getNode(activeNodeId) || getNode(ENTRY_NODE_ID)
  const currentWorkflow = currentNode.workflowId ? WORKFLOWS[currentNode.workflowId] : {
    id: 'connected_operations',
    title: 'Connected operations',
    accentColor: '#38bdf8',
    nodes: ALL_NODES,
  }
  const upstream = getUpstream(currentNode.id)
  const downstream = getDownstream(currentNode.id)

  const handlePrevNode = () => {
    const previous = upstream.find((item) => item.node)
    if (previous) handleSelectNode(previous.node.id)
  }

  const handleNextNode = () => {
    const next = downstream.find((item) => item.node && item.kind !== 'loopback') || downstream.find((item) => item.node)
    if (next) handleSelectNode(next.node.id)
  }

  const handleToggleComplete = (nodeId) => {
    setCompletedSteps((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    )
  }

  const handleResetProgress = () => {
    setCompletedSteps([])
  }

  // Filter workflows by active section
  const visibleWorkflows = useMemo(() => {
    const all = Object.values(WORKFLOWS)
    if (selectedSection === 'all') return all
    return all.filter((w) => w.sectionId === selectedSection)
  }, [selectedSection])

  // Active section metadata
  const currentSectionMeta =
    WORKFLOW_SECTIONS.find((s) => s.id === selectedSection) || WORKFLOW_SECTIONS[0]

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
    return ALL_NODES.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.actor.toLowerCase().includes(q) ||
        n.location.toLowerCase().includes(q) ||
        (n.checklist && n.checklist.some((c) => c.toLowerCase().includes(q))) ||
        (n.rules && n.rules.some((r) => r.toLowerCase().includes(q)))
    )
  }, [searchQuery])

  const highlightedNodeIds = useMemo(() => {
    if (filteredNodes) return new Set(filteredNodes.map((node) => node.id))
    if (selectedSection === 'all') return null
    return new Set(ALL_NODES.filter((node) => node.sectionId === selectedSection || node.id === ENTRY_NODE_ID).map((node) => node.id))
  }, [filteredNodes, selectedSection])

  const tracedPaths = useMemo(
    () => traceEnabled ? tracePaths(traceFromId, traceToId) : [],
    [traceEnabled, traceFromId, traceToId],
  )
  const tracedPath = tracedPaths[0] || []
  const tracedEdgeIds = useMemo(() => new Set(tracedPath.map((edge) => `${edge.from}->${edge.to}`)), [tracedPath])

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
              <h2 className="font-sans text-2xl font-bold tracking-tight sm:text-3xl text-white">
                Master Operations Workflow Graph
              </h2>
            </div>
            <p className="mt-1 text-xs text-white/60 sm:text-sm">
              One connected operational system from Admin entry through supply, stock, custody, orders, counts, and terminal outcomes.
            </p>
            <p className="mt-2 text-xs text-white/55">
              Version {WORKFLOW_GUIDE_META.version} · {WORKFLOW_GUIDE_META.approvalStatus} · Authority: {WORKFLOW_GUIDE_META.authority}
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
                placeholder="Search steps, barcodes, roles..."
                className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-12 text-sm text-white placeholder-white/50 focus:border-sky-500/50 focus:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 min-h-11 -translate-y-1/2 rounded-lg px-2 text-xs text-white/55 hover:bg-white/5 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {onClose && isModal && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                Close Guide
              </button>
            )}
          </div>
        </div>

        {/* 1. Operational Domain Section Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1">
          {WORKFLOW_SECTIONS.map((sec) => {
            const isSelected = sec.id === selectedSection
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSelectSection(sec.id)}
                className={`min-h-11 rounded-lg px-3.5 py-2 text-xs font-bold transition-[transform,background-color,color] cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {sec.label}
              </button>
            )
          })}
        </div>

        {/* 2. Specific Workflow Selector Pills within Selected Section */}
        <div className="flex flex-wrap gap-2 pt-1">
          {visibleWorkflows.map((wf) => {
            const isSelected = wf.id === activeWorkflowId
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => handleSelectWorkflow(wf.id)}
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-[transform,background-color,border-color,color] cursor-pointer ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/20 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-400/40'
                    : 'border-white/10 bg-[#0c121e] text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{wf.title}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-white/60">
                  {wf.nodes.length} steps
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Domain Context Notice */}
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] px-4 py-2.5 text-xs text-sky-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="font-semibold text-sky-400">
          Domain: {currentSectionMeta.label}
        </span>
        <span className="text-white/70 text-xs">
          {currentSectionMeta.description}
        </span>
      </div>

      <div role="note" className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
        This is a versioned guide and rehearsal surface, not an operations terminal. Guide checkmarks stay in this browser only and never prove that inventory, money, customer communication, publication, or provider work occurred. Use each step’s named Admin screen and verify its server result.
      </div>

      {/* Workflow header with local guide rehearsal state */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111c33] to-[#0f172a] p-5 lg:flex-row lg:items-center lg:justify-between shadow-xl">
        <div className="flex items-start gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-sky-400">
                {activeWorkflow.badge}
              </span>
              <span className="text-xs text-white/40">{activeWorkflow.category}</span>
            </div>
            <h3 className="mt-1 font-sans text-lg font-bold text-white sm:text-xl">
              {activeWorkflow.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-white/70 max-w-3xl">
              {activeWorkflow.description}
            </p>
          </div>
        </div>

        {/* Guide rehearsal and reference statistics */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wider text-white/40 mb-1">
              <span>Guide rehearsal</span>
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
            <span className="block text-xs uppercase tracking-wider text-white/40">Scans Required</span>
            <span className="text-sm font-bold text-sky-400">{activeWorkflow.stats.scansRequired}</span>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="block text-xs uppercase tracking-wider text-white/40">Est. Time</span>
            <span className="text-xs font-medium text-white/80">{activeWorkflow.stats.estTime}</span>
          </div>

          {currentWfCompletedCount > 0 && (
            <button
              type="button"
              onClick={handleResetProgress}
              className="text-xs text-white/40 hover:text-rose-400 transition-colors ml-2"
              title="Reset guide rehearsal checkmarks"
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
            className="text-xs underline text-sky-400 hover:text-white"
          >
            Show All Steps
          </button>
        </div>
      )}

      <section aria-label="Workflow path tracer" className="rounded-2xl border border-white/10 bg-[#0c1422] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Trace a route</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">Walk a real forward path through decisions and convergence. Recovery loopbacks stay visible on the canvas but are excluded from finite traces.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto]">
            <label className="text-xs font-bold uppercase tracking-wider text-white/45">From
              <select value={traceFromId} onChange={(event) => { setTraceFromId(event.target.value); setTraceEnabled(false) }} className="mt-1 min-h-11 w-full rounded-adm-sm border border-white/10 bg-black/30 px-3 text-xs normal-case text-white">
                {ALL_NODES.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-white/45">Terminal outcome
              <select value={traceToId} onChange={(event) => { setTraceToId(event.target.value); setTraceEnabled(false) }} className="mt-1 min-h-11 w-full rounded-adm-sm border border-white/10 bg-black/30 px-3 text-xs normal-case text-white">
                {terminalNodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setTraceEnabled(true)} className="min-h-11 rounded-adm-sm bg-sky-500 px-4 text-xs font-bold text-slate-950 hover:bg-sky-400">Trace path</button>
          </div>
        </div>
        {traceEnabled && (
          <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3" role="status">
            {tracedPath.length ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button type="button" onClick={() => handleSelectNode(traceFromId)} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-semibold text-white/80">{getNode(traceFromId)?.title}</button>
                {tracedPath.map((edge) => <React.Fragment key={`${edge.from}->${edge.to}`}><span className="text-sky-300">→</span><button type="button" onClick={() => handleSelectNode(edge.to)} className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 font-semibold text-white/80">{getNode(edge.to)?.title}</button></React.Fragment>)}
                {tracedPaths.length > 1 && <span className="ml-2 text-white/45">Showing one of {tracedPaths.length} valid paths</span>}
              </div>
            ) : <p className="text-xs text-amber-300">No forward route reaches that terminal from the selected node.</p>}
          </div>
        )}
      </section>

      {/* Interactive Visual SVG Graph Canvas */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white/50">
            Connected visual flow map · {GRAPH_STATS.nodeCount} nodes · {GRAPH_STATS.edgeCount} typed edges
          </span>
          <span className="text-xs text-sky-400 font-medium">
            Current: {currentNode?.title}
          </span>
        </div>

        <WorkflowSvgCanvas
          activeNodeId={activeNodeId}
          onSelectNode={handleSelectNode}
          completedSteps={completedSteps}
          tracedEdgeIds={tracedEdgeIds}
          highlightedNodeIds={highlightedNodeIds}
        />
      </div>

      {/* Selected Step Drilldown Detail Drawer */}
      <WorkflowDetailDrawer
        node={currentNode}
        workflow={currentWorkflow}
        onNavigate={onNavigate}
        onPrevNode={handlePrevNode}
        onNextNode={handleNextNode}
        isFirst={upstream.length === 0}
        isLast={downstream.length === 0}
        isCompleted={completedSteps.includes(currentNode?.id)}
        onToggleComplete={handleToggleComplete}
        onSelectNode={handleSelectNode}
      />
    </div>
  )
}
