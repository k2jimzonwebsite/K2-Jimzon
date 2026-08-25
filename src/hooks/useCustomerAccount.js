import { useCallback, useEffect, useRef, useState } from 'react'
import {
  claimGuestCustomer, customerAccountEnabled, customerAuthClient,
  loadCustomerHistory, replyAsCustomerAccount,
} from '../services/customerAccountService'

const initialState = { ready: false, session: null, history: null, historyState: 'idle', error: '', code: '' }

export function useCustomerAccount() {
  const enabled = customerAccountEnabled()
  const client = customerAuthClient()
  const [state, setState] = useState(() => ({ ...initialState, ready: !enabled }))
  const activeRef = useRef(true)
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

  useEffect(() => {
    activeRef.current = true
    if (!enabled || !client) {
      setState({ ...initialState, ready: true })
      return () => { activeRef.current = false }
    }
    client.auth.getSession().then(({ data, error }) => {
      if (!activeRef.current) return
      const session = error ? null : data?.session || null
      setState(current => ({ ...current, ready: true, session, error: error ? 'Your account session could not be checked. Refresh and try again.' : '' }))
      if (session) refreshHistory(session)
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!activeRef.current) return
      setState(current => ({ ...current, ready: true, session, history: session ? current.history : null, historyState: session ? current.historyState : 'idle', error: '', code: '' }))
      if (session) window.setTimeout(() => refreshHistory(session), 0)
    })
    return () => {
      activeRef.current = false
      listener.subscription.unsubscribe()
    }
  }, [client, enabled, refreshHistory])

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
    if (client) await client.auth.signOut()
    setState({ ...initialState, ready: true })
  }, [client])

  return { enabled, ...state, refreshHistory, claim, reply, signOut }
}
