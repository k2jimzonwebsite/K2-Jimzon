import { useState, useEffect } from 'react'
import { useStore } from '../../context/StoreContext'
import { supabase } from '../../lib/supabaseClient'

// Real staff & roles. Reads user_profiles (admins see all), lets the super admin
// invite people + set roles, and lets an admin turn on their own 2FA.
// Mobile-first: big touch targets, 16px inputs, one clear thing per card.

const ROLES = ['Admin', 'Staff', 'Customer']
const ROLE_BLURB = {
  Admin: 'Full access — everything, including staff & financials.',
  Staff: 'Day-to-day operations. No staff management or financials.',
  Customer: 'Storefront only — no admin access.',
}
const roleChip = (r) =>
  r === 'Admin' ? 'bg-crimson/20 text-crimson border-crimson/40'
  : r === 'Staff' ? 'bg-blue/20 text-blue border-blue/40'
  : 'bg-white/10 text-white/60 border-white/20'

// 16px inputs prevent iOS zoom; min-h-12 = comfy thumb target.
const inputCls = 'w-full rounded-xl border border-white/20 bg-black/40 px-4 min-h-12 py-3 text-base text-white placeholder:text-white/40 focus:border-blue outline-none'

export default function StaffPermissionManager() {
  const { user, inviteStaff, enrollMfa, verifyMfaEnroll } = useStore()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Staff')
  const [inviting, setInviting] = useState(false)

  const [mfa, setMfa] = useState(null)
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
    if (res.ok) { setNotice(res.note || `Invite sent to ${inviteEmail}. They'll set their own password.`); setInviteEmail(''); load() }
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

  const nameFor = (r) => (r.email ? r.email.split('@')[0] : 'User')

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-1 pb-16 animate-in fade-in duration-300">

      {/* Header */}
      <div className="pt-1">
        <h1 className="font-serif text-2xl font-bold text-white">Staff &amp; roles</h1>
        <p className="text-sm text-white/55 mt-1 leading-relaxed">
          Invite people, choose what they can access, and protect your own login with 2FA. Accounts are invite-only — each person sets their own password.
        </p>
      </div>

      {/* Alerts */}
      {err && <div className="p-3.5 rounded-xl border border-crimson/40 bg-crimson/10 text-crimson text-sm font-semibold">⚠️ {err}</div>}
      {notice && <div className="p-3.5 rounded-xl border border-forest/40 bg-forest/10 text-forest text-sm font-semibold">✓ {notice}</div>}

      {/* Invite */}
      <section className="bg-[#161922] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">✉️</span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Invite a staff member</h2>
        </div>
        <form onSubmit={sendInvite} className="space-y-3">
          <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="name@example.com" className={inputCls} />
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">Their role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className={`${inputCls} cursor-pointer appearance-none`}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-xs text-white/45 mt-1.5 leading-relaxed">{ROLE_BLURB[inviteRole]}</p>
          </div>
          <button type="submit" disabled={inviting}
            className="w-full rounded-xl bg-blue hover:bg-blue-deep text-white font-bold min-h-12 py-3 disabled:opacity-50 transition-all active:scale-[.99]">
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      </section>

      {/* People */}
      <section className="bg-[#161922] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">👥</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gold">People with access</h2>
          </div>
          {!loading && <span className="text-xs text-white/40">{rows.length}</span>}
        </div>

        {loading ? (
          <p className="text-white/50 py-8 text-center text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-white/50 py-8 text-center text-sm">No accounts yet. Invite someone above.</p>
        ) : (
          <div className="space-y-2.5">
            {rows.map(r => {
              const isSelf = user?.id === r.id
              const role = ROLES.includes(r.role) ? r.role : 'Customer'
              return (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-blue/20 text-blue font-bold flex items-center justify-center uppercase">
                      {nameFor(r).charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold truncate">
                        {nameFor(r)} {isSelf && <span className="text-xs font-normal text-white/40">(you)</span>}
                      </p>
                      <p className="text-xs text-white/45 truncate">{r.email}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg border ${roleChip(role)}`}>{role}</span>
                  </div>
                  <label className="block mt-3">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">Change role</span>
                    <select value={role} onChange={e => changeRole(r.id, e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-[#0A101D] px-3 min-h-11 py-2.5 text-base text-white focus:border-blue outline-none cursor-pointer appearance-none">
                      {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Your 2FA */}
      <section className="bg-[#161922] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔐</span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Your two-factor security</h2>
        </div>
        <p className="text-sm text-white/55 mb-4 leading-relaxed">
          Add an authenticator app (Google Authenticator, Authy…) so your login also needs a 6-digit code. Strongly recommended for admins.
        </p>

        {!mfa ? (
          <button onClick={startMfa} disabled={mfaBusy}
            className="w-full sm:w-auto rounded-xl bg-forest hover:bg-forest/90 text-white font-bold px-6 min-h-12 py-3 disabled:opacity-50 transition-all active:scale-[.99]">
            {mfaBusy ? 'Starting…' : '🔐 Turn on 2FA'}
          </button>
        ) : (
          <form onSubmit={confirmMfa} className="space-y-4">
            {mfa.qr && (
              <div className="flex justify-center">
                <img src={mfa.qr} alt="Scan this QR in your authenticator app" className="w-48 h-48 rounded-xl bg-white p-2.5" />
              </div>
            )}
            <ol className="text-sm text-white/70 space-y-2 leading-relaxed">
              <li><span className="font-bold text-white">1.</span> Scan the QR above in your authenticator app.</li>
              {mfa.secret && (
                <li className="text-xs">Can't scan? Enter this key manually:<br /><span className="font-mono text-white break-all">{mfa.secret}</span></li>
              )}
              <li><span className="font-bold text-white">2.</span> Type the 6-digit code it shows:</li>
            </ol>
            <input type="text" inputMode="numeric" maxLength={6} value={mfaCode} autoFocus
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))} placeholder="123456"
              className="w-full text-center tracking-[0.4em] font-mono text-2xl rounded-xl border border-forest/50 bg-black/50 px-3 min-h-14 py-3 text-forest outline-none focus:border-forest" />
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button type="submit" disabled={mfaBusy || mfaCode.length < 6}
                className="flex-1 rounded-xl bg-forest text-white font-bold min-h-12 py-3 disabled:opacity-50 order-1 sm:order-2 active:scale-[.99]">
                {mfaBusy ? 'Verifying…' : 'Confirm 2FA'}
              </button>
              <button type="button" onClick={() => { setMfa(null); setMfaCode('') }}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 min-h-12 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 order-2 sm:order-1">
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
