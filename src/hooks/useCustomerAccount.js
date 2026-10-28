import { useCallback, useEffect, useRef, useState } from 'react'
import {
  claimGuestCustomer, customerAccountEnabled, customerAuthClient,
  loadCustomerHistory, loadCustomerSettings, markCustomerNotificationRead,
  replyAsCustomerAccount, saveCustomerSettings, saveCustomerAddressBook,
} from '../services/customerAccountService'

const initialState = { ready: false, session: null, history: null, historyState: 'idle', error: '', code: '' }
const signOutNoticeKey = 'k2-account-signout-unconfirmed-v1'
const signOutGateKey = 'k2-account-signout-local-pending-v1'
function signOutNoticeStored() {
  try { return sessionStorage.getItem(signOutNoticeKey) === '1' } catch { return false }
}
function storeSignOutNotice(present) {
  try { if (present) sessionStorage.setItem(signOutNoticeKey, '1'); else sessionStorage.removeItem(signOutNoticeKey) } catch { /* In-memory notice still works in this tab. */ }
}
function signOutGateStored() {
  try { return localStorage.getItem(signOutGateKey) === '1' } catch { return false }
}
function storeSignOutGate(present) {
  try {
    if (present) localStorage.setItem(signOutGateKey, '1'); else localStorage.removeItem(signOutGateKey)
    return localStorage.getItem(signOutGateKey) === (present ? '1' : null)
  } catch { return false }
}

