import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  ADMIN_ROUTE, buildAdminOAuthRedirectUrl, clearAdminOAuthReturn,
  consumeAdminOAuthReturn, rememberAdminOAuthReturn,
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

  const resolveRole = async (authUser) => {
    if (!supabase || !authUser) return null
    const { data } = await supabase.from('user_profiles').select('role').eq('id', authUser.id).single()
    return data?.role || null
  }

  const applyAdminSession = (authUser, role) => {
    const normalizedUser = authUser?.userId && !authUser.id
      ? { ...authUser, id: authUser.userId }
      : authUser
    setIsAdmin(true)
    setUser({ ...normalizedUser, role })
  }

  const checkUser = async (authUser = null) => {
    if (adminBffEnabled()) {
      try {
        const result = await getAdminSessionBff()
        if (result.ok && isStaffRole(result.user?.role)) applyAdminSession(result.user, result.user.role)
        else { setIsAdmin(false); setUser(null) }
      } catch {
        setIsAdmin(false)
        setUser(null)
      } finally {
        setAuthReady(true)
      }
      return
    }
    if (!supabase) {
      setIsAdmin(false)
      setUser(null)
      setAuthReady(true)
      return
    }
    try {
      const currentUser = authUser || (await supabase.auth.getUser()).data?.user
      if (!currentUser) { setIsAdmin(false); setUser(null); return }
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
      if (isStaffRole(role) && mfaSatisfied) setIsAdmin(true)
      else {
        setIsAdmin(false)
        if (!isStaffRole(role)) clearAdminOAuthReturn()
      }
    } catch {
      setIsAdmin(false)
      setUser(null)
    } finally {
      setAuthReady(true)
    }
  }

  useEffect(() => {
    checkUser()
    if (!supabase || adminBffEnabled()) return undefined
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => checkUser(session?.user))
    return () => subscription?.unsubscribe()
  }, [])

  const loginWithGoogle = async () => {
    if (adminBffEnabled()) return { ok: false, error: 'Google sign-in is unavailable during the secure admin migration. Use your invited staff email and authenticator.' }
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data?.user) return { ok: false, error: 'Invalid email or password.' }
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) return { ok: false, mfaRequired: true }
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
    const { data: existing } = await supabase.from('user_profiles').select('id,email,role').ilike('email', cleanEmail).maybeSingle()
    if (existing) {
      const { error } = await supabase.rpc('set_user_role', { p_user_id: existing.id, p_role: role })
      return error ? { ok: false, error: 'The staff role could not be updated.' } : { ok: true, note: `Updated role for ${cleanEmail} to ${role}.` }
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: cleanEmail, role, redirectTo: window.location.origin }),
      })
      return response.ok ? { ok: true } : { ok: false, error: 'The staff invitation could not be sent.' }
    } catch {
      return { ok: false, error: 'The staff invitation could not be sent.' }
    }
  }

  const logoutAdmin = async () => {
    setIsAdmin(false)
    setUser(null)
    if (adminBffEnabled()) await logoutAdminBff()
    else if (supabase) await supabase.auth.signOut()
  }

  return {
    user, isAdmin, authReady, loginAdmin, loginWithGoogle, logoutAdmin,
    challengeMfa, enrollMfa, verifyMfaEnroll, inviteStaff,
    adminOAuthAvailable: !adminBffEnabled(),
  }
}
