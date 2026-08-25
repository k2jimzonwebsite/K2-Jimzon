import assert from 'node:assert/strict'
import { inspectBrowserSource, inspectServerSource } from './environment-source-boundary-core.mjs'

assert.deepEqual(inspectBrowserSource('const url = import.meta.env.VITE_SUPABASE_URL', 'clean.jsx'), [])
assert.deepEqual(inspectBrowserSource('if (import.meta.env.DEV) {}', 'vite-built-in.jsx'), [])
assert.equal(inspectBrowserSource('const value = process.env.SECRET', 'browser.jsx').some((x) => x.rule === 'node-env-in-browser-source'), true)
assert.equal(inspectBrowserSource("const value = import.meta.env['VITE_SUPABASE_URL']", 'dynamic.jsx').some((x) => x.rule === 'dynamic-browser-env-access'), true)
assert.equal(inspectBrowserSource('const value = import.meta.env.VITE_UNKNOWN_FLAG', 'unknown.jsx').some((x) => x.rule === 'unapproved-browser-env'), true)
assert.equal(inspectBrowserSource('const value = import.meta.env.VITE_PAYMENT_SECRET', 'secret.jsx').some((x) => x.rule === 'secret-shaped-browser-env'), true)
assert.equal(inspectServerSource('const value = import.meta.env.VITE_SUPABASE_URL', 'server.js').some((x) => x.rule === 'browser-env-api-in-server-source'), true)
assert.deepEqual(inspectServerSource("const value = process.env.SUPABASE_URL", 'server.js'), [])

console.log('Environment source-boundary tests passed (8 fixtures).')

