import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('failed Turnstile download releases the cached failure for the next attempt', async () => {
  const source = await readFile('src/components/security/TurnstileChallenge.jsx', 'utf8')
  const loader = source.slice(source.indexOf('let scriptPromise'), source.indexOf('export default'))
  let appends = 0
  let current = null
  const window = { setTimeout, clearTimeout }
  const context = vm.createContext({ window, setTimeout, clearTimeout, document: {
    querySelector: () => current,
    createElement: () => ({ dataset: {}, remove() { current = null }, addEventListener() {} }),
    head: { appendChild(script) {
      current = script
      appends++
      queueMicrotask(() => {
        if (appends === 1) script.onerror(new Error('download failed'))
        else { window.turnstile = { render() {} }; script.onload() }
      })
    } },
  } })
  vm.runInContext(loader, context)
  await assert.rejects(vm.runInContext('loadTurnstile()', context))
  const retried = await vm.runInContext('loadTurnstile()', context).catch(() => null)
  assert.ok(retried, 'second attempt must load after the failed download')
  assert.equal(appends, 2)
})
