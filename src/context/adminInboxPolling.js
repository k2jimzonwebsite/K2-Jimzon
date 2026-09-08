// Ownership rules for the Admin Inbox background poll and its read receipts.
// Kept pure so the exact staleness, generation, and unread decisions are
// verifiable without a running browser session (MAP-019 / MAP-028 H-002, H-008).

export const STALE_QUEUE_NOTICE = 'Live updates paused. This queue is the last loaded copy — refresh before acting on it.'

// A background poll never competes with an in-flight read, a hidden tab, or a
// disposed session. Only the initial load bypasses this gate.
export function shouldStartPoll({ enabled, hidden, inFlight }) {
  return Boolean(enabled) && !hidden && !inFlight
}

// Responses are applied only while they still describe the current session and
// filter generation; anything older or unrecognized is discarded.
export function isCurrentGeneration(generation, current) {
  return Number.isInteger(generation) && generation === current
}

// A transient background failure must never empty a queue staff is working in.
// An initial failure has nothing to preserve and reports the real error.
export function resolveRefreshFailure({ background, hasExistingQueue, error }) {
  return background && hasExistingQueue
    ? { keepQueue: true, stale: true, error: STALE_QUEUE_NOTICE }
    : { keepQueue: false, stale: false, error }
}

// A read receipt clears unread state only for what was actually read. A message
// that arrived after the receipt was issued stays unread until the canonical
// refresh confirms it.
export function applyReadReceipt(conversation, readAt) {
  if (!conversation) return conversation
  const inbound = Date.parse(conversation.lastInboundAt || '')
  const receipt = Date.parse(readAt || '')
  if (Number.isFinite(inbound) && Number.isFinite(receipt) && inbound > receipt) return conversation
  return { ...conversation, unread: false, unreadCount: 0, lastReadAt: readAt }
}
