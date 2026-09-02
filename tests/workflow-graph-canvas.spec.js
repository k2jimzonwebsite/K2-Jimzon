import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import {
  ALL_NODES, EDGES, ENTRY_NODE_ID, GRAPH_STATS, computeLayers, getTerminalNodes, tracePaths,
} from '../src/components/admin/master-workflow-graph/workflowGraph.js'

const read = (path) => fs.readFileSync(path, 'utf8')

test('the operations graph is connected, layered, and traceable to every terminal', () => {
  expect(GRAPH_STATS).toMatchObject({ nodeCount: 49, edgeCount: 60, branchCount: 16, convergeCount: 7, loopbackCount: 2 })
  expect(new Set(computeLayers().flat().map((node) => node.id)).size).toBe(ALL_NODES.length)
  expect(EDGES.every((edge) => ALL_NODES.some((node) => node.id === edge.from) && ALL_NODES.some((node) => node.id === edge.to))).toBe(true)
  const terminals = getTerminalNodes()
  expect(terminals).toHaveLength(3)
  for (const terminal of terminals) expect(tracePaths(ENTRY_NODE_ID, terminal.id).length).toBeGreaterThan(0)
})

test('the canvas renders model edges and the detail surface exposes graph context', () => {
  const canvas = read('src/components/admin/master-workflow-graph/WorkflowSvgCanvas.jsx')
  const detail = read('src/components/admin/master-workflow-graph/WorkflowDetailDrawer.jsx')
  const master = read('src/components/admin/master-workflow-graph/MasterWorkflowGraph.jsx')

  expect(canvas).toContain("import { ALL_NODES, EDGES, EDGE_KINDS, computeLayers } from './workflowGraph'")
  expect(canvas).toContain('EDGES.map')
  expect(canvas).not.toContain('nodePositions.slice(0, -1)')
  expect(canvas).toContain('Zoom out')
  expect(canvas).toContain('Reset view')
  expect(detail).toContain('Where did this come from?')
  expect(detail).toContain('What can you do here?')
  expect(detail).toContain('Grounding evidence')
  expect(master).toContain('tracePaths(')
  expect(master).toContain('Trace a route')
})

test('the workflow graph and visual guide stay outside the initial Admin chunk', () => {
  const admin = read('src/views/admin/Admin.jsx')
  const startHere = read('src/views/admin/StartHereGuide.jsx')
  const guide = read('src/components/admin/guides/WorkflowGuideModal.jsx')

  expect(admin).not.toMatch(/^import WorkflowGuideModal/m)
  expect(admin).toContain("const WorkflowGuideModal = lazy(() => import('../../components/admin/guides/WorkflowGuideModal'))")
  expect(startHere).not.toMatch(/^import WorkflowGuideModal/m)
  expect(startHere).toContain("lazy(() => import('../../components/admin/guides/WorkflowGuideModal'))")
  expect(guide).not.toMatch(/^import MasterWorkflowGraph/m)
  expect(guide).toContain("lazy(() => import('../master-workflow-graph/MasterWorkflowGraph'))")
})
