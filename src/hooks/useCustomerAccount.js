import { useCallback, useEffect, useRef, useState } from 'react'
import {
  claimGuestCustomer, customerAccountEnabled, customerAuthClient,
  loadCustomerHistory, loadCustomerSettings, markCustomerNotificationRead,
  replyAsCustomerAccount, saveCustomerSettings,
} from '../services/customerAccountService'

const initialState = { ready: false, session: null, history: null, historyState: 'idle', error: '', code: '' }

export function useCustomerAccount() {
  const enabled = customerAccountEnabled()
  const [state, setState] = useState(() => ({ ...initialState, ready: !enabled }))
  const [settingsState, setSettingsState] = useState({ status: 'idle', settings: null, notifications: [], error: '' })
  const activeRef = useRef(true)
  const clientRef = useRef(null)
  const sessionRef = useRef(null)
  sessionRef.current = state.session

  const refreshHistory = useCallback(async (sessionOverride = null) => {
    const session = sessionOverride || sessionRef.current
    if (!session?.access_token) return { ok: false, code: 'ACCOUNT_AUTH_REQUIRED' }
    setState(current => ({ ...current, historyState: 'loading', error: '', code: '' }))
    const result = await loadCustomerHistory(session.access_token)
    if (!activeRef.current) return result
    setState(current => result.ok
      ? { ...current, history: result.data, historyState: 'ready', error: '', code: '' }
      : { ...current, history: null, historyState: result.code === 'ACCOUNT_NOT_LINKED' ? 'unlinked' : 'error', error: result.error, code: result.code })
    return result
  }, [])

  const refreshSettings = useCallback(async (sessionOverride = null) => {
    const session = sessionOverride || sessionRef.current
    if (!session?.access_token) return { ok: false, code: 'ACCOUNT_AUTH_REQUIRED' }
    setSettingsState(current => ({ ...current, status: 'loading', error: '' }))
    const result = await loadCustomerSettings(session.access_token)
    if (!activeRef.current || sessionRef.current?.user?.id !== session.user?.id) return result
    setSettingsState(current => result.ok
      ? { status: 'ready', settings: result.data, notifications: result.notifications, error: '' }
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
        const session = error ? null : data?.session || null
        setState(current => ({ ...current, ready: true, session, error: error ? 'Your account session could not be checked. Refresh and try again.' : '' }))
        if (session) { refreshHistory(session); refreshSettings(session) }

        const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
          if (cancelled || !activeRef.current) return
          setState(current => ({ ...current, ready: true, session: nextSession, history: nextSession ? current.history : null, historyState: nextSession ? current.historyState : 'idle', error: '', code: '' }))
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
      clientRef.current = null
      subscription?.unsubscribe()
    }
  }, [enabled, refreshHistory, refreshSettings])

  const saveSettings = useCallback(async (displayName, deliveryAddress, notifyInApp) => {
    const token = state.session?.access_token
    if (!token) return { ok: false, error: 'Sign in before saving settings.' }
    const result = await saveCustomerSettings(token, displayName, deliveryAddress, notifyInApp)
    if (result.ok && activeRef.current) setSettingsState(current => ({ ...current, settings: result.data, status: 'ready', error: '' }))
    return result
  }, [state.session])

  const markNotificationRead = useCallback(async (notificationId) => {
    const token = state.session?.access_token
    if (!token) return { ok: false, error: 'Sign in before reading notifications.' }
    const result = await markCustomerNotificationRead(token, notificationId)
    if (result.ok && result.data?.read && activeRef.current) {
      setSettingsState(current => ({ ...current, notifications: current.notifications.map(item =>
        item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item) }))
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
    if (clientRef.current) await clientRef.current.auth.signOut()
    setState({ ...initialState, ready: true })
    setSettingsState({ status: 'idle', settings: null, notifications: [], error: '' })
  }, [])

  return { enabled, ...state, settingsState, refreshHistory, refreshSettings, saveSettings, markNotificationRead, claim, reply, signOut }
}
