import { useCallback, useState, useEffect, useRef } from 'react'
import { useOptionalAdminStore } from '../../context/AdminStoreContext'
import { supabase } from '../../lib/supabaseClient'
import { providerErrorIncludes, safeUiError } from '../../lib/safeUiError'
import { adminBffEnabled, commandAdminStaffAccessBff, getAdminStaffAccessBff } from '../../services/adminBffService'
import {
  AI_SPEND_CONTROL_CONFIRMATIONS, dollarsToMicros, microsToDollars,
  normalizeAiSpendControls,
} from '../../lib/aiSpendControls.js'
import { CheckIcon, InboxIcon, ShieldIcon, UserIcon, XIcon } from '../../components/ui/icons'

// Real staff & roles. Reads user_profiles (admins see all), lets the super admin
// invite people + set roles, and lets an admin turn on their own 2FA.
// Mobile-first: big touch targets, 16px inputs, one clear thing per card.

const ROLES = ['Admin', 'Staff', 'Customer']
const DISPLAY_ROLES = [...ROLES, 'SuperAdmin']
const ROLE_BLURB = {
  Admin: 'Full access — everything, including staff & financials.',
  Staff: 'Day-to-day operations. No staff management or financials.',
  Customer: 'Storefront only — no admin access.',
  SuperAdmin: 'Owner-controlled access, including paid AI spending controls.',
}
const roleChip = (r) =>
  r === 'Admin' ? 'bg-crimson/20 text-crimson border-crimson/40'
  : r === 'SuperAdmin' ? 'bg-gold/20 text-gold border-gold/40'
  : r === 'Staff' ? 'bg-blue/20 text-blue border-blue/40'
  : 'bg-white/10 text-white/60 border-white/20'

// 16px inputs prevent iOS zoom; min-h-12 = comfy thumb target.
const inputCls = 'w-full rounded-adm-sm border border-white/20 bg-black/40 px-4 min-h-12 py-3 text-base text-white placeholder:text-white/40 focus:border-blue outline-none'

