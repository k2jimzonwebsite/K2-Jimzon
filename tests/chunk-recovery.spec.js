import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import vm from 'node:vm'

function bootstrap({ blockedStorage = false } = {}) {
  const listeners = new Map()
  let reloads = 0
  let now = 20000
  const storage = new Map()
  const source = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
    .split("createRoot(document.getElementById('root'))")[0]
    .replace(/^import .*$/gm, '')
  vm.runInNewContext(source, {
    installErrorReporting() {},
    window: { addEventListener: (name, fn) => listeners.set(name, fn), location: { reload: () => reloads++ } },
    sessionStorage: {
      getItem(key) { if (blockedStorage) throw new Error('Storage denied'); return storage.get(key) },
      setItem(key, value) { if (blockedStorage) throw new Error('Storage denied'); storage.set(key, value) },
    },
    Date: { now: () => now }, Number,
  })
  return {
    fail() {
      let prevented = false
      listeners.get('vite:preloadError')?.({ preventDefault() { prevented = true } })
      now += 11000
      return { prevented, reloads }
    },
  }
}

test('persistent chunk failures do not reload away pending work or suppress the lazy-import error', () => {
  const app = bootstrap()
  for (let n = 0; n < 3; n++) expect(app.fail()).toEqual({ prevented: false, reloads: 0 })
})

test('chunk recovery still reaches the error boundary when session storage is unavailable', () => {
  const app = bootstrap({ blockedStorage: true })
  expect(() => app.fail()).not.toThrow()
  expect(app.fail()).toEqual({ prevented: false, reloads: 0 })
})
