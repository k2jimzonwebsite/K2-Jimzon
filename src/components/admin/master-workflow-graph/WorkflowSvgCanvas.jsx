import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ALL_NODES, EDGES, EDGE_KINDS, computeLayers } from './workflowGraph'

const NODE_WIDTH = 320
const NODE_HEIGHT = 220
const GAP = 100
const PAD = 24
const EDGE_STYLE = {
  [EDGE_KINDS.SEQUENCE]: { stroke: '#94a3b8', dash: '', label: 'Sequence' },
  [EDGE_KINDS.BRANCH]: { stroke: '#fbbf24', dash: '', label: 'Decision' },
  [EDGE_KINDS.CONVERGE]: { stroke: '#4ade80', dash: '', label: 'Converge' },
  [EDGE_KINDS.ENABLES]: { stroke: '#7dd3fc', dash: '7 6', label: 'Enables' },
  [EDGE_KINDS.LOOPBACK]: { stroke: '#fda4af', dash: '4 6', label: 'Recovery' },
}
const TYPE_FILTERS = [['all', 'All types'], ['scan', 'Scans'], ['decision', 'Decisions'], ['action', 'Actions'], ['complete', 'Outcomes']]
const buttonClass = 'min-h-11 rounded-adm-sm border border-white/20 bg-white/5 px-3 text-sm font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300'
function edgePath(from, to, kind) {
  if (kind === EDGE_KINDS.LOOPBACK || to.x <= from.x) {
    const startX = from.x + NODE_WIDTH / 2, startY = from.y + NODE_HEIGHT
    const endX = to.x + NODE_WIDTH / 2, endY = to.y + NODE_HEIGHT
    const bendY = Math.max(startY, endY) + 52
    return `M ${startX} ${startY} C ${startX} ${bendY}, ${endX} ${bendY}, ${endX} ${endY}`
  }
  const startX = from.x + NODE_WIDTH, startY = from.y + NODE_HEIGHT / 2
  const endX = to.x, endY = to.y + NODE_HEIGHT / 2, midX = (startX + endX) / 2
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
}