export default function StaffPermissionManager({ secureMode, runtime }) {
  const secure = secureMode ?? adminBffEnabled()
  const store = useOptionalAdminStore()
  const {
    user = null, inviteStaff = async () => ({ ok: false }),
    enrollMfa = async () => ({ ok: false }), verifyMfaEnroll = async () => ({ ok: false }),
    startMfaReplacement = async () => ({ ok: false }),
    completeMfaReplacement = async () => ({ ok: false }),
  } = runtime || store || {}
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Staff')
  const [inviteReason, setInviteReason] = useState('')
  const [inviting, setInviting] = useState(false)

  const [mfa, setMfa] = useState(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)
  const [mfaStatus, setMfaStatus] = useState('checking') // checking | verified | unavailable | error
  const [mfaReplacementAvailable, setMfaReplacementAvailable] = useState(false)
  const [mfaReplacementOpen, setMfaReplacementOpen] = useState(false)

  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [hasPin, setHasPin] = useState(null)
  const [pinReason, setPinReason] = useState('')
  const [roleChange, setRoleChange] = useState(null)
  const [invitationAvailable, setInvitationAvailable] = useState(!secure)
  const [aiSpendControls, setAiSpendControls] = useState(null)
  const [aiSpendControlsStatus, setAiSpendControlsStatus] = useState('checking')
  const isSuperAdmin = user?.role === 'SuperAdmin'

  const load = useCallback(async (signal) => {
    if (secure) {
      setLoading(true); setErr('')
      const response = await getAdminStaffAccessBff(signal)
      if (response.aborted) return
      if (!response.ok) {
        setErr(response.error || 'Staff access records could not be loaded.')
        setAiSpendControls(null)
        setAiSpendControlsStatus('unavailable')
      }
      else {
        setRows(response.staffAccess.profiles || [])
        setHasPin(Boolean(response.staffAccess.hasDeletePin))
        setInvitationAvailable(Boolean(response.staffAccess.invitationAvailable))
        setMfaStatus(response.staffAccess.currentSessionAal2 ? 'verified' : 'unavailable')
        setMfaReplacementAvailable(Boolean(response.staffAccess.mfaReplacementAvailable))
        setAiSpendControls(response.staffAccess.aiSpendControls ? normalizeAiSpendControls(response.staffAccess.aiSpendControls) : null)
        setAiSpendControlsStatus(response.staffAccess.aiSpendControlsAvailable && response.staffAccess.aiSpendControls ? 'available' : 'unavailable')
      }
      setLoading(false)
      return
    }
    if (!supabase) { setLoading(false); return }
    setLoading(true); setErr('')
    const { data, error } = await supabase.from('user_profiles')
      .select('id, email, role, created_at').order('created_at', { ascending: true })
    if (error) setErr(safeUiError('STAFF_LOAD_FAILED'))
    else setRows(data || [])
    setAiSpendControls(null)
    setAiSpendControlsStatus('unavailable')
    setLoading(false)
  }, [secure])
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort() }, [load])

  useEffect(() => {
    if (secure || !supabase) return
    supabase.rpc('has_delete_pin').then(({ data, error }) => {
      if (!error) setHasPin(Boolean(data))
      else if (providerErrorIncludes(error, 'K2_AAL2_REQUIRED')) setErr('Verify your authenticator again before managing the delete PIN.')
      else setErr('Delete PIN status could not be checked. Refresh and try again.')
    })
  }, [secure])

  const refreshMfaStatus = async () => {
    if (secure) { setMfaStatus('verified'); return }
    if (!supabase) { setMfaStatus('unavailable'); return }
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) { setMfaStatus('error'); return }
    setMfaStatus((data?.totp?.length || 0) > 0 ? 'verified' : 'unavailable')
  }
  useEffect(() => { refreshMfaStatus() }, [secure])

  const changeRole = async (id, role, reason) => {
    setErr(''); setNotice('')
    const result = secure
      ? await commandAdminStaffAccessBff('staff_role_change', { targetUserId: id, role, reason })
      : await supabase.rpc('set_user_role', { p_user_id: id, p_role: role })
    if ((secure && !result.ok) || (!secure && result.error)) return setErr(secure ? (result.error || 'The role was not changed.') : safeUiError('STAFF_ROLE_FAILED'))
    setRoleChange(null); setNotice('Role updated with an attributable reason.'); setRows(prev => prev.map(r => r.id === id ? { ...r, role } : r))
  }

  const sendInvite = async (e) => {
    e.preventDefault()
    if (!invitationAvailable) { setErr('Staff invitations remain unavailable until the reason-bound Edge receipt and server forwarding configuration are active.'); return }
    if (secure && inviteReason.trim().length < 3) { setErr('Enter an attributable reason for this invitation.'); return }
    setErr(''); setNotice(''); setInviting(true)
    const res = await inviteStaff(inviteEmail.trim(), inviteRole, inviteReason.trim())
    setInviting(false)
    if (res.ok) { setNotice(res.note || `Invite sent to ${inviteEmail}. They'll set their own password.`); setInviteEmail(''); setInviteReason(''); load() }
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
    if (res.ok) {
      setNotice('Authenticator verified. Two-factor security is active on your account.')
      setMfaStatus('verified')
      setMfa(null)
      setMfaCode('')
    }
    else setErr(res.error || 'Code did not verify.')
  }

  const nameFor = (r) => (r.email ? r.email.split('@')[0] : 'User')

  // ── Delete PIN ─────────────────────────────────────────────────────────────
  // Guards permanent product deletion. Stored server-side as a bcrypt hash via
  // set_delete_pin(); the raw value never round-trips back to the browser.
  const savePin = async (e) => {
    e.preventDefault()
    setErr(''); setNotice('')

    if (!/^\d{4}$/.test(pin)) return setErr('PIN must be exactly 4 digits.')
    if (pin !== pinConfirm) return setErr('The two PINs do not match.')
    if (!secure && !supabase) return setErr('No database connection.')

    setPinBusy(true)
    if (pinReason.trim().length < 3) { setPinBusy(false); return setErr('Enter why the delete PIN is being set or changed.') }
    const result = secure
      ? await commandAdminStaffAccessBff('admin_delete_pin_set', { pin, reason: pinReason.trim() })
      : await supabase.rpc('set_delete_pin', { new_pin: pin })
    setPinBusy(false)

    const error = secure ? (!result.ok && result) : result.error
    if (error) {
      if (secure) return setErr(result.error || 'The Delete PIN could not be saved safely.')
      return setErr(
        providerErrorIncludes(error, 'does not exist')
          ? 'The secure Delete PIN service is not available yet. Refresh after the Admin update finishes.'
          : providerErrorIncludes(error, 'K2_AAL2_REQUIRED')
            ? 'Verify your authenticator again before setting a Delete PIN.'
            : providerErrorIncludes(error, 'K2_ADMIN_REQUIRED')
              ? 'Only an Admin can set a Delete PIN.'
              : 'The Delete PIN could not be saved. Refresh and try again.'
      )
    }

    setPin(''); setPinConfirm(''); setPinReason(''); setHasPin(true)
    setNotice('Delete PIN saved with an attributable reason. You will need it to delete products.')
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-1 pb-16 animate-in fade-in duration-300">

      {/* Header */}
      <div className="pt-1">
        <h2 className="font-sans text-lg sm:text-2xl font-bold text-white">Staff &amp; roles</h2>
        <p className="text-sm text-white/55 mt-1 leading-relaxed">
          {secure ? 'Review authenticated access, make attributable role changes, and protect privileged deletion. Invitations require a durable reason-bound receipt.' : 'Invite people, choose what they can access, and protect your own login with 2FA. Accounts are invite-only — each person sets their own password.'}
        </p>
      </div>

      {/* Alerts */}
      {err && <div role="alert" className="p-3.5 rounded-adm-sm border border-crimson/40 bg-crimson/10 text-crimson text-sm font-semibold">{err}</div>}
      {notice && <div role="status" aria-live="polite" className="p-3.5 rounded-adm-sm border border-forest/40 bg-forest/10 text-forest text-sm font-semibold">{notice}</div>}

      {/* Invite */}
      <section className="bg-adm-surface border border-adm-line rounded-adm p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <InboxIcon size={19} className="text-gold" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Invite a staff member</h2>
        </div>
        {!invitationAvailable && <p role="status" className="mb-3 rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm text-amber">Invitations are unavailable until the reason-bound Edge receipt and server forwarding configuration are active. Existing access can still be reviewed.</p>}
        <form onSubmit={sendInvite} className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-white/45">Email address<input type="email" required disabled={!invitationAvailable} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            placeholder="name@example.com" className={inputCls} />
          </label>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">Their role</label>
            <select disabled={!invitationAvailable} value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className={`${inputCls} cursor-pointer appearance-none`}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-xs text-white/45 mt-1.5 leading-relaxed">{ROLE_BLURB[inviteRole]}</p>
          </div>
          {secure && <label className="block text-xs font-bold uppercase tracking-wider text-white/45">Reason for this invitation
            <textarea required minLength={3} maxLength={500} disabled={!invitationAvailable} value={inviteReason} onChange={e => setInviteReason(e.target.value)}
              placeholder="Why does this person need access?" className={`${inputCls} mt-1.5 min-h-24 resize-y`} />
          </label>}
          <button type="submit" disabled={inviting || !invitationAvailable || (secure && inviteReason.trim().length < 3)}
            className="w-full rounded-adm-sm bg-blue hover:bg-blue-deep text-white font-bold min-h-12 py-3 disabled:opacity-50 transition-[background-color,opacity,transform] active:scale-[.99] motion-reduce:transition-none">
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      </section>

      {/* Delete PIN */}
      <section className="bg-adm-surface border border-adm-line rounded-adm p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <ShieldIcon size={19} className="text-gold" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Your delete PIN</h2>
          {hasPin !== null && (
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold border ${
              hasPin ? 'bg-forest/20 text-forest border-forest/40' : 'bg-amber/20 text-amber border-amber/40'
            }`}>
              {hasPin ? 'Set' : 'Not set'}
            </span>
          )}
        </div>
        <p className="text-xs text-white/45 mb-3 leading-relaxed">
          Required to delete products. It is yours alone — every deletion is logged
          against the signed-in admin. It is stored as a one-way bcrypt hash and is never sent back to the browser.
        </p>
        <form onSubmit={savePin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">
              {hasPin ? 'New 4-digit PIN' : '4-digit PIN'}
            </label>
            <input
              type="password" inputMode="numeric" autoComplete="new-password" maxLength={4}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className={`${inputCls} text-center tracking-[0.5em] font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">Confirm PIN</label>
            <input
              type="password" inputMode="numeric" autoComplete="new-password" maxLength={4}
              value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className={`${inputCls} text-center tracking-[0.5em] font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/45 mb-1.5">Reason for setting or changing this PIN</label>
            <textarea required minLength={3} maxLength={500} value={pinReason} onChange={e => setPinReason(e.target.value)}
              className={`${inputCls} min-h-24 resize-y`} placeholder="Why is this credential needed or being rotated?" />
          </div>
          <button type="submit" disabled={pinBusy || pin.length !== 4 || pinConfirm.length !== 4}
            className="w-full rounded-adm-sm bg-blue hover:bg-blue-deep text-white font-bold min-h-12 py-3 disabled:opacity-40 transition-[background-color,opacity,transform] active:scale-[.99] motion-reduce:transition-none">
            {pinBusy ? 'Saving…' : hasPin ? 'Change PIN' : 'Set PIN'}
          </button>
        </form>
      </section>

      {/* People */}
      <section className="bg-adm-surface border border-adm-line rounded-adm p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserIcon size={19} className="text-gold" aria-hidden="true" />
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
              const role = DISPLAY_ROLES.includes(r.role) ? r.role : 'Customer'
              return (
                <div key={r.id} className="rounded-adm-sm border border-adm-line bg-white/5 p-3.5">
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
                    <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-adm-sm border ${roleChip(role)}`}>{role}</span>
                  </div>
                  <label className="block mt-3">
                    <span className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Change role</span>
                    <select value={role} disabled={role === 'SuperAdmin'} onChange={e => { if (e.target.value !== role) setRoleChange({ profile: r, role: e.target.value }) }}
                      className="w-full rounded-adm-sm border border-white/20 bg-adm-surface px-3 min-h-11 py-2.5 text-base text-white focus:border-blue outline-none cursor-pointer appearance-none">
                      {role === 'SuperAdmin' && <option value="SuperAdmin">SuperAdmin (owner controlled)</option>}
                      {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                </div>
              )
            })}
          </div>
        )}
      </section>
      {roleChange && <RoleChangeDialog change={roleChange} onCancel={() => setRoleChange(null)} onConfirm={changeRole} />}

      <PaidAiSpendControls
        secure={secure}
        isSuperAdmin={isSuperAdmin}
        controls={aiSpendControls}
        status={aiSpendControlsStatus}
        onSaved={next => {
          setAiSpendControls(normalizeAiSpendControls(next))
          setAiSpendControlsStatus('available')
          setNotice('Paid AI spending controls saved with an attributable reason. Provider activation remains separately gated.')
        }}
        onError={message => setErr(message)}
      />

      {/* Your 2FA */}
      <section className="bg-adm-surface border border-adm-line rounded-adm p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <CheckIcon size={19} className="text-gold" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Your two-factor security</h2>
          {mfaStatus !== 'checking' && (
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold border ${
              mfaStatus === 'verified'
                ? 'bg-forest/20 text-forest border-forest/40'
                : 'bg-amber/20 text-amber border-amber/40'
            }`}>
              {mfaStatus === 'verified' ? 'Active' : 'Not active'}
            </span>
          )}
        </div>
        <p className="text-sm text-white/55 mb-4 leading-relaxed">
          {mfaStatus === 'verified'
            ? 'Your verified authenticator is active. New Admin sessions require its 6-digit code.'
            : 'Add an authenticator app so your Admin login also needs a 6-digit code.'}
        </p>

        {mfaStatus === 'checking' ? (
          <p role="status" className="text-sm text-white/50">Checking authenticator status…</p>
        ) : mfaStatus === 'verified' ? (
          <div className="space-y-3">
            <div className="rounded-adm-sm border border-forest/35 bg-forest/10 p-3 text-sm text-forest font-semibold">
              Authenticator verified and required for privileged access.
            </div>
            {secure && (mfaReplacementAvailable ? (
              <button type="button" onClick={() => setMfaReplacementOpen(true)}
                className="min-h-11 w-full rounded-adm-sm border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-[background-color,border-color,transform] hover:bg-white/10 active:scale-[.99] motion-reduce:transition-none sm:w-auto">
                Replace authenticator
              </button>
            ) : (
              <p role="status" className="text-sm leading-relaxed text-white/50">
                Secure replacement is not active yet. Keep using the current authenticator. Lost access requires the documented owner/provider recovery process.
              </p>
            ))}
          </div>
        ) : !mfa ? (
          <button onClick={startMfa} disabled={mfaBusy}
            className="w-full sm:w-auto rounded-adm-sm bg-forest hover:bg-forest/90 text-white font-bold px-6 min-h-12 py-3 disabled:opacity-50 transition-all active:scale-[.99]">
            {mfaBusy ? 'Starting…' : 'Turn on 2FA'}
          </button>
        ) : (
          <form onSubmit={confirmMfa} className="space-y-4">
            {mfa.qr && (
              <div className="flex justify-center">
                <img src={mfa.qr} alt="Scan this QR in your authenticator app" className="w-48 h-48 rounded-adm-sm bg-white p-2.5" />
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
              className="w-full text-center tracking-[0.4em] font-mono text-2xl rounded-adm-sm border border-forest/50 bg-black/50 px-3 min-h-14 py-3 text-forest outline-none focus:border-forest" />
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button type="submit" disabled={mfaBusy || mfaCode.length < 6}
                className="flex-1 rounded-adm-sm bg-forest text-white font-bold min-h-12 py-3 disabled:opacity-50 order-1 sm:order-2 active:scale-[.99]">
                {mfaBusy ? 'Verifying…' : 'Confirm 2FA'}
              </button>
              <button type="button" onClick={() => { setMfa(null); setMfaCode('') }}
                className="flex-1 rounded-adm-sm border border-white/15 bg-white/5 min-h-12 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 order-2 sm:order-1">
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
      {mfaReplacementOpen && <MfaReplacementDialog
        onClose={() => setMfaReplacementOpen(false)}
        onStart={startMfaReplacement}
        onComplete={completeMfaReplacement}
        onSuccess={() => {
          setMfaReplacementOpen(false)
          setNotice('Authenticator replaced. Your previous factor is no longer active.')
        }}
      />}
    </div>
  )
}

function PaidAiSpendControls({ secure, isSuperAdmin, controls, status, onSaved, onError }) {
  const [enabled, setEnabled] = useState(false)
  const [model, setModel] = useState('')
  const [perProduct, setPerProduct] = useState('')
  const [perSession, setPerSession] = useState('')
  const [monthly, setMonthly] = useState('')
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const next = normalizeAiSpendControls(controls || {})
    setEnabled(next.paidPathEnabled)
    setModel(next.providerModelSnapshot || '')
    setPerProduct(microsToDollars(next.perProductUsdMicros))
    setPerSession(microsToDollars(next.perSessionUsdMicros))
    setMonthly(microsToDollars(next.monthlyUsdMicros))
  }, [controls])

  const save = async event => {
    event.preventDefault()
    if (!secure || !isSuperAdmin || status !== 'available') return onError('Paid AI spending controls are not active in this environment.')
    let payload
    try {
      payload = {
        paidPathEnabled: enabled,
        providerModelSnapshot: model.trim() || null,
        perProductUsdMicros: dollarsToMicros(perProduct),
        perSessionUsdMicros: dollarsToMicros(perSession),
        monthlyUsdMicros: dollarsToMicros(monthly),
        contentConfirmationRequired: true,
        imageConfirmationRequired: true,
        manualFallbackRequired: true,
        expectedVersion: normalizeAiSpendControls(controls).version,
        reason: reason.trim(),
        confirmation: enabled ? confirmation.trim() : AI_SPEND_CONTROL_CONFIRMATIONS.SAVE,
      }
    } catch {
      return onError('Enter valid dollar amounts with no more than six decimal places.')
    }
    if (payload.reason.length < 8) return onError('Enter at least 8 characters explaining this budget change.')
    if (enabled && confirmation.trim() !== AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE) {
      return onError(`Type ${AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE} to deliberately enable paid AI.`)
    }
    setBusy(true)
    const response = await commandAdminStaffAccessBff('ai_spend_controls_update', payload)
    setBusy(false)
    if (!response.ok) return onError(response.error || 'The paid AI spending controls could not be saved safely.')
    onSaved(response.result?.controls || response.result || payload)
    setReason('')
    setConfirmation('')
  }

  const display = normalizeAiSpendControls(controls || {})
  return <section className="bg-adm-surface border border-adm-line rounded-adm p-4 sm:p-5 shadow-lg">
    <div className="flex items-center gap-2 mb-1">
      <ShieldIcon size={19} className="text-gold" aria-hidden="true" />
      <h2 className="text-sm font-bold uppercase tracking-wider text-gold">Paid AI intake spending controls</h2>
      <span className="ml-auto rounded-full border border-amber/40 bg-amber/15 px-2 py-0.5 text-xs font-bold text-amber">
        {status === 'available' && display.paidPathEnabled ? 'Enabled by SuperAdmin' : 'Fail-closed'}
      </span>
    </div>
    <p className="text-sm text-white/55 leading-relaxed mb-3">
      Automatic API intake is an optional paid path for descriptions, usage/instructions, SEO, and draft image candidates. It can never write SKU, price, cost, stock, lots, expiry, custody, approval, or publication.
    </p>
    {!secure || status !== 'available' ? (
      <div role="status" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm leading-relaxed text-amber">
        Prepared — not active. The provider boundary, owner-approved model, retention decision, and hard caps must be verified before this control can be changed. Use the manual K2 Product Content → Smart Paste → K2 Product Image Studio workflow meanwhile.
      </div>
    ) : !isSuperAdmin ? (
      <div role="status" className="rounded-adm-sm border border-white/15 bg-white/5 p-3 text-sm leading-relaxed text-white/60">
        Only a SuperAdmin may change these limits or enable paid calls. Ask the owner to review the current caps; the manual two-Project path remains available.
      </div>
    ) : (
      <form onSubmit={save} className="space-y-3">
        <label className="flex items-start gap-3 rounded-adm-sm border border-white/15 bg-white/5 p-3 text-sm text-white/75">
          <input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="mt-1 h-5 w-5 accent-gold" />
          <span><strong className="text-white">Allow the paid API path</strong><span className="block text-xs text-white/45 mt-1">This is off by default and remains blocked unless every cap, model, and confirmation is valid.</span></span>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-white/45">Approved provider/model snapshot
          <input value={model} onChange={event => setModel(event.target.value)} maxLength={160} placeholder="e.g. provider/model@approved-snapshot" className={`${inputCls} mt-1.5`} />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-white/45">Per product (USD)
            <input value={perProduct} onChange={event => setPerProduct(event.target.value)} inputMode="decimal" placeholder="0.00" className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/45">Per session (USD)
            <input value={perSession} onChange={event => setPerSession(event.target.value)} inputMode="decimal" placeholder="0.00" className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/45">Monthly cap (USD)
            <input value={monthly} onChange={event => setMonthly(event.target.value)} inputMode="decimal" placeholder="0.00" className={`${inputCls} mt-1.5`} />
          </label>
        </div>
        <div className="rounded-adm-sm border border-blue/25 bg-blue/10 p-3 text-xs leading-relaxed text-white/65">
          Content and image confirmations, manual fallback, server-only keys, redacted usage/cost receipts, and fail-closed cap checks are fixed safeguards. They are not removable from this screen.
        </div>
        {enabled && <label className="block text-xs font-bold uppercase tracking-wider text-white/45">Type {AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE} to enable
          <input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" placeholder={AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE} className={`${inputCls} mt-1.5 font-mono`} />
        </label>}
        <label className="block text-xs font-bold uppercase tracking-wider text-white/45">Reason for this control change
          <textarea required minLength={8} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className={`${inputCls} mt-1.5 min-h-24 resize-y`} placeholder="Why is this model or budget being changed?" />
        </label>
        <button type="submit" disabled={busy || reason.trim().length < 8 || (enabled && confirmation.trim() !== AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE)} className="w-full rounded-adm-sm bg-blue hover:bg-blue-deep text-white font-bold min-h-12 py-3 disabled:opacity-50 transition-[background-color,opacity,transform] active:scale-[.99] motion-reduce:transition-none">
          {busy ? 'Saving…' : 'Save paid AI controls'}
        </button>
      </form>
    )}
    {status === 'available' && <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-white/55 sm:grid-cols-4">
      <div><dt>Per product</dt><dd className="font-semibold text-white">{microsToDollars(display.perProductUsdMicros) || 'Unset'}</dd></div>
      <div><dt>Per session</dt><dd className="font-semibold text-white">{microsToDollars(display.perSessionUsdMicros) || 'Unset'}</dd></div>
      <div><dt>Monthly cap</dt><dd className="font-semibold text-white">{microsToDollars(display.monthlyUsdMicros) || 'Unset'}</dd></div>
      <div><dt>Config version</dt><dd className="font-semibold text-white">{display.version}</dd></div>
    </dl>}
  </section>
}

function MfaReplacementDialog({ onClose, onStart, onComplete, onSuccess }) {
  const [reason, setReason] = useState('')
  const [replacement, setReplacement] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = event => { if (event.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [busy, onClose])

  const start = async event => {
    event.preventDefault()
    setError(''); setBusy(true)
    const result = await onStart(reason.trim())
    setBusy(false)
    if (!result.ok) return setError(result.error || 'Authenticator replacement could not be started.')
    setReplacement({ ...result.replacement, reason: reason.trim() })
  }

  const complete = async event => {
    event.preventDefault()
    setError(''); setBusy(true)
    const result = await onComplete({ ...replacement, reason: reason.trim(), code: code.trim() })
    setBusy(false)
    if (!result.ok) return setError(result.error || 'The new authenticator could not replace the previous factor.')
    onSuccess()
  }

  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 sm:items-center sm:p-4" role="presentation">
    <form onSubmit={replacement ? complete : start} role="dialog" aria-modal="true" aria-labelledby="mfa-replacement-title"
      className="max-h-[92dvh] w-full overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:max-w-md sm:rounded-adm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gold">Credential change</p>
          <h2 id="mfa-replacement-title" className="mt-1 text-xl font-bold">Replace authenticator</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Keep your current authenticator until this replacement succeeds. The old factor is retired only after the new code verifies.
          </p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} disabled={busy}
          aria-label="Close authenticator replacement"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-adm-sm border border-adm-line text-white/70 disabled:opacity-40">
          <XIcon size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm leading-relaxed text-amber">
        <strong>Lost access to the current authenticator?</strong> Stop here. This replacement requires an active AAL2 session; use the documented owner/provider recovery process.
      </div>
      {error && <div role="alert" className="mt-4 rounded-adm-sm border border-crimson/40 bg-crimson/10 p-3 text-sm font-semibold text-crimson">{error}</div>}

      {!replacement ? <div className="mt-4 space-y-4">
        <label className="block text-sm font-semibold text-white/70">Reason for replacing your authenticator
          <textarea required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)}
            className={`${inputCls} mt-1 min-h-24 resize-y`} placeholder="Why is this factor being replaced?" />
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-adm-sm border border-adm-line px-4 font-semibold disabled:opacity-40">Cancel</button>
          <button type="submit" disabled={busy || reason.trim().length < 3}
            className="min-h-11 rounded-adm-sm bg-blue px-4 font-bold text-white transition-[background-color,opacity,transform] active:scale-[.99] disabled:opacity-50 motion-reduce:transition-none">
            {busy ? 'Starting…' : 'Start secure replacement'}
          </button>
        </div>
      </div> : <div className="mt-4 space-y-4">
        {replacement.qr && <div className="flex justify-center">
          <img src={replacement.qr} alt="New authenticator setup QR code" className="h-48 w-48 rounded-adm-sm bg-white p-2.5" />
        </div>}
        <div className="space-y-2 text-sm leading-relaxed text-white/65">
          <p>Scan the QR code with the new authenticator app.</p>
          {replacement.secret && <p className="text-xs">Cannot scan? Enter this key manually:<br /><span className="break-all font-mono text-white">{replacement.secret}</span></p>}
          <p className="font-semibold text-amber">Keep your current authenticator until this replacement succeeds.</p>
        </div>
        <label className="block text-sm font-semibold text-white/70">Six-digit code from the new authenticator
          <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="mt-1 min-h-14 w-full rounded-adm-sm border border-blue/50 bg-black/50 px-3 py-3 text-center font-mono text-2xl tracking-[0.35em] text-white outline-none focus:border-blue" />
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-adm-sm border border-adm-line px-4 font-semibold disabled:opacity-40">Cancel</button>
          <button type="submit" disabled={busy || code.length !== 6}
            className="min-h-11 rounded-adm-sm bg-blue px-4 font-bold text-white transition-[background-color,opacity,transform] active:scale-[.99] disabled:opacity-50 motion-reduce:transition-none">
            {busy ? 'Verifying…' : 'Verify and replace authenticator'}
          </button>
        </div>
      </div>}
    </form>
  </div>
}

function RoleChangeDialog({ change, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = event => { if (event.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [busy, onCancel])
  const label = change.profile.email || change.profile.fullName || 'this account'
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 sm:items-center sm:p-4" role="presentation">
    <form role="dialog" aria-modal="true" aria-labelledby="role-change-title" onSubmit={async event => { event.preventDefault(); setBusy(true); await onConfirm(change.profile.id, change.role, reason.trim()); setBusy(false) }} className="w-full space-y-4 rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:max-w-md sm:rounded-adm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-gold">Privilege change</p><h2 id="role-change-title" className="mt-1 text-xl font-bold">Change role to {change.role}</h2><p className="mt-2 break-all text-sm text-white/55">This changes Admin access for {label}. The database still protects the final Admin.</p></div><button ref={closeRef} type="button" onClick={onCancel} aria-label="Close role change dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-adm-sm border border-adm-line">×</button></div>
      <label className="block text-sm font-semibold text-white/70">Reason for this access change<textarea required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className={`${inputCls} mt-1 min-h-24 resize-y`} /></label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="min-h-11 rounded-adm-sm border border-adm-line px-4 font-semibold">Cancel</button><button type="submit" disabled={busy || reason.trim().length < 3} className="min-h-11 rounded-adm-sm bg-crimson px-4 font-bold text-white disabled:opacity-50">{busy ? 'Changing…' : `Change to ${change.role}`}</button></div>
    </form>
  </div>
}
