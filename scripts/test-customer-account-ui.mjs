#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const port = 5181
// The customer-account journey only renders once `supabase` is a real client,
// and `supabaseClient.js` builds one only when VITE_SUPABASE_URL is present.
// Use a fabricated project reference in every environment. The browser tests
// intercept its requests, so a fixture regression cannot address K2's real
// provider while the client still receives the configuration it requires.
const supabaseProjectRef = 'fixture'
// supabase-js derives its session storage key from the project ref, so the
// spec must seed the same key it will later read. Pass it through rather than
// hardcoding the ref in two places where the copies can silently drift.
const authStorageKey = `sb-${supabaseProjectRef}-auth-token`
const env = {
  ...process.env,
  K2_DEPLOYMENT_TARGET: 'storefront',
  VITE_SUPABASE_URL: `https://${supabaseProjectRef}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key',
  VITE_GUEST_BFF_ENABLED: 'true',
  VITE_CUSTOMER_ACCOUNT_ENABLED: 'true',
  VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  K2_ACCOUNT_UI_AUTH_STORAGE_KEY: authStorageKey,
  PLAYWRIGHT_ACCOUNT_BASE_URL: `http://127.0.0.1:${port}`,
}
const server = spawn(process.execPath, [path.join(root,'node_modules','vite','bin','vite.js'),'--mode','storefront','--host','127.0.0.1','--port',String(port),'--configLoader','runner'], {
  cwd: root, env, windowsHide: true, stdio: 'ignore',
})

const ready = () => new Promise((resolve, reject) => {
  let attempts = 0
  const probe = () => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.once('connect', () => { socket.destroy(); resolve() })
    socket.once('error', () => {
      socket.destroy(); attempts += 1
      if (attempts >= 80) reject(new Error('Customer-account test server did not start.'))
      else setTimeout(probe, 100)
    })
  }
  probe()
})

try {
  await ready()
  const result = spawnSync(process.execPath, [
    path.join(root,'node_modules','@playwright','test','cli.js'), 'test',
    '--config=playwright.account.config.js', 'tests/customer-account-ui.spec.js', 'tests/wholesale-inquiry-ui.spec.js',
  ], { cwd: root, env, encoding: 'utf8', windowsHide: true, stdio: 'inherit' })
  if (result.error || result.status !== 0) process.exitCode = result.status || 2
} finally {
  server.kill()
}
