import { expect, test } from '@playwright/test'
import { hostnameInventorySql, inventoryPersistedHostnames } from '../scripts/map024-evidence/inventory-persisted-hostnames.mjs'

const validUrl = [
  'postgresql://',
  'postgres',
  ':',
  'fixture-password',
  '@db.pixplcjqivlfflickobf.supabase.co:5432/postgres?sslmode=require',
].join('')

test('MAP-024 hostname inventory is read-only and redacted', () => {
  expect(hostnameInventorySql).toContain('create temporary table map024_hostname_matches')
  expect(hostnameInventorySql).toContain('attribute.atttypid in (25, 1042, 1043, 114, 3802)')
  expect(hostnameInventorySql).not.toContain('update ')
  expect(hostnameInventorySql).not.toContain('delete ')
  expect(hostnameInventorySql).not.toContain('insert into public.')
  expect(hostnameInventorySql).toContain('legacy_vercel_count')
  expect(hostnameInventorySql).toContain('localhost_count')
})

test('MAP-024 hostname inventory accepts only the exact K2 production boundary', () => {
  expect(() => inventoryPersistedHostnames({ databaseUrl: 'postgresql://user:password@localhost:5432/example', spawnImpl: () => ({ status: 0, stdout: '{}' }) }))
    .toThrow('MAP024_HOSTNAME_INVENTORY_REFUSAL')
})

test('MAP-024 hostname inventory emits counts without matched values', () => {
  const fakeOutput = JSON.stringify({
    projectRef: 'pixplcjqivlfflickobf',
    columnsScanned: 12,
    columnsWithMatches: 1,
    rowsWithMatches: 2,
    matches: [{ schema_name: 'public', table_name: 'settings', column_name: 'callback_url', data_type: 'text', row_count: 2, absolute_url_count: 2, legacy_vercel_count: 2, localhost_count: 0, loopback_count: 0 }],
  })
  const result = inventoryPersistedHostnames({
    databaseUrl: validUrl,
    spawnImpl: (_file, _args, options) => {
      expect(options.env.PGPASSWORD).toBe('fixture-password')
      return { status: 0, stdout: fakeOutput }
    },
  })
  expect(result.matches[0]).not.toHaveProperty('value')
  expect(result.matches[0].legacy_vercel_count).toBe(2)
})
