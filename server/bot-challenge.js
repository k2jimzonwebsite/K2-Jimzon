export async function verifyBotChallenge(token, ip, expectedAction = '') {
  const secret = process.env.K2_TURNSTILE_SECRET_KEY || ''
  if (!secret) return process.env.NODE_ENV !== 'production'
  if (!token || String(token).length > 2048) return false
  try {
    const body = new URLSearchParams({ secret, response: String(token), remoteip: ip })
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body, signal: AbortSignal.timeout(5000),
    })
    const result = await response.json()
    return response.ok && result?.success === true
      && (!expectedAction || result?.action === expectedAction)
  } catch {
    return false
  }
}