export default function WorkflowSvgCanvas({ activeNodeId, onSelectNode, completedSteps = [],
  tracedEdgeIds = new Set(), highlightedNodeIds = null, workflowId = null }) {
  const viewportRef = useRef(null)
  const dragRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [scope, setScope] = useState('workflow')
  const [typeFilter, setTypeFilter] = useState('all')
  const visibleNodes = useMemo(() => ALL_NODES.filter(node =>
    (scope === 'all' || !workflowId || node.workflowId === workflowId || node.id === 'admin.entry')
    && (!highlightedNodeIds || highlightedNodeIds.has(node.id))
    && (typeFilter === 'all' || node.type === typeFilter)), [workflowId, scope, highlightedNodeIds, typeFilter])
  const layout = useMemo(() => {
    const ids = new Set(visibleNodes.map(node => node.id))
    const layers = computeLayers().map(layer => layer.filter(node => ids.has(node.id))).filter(layer => layer.length)
    const maxRows = Math.max(1, ...layers.map(layer => layer.length))
    const height = PAD * 2 + maxRows * NODE_HEIGHT + (maxRows - 1) * 36 + 80
    const width = PAD * 2 + layers.length * NODE_WIDTH + Math.max(0, layers.length - 1) * GAP
    const positions = new Map()
    layers.forEach((layer, index) => {
      const startY = PAD + (maxRows - layer.length) * (NODE_HEIGHT + 36) / 2
      layer.forEach((node, row) => positions.set(node.id, { x: PAD + index * (NODE_WIDTH + GAP), y: startY + row * (NODE_HEIGHT + 36) }))
    })
    return { positions, width, height }
  }, [visibleNodes])
  const edges = useMemo(() => EDGES.map(edge => {
    const from = layout.positions.get(edge.from), to = layout.positions.get(edge.to)
    return from && to ? { ...edge, id: `${edge.from}->${edge.to}`, from, to, d: edgePath(from, to, edge.kind) } : null
  }).filter(Boolean), [layout])
  const focusNode = () => {
    const viewport = viewportRef.current
    const position = layout.positions.get(activeNodeId) || layout.positions.get(visibleNodes[0]?.id)
    if (!viewport || !position) return
    viewport.scrollTo({ left: Math.max(0, (position.x + NODE_WIDTH / 2) * zoom - viewport.clientWidth / 2),
      top: Math.max(0, (position.y + NODE_HEIGHT / 2) * zoom - viewport.clientHeight / 2), behavior: 'instant' })
  }
  useLayoutEffect(() => {
    focusNode()
    const observer = new ResizeObserver(focusNode)
    if (viewportRef.current) observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [activeNodeId, layout, zoom])
  useLayoutEffect(() => { setTypeFilter('all') }, [activeNodeId, workflowId])
  const handlePointerDown = event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('[data-node-id]')) return
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  const handlePointerMove = event => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    event.currentTarget.scrollLeft = drag.left + drag.x - event.clientX
    event.currentTarget.scrollTop = drag.top + drag.y - event.clientY
  }
  const handlePointerUp = event => {
    if (dragRef.current?.id !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const handleKeyDown = event => {
    if (event.target !== event.currentTarget) return
    const delta = { ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100] }[event.key]
    if (!delta) return
    event.preventDefault(); event.stopPropagation()
    event.currentTarget.scrollBy({ left: delta[0], top: delta[1], behavior: 'instant' })
  }
  return <section aria-label="Connected operations workflow canvas" className="min-w-0 overflow-hidden rounded-xl border border-white/15 bg-[#080d16]">
    <div className="flex flex-wrap items-center gap-2 border-b border-white/15 bg-[#0b121e] p-3">
      <div className="flex flex-wrap gap-2" aria-label="Map scope">
        {['workflow', 'all'].map(value => <button key={value} type="button" aria-pressed={scope === value}
          onClick={() => setScope(value)} className={buttonClass}>{value === 'workflow' ? 'This workflow' : 'Full map'}</button>)}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Step types">
        {TYPE_FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={typeFilter === id}
          onClick={() => setTypeFilter(id)} className={buttonClass}>{label}</button>)}
      </div>
      <button type="button" onClick={focusNode} className={buttonClass}>Focus Active Node</button>
      <button type="button" aria-label="Zoom out" onClick={() => setZoom(current => Math.max(0.6, +(current - 0.1).toFixed(2)))} className={buttonClass}>−</button>
      <span className="min-w-12 text-center text-sm tabular-nums text-slate-200">{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="Zoom in" onClick={() => setZoom(current => Math.min(1.6, +(current + 0.1).toFixed(2)))} className={buttonClass}>+</button>
      <button type="button" onClick={() => { setZoom(1); focusNode() }} className={buttonClass}>Reset view</button>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 text-sm text-slate-300" aria-label="Edge legend">
      {Object.entries(EDGE_STYLE).map(([kind, style]) => <span key={kind} className="inline-flex items-center gap-2"><span className="h-0.5 w-5" style={{ backgroundColor: style.stroke }} />{style.label}</span>)}
      <span className="ml-auto" role="status">{visibleNodes.length} steps shown</span>
    </div>
    <div ref={viewportRef} role="region" aria-label="Pan and zoom workflow map" tabIndex={0} data-workflow-viewport
      className="relative h-[32rem] overflow-auto overscroll-x-contain cursor-grab focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp} onLostPointerCapture={() => { dragRef.current = null }} onKeyDown={handleKeyDown}>
      {visibleNodes.length === 0 ? <p className="p-6 text-base text-slate-200">No steps match these filters. Choose All types or clear the search and role filters.</p> :
        <div style={{ width: layout.width * zoom, height: layout.height * zoom }}>
          <div className="relative" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
            <svg className="pointer-events-none absolute inset-0" width={layout.width} height={layout.height} aria-hidden="true">
              <defs>{Object.entries(EDGE_STYLE).map(([kind, style]) => <marker key={kind} id={`workflow-arrow-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1 L 8 5 L 0 9 z" fill={style.stroke} /></marker>)}</defs>
              {edges.map(edge => {
                const style = EDGE_STYLE[edge.kind], traced = tracedEdgeIds.has(edge.id)
                return <g key={edge.id} data-edge-kind={edge.kind}>
                  <path d={edge.d} fill="none" stroke={traced ? '#f8fafc' : style.stroke} strokeWidth={traced ? 4 : 2} strokeDasharray={style.dash} markerEnd={`url(#workflow-arrow-${edge.kind})`} />
                  {edge.label && edge.kind === EDGE_KINDS.BRANCH && <text x={(edge.from.x + NODE_WIDTH + edge.to.x) / 2} y={(edge.from.y + edge.to.y) / 2 + NODE_HEIGHT / 2 - 10} fill="#fde68a" fontSize="14" textAnchor="middle">{edge.label}</text>}
                </g>
              })}
            </svg>
            {visibleNodes.map(node => {
              const position = layout.positions.get(node.id), selected = node.id === activeNodeId, reviewed = completedSteps.includes(node.id)
              return <button key={node.id} type="button" data-node-id={node.id} aria-pressed={selected} onClick={() => onSelectNode(node.id)}
                className={`absolute flex flex-col gap-2 rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-4 focus-visible:outline-sky-300 ${selected ? 'border-sky-300 bg-[#13233a]' : 'border-slate-500 bg-[#0d1625] hover:border-slate-200'}`}
                style={{ left: position.x, top: position.y, width: NODE_WIDTH, height: NODE_HEIGHT }}>
                <span className="flex w-full items-center justify-between gap-2 text-sm text-slate-300"><span className="capitalize">{node.type === 'complete' ? 'Outcome' : node.type}</span><span>{reviewed ? 'Guide reviewed' : node.step || 'Start'}</span></span>
                <strong className="line-clamp-3 font-sans text-base leading-6 text-white">{node.title}</strong>
                <span className="line-clamp-1 text-sm text-sky-200">{node.actor}</span>
                <span className="line-clamp-3 text-sm leading-5 text-slate-200">{node.short}</span>
              </button>
            })}
          </div>
        </div>}
    </div>
    <p className="px-4 py-3 text-sm text-slate-300">Scroll or drag to explore. On touch, swipe the map. Focus the map and use arrow keys to pan. Select a step for full instructions below; use 100% to read the map.</p>
  </section>
}
