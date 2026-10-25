import { test } from 'node:test'
import assert from 'node:assert/strict'

// A real provider is deliberately replaced here: these checks must never mint
// or submit a production token. The actual lifecycle implementation is exercised.
async function fixture(t, behavior) {
  const { mountTurnstileWidget } = await import('../src/lib/turnstileWidget.js')
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const states = [], tokens = [], removed = []
  let options
  const dispose = mountTurnstileWidget({
    render(container, config) { options = config; behavior?.(config); return 'widget-1' },
    remove(id) { removed.push(id) },
  }, {}, { siteKey: 'fixture-site-key', action: 'admin_auth', onToken: token => tokens.push(token),
    onState: state => states.push(state) })
  return { options, dispose, states, tokens, removed }
}

test('a silent rendered challenge times out without ever granting a token', async t => {
  const f = await fixture(t)
  assert.equal(f.options.appearance, 'always')
  t.mock.timers.tick(30000)
  assert.match(f.states.at(-1).error, /taking longer/)
  assert.equal(f.states.at(-1).status, 'error')
  assert.deepEqual(f.tokens, [''])
  f.options.callback('late-token')
  assert.deepEqual(f.tokens, [''], 'a timed-out attempt cannot later grant a token')
  f.dispose()
  assert.deepEqual(f.removed, ['widget-1'])
})

test('success is visible and cancels the pending deadline; expiry invalidates the token', async t => {
  const f = await fixture(t)
  f.options.callback('fixture-token')
  assert.equal(f.states.at(-1).status, 'verified')
  t.mock.timers.tick(30000)
  assert.equal(f.states.at(-1).status, 'verified')
  f.options['expired-callback']()
  assert.equal(f.tokens.at(-1), '')
  assert.match(f.states.at(-1).error, /expired/)
  f.dispose()
})

test('provider errors are visible, bounded, and never bypass verification', async t => {
  const f = await fixture(t)
  assert.equal(f.options.retry, 'never')
  f.options['error-callback']('110200')
  assert.equal(f.states.at(-1).status, 'error')
  assert.match(f.states.at(-1).error, /110200/)
  f.options.callback('late-token')
  assert.equal(f.tokens.at(-1), '')
  f.dispose()
})

test('unmount cancels deadlines and ignores all stale provider callbacks', async t => {
  const f = await fixture(t)
  f.dispose()
  const stateCount = f.states.length, tokenCount = f.tokens.length
  f.options.callback('stale-token')
  f.options['error-callback']('300030')
  f.options['expired-callback']()
  t.mock.timers.tick(60000)
  assert.equal(f.states.length, stateCount)
  assert.equal(f.tokens.length, tokenCount)
})

test('an interactive challenge gets the provider interaction window instead of the background deadline', async t => {
  const f = await fixture(t)
  f.options['before-interactive-callback']()
  t.mock.timers.tick(30000)
  assert.equal(f.states.at(-1).status, 'interactive')
  f.options['timeout-callback']()
  assert.match(f.states.at(-1).error, /timed out/)
  assert.equal(f.tokens.at(-1), '')
  f.dispose()
})

test('interactive cleanup after success cannot restart the pending deadline', async t => {
  const f = await fixture(t)
  f.options['before-interactive-callback']()
  f.options.callback('fixture-token')
  f.options['after-interactive-callback']()
  t.mock.timers.tick(120000)
  assert.equal(f.states.at(-1).status, 'verified')
  assert.equal(f.tokens.at(-1), 'fixture-token')
  f.dispose()
})

test('a synchronous render failure becomes a retryable error', async t => {
  const f = await fixture(t, () => { throw new Error('render failed') })
  assert.equal(f.states.at(-1).status, 'error')
  assert.match(f.states.at(-1).error, /could not load/)
  f.dispose()
})
