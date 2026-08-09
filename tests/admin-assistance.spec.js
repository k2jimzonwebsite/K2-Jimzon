import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { ADMIN_SHORTCUTS, GO_TO_SHORTCUTS, SCAN_WORKFLOWS } from '../src/views/admin/adminOperations.js'
import { answerQuestion, searchGuide, TOPICS } from '../src/views/admin/adminGuide.js'
import { buildProject1Prompt } from '../src/views/admin/productResearchPrompt.js'

test('admin shortcut registry exposes safe high-frequency operations', () => {
  expect(ADMIN_SHORTCUTS.some(item => item.id === 'scan' && item.keys.join(' ') === 'Alt S')).toBeTruthy()
  expect(ADMIN_SHORTCUTS.some(item => item.id === 'guide')).toBeTruthy()
  expect(GO_TO_SHORTCUTS.f).toBe('consignment')
  expect(SCAN_WORKFLOWS.map(item => item.id)).toEqual(expect.arrayContaining(['new_product', 'pack_order', 'milan_box', 'manila_box']))
})

test('operations retrieval cites the rulebook and prefers the active context', () => {
  const result = answerQuestion('How do I recount a box when it arrives in Manila?', { section: 'consignment' })
  expect(result.ok).toBeTruthy()
  expect(result.topic.id).toBe('manila_scanning')
  expect(result.topic.source).toContain('Operations Rulebook')
  expect(searchGuide('waybill')[0].id).toBe('waybills')
  expect(TOPICS.every(topic => topic.source && topic.how.length)).toBeTruthy()
})

test('adaptive product prompt requires evidence, uncertainty, draft review, and before-after images', () => {
  const prompt = buildProject1Prompt({
    barcode: '8005110060027',
    productName: 'Example Pasta 500g',
    researchMode: 'usage',
  })

  expect(prompt).toContain('packaging images as the primary source')
  expect(prompt).toContain('Unknown — verify manually')
  expect(prompt).toContain('source_urls')
  expect(prompt).toContain('human-reviewed Draft')
  expect(prompt).toContain('BEFORE')
  expect(prompt).toContain('AFTER')
  expect(prompt).toContain('Do not mark the record Live')
})

test('keyboard shortcuts do not bypass operational safeguards', async () => {
  const source = await readFile(new URL('../src/views/admin/Admin.jsx', import.meta.url), 'utf8')
  const scanCenter = await readFile(new URL('../src/views/admin/UniversalScanLauncher.jsx', import.meta.url), 'utf8')

  expect(source).toContain('isTextEntryTarget(event.target)')
  expect(source).toContain("event.altKey && key === 's'")
  expect(scanCenter).toContain('Select the order, flight, or box before unit scans')
  expect(scanCenter).toContain('never silently accepted')
})
