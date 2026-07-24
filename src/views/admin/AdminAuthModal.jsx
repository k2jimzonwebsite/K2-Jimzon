import { useState } from 'react'
import { useStore } from '../../context/StoreContext'

// Real admin login: Supabase email+password or Google, with a genuine TOTP
// second factor when the account has 2FA enrolled. No passcodes, no demo codes.
export default function AdminAuthModal({ isOpen, onClose }) {
  const { loginAdmin, loginWithGoogle, challengeMfa } = useStore()
  const [step, setStep] = useState(1)        // 1: credentials, 2: 2FA code
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const submitCredentials = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await loginAdmin({ email: email.trim(), password })
    setLoading(false)
    if (res.ok) return                        // context flips isAdmin → dashboard shows
    if (res.mfaRequired) { setStep(2); return }
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

  const field = 'w-full rounded-xl border border-white/15 bg-black/30 px-4 min-h-12 py-3 text-base text-white placeholder:text-white/35 focus:border-blue focus:outline-none transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md my-auto rounded-2xl border border-white/10 bg-[#161922] p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden font-sans">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-blue/15 blur-3xl pointer-events-none" />

        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue/15 border border-blue/30 text-xl">🔒</div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">
            K2 Jimzon <span className="text-blue">Admin</span>
          </h2>
          <p className="text-sm text-white/50 mt-1">Staff sign-in</p>
        </div>

        {step === 1 ? (
          <form onSubmit={submitCredentials} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl border border-crimson/40 bg-crimson/15 text-crimson text-sm font-bold">⚠️ {error}</div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@k2jimzon.com" required autoFocus className={field} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••" required className={field} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-blue hover:bg-blue-deep min-h-12 py-3 text-sm font-extrabold text-white shadow-lg transition-all active:scale-[.99] disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/35 font-medium">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div>
              <button type="button" onClick={() => loginWithGoogle()}
                className="w-full min-h-12 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Continue with Google
              </button>
              <p className="text-xs text-white/40 text-center mt-3">
                No account? Ask your super admin to invite you — accounts are created by invite only.
              </p>
            </div>

            <button type="button" onClick={onClose}
              className="w-full text-sm font-semibold text-white/45 hover:text-white transition-colors py-1">
              ← Back to store
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4 animate-in fade-in duration-200">
            {error && (
              <div className="p-3.5 rounded-xl border border-crimson/40 bg-crimson/15 text-crimson text-sm font-bold">⚠️ {error}</div>
            )}
            <div className="bg-blue/15 border border-blue/30 p-4 rounded-xl text-sm text-white">
              <p className="font-bold text-blue flex items-center gap-1.5 text-base"><span>🔐</span> Two-factor required</p>
              <p className="text-neutral-300 mt-0.5">Enter the 6-digit code from your authenticator app.</p>
            </div>
            <input type="text" inputMode="numeric" maxLength={6} value={code} autoFocus
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" required
              className="w-full text-center tracking-[0.4em] font-mono text-2xl font-extrabold rounded-xl border border-blue/40 bg-black/50 px-4 py-3.5 text-blue placeholder:text-white/30 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue transition-all" />
            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
              <button type="button" onClick={() => { setStep(1); setError(''); setCode('') }}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 min-h-12 py-3 text-sm font-bold text-neutral-300 hover:bg-white/15 hover:text-white transition-all">
                ← Back
              </button>
              <button type="submit" disabled={loading || code.length < 6}
                className="flex-1 rounded-xl bg-blue hover:bg-blue-deep min-h-12 py-3 text-sm font-extrabold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50">
                {loading ? 'Verifying…' : 'Verify & enter'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
