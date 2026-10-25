// One lifecycle for staff and shopper forms. Only the provider's current
// success callback can supply a token; timeouts and retries always fail closed.
export function mountTurnstileWidget(api, container, { siteKey, action, size = 'flexible', onToken, onState }) {
  let disposed = false
  let failed = false
  let verified = false
  let widgetId
  let deadline
  const fail = error => {
    if (disposed || failed) return
    failed = true
    clearTimeout(deadline)
    onToken('')
    onState({ status: 'error', error })
  }
  const armDeadline = (milliseconds, message) => {
    clearTimeout(deadline)
    deadline = setTimeout(() => fail(message), milliseconds)
  }
  onState({ status: 'loading', error: '' })
  armDeadline(30000, 'The security check is taking longer than expected. Please retry. If it keeps failing, check your connection or contact K2 Jimzon.')
  try {
    widgetId = api.render(container, {
      sitekey: siteKey, action, appearance: 'always', size,
      retry: 'never', 'refresh-expired': 'manual', 'refresh-timeout': 'manual',
      callback: token => {
        if (disposed || failed) return
        if (typeof token !== 'string' || !token.trim()) return fail('Security check could not complete. Please retry.')
        verified = true
        clearTimeout(deadline)
        onState({ status: 'verified', error: '' })
        onToken(token)
      },
      'before-interactive-callback': () => {
        if (disposed || failed || verified) return
        onState({ status: 'interactive', error: '' })
        armDeadline(120000, 'Security check timed out. Please retry.')
      },
      'after-interactive-callback': () => {
        if (disposed || failed || verified) return
        onState({ status: 'loading', error: '' })
        armDeadline(30000, 'The security check is taking longer than expected. Please retry.')
      },
      'expired-callback': () => fail('Security check expired. Please complete it again.'),
      'timeout-callback': () => fail('Security check timed out. Please retry.'),
      'error-callback': code => {
        const reference = /^\d{6}$/.test(String(code)) ? ` (code ${code})` : ''
        fail(`Security check could not load${reference}. Please retry. If it keeps failing, contact K2 Jimzon.`)
        return true
      },
    })
  } catch {
    fail('Security check could not load. Check your connection and retry.')
  }
  return () => {
    disposed = true
    clearTimeout(deadline)
    if (widgetId != null) api.remove(widgetId)
  }
}
