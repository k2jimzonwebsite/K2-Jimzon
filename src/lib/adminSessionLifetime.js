const STORAGE_KEY = 'k2-admin-session-start'
export const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000

export function clearAdminBrowserSession(storage) {
  storage.removeItem(STORAGE_KEY)
}

export function resetAdminBrowserSession(storage, userId, now = Date.now()) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ userId, startedAt: now }))
  return { expired: false, expiresAt: now + ADMIN_SESSION_MS }
}

export function getOrStartAdminBrowserSession(storage, userId, now = Date.now()) {
  let saved
  try { saved = JSON.parse(storage.getItem(STORAGE_KEY)) } catch { /* old or invalid browser state */ }
  if (saved?.userId !== userId || !Number.isSafeInteger(saved?.startedAt)) {
    return resetAdminBrowserSession(storage, userId, now)
  }
  if (saved.startedAt > now || now >= saved.startedAt + ADMIN_SESSION_MS) {
    return { expired: true }
  }
  return { expired: false, expiresAt: saved.startedAt + ADMIN_SESSION_MS }
}
