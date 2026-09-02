import React, { useMemo, useRef, useState } from 'react'
import { ALL_NODES, EDGES, EDGE_KINDS, computeLayers } from './workflowGraph'

const NODE_WIDTH = 216
const NODE_HEIGHT = 128
const LAYER_GAP = 84
const ROW_GAP = 28
const CANVAS_PAD = 44

const EDGE_STYLE = {
  [EDGE_KINDS.SEQUENCE]: { stroke: '#64748b', dash: '', label: 'Sequence' },
  [EDGE_KINDS.BRANCH]: { stroke: '#f59e0b', dash: '', label: 'Decision' },
  [EDGE_KINDS.CONVERGE]: { stroke: '#22c55e', dash: '', label: 'Converge' },
  [EDGE_KINDS.ENABLES]: { stroke: '#38bdf8', dash: '7 6', label: 'Enables' },
  [EDGE_KINDS.LOOPBACK]: { stroke: '#fb7185', dash: '4 6', label: 'Recovery' },
}

const BADGES = {
  entry: ['ENTRY', 'border-sky-400/40 bg-sky-400/15 text-sky-300'],
  intake: ['INTAKE', 'border-sky-500/30 bg-sky-500/15 text-sky-300'],
  scan: ['SCAN', 'border-purple-500/30 bg-purple-500/15 text-purple-300'],
  decision: ['DECISION', 'border-amber-500/30 bg-amber-500/15 text-amber-300'],
  action: ['ACTION', 'border-blue-500/30 bg-blue-500/15 text-blue-300'],
  complete: ['COMMITTED', 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'],
}

function edgePath(from, to, kind) {
  if (kind === EDGE_KINDS.LOOPBACK || to.x <= from.x) {
    const startX = from.x + NODE_WIDTH / 2
    const startY = from.y + NODE_HEIGHT
    const endX = to.x + NODE_WIDTH / 2
    const endY = to.y + NODE_HEIGHT
    const bendY = Math.max(startY, endY) + 52
    return `M ${startX} ${startY} C ${startX} ${bendY}, ${endX} ${bendY}, ${endX} ${endY}`
  }
  const startX = from.x + NODE_WIDTH
  const startY = from.y + NODE_HEIGHT / 2
  const endX = to.x
  const endY = to.y + NODE_HEIGHT / 2
  const midX = startX + Math.max(32, (endX - startX) / 2)
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
}

export default function WorkflowSvgCanvas({
  activeNodeId,
  onSelectNode,
  completedSteps = [],
  tracedEdgeIds = new Set(),
  highlightedNodeIds = null,
}) {
  const dragRef = useRef(null)
  const [view, setView] = useState({ x: 24, y: 28, zoom: 0.72 })

  const layout = useMemo(() => {
    const layers = computeLayers()
    const maxRows = Math.max(...layers.map((layer) => layer.length))
    const height = CANVAS_PAD * 2 + maxRows * NODE_HEIGHT + Math.max(0, maxRows - 1) * ROW_GAP + 76
    const width = CANVAS_PAD * 2 + layers.length * NODE_WIDTH + Math.max(0, layers.length - 1) * LAYER_GAP
    const positions = new Map()
    layers.forEach((layer, layerIndex) => {
      const layerHeight = layer.length * NODE_HEIGHT + Math.max(0, layer.length - 1) * ROW_GAP
      const startY = CANVAS_PAD + Math.max(0, (height - CANVAS_PAD * 2 - 76 - layerHeight) / 2)
      layer.forEach((node, rowIndex) => positions.set(node.id, {
        x: CANVAS_PAD + layerIndex * (NODE_WIDTH + LAYER_GAP),
        y: startY + rowIndex * (NODE_HEIGHT + ROW_GAP),
      }))
    })
    return { positions, width, height }
  }, [])

  const edges = useMemo(() => EDGES.map((edge) => {
    const from = layout.positions.get(edge.from)
    const to = layout.positions.get(edge.to)
    return from && to ? { ...edge, id: `${edge.from}->${edge.to}`, fromPosition: from, toPosition: to, d: edgePath(from, to, edge.kind) } : null
  }).filter(Boolean), [layout])

  const changeZoom = (delta) => setView((current) => ({
    ...current,
    zoom: Math.min(1.15, Math.max(0.42, Number((current.zoom + delta).toFixed(2)))),
  }))
  const resetView = () => setView({ x: 24, y: 28, zoom: 0.72 })

  const handlePointerDown = (event) => {
    if (event.target.closest('[data-node-id]') || event.button !== 0) return
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: view.x, originY: view.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setView((current) => ({ ...current, x: drag.originX + event.clientX - drag.x, y: drag.originY + event.clientY - drag.y }))
  }
  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  return (
    <section aria-label="Connected operations workflow canvas" className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d16] shadow-2xl">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-[#0b121e] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/55" aria-label="Edge legend">
          {Object.entries(EDGE_STYLE).map(([kind, style]) => (
            <span key={kind} className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5" style={{ backgroundColor: style.stroke }} />{style.label}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-0.1)} className="min-h-11 rounded-adm-sm border border-white/10 bg-white/5 px-3 text-sm font-bold text-white/75 hover:bg-white/10">−</button>
          <span className="min-w-12 text-center text-xs tabular-nums text-white/55">{Math.round(view.zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => changeZoom(0.1)} className="min-h-11 rounded-adm-sm border border-white/10 bg-white/5 px-3 text-sm font-bold text-white/75 hover:bg-white/10">+</button>
          <button type="button" onClick={resetView} className="min-h-11 rounded-adm-sm border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/75 hover:bg-white/10">Reset view</button>
        </div>
      </div>

      <div
        className="relative h-[38rem] touch-none cursor-grab overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.10)_1px,transparent_0)] bg-[length:24px_24px] active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute left-0 top-0 motion-reduce:transition-none" style={{ width: layout.width, height: layout.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0' }}>
          <svg className="pointer-events-none absolute inset-0" width={layout.width} height={layout.height} aria-hidden="true">
            <defs>
              {Object.entries(EDGE_STYLE).map(([kind, style]) => (
                <marker key={kind} id={`workflow-arrow-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill={style.stroke} />
                </marker>
              ))}
            </defs>
            {EDGES.map((modelEdge) => {
              const edge = edges.find((candidate) => candidate.from === modelEdge.from && candidate.to === modelEdge.to)
              if (!edge) return null
              const style = EDGE_STYLE[edge.kind]
              const traced = tracedEdgeIds.has(edge.id)
              const adjacent = edge.from === activeNodeId || edge.to === activeNodeId
              const completed = completedSteps.includes(edge.from) && completedSteps.includes(edge.to)
              const stroke = traced ? '#f8fafc' : completed ? '#34d399' : style.stroke
              return (
                <g key={edge.id} data-edge-kind={edge.kind}>
                  <path d={edge.d} fill="none" stroke="rgba(0,0,0,.58)" strokeWidth="6" strokeLinecap="round" />
                  <path d={edge.d} fill="none" stroke={stroke} strokeWidth={traced ? 4 : adjacent ? 3 : 2} strokeDasharray={traced ? '' : style.dash} strokeLinecap="round" markerEnd={`url(#workflow-arrow-${edge.kind})`} opacity={traced || adjacent ? 1 : 0.72} />
                  {edge.label && edge.kind === EDGE_KINDS.BRANCH && (
                    <text x={(edge.fromPosition.x + NODE_WIDTH + edge.toPosition.x) / 2} y={(edge.fromPosition.y + edge.toPosition.y) / 2 + NODE_HEIGHT / 2 - 8} fill="#fcd34d" fontSize="11" fontWeight="700" textAnchor="middle">{edge.label}</text>
                  )}
                </g>
              )
            })}
          </svg>

          {ALL_NODES.map((node) => {
            const position = layout.positions.get(node.id)
            const selected = node.id === activeNodeId
            const completed = completedSteps.includes(node.id)
            const highlighted = !highlightedNodeIds || highlightedNodeIds.has(node.id)
            const [badge, badgeClass] = BADGES[node.type] || ['PROCESS', 'border-white/15 bg-white/5 text-white/60']
            return (
              <button key={node.id} type="button" data-node-id={node.id} onClick={() => onSelectNode(node.id)} aria-pressed={selected} className={`absolute flex flex-col rounded-xl border p-3 text-left shadow-xl transition-[border-color,background-color,opacity,box-shadow] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/40 motion-reduce:transition-none ${selected ? 'border-sky-300 bg-[#13233a] ring-2 ring-sky-400/40' : completed ? 'border-emerald-500/45 bg-[#0b1c18]' : 'border-white/12 bg-[#0d1625] hover:border-white/30'} ${highlighted ? 'opacity-100' : 'opacity-25'}`} style={{ left: position.x, top: position.y, width: NODE_WIDTH, height: NODE_HEIGHT }}>
                <span className="flex w-full items-center justify-between gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] ${badgeClass}`}>{badge}</span>
                  <span className="text-xs tabular-nums text-white/40">{node.id === 'admin.entry' ? 'START' : node.step}</span>
                </span>
                <strong className="mt-2 line-clamp-2 font-sans text-sm leading-snug text-white">{node.title}</strong>
                <span className="mt-1 line-clamp-1 text-xs font-semibold text-sky-300/80">{node.actor}</span>
                <span className="mt-auto line-clamp-2 text-xs leading-4 text-white/50">{node.short}</span>
              </button>
            )
          })}
        </div>
        <p className="pointer-events-none absolute bottom-3 left-4 rounded-md bg-black/60 px-2 py-1 text-xs text-white/50">Drag the canvas · use controls to zoom · select any node for evidence and next actions</p>
      </div>
    </section>
  )
}
