import { test } from 'node:test'
import assert from 'node:assert/strict'

test('commit guard refuses unstaged runtime inputs that could hide a staged regression', async () => {
  const { verificationTreeError } = await import('../scripts/git-guardrails.mjs')
  assert.match(verificationTreeError('pre-commit', ['src/lib/turnstileWidget.js'], []), /unstaged/)
  assert.equal(verificationTreeError('pre-commit', ['DESIGN.md'], ['src/lib/turnstileWidget.js']), '')
})

test('push guard requires committed runtime and test inputs but permits receipt-only edits', async () => {
  const { verificationTreeError } = await import('../scripts/git-guardrails.mjs')
  assert.match(verificationTreeError('pre-push', [], ['tests/new.test.mjs']), /untracked/)
  assert.match(verificationTreeError('pre-push', ['package.json'], []), /uncommitted/)
  assert.equal(verificationTreeError('pre-push', ['MASTER_ACTION_PLAN.md'], ['docs/acceptance/receipt.md']), '')
})

test('lint configuration is a verification input for commits and pushes', async () => {
  const { verificationTreeError } = await import('../scripts/git-guardrails.mjs')
  assert.match(verificationTreeError('pre-commit', ['eslint.config.js'], []), /unstaged/)
  assert.match(verificationTreeError('pre-push', [], ['eslint.config.js']), /untracked/)
})

test('hook installation preserves an existing custom hooks directory', async () => {
  const { hooksPathDecision } = await import('../scripts/install-git-guardrails.mjs')
  assert.equal(hooksPathDecision(''), 'install')
  assert.equal(hooksPathDecision('.githooks'), 'install')
  assert.equal(hooksPathDecision('.husky/_'), 'preserve')
})

test('push guard refuses outgoing commits other than the checked HEAD', async () => {
  const { pushRefsError } = await import('../scripts/git-guardrails.mjs')
  const head = 'a'.repeat(40), other = 'b'.repeat(40), zero = '0'.repeat(40)
  const line = sha => `refs/heads/topic ${sha} refs/heads/topic ${zero}\n`
  assert.equal(pushRefsError(line(head), head), '')
  assert.equal(pushRefsError(line(zero), head), '', 'deletions publish no untested code')
  assert.match(pushRefsError(line(other), head), /checked-out HEAD/)
  assert.match(pushRefsError(line(head) + line(other), head), /checked-out HEAD/)
  assert.match(pushRefsError('malformed', head), /ref list/)
})
