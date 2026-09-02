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
    'overview', 'workflow_graph', 'kanban', 'consignment', 'pasabuy_manager',
    'suppliers', 'inventory', 'omni_hub', 'inbox', 'wholesale', 'coupons',
    'staff_permissions', 'integrations', 'store_assets', 'globe',
  ])

  for (const workflow of Object.values(WORKFLOWS)) {
    for (const node of workflow.nodes) {
      if (node.adminJump) {
        expect(validSections.has(node.adminJump), `${node.id} routes to missing Admin section ${node.adminJump}`).toBe(true)
      }
    }
  }
})

test('guide rehearsal state cannot be presented as a real operational completion', async () => {
  const master = await read('../src/components/admin/master-workflow-graph/MasterWorkflowGraph.jsx')
  const detail = await read('../src/components/admin/master-workflow-graph/WorkflowDetailDrawer.jsx')

  expect(master).toContain('Guide rehearsal')
  expect(master).not.toContain('Shift Progress')
  expect(detail).toContain('Training example')
  expect(detail).toContain('does not write or verify a real record')
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
