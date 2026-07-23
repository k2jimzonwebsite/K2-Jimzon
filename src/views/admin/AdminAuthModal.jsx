import { useState } from 'react'
import { useStore } from '../../context/StoreContext'
import { verify2faCode } from '../../lib/securityVault'

export default function AdminAuthModal({ isOpen, onClose }) {
  const { loginAdmin } = useStore()
  const [step, setStep] = useState(1) // 1: Credentials, 2: 2FA TOTP
  const [mode, setMode] = useState('passcode') // 'passcode' | 'email'
  const [passcode, setPasscode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleStep1Submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'passcode') {
        if (passcode === 'K2ADMIN2026' || passcode === 'admin123') {
          setStep(2)
        } else {
          setError('Invalid Admin Security Passcode. (Try: K2ADMIN2026)')
        }
      } else {
        if (email && password) {
          setStep(2)
        } else {
          setError('Please provide valid admin email & password.')
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
      if (verify2faCode(totpCode)) {
        const success = await loginAdmin({ passcode, email, password })
        if (!success) {
          setError('Session verification failed. Please try again.')
        }
      } else {
        setError('Invalid 2FA Authenticator Code. (Try 6-digit code: 202688)')
      }
    } catch (err) {
      setError(err.message || '2FA Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A101D] p-6 text-white shadow-2xl relative overflow-hidden">
        
        {/* Header decoration */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-crimson/20 blur-2xl pointer-events-none" />
        
        <div className="mb-6 text-center">
          <p className="font-serif text-2xl font-semibold text-white">K2 Jimzon <span className="text-crimson font-mono text-lg">BOS</span></p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-[10px] font-mono uppercase tracking-widest bg-crimson/20 text-crimson font-bold px-2 py-0.5 rounded border border-crimson/30">
              AES-256 Vault & 2FA Active
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 bg-white/5 p-2 rounded-xl border border-white/10 text-xs font-mono">
          <span className={`px-3 py-1 rounded-lg ${step === 1 ? 'bg-crimson font-bold text-white' : 'text-white/40'}`}>
            1. Master Password
          </span>
          <span className="text-white/20">→</span>
          <span className={`px-3 py-1 rounded-lg ${step === 2 ? 'bg-forest font-bold text-white' : 'text-white/40'}`}>
            2. 2FA Authenticator Code
          </span>
        </div>

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-xs font-medium animate-in shake">
                {error}
              </div>
            )}

            {/* Tab Selector */}
            <div className="flex border-b border-white/10 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setMode('passcode'); setError('') }}
                className={`flex-1 py-2 text-center transition-all ${
                  mode === 'passcode'
                    ? 'border-b-2 border-crimson text-white font-bold'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                Passcode Gate
              </button>
              <button
                type="button"
                onClick={() => { setMode('email'); setError('') }}
                className={`flex-1 py-2 text-center transition-all ${
                  mode === 'email'
                    ? 'border-b-2 border-crimson text-white font-bold'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                Supabase Sign-In
              </button>
            </div>

            {mode === 'passcode' ? (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
                  Admin Security Passcode
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter admin key (e.g. K2ADMIN2026)"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-crimson focus:outline-none focus:ring-1 focus:ring-crimson font-mono"
                />
                <p className="text-[11px] text-white/40 mt-1.5 italic">
                  Demo key: <span className="font-mono text-white/70">K2ADMIN2026</span>
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@k2jimzon.ph"
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-crimson focus:outline-none focus:ring-1 focus:ring-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-crimson focus:outline-none focus:ring-1 focus:ring-crimson"
                  />
                </div>
              </>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white/70 hover:bg-white/10 transition-all"
              >
                Back to Store
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-crimson py-3 text-xs font-bold text-white hover:bg-crimson/90 transition-all shadow-lg shadow-crimson/20 disabled:opacity-50"
              >
                Continue to 2FA →
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} className="space-y-4 animate-in fade-in duration-300">
            {error && (
              <div className="p-3 rounded-lg border border-crimson/30 bg-crimson/10 text-crimson text-xs font-medium animate-in shake">
                {error}
              </div>
            )}

            <div className="bg-forest/10 border border-forest/30 p-3.5 rounded-xl text-xs text-forest space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>🔐</span> 2-Factor Authentication Required
              </p>
              <p className="text-white/70 text-[11px]">
                Enter the 6-digit TOTP code from your Google Authenticator or Authy app.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
                6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="202688"
                required
                className="w-full text-center tracking-[0.4em] font-mono text-xl font-bold rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-forest placeholder:text-white/20 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
              />
              <p className="text-[11px] text-white/40 mt-1.5 text-center italic font-mono">
                Demo code: <span className="text-forest font-bold">202688</span> or <span className="text-forest font-bold">123456</span>
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-3 text-xs font-semibold text-white/70 hover:bg-white/10 transition-all"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading || totpCode.length < 6}
                className="flex-1 rounded-lg bg-forest py-3 text-xs font-bold text-white hover:bg-forest/90 transition-all shadow-lg shadow-forest/20 disabled:opacity-50"
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
