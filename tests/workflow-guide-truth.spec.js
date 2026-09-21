import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { WORKFLOW_GUIDE_META, WORKFLOWS } from '../src/components/admin/master-workflow-graph/workflowData.js'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const guideText = () => JSON.stringify(WORKFLOWS)

test('the staff workflow guide does not claim unavailable automation or integrations', () => {
  const text = guideText()

  for (const unsupportedClaim of [
    /automatically alerts/i,
    /automatically receives/i,
    /automated tracking SMS/i,
    /auto-release reserved stock/i,
    /clear Redis cache/i,
    /force manual webhook sync/i,
    /push(?:es)? live .*Shopee.*Lazada/i,
    /increments across all channels/i,
    /system automatically computes landed cost/i,
    /system calculates landed cost floor/i,
    /system freezes order picking/i,
    /session PIN\/biometric/i,
    /packing station camera/i,
    /appears immediately in Storefront/i,
  ]) {
    expect(text).not.toMatch(unsupportedClaim)
  }
})

test('the guide exposes a version, approval state, and authoritative operational source', () => {
  expect(WORKFLOW_GUIDE_META.version).toMatch(/^2026-08-30-draft\./)
  expect(WORKFLOW_GUIDE_META.approvalStatus).toBe('DRAFT — NOT LOCKED')
  expect(WORKFLOW_GUIDE_META.effectiveDate).toBeNull()
  expect(WORKFLOW_GUIDE_META.authority).toBe('K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md')
})

test('the guide routes every action to an actual Admin section', () => {
  const validSections = new Set([
    'overview', 'owner_close', 'workflow_graph', 'kanban', 'consignment', 'pasabuy_manager',
    'suppliers', 'inventory', 'omni_hub', 'inbox', 'wholesale', 'coupons',
    'reservations', 'delivery', 'staff_permissions', 'integrations', 'store_assets', 'globe',
  ])

  for (const workflow of Object.values(WORKFLOWS)) {
    for (const node of workflow.nodes) {
      if (node.adminJump) {
        expect(validSections.has(node.adminJump), `${node.id} routes to missing Admin section ${node.adminJump}`).toBe(true)
      }
    }
  }
})

test('every quoted guide control is a real staff-facing label', async () => {
  const sourceFiles = [
    '../src/views/admin/Kanban.jsx',
    '../src/views/admin/PurchaseOrders.jsx',
    '../src/views/admin/ConsignmentManager.jsx',
    '../src/views/admin/InventoryGrid.jsx',
    '../src/views/admin/OwnerCountClose.jsx',
    '../src/views/admin/OmniOperationsHub.jsx',
    '../src/views/admin/Inbox.jsx',
    '../src/views/admin/PasabuyManager.jsx',
    '../src/views/admin/ChannelIntegrations.jsx',
  ]
  const adminLabels = (await Promise.all(sourceFiles.map(read))).join('\n')

  for (const workflow of Object.values(WORKFLOWS)) {
    for (const node of workflow.nodes) {
      const clickText = node.actionGuide.whatToClick
      if (clickText.startsWith('No Admin control yet.')) continue
      const labels = [...clickText.matchAll(/"([^"]+)"/g)].map(match => match[1])
      expect(labels.length, `${node.id} must name a real control or state that no Admin control exists`).toBeGreaterThan(0)
      for (const label of labels) {
        expect(adminLabels.includes(label), `${node.id} names missing control "${label}"`).toBe(true)
      }
    }
  }
})

test('workflow guide uses plain staff language for fallback instructions', async () => {
  const detail = await read('../src/components/admin/master-workflow-graph/WorkflowDetailDrawer.jsx')
  expect(detail).not.toContain('designated screen')
  expect(detail).not.toContain('downstream operational stage')
  expect(detail).not.toContain('server result')
  expect(detail).toContain('saved record')
})

test('guide rehearsal state cannot be presented as a real operational completion', async () => {
  const master = await read('../src/components/admin/master-workflow-graph/MasterWorkflowGraph.jsx')
  const detail = await read('../src/components/admin/master-workflow-graph/WorkflowDetailDrawer.jsx')

  expect(master).toContain('Guide rehearsal')
  expect(master).not.toContain('Shift Progress')
  expect(detail).toContain('Training example')
  expect(detail).toContain('does not save or verify real work')
  expect(detail).not.toContain('automatically toggle step complete')
  expect(detail).not.toContain('setTimeout(() =>')
  expect(detail).not.toContain('Laser Barcode & Step Simulator')
  expect(detail).not.toContain('Mark as Completed')
})

test('the new-product guide names the two approved manual ChatGPT Projects', () => {
  const node = WORKFLOWS.new_product_intake.nodes.find(item => item.id === 'np_3')
  const text = JSON.stringify(node)

  expect(text).toContain('K2 Product Content')
  expect(text).toContain('K2 Product Image Studio')
  expect(text).toContain('Smart Paste')
  expect(text).toContain('PRIMARY')
  expect(text).toContain('AFTER')
  expect(text).not.toMatch(/Midjourney|FLUX|DALL-E 3/i)
})

test('every workflow defines objective/goal/exit gates and all nodes provide complete staff action guides', async () => {
  for (const [wfId, workflow] of Object.entries(WORKFLOWS)) {
    expect(workflow.goal, `${wfId} missing goal`).toBeTruthy()
    expect(workflow.startingPoint, `${wfId} missing startingPoint`).toBeTruthy()
    expect(workflow.completionCriteria, `${wfId} missing completionCriteria`).toBeTruthy()
    for (const node of workflow.nodes) {
      expect(node.actionGuide, `${node.id} missing actionGuide`).toBeDefined()
      expect(node.actionGuide.targetScreen, `${node.id} missing targetScreen`).toBeTruthy()
      expect(node.actionGuide.whatToClick, `${node.id} missing whatToClick`).toBeTruthy()
      expect(node.actionGuide.actionDirective, `${node.id} missing actionDirective`).toBeTruthy()
      expect(node.actionGuide.nextAction, `${node.id} missing nextAction`).toBeTruthy()
      expect(node.actionGuide.exitCriteria, `${node.id} missing exitCriteria`).toBeTruthy()
    }
  }

  const master = await read('../src/components/admin/master-workflow-graph/MasterWorkflowGraph.jsx')
  const detail = await read('../src/components/admin/master-workflow-graph/WorkflowDetailDrawer.jsx')

  expect(master).toContain('Goal and completion checks')
  expect(master).toContain('Steps and handoffs')
  expect(detail).toContain('What to do')
  expect(detail).toContain('Follow these steps')
  expect(detail).toContain('1. Open the right screen')
  expect(detail).toContain('2. Do the work')
  expect(detail).toContain('3. Next step')
  expect(detail).toContain('4. Before moving on')
})
