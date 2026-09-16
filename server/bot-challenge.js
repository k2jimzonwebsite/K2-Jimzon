import { createHash } from 'node:crypto'

// Bot-challenge semantics (MAP-020 F-020-001):
// - A token proves one solving on one host for one action. Replays are
//   rejected through a short-lived seen-token store.
// - The expected hostname (taken from the already-validated request origin at
//   each call site) must match the hostname Cloudflare reports.
// - A missing secret fails closed. Local and fixture runners that never touch
//   the provider opt in explicitly with K2_TURNSTILE_ALLOW_UNCONFIGURED=true;
//   nothing opts in silently.
//
// The replay store is per process instance: it is a cost shield in front of
// provider verification, not a distributed single-use guarantee.
const REPLAY_TTL_MS = 10 * 60 * 1000
const REPLAY_MAX_ENTRIES = 2000
const seenTokens = new Map()

function pruneReplayStore(now) {
  // Insertion order matches expiry order (one fixed TTL), so expired entries
  // always form a prefix.
  for (const [digest, expiresAt] of seenTokens) {
    if (expiresAt > now) break
    seenTokens.delete(digest)
  }
  while (seenTokens.size > REPLAY_MAX_ENTRIES) {
    seenTokens.delete(seenTokens.keys().next().value)
  }
}

export async function verifyBotChallenge(token, ip, expectedAction = '', options = {}) {
  const secret = process.env.K2_TURNSTILE_SECRET_KEY || ''
  if (!secret) return process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED === 'true'
  const candidate = String(token || '')
  if (!candidate || candidate.length > 2048) return false
  const digest = createHash('sha256').update(candidate).digest('hex')
  const now = Date.now()
  pruneReplayStore(now)
  if (seenTokens.has(digest)) return false
  try {
    const body = new URLSearchParams({ secret, response: candidate, remoteip: ip })
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body, signal: AbortSignal.timeout(5000),
    })
    const result = await response.json()
    const ok = response.ok && result?.success === true
      && (!expectedAction || result?.action === expectedAction)
      && (!options.hostname || result?.hostname === options.hostname)
    if (ok) seenTokens.set(digest, now + REPLAY_TTL_MS)
    return ok
  } catch {
    return false
  }
}
