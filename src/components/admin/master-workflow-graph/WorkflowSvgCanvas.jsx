import React, { useRef, useEffect, useState } from 'react'

/**
 * WorkflowSvgCanvas
 * Renders high-fidelity SVG connector lines, directional curves, animated pulses,
 * and interactive node anchors for any active operational workflow.
 */
export default function WorkflowSvgCanvas({
  workflow,
  activeNodeId,
  onSelectNode,
  completedSteps = [],
}) {
  const containerRef = useRef(null)
  const [nodePositions, setNodePositions] = useState([])

  // Measure physical positions of nodes in DOM to draw precise SVG connector paths
  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const nodeElements = containerRef.current.querySelectorAll('[data-node-id]')

      const positions = Array.from(nodeElements).map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          id: el.getAttribute('data-node-id'),
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height,
          right: rect.right - containerRect.left,
          bottom: rect.bottom - containerRect.top,
        }
      })
      setNodePositions(positions)
    }

    updatePositions()
    const resizeObserver = new ResizeObserver(updatePositions)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    window.addEventListener('resize', updatePositions)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updatePositions)
    }
  }, [workflow.id, workflow.nodes.length])

  // Build SVG path strings between consecutive nodes
  const paths = nodePositions.slice(0, -1).map((current, idx) => {
    const next = nodePositions[idx + 1]
    if (!current || !next) return null

    // Determine if adjacent nodes are on the same horizontal row or wrapped
    const isSameRow = Math.abs(current.y - next.y) < 30

    let d = ''
    if (isSameRow) {
      // Direct horizontal line with soft ease
      const startX = current.right + 4
      const startY = current.y
      const endX = next.left - 4
      const endY = next.y
      const midX = (startX + endX) / 2
      d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
    } else {
      // S-curve connector wrapping to next line
      const startX = current.x
      const startY = current.bottom + 4
      const endX = next.x
      const endY = next.top - 4
      const midY = (startY + endY) / 2
      d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
    }

    const isCurrentActive = workflow.nodes[idx].id === activeNodeId
    const isNextActive = workflow.nodes[idx + 1]?.id === activeNodeId
    const isActive = isCurrentActive || isNextActive
    const isCompleted =
      completedSteps.includes(workflow.nodes[idx].id) &&
      completedSteps.includes(workflow.nodes[idx + 1]?.id)

    let strokeColor = 'rgba(255, 255, 255, 0.15)'
    if (isCompleted) {
      strokeColor = '#10b981' // emerald
    } else if (isActive) {
      strokeColor = workflow.accentColor || '#38bdf8'
    }

    return {
      id: `path-${current.id}-${next.id}`,
      d,
      isActive,
      isCompleted,
      color: strokeColor,
    }
  }).filter(Boolean)

  const getNodeTypeBadge = (type) => {
    switch (type) {
      case 'intake':
        return { label: 'START / INTAKE', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' }
      case 'scan':
        return { label: '2-FACTOR SCAN', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' }
      case 'decision':
        return { label: 'VERIFICATION', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
      case 'action':
        return { label: 'HANDLING', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
      case 'complete':
        return { label: 'COMMITTED', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
      default:
        return { label: 'PROCESS', bg: 'bg-white/10 text-white/70 border-white/20' }
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#080d16] p-6 shadow-2xl">
      {/* Background Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div ref={containerRef} className="relative z-10 w-full">
        {/* SVG Connector Layer */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <marker
              id={`arrow-${workflow.id}`}
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill={workflow.accentColor || '#38bdf8'} opacity="0.85" />
            </marker>
          </defs>

          {paths.map((p) => (
            <g key={p.id}>
              {/* Background Path Outline */}
              <path
                d={p.d}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Dynamic Colored Path */}
              <path
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={p.isActive ? '2.5' : p.isCompleted ? '2' : '1.5'}
                strokeDasharray={p.isActive ? '6 4' : 'none'}
                strokeLinecap="round"
                className={p.isActive ? 'animate-pulse' : ''}
              />
            </g>
          ))}
        </svg>

        {/* Node Grid Layout */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {workflow.nodes.map((node) => {
            const isSelected = node.id === activeNodeId
            const isDone = completedSteps.includes(node.id)
            const badge = getNodeTypeBadge(node.type)

            return (
              <div
                key={node.id}
                data-node-id={node.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectNode(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectNode(node.id)
                  }
                }}
                className={`group relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isSelected
                    ? 'border-sky-400 bg-[#0e1726] shadow-lg shadow-sky-500/10 ring-2 ring-sky-400/30'
                    : isDone
                    ? 'border-emerald-500/40 bg-[#091512] hover:border-emerald-400/60'
                    : 'border-white/10 bg-[#0b121e]/90 hover:border-white/25 hover:bg-[#0f1828]'
                }`}
              >
                {/* Step Circle & Type Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform group-hover:scale-105 ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950 font-extrabold'
                        : isSelected
                        ? 'bg-sky-400 text-slate-950 font-extrabold shadow-sm'
                        : 'border border-white/20 bg-white/5 text-white/80'
                    }`}
                  >
                    {isDone ? '✓' : node.step}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Node Title */}
                <h4
                  className={`mt-3 font-serif text-sm font-semibold leading-snug transition-colors ${
                    isSelected ? 'text-white' : 'text-white/90 group-hover:text-white'
                  }`}
                >
                  {node.title}
                </h4>

                {/* Actor / Location */}
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/50">
                  <span className="font-medium text-white/70">{node.actor}</span>
                </div>

                {/* Short Instruction */}
                <p className="mt-2 text-xs leading-relaxed text-white/60 line-clamp-2">
                  {node.short}
                </p>

                {/* View Details Hint */}
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] font-semibold">
                  <span className={isSelected ? 'text-sky-400' : isDone ? 'text-emerald-400' : 'text-white/40 group-hover:text-white/70'}>
                    {isSelected ? 'Viewing details ▸' : isDone ? 'Step Completed ✓' : 'Click to inspect'}
                  </span>
                  {node.hasPromptStudio && (
                    <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
                      AI PROMPTS
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
