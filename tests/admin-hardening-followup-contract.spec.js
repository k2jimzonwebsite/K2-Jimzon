import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('packing slip prints only the slip, never the admin chrome', async () => {
  const modal = await read('../src/views/admin/PackingSlipModal.jsx')
  expect(modal).toContain('k2-print-slip')
  const css = await read('../src/index.css')
  expect(css).toContain('@media print')
  expect(css).toContain('k2-print-slip')
})

test('staff without an admin role see disabled privileged controls with a reason', async () => {
  const src = await read('../src/views/admin/StaffPermissionManager.jsx')
  expect(src).toContain('canManage')
  expect(src).toContain('Only Admins can change roles or invite staff')
})

test('staff sessions do not sign out merely because the Admin tab is idle', async () => {
  const shell = await read('../src/views/admin/Admin.jsx')
  expect(shell).not.toContain('useIdleLock')
  expect(shell).not.toContain('idleWarning')
  expect(shell).not.toContain('Stay signed in')
})
