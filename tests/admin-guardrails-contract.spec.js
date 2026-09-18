import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('transfer approval requires a second explicit confirm, not a single click', async () => {
  const src = await read('../src/views/admin/ShopAllocationManager.jsx')
  expect(src).toContain('Confirm approve')
  expect(src).toContain('setApproveId(t.id)')
})

test('J&T tracking save surfaces a server refusal instead of closing silently', async () => {
  const src = await read('../src/views/admin/JntVipDispatchModal.jsx')
  expect(src).toContain('result.ok === false')
})

test('Milan instant draft requires an arming tap that names the SKU first', async () => {
  const src = await read('../src/views/admin/MilanPackingScannerModal.jsx')
  expect(src).toContain('instantArmed')
  expect(src).toContain('Tap again to create')
})

test('Manila finish requires confirmation when the count is short', async () => {
  const src = await read('../src/views/admin/MobileScannerModal.jsx')
  expect(src).toContain('finishArmed')
})