export function useCustomerAccount() {
  const enabled = customerAccountEnabled()
  const [state, setState] = useState(() => ({ ...initialState, ready: !enabled }))
  const [settingsState, setSettingsState] = useState({ status: 'idle', settings: null, notifications: [], error: '' })
  const [signOutNotice, setSignOutNotice] = useState(() => signOutNoticeStored() ? 'unconfirmed' : null)
  const [signOutBlocked, setSignOutBlocked] = useState(signOutGateStored)
  const signOutBlockedRef = useRef(signOutBlocked)
  const signOutNoticeRef = useRef(signOutNotice)
  const signOutAttempt = useRef(0)
  const activeRef = useRef(true)
  const clientRef = useRef(null)
  const sessionRef = useRef(null)
  const historyReadGeneration = useRef(0)
  const settingsReadGeneration = useRef(0)
  const identityEpoch = useRef(0)
  const locallyReadNotifications = useRef(new Map())
  sessionRef.current = state.session

  const updateSignOutGate = useCallback(present => {
    if (!storeSignOutGate(present)) return false
    signOutBlockedRef.current = present
    setSignOutBlocked(present)
    return true
  }, [])

  useEffect(() => {
    const changed = event => {
      if (event.key !== signOutGateKey) return
      const blocked = event.newValue === '1'
      signOutBlockedRef.current = blocked
      setSignOutBlocked(blocked)
      if (blocked) {
        sessionRef.current = null
        identityEpoch.current++; historyReadGeneration.current++; settingsReadGeneration.current++
        locallyReadNotifications.current.clear()
        setState({ ...initialState, ready: true })
        setSettingsState({ status: 'idle', settings: null, notifications: [], error: '' })
      }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])

  const refreshHistory = useCallback(async (sessionOverride = null) => {
    const session = sessionOverride || sessionRef.current
    if (!session?.access_token) return { ok: false, code: 'ACCOUNT_AUTH_REQUIRED' }
    if (sessionRef.current?.user?.id !== session.user?.id) return { ok: false, code: 'ACCOUNT_AUTH_REQUIRED' }
    const generation = ++historyReadGeneration.current
    setState(current => ({ ...current, historyState: 'loading', error: '', code: '' }))
    const result = await loadCustomerHistory(session.access_token)
    if (!activeRef.current || sessionRef.current?.user?.id !== session.user?.id || generation !== historyReadGeneration.current) return result
    setState(current => current.session?.user?.id !== session.user?.id || generation !== historyReadGeneration.current ? current : result.ok
      ? { ...current, history: result.data, historyState: 'ready', error: '', code: '' }
      : { ...current, history: ['SERVICE_UNAVAILABLE', 'REQUEST_TIMEOUT', 'RATE_LIMITED'].includes(result.code) ? current.history : null,
        historyState: result.code === 'ACCOUNT_NOT_LINKED' ? 'unlinked' : 'error', error: result.error, code: result.code })
    return result
  }, [])

  const refreshSettings = useCallback(async (sessionOverride = null) => {
    const session = sessionOverride || sessionRef.current
    if (!session?.access_token) return { ok: false, code: 'ACCOUNT_AUTH_REQUIRED' }
    if (sessionRef.current?.user?.id !== session.user?.id) return { ok: false, code: 'ACCOUNT_AUTH_REQUIRED' }
    const generation = ++settingsReadGeneration.current
    setSettingsState(current => ({ ...current, status: 'loading', error: '' }))
    const result = await loadCustomerSettings(session.access_token)
    if (!activeRef.current || sessionRef.current?.user?.id !== session.user?.id || generation !== settingsReadGeneration.current) return { ...result, superseded: true }
    setSettingsState(current => generation !== settingsReadGeneration.current || sessionRef.current?.user?.id !== session.user?.id ? current : result.ok
      ? { status: 'ready', settings: result.data, notifications: result.notifications.map(item =>
        item.read_at || !locallyReadNotifications.current.has(item.id) ? item : { ...item, read_at: locallyReadNotifications.current.get(item.id) }), error: '' }
      : { ...current, status: 'error', error: result.error || 'Settings are unavailable.' })
    return result
  }, [])

  useEffect(() => {
    let cancelled = false
    let subscription = null
    activeRef.current = true
    if (!enabled) {
      clientRef.current = null
      setState({ ...initialState, ready: true })
      setSettingsState({ status: 'idle', settings: null, notifications: [], error: '' })
      return () => { activeRef.current = false }
    }

    const initialize = async () => {
      try {
        const client = await customerAuthClient()
        if (cancelled) return
        clientRef.current = client
        if (!client) {
          setState({ ...initialState, ready: true })
          return
        }

        const { data, error } = await client.auth.getSession()
        if (cancelled) return
        const storedSession = error ? null : data?.session || null
        if (signOutBlockedRef.current && !error && !storedSession) updateSignOutGate(false)
        const session = signOutBlockedRef.current ? null : storedSession
        sessionRef.current = session
        setState(current => ({ ...current, ready: true, session, error: error ? 'Your account session could not be checked. Refresh and try again.' : '' }))
        if (session) { refreshHistory(session); refreshSettings(session) }

        const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
          if (cancelled || !activeRef.current) return
          if (signOutBlockedRef.current && nextSession) return
          if (signOutBlockedRef.current && !nextSession) updateSignOutGate(false)
          if (nextSession && signOutNoticeRef.current === 'local-only') {
            signOutNoticeRef.current = null
            setSignOutNotice(null)
          }
          const identityChanged = sessionRef.current?.user?.id !== nextSession?.user?.id
          sessionRef.current = nextSession
          setState(current => ({ ...current, ready: true, session: nextSession,
            history: nextSession?.user?.id === current.session?.user?.id ? current.history : null,
            historyState: nextSession?.user?.id === current.session?.user?.id ? current.historyState : 'idle', error: '', code: '' }))
          if (identityChanged) { identityEpoch.current++; historyReadGeneration.current++; settingsReadGeneration.current++; locallyReadNotifications.current.clear(); setSettingsState({ status: 'idle', settings: null, notifications: [], error: '' }) }
          if (nextSession) window.setTimeout(() => { refreshHistory(nextSession); refreshSettings(nextSession) }, 0)
          else setSettingsState({ status: 'idle', settings: null, notifications: [], error: '' })
        })
        subscription = listener.subscription
      } catch {
        if (cancelled) return
        setState({ ...initialState, ready: true, error: 'Your account session could not be checked. Refresh and try again.' })
      }
    }

    void initialize()
    return () => {
      cancelled = true
      activeRef.current = false
      identityEpoch.current++
      historyReadGeneration.current++
      settingsReadGeneration.current++
      locallyReadNotifications.current.clear()
      clientRef.current = null
      subscription?.unsubscribe()
    }
  }, [enabled, refreshHistory, refreshSettings, updateSignOutGate])

  const updateSettings = useCallback(async mutate => {
    const actorId = state.session?.user?.id
    const token = state.session?.access_token
    const epoch = identityEpoch.current
    const generationAtStart = settingsReadGeneration.current
    if (!token) return { ok: false, error: 'Sign in before saving settings.' }
    const result = await mutate(token)
    if (result.ok && activeRef.current && identityEpoch.current === epoch && sessionRef.current?.user?.id === actorId) {
      if (generationAtStart !== settingsReadGeneration.current) {
        const refreshed = await refreshSettings()
        if (refreshed.superseded) return result
        if (!refreshed.ok && activeRef.current && identityEpoch.current === epoch && sessionRef.current?.user?.id === actorId) {
          setSettingsState(current => ({ ...current, error: 'Settings were saved, but the latest values could not be checked. Try again.' }))
          return { ok: false, error: 'Settings were saved, but the latest values could not be checked. Try again.' }
        }
        return result
      }
      const generation = ++settingsReadGeneration.current
      setSettingsState(current => generation !== settingsReadGeneration.current || identityEpoch.current !== epoch || sessionRef.current?.user?.id !== actorId
        ? current : { ...current, settings: { ...current.settings, ...result.data }, status: 'ready', error: '' })
    }
    return result
  }, [state.session, refreshSettings])

  const saveSettings = useCallback((displayName, deliveryAddress, notifyInApp) =>
    updateSettings(token => saveCustomerSettings(token, displayName, deliveryAddress, notifyInApp)), [updateSettings])
  const saveAddressBook = useCallback(command => updateSettings(token => saveCustomerAddressBook(token, command)), [updateSettings])

  const markNotificationRead = useCallback(async (notificationId) => {
    const actorId = state.session?.user?.id
    const token = state.session?.access_token
    const epoch = identityEpoch.current
    if (!token) return { ok: false, error: 'Sign in before reading notifications.' }
    const result = await markCustomerNotificationRead(token, notificationId)
    if (result.ok && result.data?.read && activeRef.current && identityEpoch.current === epoch && sessionRef.current?.user?.id === actorId) {
      const readAt = new Date().toISOString()
      locallyReadNotifications.current.set(notificationId, readAt)
      setSettingsState(current => ({ ...current, notifications: current.notifications.map(item =>
        item.id === notificationId ? { ...item, read_at: readAt } : item) }))
    }
    return result
  }, [state.session])

  const claim = useCallback(async (contactKind, idempotencyKey) => {
    if (!state.session?.access_token) return { ok: false, error: 'Sign in before linking records.' }
    const result = await claimGuestCustomer(state.session.access_token, contactKind, idempotencyKey)
    if (result.ok) await refreshHistory(state.session)
    return result
  }, [refreshHistory, state.session])

  const reply = useCallback(async (conversationReference, message, idempotencyKey) => {
    if (!state.session?.access_token) return { ok: false, error: 'Sign in before replying.' }
    const result = await replyAsCustomerAccount(state.session.access_token, conversationReference, message, idempotencyKey)
    if (result.ok) await refreshHistory(state.session)
    return result
  }, [refreshHistory, state.session])

  const signOut = useCallback(async () => {
    if (signOutNoticeRef.current === 'pending') return
    if (!updateSignOutGate(true)) {
      signOutNoticeRef.current = 'storage-error'
      setSignOutNotice('storage-error')
      return
    }
    const hadNotice = signOutNoticeRef.current === 'unconfirmed'
    const expectedToken = sessionRef.current?.access_token || null
    const attempt = ++signOutAttempt.current
    signOutNoticeRef.current = 'pending'
    setSignOutNotice('pending')
    storeSignOutNotice(true)
    const timeout = window.setTimeout(() => {
      if (activeRef.current && attempt === signOutAttempt.current && signOutNoticeRef.current === 'pending') {
        signOutNoticeRef.current = 'unconfirmed'
        setSignOutNotice('unconfirmed')
      }
    }, 15000)
    sessionRef.current = null
    identityEpoch.current++
    historyReadGeneration.current++
    settingsReadGeneration.current++
    locallyReadNotifications.current.clear()
    setState({ ...initialState, ready: true })
    setSettingsState({ status: 'idle', settings: null, notifications: [], error: '' })
    let confirmed = false
    try {
      if (clientRef.current) {
        const before = await clientRef.current.auth.getSession()
        const storedToken = before.data?.session?.access_token || null
        if (!before.error && !storedToken) updateSignOutGate(false)
        else if (!before.error && storedToken && (!expectedToken || storedToken === expectedToken)) {
          const result = await clientRef.current.auth.signOut()
          const check = await clientRef.current.auth.getSession()
          const localCleared = !check.error && !check.data?.session
          if (localCleared) updateSignOutGate(false)
          confirmed = result?.error === null && localCleared
        }
      }
    } catch { /* The local view stays closed; provider revocation is unconfirmed. */ }
    window.clearTimeout(timeout)
    if (!activeRef.current || attempt !== signOutAttempt.current) return
    if (!confirmed || hadNotice) {
      signOutNoticeRef.current = 'unconfirmed'
      setSignOutNotice('unconfirmed')
      storeSignOutNotice(true)
    } else {
      // The SDK treats some provider refusals as success. Only describe the
      // observed local session removal, never verified remote revocation.
      signOutNoticeRef.current = 'local-only'
      setSignOutNotice('local-only')
      storeSignOutNotice(false)
    }
  }, [updateSignOutGate])

  const dismissSignOutNotice = useCallback(() => {
    if (signOutNoticeRef.current === 'pending' || signOutBlockedRef.current) return
    signOutNoticeRef.current = null
    setSignOutNotice(null)
    storeSignOutNotice(false)
  }, [])

  return { enabled, ...state, settingsState, signOutNotice, signOutBlocked, dismissSignOutNotice, refreshHistory, refreshSettings, saveSettings, saveAddressBook, markNotificationRead, claim, reply, signOut }
}
