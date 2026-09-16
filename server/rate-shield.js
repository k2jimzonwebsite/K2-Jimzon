// Bounded in-memory token buckets (MAP-020 F-020-004).
//
// Cost shield in front of the authoritative durable budgets: sheds obvious
// floods before they reach RPC cost, provider delivery, or the database.
// Per route+IP keys with a fixed window; oversized key tables reset instead of
// growing without bound. This is a shield, not a distributed guarantee — the
// durable per-IP/contact budgets stay authoritative and the guards stay on
// even when this process restarts empty.
export function createRateShield({ windowMs, limit, now = () => Date.now(), maxKeys = 5000 }) {
  const buckets = new Map()
  return {
    consume(key) {
      const at = now()
      const current = buckets.get(key)
      if (!current || current.resetAt <= at) {
        if (buckets.size >= maxKeys) buckets.clear()
        buckets.set(key, { count: 1, resetAt: at + windowMs })
        return { allowed: true, retryAfter: 0 }
      }
      current.count += 1
      if (current.count > limit) {
        return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - at) / 1000)) }
      }
      return { allowed: true, retryAfter: 0 }
    },
  }
}

// Production buckets. Generous on purpose: ordinary staff and customer traffic
// never notices them (the durable budgets below stay stricter); only floods do.
export const STOREFRONT_RATE_SHIELD = createRateShield({ windowMs: 60_000, limit: 300 })
export const ADMIN_AUTH_RATE_SHIELD = createRateShield({ windowMs: 60_000, limit: 120 })

export function shieldKey(route, ip) {
  return `${String(route || '')}\n${String(ip || '')}`.slice(0, 256)
}
