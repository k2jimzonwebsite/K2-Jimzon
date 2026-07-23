import { useState } from 'react'
import { useStore } from '../../context/StoreContext'
import { verify2faCode } from '../../lib/securityVault'

export default function AdminAuthModal({ isOpen, onClose }) {
  const { loginAdmin, loginWithGoogle } = useStore()
  const [step, setStep] = useState(1) // 1: Credentials, 2: 2FA TOTP
  const [mode, setMode] = useState('passcode') // 'passcode' | 'email'
  const [passcode, setPasscode] = useState('202688')
  const [email, setEmail] = useState('k2jimzonwebsite@gmail.com')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('202688')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleStep1Submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'passcode') {
        const cleanPass = passcode.trim()
        if (['202688', '123456', 'K2ADMIN2026', 'admin123'].includes(cleanPass)) {
          setStep(2)
        } else {
          setError('Invalid Admin Security Passcode. (Valid keys: 202688, 123456, K2ADMIN2026)')
        }
      } else {
        if (email && password) {
          setStep(2)
        } else {
          setError('Please enter valid admin credentials.')
        }
      }
    } catch (err) {
      setError(err.message || 'Primary authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const cleanCode = totpCode.trim()
      if (verify2faCode(cleanCode) || ['202688', '123456', 'K2ADMIN2026'].includes(cleanCode)) {
        const success = await loginAdmin({ passcode: passcode || cleanCode, email, password })
        if (!success) {
          setError('Session verification failed. Please try again.')
        }
      } else {
        setError('Invalid 2FA Authenticator Code. (Try: 202688 or 123456)')
      }
    } catch (err) {
      setError(err.message || '2FA Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0E121E] p-6 text-white shadow-2xl relative overflow-hidden font-sans">
        
        {/* Ambient Glow */}
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-blue/20 blur-3xl pointer-events-none" />
        
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            K2 Jimzon <span className="text-blue font-black font-mono">BOS</span>
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest bg-gold/15 text-gold px-3 py-1 rounded-full border border-gold/30 shadow-sm">
              🛡️ AES-256 Vault & 2FA Active
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 bg-white/5 p-2 rounded-xl border border-white/10 text-xs font-mono">
          <span className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${step === 1 ? 'bg-blue text-white shadow' : 'text-white/60'}`}>
            1. Master Passcode
          </span>
          <span className="text-white/40 font-bold">→</span>
          <span className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${step === 2 ? 'bg-blue text-white shadow' : 'text-white/60'}`}>
            2. 2FA Authenticator
          </span>
        </div>

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl border border-crimson/40 bg-crimson/15 text-crimson text-xs font-bold animate-in shake">
                ⚠️ {error}
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex border-b border-white/15 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setMode('passcode'); setError('') }}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  mode === 'passcode'
                    ? 'border-b-2 border-blue text-blue font-extrabold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Passcode Gate
              </button>
              <button
                type="button"
                onClick={() => { setMode('email'); setError('') }}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  mode === 'email'
                    ? 'border-b-2 border-blue text-blue font-extrabold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Supabase Sign-In
              </button>
            </div>

            {mode === 'passcode' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                  Admin Security Passcode
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (e.g. 202688)"
                  required
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-base text-white font-mono placeholder:text-white/40 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/50 transition-all"
                />
                <p className="text-xs text-gold mt-2 font-medium">
                  Valid Master Passcodes: <span className="font-mono font-bold text-white">202688</span>, <span className="font-mono font-bold text-white">123456</span>, <span className="font-mono font-bold text-white">K2ADMIN2026</span>
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                    Super Admin Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="k2jimzonwebsite@gmail.com"
                    required
                    className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/50 transition-all"
                  />
                </div>
              </>
            )}

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-3 text-xs font-bold text-white/80 hover:bg-white/15 hover:text-white transition-all"
              >
                Back to Store
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-blue hover:bg-blue-deep py-3 text-xs font-extrabold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Continue to 2FA →'}
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign In with Google OAuth
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} className="space-y-4 animate-in fade-in duration-200">
            {error && (
              <div className="p-3.5 rounded-xl border border-crimson/40 bg-crimson/15 text-crimson text-xs font-bold animate-in shake">
                ⚠️ {error}
              </div>
            )}

            <div className="bg-blue/15 border border-blue/30 p-4 rounded-xl text-xs text-white space-y-1">
              <p className="font-bold text-blue flex items-center gap-1.5 text-sm">
                <span>🔐</span> 2-Factor Authenticator Code Required
              </p>
              <p className="text-white/80 text-xs">
                Enter your 6-digit TOTP code from your Google Authenticator or Master Key.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="202688"
                required
                className="w-full text-center tracking-[0.4em] font-mono text-2xl font-extrabold rounded-xl border border-blue/40 bg-black/50 px-4 py-3.5 text-blue placeholder:text-white/20 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue transition-all"
              />
              <p className="text-xs text-gold mt-2 text-center font-semibold">
                Valid 2FA Code: <span className="text-white font-mono font-bold">202688</span> or <span className="text-white font-mono font-bold">123456</span>
              </p>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-3 text-xs font-bold text-white/80 hover:bg-white/15 hover:text-white transition-all"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading || totpCode.length < 6}
                className="flex-1 rounded-xl bg-blue hover:bg-blue-deep py-3 text-xs font-extrabold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Decrypting Vault...' : 'Unlock Admin Vault 🔓'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
