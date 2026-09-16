import { test, expect } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      files.push(...await sourceFiles(full))
    } else if (/\.(jsx|js)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

test('every TurnstileChallenge usage wires onTokenChange, never onVerify', async () => {
  const files = await sourceFiles('src')
  const usages = []
  for (const file of files) {
    const text = await readFile(file, 'utf8')
    if (!text.includes('<TurnstileChallenge')) continue
    usages.push(file)
    expect(text, `${file} must not pass onVerify (the component only reads onTokenChange)`).not.toMatch(/<TurnstileChallenge[^>]*onVerify=/)
  }
  // The safety net only works if it actually inspects call sites.
  expect(usages.length).toBeGreaterThan(3)
  for (const file of usages) {
    if (file.endsWith('TurnstileChallenge.jsx')) continue
    const text = await readFile(file, 'utf8')
    expect(text, `${file} must pass onTokenChange to TurnstileChallenge`).toMatch(/<TurnstileChallenge[^>]*onTokenChange=/)
  }
})

test('widget bot-check actions agree with the server expected actions', async () => {
  // A token minted for one form must not verify on another. Each pair below
  // is (server route file, expected action, storefront view file).
  const pairs = [
    ['prepared-api/storefront/order.js', 'guest_order', 'src/views/Checkout.jsx'],
    ['prepared-api/storefront/pasabuy.js', 'guest_pasabuy', 'src/views/Pasabuy.jsx'],
    ['prepared-api/storefront/wholesale.js', 'guest_wholesale', 'src/views/Wholesale.jsx'],
    ['prepared-api/storefront/conversation.js', 'guest_start', 'src/views/GuestMessages.jsx'],
    ['prepared-api/storefront/conversation.js', 'guest_start', 'src/components/shop/StoreChatPanel.jsx'],
  ]
  for (const [serverFile, action, viewFile] of pairs) {
    const server = await readFile(serverFile, 'utf8')
    const view = await readFile(viewFile, 'utf8')
    expect(server, `${serverFile} must verify the ${action} action`).toContain(`'${action}'`)
    expect(view, `${viewFile} must render the widget with the ${action} action`).toContain(`action="${action}"`)
  }
})
