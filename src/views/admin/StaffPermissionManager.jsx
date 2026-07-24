import { useState, useEffect } from 'react'
import { useStore } from '../../context/StoreContext'
import { supabase } from '../../lib/supabaseClient'

// Real staff & roles. Reads user_profiles (admins can see all), lets the super
// admin invite people and set roles, and lets an admin turn on their own 2FA.
// No passwords or PINs are ever stored in the browser.

const ROLES = ['Admin', 'Staff', 'Customer']
const ROLE_BLURB = {
  Admin: 'Full access — everything, including staff & financials.',
  Staff: 'Day-to-day operations. No staff management or financials.',
  Customer: 'Storefront only — no admin access.',
}

export default function StaffPermissionManager() {
  const { user, inviteStaff, enrollMfa, verifyMfaEnroll } = useStore()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Staff')
  const [inviting, setInviting] = useState(false)

  // 2FA enrollment
  const [mfa, setMfa] = useState(null)     // { factorId, qr, secret }
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)

  const load = async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true); setErr('')
    const { data, error } = await supabase.from('user_profiles')
      .select('id, email, role, created_at').order('created_at', { ascending: true })
    if (error) setErr(error.message)
    else setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const changeRole = async (id, role) => {
    setErr(''); setNotice('')
    const { error } = await supabase.from('user_profiles').update({ role }).eq('id', id)
    if (error) setErr(error.message)
    else { setNotice('Role updated.'); setRows(prev => prev.map(r => r.id === id ? { ...r, role } : r)) }
  }

  const sendInvite = async (e) => {
    e.preventDefault()
    setErr(''); setNotice(''); setInviting(true)
    const res = await inviteStaff(inviteEmail.trim(), inviteRole)
    setInviting(false)
    if (res.ok) { setNotice(`Invite sent to ${inviteEmail}. They'll set their own password.`); setInviteEmail(''); load() }
    else setErr(res.error || 'Invite failed.')
  }

  const startMfa = async () => {
    setErr(''); setMfaBusy(true)
    const res = await enrollMfa()
    setMfaBusy(false)
    if (res.ok) setMfa(res)
    else setErr(res.error || 'Could not start 2FA enrollment.')
  }
  const confirmMfa = async (e) => {
    e.preventDefault()
    setErr(''); setMfaBusy(true)
    const res = await verifyMfaEnroll(mfa.factorId, mfaCode.trim())
    setMfaBusy(false)
    if (res.ok) { setNotice('2FA is now on for your account.'); setMfa(null); setMfaCode('') }
    else setErr(res.error || 'Code did not verify.')
  }

  const roleClass = (r) => r === 'Admin' ? 'text-crimson' : r === 'Staff' ? 'text-blue' : 'text-white/60'

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      <div>
        <h1 className="font-serif text-2xl font-bold text-white">Staff &amp; roles</h1>
        <p className="text-sm text-white/55 mt-1">Invite people, set what they can access, and secure your own account with 2FA. Accounts are invite-only; passwords are set by each person and never stored here.</p>
      </div>

      {err && <div className="p-3 rounded-xl border border-crimson/40 bg-crimson/10 text-crimson text-sm font-semibold">⚠️ {err}</div>}
      {notice && <div className="p-3 rounded-xl border border-forest/40 bg-forest/10 text-forest text-sm font-semibold">✓ {notice}</div>}

      {/* Invite */}
      <div className="bg-[#18181b] border border-white/15 rounded-2xl p-5 shadow-lg">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gold mb-3">Invite a staff member</h2>
        <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
          <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="name@example.com"
            className="flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-blue outline-none" />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
            className="rounded-xl border border-white/20 bg-[#0A101D] px-4 py-2.5 text-white focus:border-blue outline-none cursor-pointer">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" disabled={inviting}
            className="rounded-xl bg-blue hover:bg-blue-deep text-white font-bold px-6 py-2.5 disabled:opacity-50 transition-all">
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        <p className="text-xs text-white/40 mt-2">{ROLE_BLURB[inviteRole]}</p>
      </div>

      {/* People */}
      <div className="bg-[#18181b] border border-white/15 rounded-2xl p-5 shadow-lg">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gold mb-3">People with access</h2>
        {loading ? (
          <p className="text-white/50 py-8 text-center text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-white/50 py-8 text-center text-sm">No profiles yet. Invite someone above, or sign in once yourself to create your profile.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {rows.map(r => {
              const isSelf = user?.id === r.id
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{r.full_name || r.email} {isSelf && <span className="text-xs text-white/40">(you)</span>}</p>
                    <p className="text-sm text-white/50 truncate">{r.email} · <span className={`font-bold ${roleClass(r.role)}`}>{r.role}</span></p>
                  </div>
                  <select value={ROLES.includes(r.role) ? r.role : 'Customer'} onChange={e => changeRole(r.id, e.target.value)}
                    className="shrink-0 rounded-lg border border-white/20 bg-[#0A101D] px-3 py-1.5 text-sm text-white focus:border-blue outline-none cursor-pointer">
                    {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Your 2FA */}
      <div className="bg-[#18181b] border border-white/15 rounded-2xl p-5 shadow-lg">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gold mb-1">Your two-factor security</h2>
        <p className="text-sm text-white/55 mb-3">Add an authenticator app (Google Authenticator, Authy…) so your admin login needs a 6-digit code. Strongly recommended.</p>
        {!mfa ? (
          <button onClick={startMfa} disabled={mfaBusy}
            className="rounded-xl bg-forest hover:bg-forest/90 text-white font-bold px-5 py-2.5 disabled:opacity-50 transition-all">
            {mfaBusy ? 'Starting…' : '🔐 Turn on 2FA'}
          </button>
        ) : (
          <form onSubmit={confirmMfa} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {mfa.qr && <img src={mfa.qr} alt="Scan this QR in your authenticator app" className="w-40 h-40 rounded-lg bg-white p-2 shrink-0" />}
              <div className="text-sm text-white/70 space-y-2">
                <p>1. Scan this QR in your authenticator app.</p>
                {mfa.secret && <p>Or enter this key manually: <span className="font-mono text-white break-all">{mfa.secret}</span></p>
                }
                <p>2. Enter the 6-digit code it shows:</p>
                <input type="text" inputMode="numeric" maxLength={6} value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))} placeholder="123456"
                  className="w-40 text-center tracking-[0.3em] font-mono text-xl rounded-lg border border-forest/50 bg-black/50 px-3 py-2 text-forest outline-none focus:border-forest" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setMfa(null); setMfaCode('') }}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10">Cancel</button>
              <button type="submit" disabled={mfaBusy || mfaCode.length < 6}
                className="rounded-lg bg-forest text-white font-bold px-5 py-2 disabled:opacity-50">
                {mfaBusy ? 'Verifying…' : 'Confirm 2FA'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
