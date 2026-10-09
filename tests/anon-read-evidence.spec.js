import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// Run the actual CLI with only its external filesystem/network/process edges
// replaced. No production credentials, records or HTTP requests are used.
async function probe({ status = 200, range = '0-0/1', privateStatus = 401, privateRange = null, truthStatus = 200, truthRange = '0-0/1' } = {}) {
  const source = readFileSync(new URL('../scripts/map017-evidence/verify-anon-read-boundary.mjs', import.meta.url), 'utf8').replace(/^import fs.*$/m, '')
  const lines = []
  let exitCode
  await vm.runInNewContext(`(async()=>{${source}})()`, {
    fs: { readFileSync: () => 'VITE_SUPABASE_URL=https://fixture.invalid\nVITE_SUPABASE_PUBLISHABLE_KEY=fixture-anon\nSUPABASE_SECRET_KEY=fixture-secret' },
    fetch: async (url, options) => {
      const privileged = options.headers.apikey === 'fixture-secret'
      const publicTable = /\/(products|brands|categories|v_product_stock_from_batches)\?/.test(url)
      return {
        status: privileged ? truthStatus : publicTable ? status : privateStatus,
        headers: { get: () => privileged ? truthRange : publicTable ? range : privateRange },
      }
    },
    process: { argv: [], exit: code => { exitCode = code } },
    console: { log: (...args) => lines.push(args.join(' ')) },
  })
  return { exitCode, output: lines.join('\n') }
}

test('provider outage never passes a private boundary or claims an empty table', async () => {
  const result = await probe({ status: 503, privateStatus: 503, truthStatus: 503, range: null, truthRange: null })
  expect(result.exitCode).toBe(1)
  expect(result.output).not.toMatch(/^PASS/m)
  expect(result.output).not.toContain('table empty')
})

test('failed privileged baseline invalidates otherwise allowed or denied probes', async () => {
  const result = await probe({ truthStatus: 401, truthRange: null })
  expect(result.exitCode).toBe(1)
  expect(result.output).not.toMatch(/^PASS/m)
})

for (const range of [null, '0-0/*', '0-0/nope', '0-0/', '0-0/-1', '0-0/1.5']) {
  test(`unknown or malformed count is not security evidence: ${range}`, async () => {
    const result = await probe({ range, privateStatus: 200, privateRange: range, truthRange: range })
    expect(result.exitCode).toBe(1)
    expect(result.output).not.toMatch(/^PASS/m)
  })
}

test('confirmed baseline plus explicit authorization denial passes', async () => {
  expect((await probe()).exitCode).toBe(0)
})

test('zero visible rows are qualified when the private source is empty', async () => {
  const result = await probe({ privateStatus: 200, privateRange: '*/0', truthRange: '*/0' })
  expect(result.exitCode).toBe(0)
  expect(result.output).toContain('empty source; row isolation unproven')
})

test('exposed private rows fail and missing routes are not authorization denial', async () => {
  expect((await probe({ privateStatus: 200, privateRange: '0-0/1' })).output).toContain('EXPOSED')
  const missing = await probe({ privateStatus: 404 })
  expect(missing.exitCode).toBe(1)
  expect(missing.output).not.toMatch(/^PASS  anon cannot/m)
})
