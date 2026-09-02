import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { access } from 'node:fs/promises'
import {
  ALL_NODES, EDGES, EDGE_KINDS, ENTRY_NODE_ID, NODE_GROUNDING, tracePaths,
} from '../src/components/admin/master-workflow-graph/workflowGraph.js'
import { WORKFLOWS, WORKFLOW_SECTIONS } from '../src/components/admin/master-workflow-graph/workflowData.js'
import { TOPICS as GUIDE_ENTRIES } from '../src/views/admin/adminGuide.js'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const exists = async path => access(new URL(path, import.meta.url)).then(() => true, () => false)

const channelNodes = () => ALL_NODES.filter(node => node.sectionId === 'channel_intake')

test('the admin workflow map has a channel intake section wired into the graph', () => {
  expect(WORKFLOW_SECTIONS.map(section => section.id)).toContain('channel_intake')

  const workflow = WORKFLOWS.channel_integration_lifecycle
  expect(workflow.sectionId).toBe('channel_intake')
  expect(workflow.nodes.length).toBeGreaterThanOrEqual(8)

  // Reachable from the one entry point, like every other workflow. An island in
  // the graph would render but could never be arrived at.
  expect(tracePaths(ENTRY_NODE_ID, 'ch_1').length).toBeGreaterThan(0)
  expect(tracePaths(ENTRY_NODE_ID, 'ch_8').length).toBeGreaterThan(0)
})

test('a connected channel enables the existing order path rather than duplicating it', () => {
  // `enables`, not `sequence`: connecting a channel makes its orders workable
  // later, it is not a step an operator walks straight into picking.
  const bridge = EDGES.find(edge => edge.from === 'ch_8' && edge.to === 'ord_1')
  expect(bridge).toBeTruthy()
  expect(bridge.kind).toBe(EDGE_KINDS.ENABLES)

  // There is no second fulfillment chain for marketplace orders.
  const channelIds = new Set(channelNodes().map(node => node.id))
  const strays = EDGES.filter(edge =>
    channelIds.has(edge.from) && !channelIds.has(edge.to) && edge.to !== 'ord_1')
  expect(strays).toEqual([])
})

test('the map marks the unbuilt channels as unbuilt instead of drawing them working', () => {
  const nodes = channelNodes()
  const text = JSON.stringify(nodes)

  // The Lazada / TikTok / social gap must be visible in the map itself, not
  // only in the plan. A map that draws every channel identically would tell
  // staff that an order is arriving somewhere nobody is watching.
  expect(text).toContain('NOT BUILT')
  expect(text).toMatch(/Lazada/)
  expect(text).toMatch(/TikTok Shop/)

  // A dead-end branch exists for channels with no adapter, so the honest path
  // is drawn rather than implied.
  const noAdapter = EDGES.find(edge => edge.from === 'ch_3' && edge.to === 'ch_8')
  expect(noAdapter.kind).toBe(EDGE_KINDS.BRANCH)
  expect(noAdapter.condition).toMatch(/no adapter|not connected|Seller Center|own portal/i)
})

test('every channel node is grounded in a file or database object that exists', async () => {
  for (const node of channelNodes()) {
    const grounding = NODE_GROUNDING[node.id] || []
    expect(grounding.length, `${node.id} has no grounding`).toBeGreaterThan(0)

    for (const ref of grounding) {
      // Only path-shaped refs are checkable from here; table and rpc refs are
      // covered by the migration suites.
      if (ref.kind === 'screen' || ref.kind === 'component') {
        expect(await exists(`../${ref.ref}`), `${node.id} cites missing ${ref.ref}`).toBe(true)
      }
    }
  }
})

test('the guide explains connecting a channel, receiving inventory, and what is not connected', () => {
  const ids = GUIDE_ENTRIES.map(entry => entry.id)
  for (const id of ['channel-connect-marketplace', 'channel-inventory-readiness', 'channel-social-messaging']) {
    expect(ids).toContain(id)
  }

  const social = GUIDE_ENTRIES.find(entry => entry.id === 'channel-social-messaging')
  expect(social.what).toMatch(/no adapter|reaches no K2 system/i)

  const connect = GUIDE_ENTRIES.find(entry => entry.id === 'channel-connect-marketplace')
  // The secret-handling rule is the one mistake that cannot be undone quietly,
  // so it has to be stated where an operator will actually read it.
  expect(JSON.stringify(connect)).toMatch(/VITE_/)

  for (const entry of GUIDE_ENTRIES) {
    expect(entry.title, `${entry.id} has no title`).toBeTruthy()
    expect(Array.isArray(entry.how), `${entry.id} has no steps`).toBe(true)
    expect(entry.where, `${entry.id} does not say where`).toBeTruthy()
  }
})

test('the audit findings are recorded in the master action plan', async () => {
  const plan = await read('../MASTER_ACTION_PLAN.md')

  expect(plan).toContain('### MAP-028')
  // The launch-blocking findings must be named, not summarised away.
  expect(plan).toContain('vercel.json')
  expect(plan).toContain('sitemap')
  expect(plan).toMatch(/Content-Security-Policy-Report-Only|report-uri|report-to/)
  expect(plan).toMatch(/channel vocabular/i)
  expect(plan).toMatch(/oversell/i)
})
