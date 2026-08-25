import { useEffect, useState } from 'react'
import { useAdminStore as useStore } from '../../context/AdminStoreContext'
import { AlertIcon, ShieldIcon } from '../../components/ui/icons'
import TurnstileChallenge from '../../components/security/TurnstileChallenge'

// Real admin login: Supabase email+password or Google, with a genuine TOTP
// second factor when the account has 2FA enrolled. No passcodes, no demo codes.
export default function AdminAuthModal(props) {
  return <AdminAuthForm {...props} runtime={useStore()} />
}

export function AdminAuthForm({ isOpen, onClose, runtime }) {
  const {
    loginAdmin, loginWithGoogle = async () => ({ ok:false }), challengeMfa,
    enrollMfa, verifyMfaEnroll, adminOAuthAvailable,
    requestPasswordRecovery = async () => ({ ok: false, error: 'Secure password recovery is unavailable.' }),
    completePasswordRecovery = async () => ({ ok: false, error: 'Secure password recovery is unavailable.' }),
    mfaRequired, authError, adminBotChallengeRequired = false,
  } = runtime
  const [step, setStep] = useState(() => new URLSearchParams(window.location.search).get('recovery') === 'ready' ? 6 : 1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [enrollment, setEnrollment] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [recoveryNotice, setRecoveryNotice] = useState('')
  const [botToken, setBotToken] = useState('')
  const [challengeKey, setChallengeKey] = useState(0)

  const resetChallenge = () => {
    setBotToken('')
    setChallengeKey(value => value + 1)
  }

  useEffect(() => {
    if (!mfaRequired) return
    setStep(2)
    setError('')
    setLoading(false)
  }, [mfaRequired])

  useEffect(() => {
    if (!authError) return
    setStep(1)
    setError(authError)
    setLoading(false)
  }, [authError])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('recovery') !== 'invalid') return
    window.history.replaceState(window.history.state, '', window.location.pathname)
    setError('This recovery link is invalid, expired, or already used. Request a new link.')
  }, [])

  useEffect(() => {
    if (step !== 6 || new URLSearchParams(window.location.search).get('recovery') !== 'ready') return
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [step])

  useEffect(() => {
    // Browsers may restore the pre-redirect page from the back/forward cache.
    // Never preserve a stale "Opening Google" state after the OAuth return.
    const resetRedirectLoading = () => setLoading(false)
    window.addEventListener('pageshow', resetRedirectLoading)
    return () => window.removeEventListener('pageshow', resetRedirectLoading)
  }, [])

  if (!isOpen) return null

  const submitCredentials = async (e) => {
    e.preventDefault()
    if (adminBotChallengeRequired && !botToken) return setError('Complete the security check before signing in.')
    setError(''); setLoading(true)
    const res = await loginAdmin({ email: email.trim(), password, botToken })
    if (adminBotChallengeRequired) resetChallenge()
    if (res.ok) return                        // context flips isAdmin → dashboard shows
    if (res.mfaRequired) { setLoading(false); setStep(2); return }
    if (res.enrollmentRequired) {
      const setup = await enrollMfa()
      setLoading(false)
      if (setup.ok) { setEnrollment(setup); setCode(''); setStep(3); return }
      setError(setup.error || 'Authenticator setup could not be started.')
      return
    }
    setLoading(false)
    setError(res.error || 'Sign-in failed.')
  }

  const submitCode = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await challengeMfa(code.trim())
    setLoading(false)
    if (res.ok) return
    setError(res.error || 'Invalid authenticator code.')
  }

  const submitEnrollmentCode = async (e) => {
    e.preventDefault()
    if (!enrollment?.factorId) return setError('Authenticator setup expired. Return to sign-in and start again.')
    setError(''); setLoading(true)
    const res = await verifyMfaEnroll(enrollment.factorId, code.trim())
    setLoading(false)
    if (res.ok) return
    setError(res.error || 'That authenticator code could not be verified.')
  }

  const submitGoogle = async () => {
    setError('')
    setLoading(true)
    const res = await loginWithGoogle()
    if (!res?.ok) {
      setError(res?.error || 'Google sign-in failed.')
      setLoading(false)
    }
  }

  const submitRecoveryRequest = async (e) => {
    e.preventDefault()
    if (adminBotChallengeRequired && !botToken) return setError('Complete the security check before requesting a recovery email.')
    setError(''); setLoading(true)
    const result = await requestPasswordRecovery(email.trim(), botToken)
    if (adminBotChallengeRequired) resetChallenge()
    setLoading(false)
    if (!result.ok) return setError(result.error || 'Recovery email could not be requested.')
    setRecoveryNotice('If that email belongs to an invited staff account, a recovery link is on its way.')
    setStep(5)
  }

  const useRecoveryLink = () => {
    if (new URLSearchParams(window.location.search).get('recovery') !== 'ready') {
      setError('Open the newest recovery link from your email on this device.')
      return
    }
    window.history.replaceState(window.history.state, '', window.location.pathname)
    setPassword(''); setConfirmation(''); setError(''); setStep(6)
  }

  const submitRecoveryCompletion = async (e) => {
    e.preventDefault()
    if (password !== confirmation) return setError('The passwords do not match.')
    if (password.length < 12) return setError('Use at least 12 characters.')
    setError(''); setLoading(true)
    const result = await completePasswordRecovery(password)
    setLoading(false)
    if (!result.ok) return setError(result.error || 'The password could not be changed safely.')
    setPassword(''); setConfirmation('')
    setRecoveryNotice('Password changed. Sign in again with your new password and authenticator.')
    setStep(7)
  }

  const field = 'w-full rounded-adm-sm border border-white/20 bg-black/30 px-4 min-h-12 py-3 text-base text-white placeholder:text-white/50 focus:border-blue focus:outline-none transition-colors motion-reduce:transition-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="w-full max-w-md my-auto rounded-adm border border-adm-line bg-adm-surface p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden font-sans">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-blue/15 blur-3xl pointer-events-none" />

        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-adm bg-blue/15 border border-blue/30 text-blue"><ShieldIcon size={24} /></div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">
            K2 Jimzon <span className="text-blue">Admin</span>
          </h2>
          <p className="text-sm text-white/50 mt-1">Staff sign-in</p>
        </div>

        {step === 1 ? (
          <form onSubmit={submitCredentials} className="space-y-4">
            {error && (
              <div role="alert" className="flex items-start gap-2 p-3.5 rounded-adm-sm border border-crimson/40 bg-crimson/15 text-crimson text-sm font-bold"><AlertIcon size={17} className="mt-0.5 shrink-0" /> {error}</div>
            )}

            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">Email</label>
              <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@k2jimzon.com" required autoFocus autoComplete="username" className={field} />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">Password</label>
              <input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••" required autoComplete="current-password" className={field} />
              <button type="button" onClick={() => { setError(''); resetChallenge(); setStep(4) }}
                className="mt-2 min-h-11 text-sm font-bold text-blue hover:text-blue-light transition-colors motion-reduce:transition-none">
                Forgot password?
              </button>
            </div>

            {adminBotChallengeRequired && <TurnstileChallenge
              key={challengeKey}
              enabled
              tone="admin"
              action="admin_auth"
              onTokenChange={setBotToken}
              description="Complete this check before K2 verifies staff credentials."
            />}

            <button type="submit" disabled={loading}
              className="w-full rounded-adm-sm bg-blue hover:bg-blue-deep min-h-12 py-3 text-sm font-extrabold text-white shadow-lg transition-[background-color,opacity,transform] active:scale-[.98] disabled:opacity-50 motion-reduce:transition-none">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div hidden={!adminOAuthAvailable} className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/50 font-medium">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div hidden={!adminOAuthAvailable}>
              <button type="button" onClick={submitGoogle} disabled={loading}
                className="w-full min-h-12 py-3 px-4 rounded-adm-sm bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm transition-[background-color,opacity,transform] shadow-md flex items-center justify-center gap-2 active:scale-[.98] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                {loading ? 'Opening Google…' : 'Continue with Google'}
              </button>
              <p className="text-xs text-white/40 text-center mt-3">
                No account? Ask your super admin to invite you — accounts are created by invite only.
              </p>
            </div>

            {!adminOAuthAvailable && (
              <p className="text-center text-sm leading-relaxed text-white/60">
                Staff access is invite-only and requires your authenticator.
              </p>
            )}

            <button type="button" onClick={onClose}
              className="w-full text-sm font-semibold text-white/45 hover:text-white transition-colors py-1">
              ← Back to store
            </button>
          </form>
        ) : step === 2 ? (
          <form onSubmit={submitCode} className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none">
            {error && (
              <div role="alert" className="flex items-start gap-2 p-3.5 rounded-adm-sm border border-crimson/40 bg-crimson/15 text-crimson text-sm font-bold"><AlertIcon size={17} className="mt-0.5 shrink-0" /> {error}</div>
            )}
            <div className="bg-blue/15 border border-blue/30 p-4 rounded-adm-sm text-sm text-white">
              <p className="font-bold text-blue flex items-center gap-1.5 text-base"><ShieldIcon size={18} /> Two-factor required</p>
              <p className="text-neutral-300 mt-0.5">Enter the 6-digit code from your authenticator app.</p>
            </div>
            <input type="text" inputMode="numeric" maxLength={6} value={code} autoFocus
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" required
              aria-label="Six-digit authenticator code"
              className="w-full text-center tracking-[0.4em] font-mono text-2xl font-extrabold rounded-adm-sm border border-blue/40 bg-black/50 px-4 py-3.5 text-blue placeholder:text-white/50 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue transition-[border-color,box-shadow] motion-reduce:transition-none" />
            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
              <button type="button" onClick={() => { setStep(1); setError(''); setCode('') }}
                className="flex-1 rounded-adm-sm border border-white/20 bg-white/10 min-h-12 py-3 text-sm font-bold text-neutral-300 hover:bg-white/15 hover:text-white transition-[background-color,color] motion-reduce:transition-none">
                ← Back
              </button>
              <button type="submit" disabled={loading || code.length < 6}
                className="flex-1 rounded-adm-sm bg-blue hover:bg-blue-deep min-h-12 py-3 text-sm font-extrabold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50">
                {loading ? 'Verifying…' : 'Verify & enter'}
              </button>
            </div>
          </form>
        ) : step === 3 ? (
          <form onSubmit={submitEnrollmentCode} className="space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-adm-sm border border-crimson/40 bg-crimson/15 p-3.5 text-sm font-bold text-crimson">
                <AlertIcon size={17} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <div>
              <h3 className="text-lg font-extrabold text-white">Set up your authenticator</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                Scan this code in your authenticator app. K2 will not activate Admin access until the six-digit code verifies.
              </p>
            </div>
            <div className="flex justify-center">
              <img src={enrollment?.qr} alt="Authenticator setup QR code" className="h-44 w-44 rounded-adm-sm bg-white p-2" />
            </div>
            <div className="rounded-adm-sm border border-white/15 bg-black/25 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/55">Manual setup key</p>
              <code className="mt-1 block break-all font-mono text-sm font-bold tracking-wide text-white">{enrollment?.secret}</code>
              <p className="mt-1 text-xs leading-relaxed text-white/55">Keep this key private. It is shown only for this setup attempt.</p>
            </div>
            <div>
              <label htmlFor="admin-enrollment-code" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/55">Six-digit verification code</label>
              <input id="admin-enrollment-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} autoFocus onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456" required
                className="w-full min-h-14 rounded-adm-sm border border-blue/40 bg-black/50 px-4 py-3.5 text-center font-mono text-2xl font-extrabold tracking-[0.4em] text-blue placeholder:text-white/50 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue transition-[border-color,box-shadow] motion-reduce:transition-none" />
            </div>
            <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:gap-3">
              <button type="button" onClick={() => { setStep(1); setEnrollment(null); setCode(''); setError('') }}
                className="min-h-12 flex-1 rounded-adm-sm border border-white/20 bg-white/10 py-3 text-sm font-bold text-neutral-300 hover:bg-white/15 hover:text-white transition-[background-color,color] motion-reduce:transition-none">
                Restart sign-in
              </button>
              <button type="submit" disabled={loading || code.length !== 6}
                className="min-h-12 flex-1 rounded-adm-sm bg-blue py-3 text-sm font-extrabold text-white shadow-lg hover:bg-blue-deep active:scale-[.98] disabled:opacity-50 transition-[background-color,opacity,transform] motion-reduce:transition-none">
                {loading ? 'Verifying…' : 'Verify and enter Admin'}
              </button>
            </div>
          </form>
        ) : step === 4 ? (
          <form onSubmit={submitRecoveryRequest} className="space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Reset staff password</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/65">Use the verified email on your invited staff account.</p>
            </div>
            {error && <div role="alert" className="flex items-start gap-2 rounded-adm-sm border border-crimson/40 bg-crimson/15 p-3.5 text-sm font-bold text-crimson"><AlertIcon size={17} className="mt-0.5 shrink-0" /> {error}</div>}
            <div>
              <label htmlFor="admin-recovery-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/55">Staff email</label>
              <input id="admin-recovery-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" className={field} />
            </div>
            {adminBotChallengeRequired && <TurnstileChallenge
              key={challengeKey}
              enabled
              tone="admin"
              action="admin_auth"
              onTokenChange={setBotToken}
              description="Complete this check before K2 requests a staff recovery email."
            />}
            <button type="submit" disabled={loading} className="w-full min-h-12 rounded-adm-sm bg-blue py-3 text-sm font-extrabold text-white transition-[background-color,opacity,transform] hover:bg-blue-deep active:scale-[.98] disabled:opacity-50 motion-reduce:transition-none">{loading ? 'Requesting…' : 'Send recovery email'}</button>
            <button type="button" onClick={() => { setError(''); resetChallenge(); setStep(1) }} className="w-full min-h-11 text-sm font-semibold text-white/55 hover:text-white transition-colors motion-reduce:transition-none">Back to sign-in</button>
          </form>
        ) : step === 5 ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Check your email</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{recoveryNotice}</p>
            </div>
            {error && <div role="alert" className="flex items-start gap-2 rounded-adm-sm border border-crimson/40 bg-crimson/15 p-3.5 text-sm font-bold text-crimson"><AlertIcon size={17} className="mt-0.5 shrink-0" /> {error}</div>}
            <button type="button" onClick={useRecoveryLink} className="w-full min-h-12 rounded-adm-sm bg-blue py-3 text-sm font-extrabold text-white transition-[background-color,transform] hover:bg-blue-deep active:scale-[.98] motion-reduce:transition-none">Use recovery link</button>
            <button type="button" onClick={() => { setError(''); setStep(1) }} className="w-full min-h-11 text-sm font-semibold text-white/55 hover:text-white transition-colors motion-reduce:transition-none">Back to sign-in</button>
          </div>
        ) : step === 6 ? (
          <form onSubmit={submitRecoveryCompletion} className="space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Reset staff password</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/65">Use at least 12 characters. After the change, all existing staff sessions are closed.</p>
            </div>
            {error && <div role="alert" className="flex items-start gap-2 rounded-adm-sm border border-crimson/40 bg-crimson/15 p-3.5 text-sm font-bold text-crimson"><AlertIcon size={17} className="mt-0.5 shrink-0" /> {error}</div>}
            <div>
              <label htmlFor="admin-new-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/55">New password</label>
              <input id="admin-new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={128} required autoFocus autoComplete="new-password" className={field} />
            </div>
            <div>
              <label htmlFor="admin-confirm-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/55">Confirm new password</label>
              <input id="admin-confirm-password" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} minLength={12} maxLength={128} required autoComplete="new-password" className={field} />
            </div>
            <button type="submit" disabled={loading} className="w-full min-h-12 rounded-adm-sm bg-blue py-3 text-sm font-extrabold text-white transition-[background-color,opacity,transform] hover:bg-blue-deep active:scale-[.98] disabled:opacity-50 motion-reduce:transition-none">{loading ? 'Changing password…' : 'Set new password'}</button>
          </form>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-extrabold text-white">Password changed</h3>
            <p role="status" className="text-sm leading-relaxed text-white/70">{recoveryNotice}</p>
            <button type="button" onClick={() => { setRecoveryNotice(''); setStep(1) }} className="w-full min-h-12 rounded-adm-sm bg-blue py-3 text-sm font-extrabold text-white transition-[background-color,transform] hover:bg-blue-deep active:scale-[.98] motion-reduce:transition-none">Return to sign-in</button>
          </div>
        )}
      </div>
    </div>
  )
}
