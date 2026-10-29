import assert from 'node:assert/strict'
import test from 'node:test'
import { captureCustomerEmailReturn } from '../src/lib/customerEmailReturn.js'

function capture(path, fail = false) {
  let replaced = null
  const result = captureCustomerEmailReturn({ href: `https://www.k2jimzon.com${path}` }, {
    state: { existing: true }, replaceState(state, _, url) { assert.deepEqual(state, { existing: true }); if (fail) throw new Error('disabled'); replaced = url },
  })
  return { result, replaced }
}
test('email return captures the hash only in memory and scrubs credentials before SDK initialization', () => {
  const value = capture(`/account?campaign=source#token_hash=${'a'.repeat(64)}&type=email`)
  assert.deepEqual(value.result, { kind: 'hash', tokenHash: 'a'.repeat(64) })
  assert.equal(value.replaced, '/account?campaign=source')
})
test('email return rejects duplicate, mixed, recovery and incomplete credentials', () => {
  for (const fragment of [
    `token_hash=${'a'.repeat(64)}&type=email&type=signup`,
    `token_hash=${'a'.repeat(64)}&type=recovery`,
    `token_hash=${'a'.repeat(64)}&type=email&access_token=bad`,
    'access_token=one.two.three&type=magiclink',
    'token_hash=short&type=email',
  ]) {
    const { result, replaced } = capture(`/account#${fragment}`)
    assert.equal(result.kind, 'error')
    assert.equal(replaced, '/account')
    assert.equal(JSON.stringify(result).includes('a'.repeat(64)), false)
  }
})
test('email return leaves unrelated account anchors, pages and PKCE codes untouched', () => {
  for (const path of ['/account#account-settings-title', '/account?code=PKCE_CODE', `/admin-portal-k2-secure#token_hash=${'a'.repeat(64)}&type=email`]) {
    assert.deepEqual(capture(path), { result: null, replaced: null })
  }
})
test('email return fails closed if URL credentials cannot be cleared', () => {
  const { result } = capture(`/account#token_hash=${'a'.repeat(64)}&type=email`, true)
  assert.equal(result.kind, 'error')
  assert.equal(JSON.stringify(result).includes('a'.repeat(64)), false)
})

test('email return accepts the supported twelve-character provider refresh token and refuses shorter tokens', () => {
  const accessToken = 'one.two.three'
  assert.deepEqual(capture(`/account#access_token=${accessToken}&refresh_token=abc123def456&type=magiclink`).result, { kind: 'session', accessToken, refreshToken: 'abc123def456' })
  assert.equal(capture(`/account#access_token=${accessToken}&refresh_token=abc123def45&type=magiclink`).result.kind, 'error')
})
