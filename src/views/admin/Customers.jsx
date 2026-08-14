import { useCallback, useEffect, useMemo, useState } from 'react'
import { UserIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import { adminBffEnabled, getAdminCustomers } from '../../services/adminBffService'
import { EmptyState, MetricRail, SectionHeading, StateBanner, StatusPill, WorkspaceIntro } from './AdminWorkspaceUi'

const LEGACY_PROJECTION = 'id,email,role,created_at,updated_at'

function legacyCustomer(profile) {
  return {
    id: profile.id, displayName: profile.email || 'Registered customer', status: 'active',
    createdSource: 'website_account_legacy', createdAt: profile.created_at,
    updatedAt: profile.updated_at || profile.created_at,
    account: { linked: true, status: 'legacy', commercialRole: profile.role },
    contacts: profile.email ? [{ kind: 'email', value: profile.email, verificationStatus: 'account_profile' }] : [],
    channels: [], metrics: null,
  }
}

function customerState(customer) {
  if (customer.status === 'merged') return { label: 'Merged', tone: 'warning' }
  if (customer.status === 'deleted') return { label: 'Deleted', tone: 'danger' }
  if (customer.account?.commercialRole === 'VIP') return { label: 'VIP account', tone: 'warning' }
  if (customer.account?.linked) return { label: 'Account linked', tone: 'success' }
  return { label: 'Guest / channel', tone: 'info' }
}

function primaryContact(customer) {
  const verified = customer.contacts?.find(contact => contact.verificationStatus === 'verified')
  return verified || customer.contacts?.[0] || null
}

export default function Customers() {
  const secure = adminBffEnabled()
  const [customers, setCustomers] = useState([])
  const [mode, setMode] = useState('legacy_profiles')
  const [metricsAvailable, setMetricsAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCustomers = useCallback(async () => {
    setLoading(true); setError('')
    if (secure) {
      const result = await getAdminCustomers()
      if (!result.ok) setError(result.error)
      else {
        setCustomers(result.data?.customers || [])
        setMode(result.data?.mode || 'legacy_profiles')
        setMetricsAvailable(Boolean(result.data?.metricsAvailable))
      }
      setLoading(false)
      return
    }
    if (!supabase) { setError('Customer storage is not configured.'); setLoading(false); return }
    const { data, error: fetchError } = await supabase.from('user_profiles')
      .select(LEGACY_PROJECTION).in('role', ['Customer', 'VIP'])
      .order('created_at', { ascending: false }).limit(500)
    if (fetchError) setError('Customer profiles could not be loaded safely.')
    else { setCustomers((data || []).map(legacyCustomer)); setMode('legacy_profiles'); setMetricsAvailable(false) }
    setLoading(false)
  }, [secure])

  useEffect(() => {
    fetchCustomers()
    if (secure || !supabase) return undefined
    const channel = supabase.channel('admin:customer-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, fetchCustomers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchCustomers, secure])

  const metrics = useMemo(() => ({
    total: customers.length,
    accounts: customers.filter(customer => customer.account?.linked).length,
    guestOrChannel: customers.filter(customer => !customer.account?.linked).length,
    linkedChannels: customers.reduce((sum, customer) => sum + (customer.channels || []).filter(channel => channel.linkStatus === 'linked').length, 0),
    unread: metricsAvailable ? customers.reduce((sum, customer) => sum + Number(customer.metrics?.unreadCount || 0), 0) : null,
  }), [customers, metricsAvailable])

  return <div className="mx-auto max-w-[1600px] space-y-5 text-white">
    <WorkspaceIntro eyebrow="Customer identity" title="Customers" description="Account, guest, and channel identities stay separate until ownership is verified. Similar names, email addresses, and phone numbers are never merged automatically." actions={<button type="button" onClick={fetchCustomers} disabled={loading} className="min-h-11 rounded-adm-sm border border-adm-line bg-white/5 px-4 text-sm font-semibold disabled:opacity-40">{loading ? 'Refreshing…' : 'Refresh'}</button>} />

    {error && <StateBanner tone="danger">{error}</StateBanner>}
    {!error && <StateBanner tone="info">{mode === 'canonical' ? 'Canonical customer identities are available. Order and conversation totals appear only when every supporting query succeeds.' : 'Current view contains registered Supabase customer profiles only. Guest and marketplace identities remain unavailable until the hybrid identity migration is activated.'}</StateBanner>}

    <MetricRail items={[
      { label: 'Customer records', value: metrics.total },
      { label: 'Accounts linked', value: metrics.accounts, tone: 'text-forest' },
      { label: 'Guest or channel only', value: mode === 'canonical' ? metrics.guestOrChannel : 'Pending', tone: 'text-blue' },
      { label: metricsAvailable ? 'Unread messages' : 'Operational totals', value: metricsAvailable ? metrics.unread : 'Unavailable' },
    ]} />

    <section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
      <div className="p-4"><SectionHeading title="Identity directory" description="This is an operational identity view, not a marketing broadcast list. Contact and channel provenance remains attributable." count={customers.length} /></div>
      {loading ? <div className="space-y-2 border-t border-adm-line p-4" role="status" aria-label="Loading customers">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 rounded-adm-sm bg-white/[0.04]" />)}</div> : customers.length === 0 ? <EmptyState icon={UserIcon} title="No customer identities yet" description={mode === 'canonical' ? 'Guest, account, and channel identities will appear after their first verified interaction.' : 'No registered Customer or VIP profiles exist in the current account directory.'} /> : <>
        <div className="space-y-3 border-t border-adm-line p-3 sm:hidden">{customers.map(customer => <CustomerCard key={customer.id} customer={customer} metricsAvailable={metricsAvailable} />)}</div>
        <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-y border-adm-line bg-adm-sunken text-xs uppercase tracking-wider text-white/55"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Identity</th><th className="px-4 py-3">Channels</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Created</th></tr></thead>
          <tbody className="divide-y divide-adm-line">{customers.map(customer => <CustomerRow key={customer.id} customer={customer} metricsAvailable={metricsAvailable} />)}</tbody>
        </table></div>
      </>}
    </section>
  </div>
}

function CustomerRow({ customer, metricsAvailable }) {
  const state = customerState(customer)
  const contact = primaryContact(customer)
  return <tr className="hover:bg-white/[0.025]"><td className="px-4 py-4"><p className="font-semibold text-white">{customer.displayName}</p><p className="mt-1 text-sm text-white/55">{contact ? `${contact.kind}: ${contact.value}` : 'No contact point available'}</p></td><td className="px-4 py-4"><StatusPill tone={state.tone}>{state.label}</StatusPill><p className="mt-2 text-sm text-white/50">{customer.createdSource.replaceAll('_', ' ')}</p></td><td className="px-4 py-4"><p className="font-semibold tabular-nums">{customer.channels?.length || 0} recorded</p><p className="mt-1 text-sm text-white/55">{customer.channels?.filter(channel => channel.linkStatus === 'linked').map(channel => channel.channel).join(', ') || 'No verified channel link'}</p></td><td className="px-4 py-4">{metricsAvailable && customer.metrics ? <><p className="font-semibold tabular-nums">{customer.metrics.orderCount} orders · {customer.metrics.pasabuyCount} Pasabuy</p><p className="mt-1 text-sm text-white/55">{customer.metrics.conversationCount} conversations · {customer.metrics.unreadCount} unread</p></> : <span className="text-sm text-white/50">Operational totals unavailable</span>}</td><td className="px-4 py-4 text-sm text-white/65">{new Date(customer.createdAt).toLocaleDateString()}</td></tr>
}

function CustomerCard({ customer, metricsAvailable }) {
  const state = customerState(customer)
  const contact = primaryContact(customer)
  return <article className="rounded-adm-sm border border-adm-line bg-adm-sunken p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-base font-bold">{customer.displayName}</p><p className="mt-1 break-all text-sm leading-6 text-white/60">{contact ? `${contact.kind}: ${contact.value}` : 'No contact point available'}</p></div><StatusPill tone={state.tone}>{state.label}</StatusPill></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-white/50">Recorded channels</dt><dd className="mt-1 font-semibold tabular-nums">{customer.channels?.length || 0}</dd></div><div><dt className="text-white/50">Created</dt><dd className="mt-1 font-semibold">{new Date(customer.createdAt).toLocaleDateString()}</dd></div><div className="col-span-2"><dt className="text-white/50">Operational activity</dt><dd className="mt-1 leading-6">{metricsAvailable && customer.metrics ? `${customer.metrics.orderCount} orders · ${customer.metrics.pasabuyCount} Pasabuy · ${customer.metrics.conversationCount} conversations` : 'Unavailable until canonical identity queries are complete'}</dd></div></dl></article>
}
