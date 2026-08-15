import { useEffect, useRef, useState } from 'react'
import { supabase, supabasePublicKey } from '../lib/supabaseClient'
import {
  ADMIN_ROUTE, buildAdminOAuthRedirectUrl, clearAdminOAuthReturn,
  clearAdminOAuthCredentialsFromUrl, consumeAdminOAuthReturn, rememberAdminOAuthReturn,
} from '../lib/adminAuthRedirect'
import {
  adminBffEnabled, challengeAdminMfaBff, getAdminSessionBff,
  loginAdminBff, logoutAdminBff,
} from '../services/adminBffService'

const STAFF_ROLES = ['Admin', 'Staff']
const isStaffRole = (role) => STAFF_ROLES.includes(role)

export function useAdminAuthRuntime() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [authError, setAuthError] = useState('')
  const inviteOperationRef = useRef({ fingerprint: '', key: '' })

  const resolveRole = async (authUser) => {
    if (!supabase || !authUser) return null
    const { data, error } = await supabase.from('user_profiles').select('role').eq('id', authUser.id).maybeSingle()
    if (error) throw error
    return data?.role || null
  }

  const applyAdminSession = (authUser, role) => {
    const normalizedUser = authUser?.userId && !authUser.id
      ? { ...authUser, id: authUser.userId }
      : authUser
    setMfaRequired(false)
    setAuthError('')
    setIsAdmin(true)
    setUser({ ...normalizedUser, role })
  }

  const checkUser = async (authUser = null) => {
    if (adminBffEnabled()) {
      try {
        const result = await getAdminSessionBff()
        if (result.ok && isStaffRole(result.user?.role)) applyAdminSession(result.user, result.user.role)
        else { setIsAdmin(false); setUser(null); setMfaRequired(Boolean(result.mfaRequired)) }
      } catch {
        setIsAdmin(false)
        setUser(null)
        setMfaRequired(false)
      } finally {
        setAuthReady(true)
      }
      return
    }
    if (!supabase) {
      setIsAdmin(false)
      setUser(null)
      setMfaRequired(false)
      setAuthReady(true)
      return
    }
    try {
      const currentUser = authUser || (await supabase.auth.getUser()).data?.user
      if (!currentUser) {
        setIsAdmin(false)
        setUser(null)
        setMfaRequired(false)
        return
      }
      let mfaSatisfied = true
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) mfaSatisfied = false
      } catch { /* transitional legacy session */ }
      const role = await resolveRole(currentUser)
      setUser({ ...currentUser, role })
      if (isStaffRole(role)) {
        const returnTo = consumeAdminOAuthReturn()
        if (returnTo === ADMIN_ROUTE && window.location.pathname !== ADMIN_ROUTE) window.location.replace(returnTo)
      }
      if (isStaffRole(role) && mfaSatisfied) {
        setMfaRequired(false)
        setAuthError('')
        setIsAdmin(true)
      } else if (isStaffRole(role)) {
        setMfaRequired(true)
        setAuthError('')
        setIsAdmin(false)
      } else {
        setMfaRequired(false)
        setAuthError('This Google account has no Admin or Staff access.')
        setIsAdmin(false)
        clearAdminOAuthReturn()
      }
    } catch {
      setIsAdmin(false)
      setUser(null)
      setMfaRequired(false)
      setAuthError('Staff access could not be verified. Please try again.')
    } finally {
      setAuthReady(true)
    }
  }

  useEffect(() => {
    checkUser()
    if (!supabase || adminBffEnabled()) return undefined
    const pendingChecks = new Set()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase awaits auth callbacks while holding its internal auth lock.
      // Defer follow-up Auth/MFA calls so the Google callback can finish,
      // persist its session, and remove credentials from the URL first.
      clearAdminOAuthCredentialsFromUrl()
      const checkId = window.setTimeout(() => {
        pendingChecks.delete(checkId)
        checkUser(session?.user)
      }, 0)
      pendingChecks.add(checkId)
    })
    return () => {
      pendingChecks.forEach((checkId) => window.clearTimeout(checkId))
      subscription?.unsubscribe()
    }
  }, [])

  const loginWithGoogle = async () => {
    if (adminBffEnabled()) return { ok: false, error: 'Google sign-in is unavailable during the secure admin migration. Use your invited staff email and authenticator.' }
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    setAuthError('')
    setMfaRequired(false)
    rememberAdminOAuthReturn()
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: buildAdminOAuthRedirectUrl() },
      })
      if (error) throw error
      return { ok: true }
    } catch {
      clearAdminOAuthReturn()
      return { ok: false, error: 'Google sign-in could not be started.' }
    }
  }

  const loginAdmin = async ({ email, password }) => {
    if (!email || !password) return { ok: false, error: 'Enter your email and password.' }
    if (adminBffEnabled()) {
      const result = await loginAdminBff({ email: email.trim(), password })
      if (result.ok) applyAdminSession(result.user, result.user?.role)
      return result
    }
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    setAuthError('')
    setMfaRequired(false)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data?.user) return { ok: false, error: 'Invalid email or password.' }
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        setMfaRequired(true)
        return { ok: false, mfaRequired: true }
      }
    } catch { /* transitional legacy session */ }
    const role = await resolveRole(data.user)
    if (!isStaffRole(role)) {
      await supabase.auth.signOut()
      return { ok: false, error: 'This account has no admin access.' }
    }
    applyAdminSession(data.user, role)
    return { ok: true }
  }

  const challengeMfa = async (code) => {
    if (adminBffEnabled()) {
      const result = await challengeAdminMfaBff(code)
      if (result.ok) applyAdminSession(result.user, result.user?.role)
      return result
    }
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    setAuthError('')
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const factor = factors?.totp?.find((item) => item.status === 'verified') || factors?.totp?.[0]
    if (!factor) return { ok: false, error: 'No authenticator is enrolled on this account.' }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError) return { ok: false, error: 'Authenticator verification could not be started.' }
    const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code })
    if (error) return { ok: false, error: 'That authenticator code could not be verified.' }
    const { data } = await supabase.auth.getUser()
    const role = await resolveRole(data?.user)
    if (!isStaffRole(role)) {
      await supabase.auth.signOut()
      return { ok: false, error: 'This account has no admin access.' }
    }
    applyAdminSession(data.user, role)
    return { ok: true }
  }

  const enrollMfa = async () => {
    if (adminBffEnabled()) return { ok: false, error: 'Authenticator enrollment is not yet available through the secure admin boundary.' }
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) return { ok: false, error: 'Authenticator enrollment could not be started.' }
    return { ok: true, factorId: data.id, qr: data.totp?.qr_code, secret: data.totp?.secret }
  }

  const verifyMfaEnroll = async (factorId, code) => {
    if (adminBffEnabled()) return { ok: false, error: 'Authenticator enrollment is not yet available through the secure admin boundary.' }
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) return { ok: false, error: 'Authenticator verification could not be started.' }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    return error ? { ok: false, error: 'That authenticator code could not be verified.' } : { ok: true }
  }

  const inviteStaff = async (email, role = 'Staff') => {
    if (adminBffEnabled()) return { ok: false, error: 'Staff invitations are not yet available through the secure admin boundary.' }
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { ok: false, error: 'You must be signed in.' }
    const cleanEmail = email.trim().toLowerCase()
    const fingerprint = `${cleanEmail}\n${role}`
    if (inviteOperationRef.current.fingerprint !== fingerprint || !inviteOperationRef.current.key) {
      inviteOperationRef.current = { fingerprint, key: crypto.randomUUID() }
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabasePublicKey,
          'X-Idempotency-Key': inviteOperationRef.current.key,
        },
        body: JSON.stringify({ email: cleanEmail, role, redirectTo: window.location.origin }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.ok && payload.ok && payload.roleAssigned) {
        inviteOperationRef.current = { fingerprint: '', key: '' }
        return {
          ok: true,
          note: payload.invited
            ? `Invite sent to ${cleanEmail}; the ${role} role was assigned.`
            : `The existing account for ${cleanEmail} now has the ${role} role.`,
        }
      }
      const errors = {
        AAL2_REQUIRED: 'Verify your authenticator before inviting staff.',
        RATE_LIMITED: 'Too many invitations were attempted. Wait ten minutes and try again.',
        OPERATION_IN_PROGRESS: 'This invitation is already being processed. Try again shortly.',
        IDEMPOTENCY_CONFLICT: 'The invitation details changed. Close and retry the action.',
        FORBIDDEN_ROLE: 'Only an Admin can invite staff.',
        INVALID_EMAIL: 'Enter a valid email address.',
      }
      return { ok: false, error: errors[payload.error] || 'The staff invitation could not be completed.' }
    } catch {
      return { ok: false, error: 'The staff invitation could not be sent.' }
    }
  }

  const logoutAdmin = async () => {
    setIsAdmin(false)
    setUser(null)
    setMfaRequired(false)
    setAuthError('')
    if (adminBffEnabled()) await logoutAdminBff()
    else if (supabase) await supabase.auth.signOut()
  }

  return {
    user, isAdmin, authReady, mfaRequired, authError,
    loginAdmin, loginWithGoogle, logoutAdmin,
    challengeMfa, enrollMfa, verifyMfaEnroll, inviteStaff,
    adminOAuthAvailable: !adminBffEnabled(),
  }
}
