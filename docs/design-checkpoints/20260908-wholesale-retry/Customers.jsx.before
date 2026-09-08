import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BriefcaseIcon, UserIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import { adminBffEnabled, getAdminCustomers, getAdminWholesaleInquiries, reviewAdminWholesaleInquiry } from '../../services/adminBffService'
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
  const [inquiries, setInquiries] = useState([])
  const [inquiryError, setInquiryError] = useState('')
  const [reviewing, setReviewing] = useState(null)
  const [reviewStatus, setReviewStatus] = useState('under_review')
  const [reviewReason, setReviewReason] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [savingReview, setSavingReview] = useState(false)

  const openReview = inquiry => {
    setReviewing(inquiry)
    setReviewStatus(inquiry.status==='closed'?'under_review':inquiry.status==='under_review'?'closed':'under_review')
    setReviewReason(''); setReviewError('')
  }

  const saveReview = async event => {
    event.preventDefault()
    if(!reviewing||reviewReason.trim().length<3) return
    setSavingReview(true); setReviewError('')
    const result=await reviewAdminWholesaleInquiry(reviewing.publicReference,reviewStatus,reviewReason.trim())
    if(!result.ok){setReviewError(result.error);setSavingReview(false);return}
    setInquiries(current=>current.map(inquiry=>inquiry.publicReference===reviewing.publicReference?{...inquiry,status:result.result?.status||reviewStatus,updatedAt:result.result?.updatedAt||new Date().toISOString()}:inquiry))
    setSavingReview(false); setReviewing(null)
  }

  const fetchCustomers = useCallback(async () => {
    setLoading(true); setError(''); setInquiryError('')
    if (secure) {
      const [result,inquiryResult] = await Promise.all([getAdminCustomers(),getAdminWholesaleInquiries()])
      if (!result.ok) setError(result.error)
      else {
        setCustomers(result.data?.customers || [])
        setMode(result.data?.mode || 'legacy_profiles')
        setMetricsAvailable(Boolean(result.data?.metricsAvailable))
      }
      if(!inquiryResult.ok) setInquiryError(inquiryResult.error)
      else setInquiries(inquiryResult.data?.inquiries || [])
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

    <WholesaleInquirySection secure={secure} inquiryError={inquiryError} loading={loading} inquiries={inquiries} onReview={openReview} />
    {reviewing&&<WholesaleReviewDialog inquiry={reviewing} status={reviewStatus} setStatus={setReviewStatus} reason={reviewReason} setReason={setReviewReason} error={reviewError} saving={savingReview} onClose={()=>!savingReview&&setReviewing(null)} onSubmit={saveReview} />}

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

export function WholesaleInquirySection({secure,inquiryError,loading,inquiries,onReview}) {
  return <section className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
    <div className="p-4"><SectionHeading title="Wholesale inquiries" description="Submitted business needs only. An inquiry is not an approved organization, buyer, price list, credit decision, stock allocation, or delivery promise." count={secure&&!inquiryError?inquiries.length:undefined} /></div>
    {!secure?<StateBanner tone="info">Secure Wholesale inquiry review is unavailable until the Admin and Storefront BFF boundaries are activated together.</StateBanner>:inquiryError?<div className="border-t border-adm-line p-4"><StateBanner tone="danger">Wholesale inquiries are unavailable. Customer identities remain separately usable in the directory below.</StateBanner></div>:loading?<div className="space-y-2 border-t border-adm-line p-4" role="status" aria-label="Loading Wholesale inquiries">{Array.from({length:2}).map((_,index)=><div key={index} className="h-24 rounded-adm-sm bg-white/[0.04]" />)}</div>:inquiries.length===0?<EmptyState icon={BriefcaseIcon} title="No Wholesale inquiries recorded" description="A server-confirmed inquiry will appear here after the secure Storefront boundary is active." />:<>
      <div className="space-y-3 border-t border-adm-line p-3 md:hidden">{inquiries.map(inquiry=><WholesaleInquiryCard key={inquiry.publicReference} inquiry={inquiry} onReview={onReview} />)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1060px] text-left text-sm"><thead className="border-y border-adm-line bg-adm-sunken text-xs uppercase tracking-wider text-white/55"><tr><th className="px-4 py-3">Inquiry</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Need</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-adm-line">{inquiries.map(inquiry=><tr key={inquiry.publicReference}><td className="px-4 py-4"><p className="font-mono text-xs font-semibold text-blue">{inquiry.publicReference}</p><p className="mt-1 font-semibold">{inquiry.organizationName}</p><p className="mt-1 text-xs text-white/45">{inquiry.businessType?.replaceAll('_',' ')}</p></td><td className="px-4 py-4"><p className="font-semibold">{inquiry.contactName}</p><p className="mt-1 text-sm text-white/55">{inquiry.email||inquiry.phone||'Contact unavailable'}</p></td><td className="max-w-md px-4 py-4"><p className="line-clamp-2 leading-6">{inquiry.targetItems}</p><p className="mt-1 text-xs text-white/45">{inquiry.volumeBand?.replaceAll('_',' ')} · {inquiry.deliveryArea}</p></td><td className="px-4 py-4"><StatusPill tone="info">{inquiry.status?.replaceAll('_',' ')}</StatusPill><p className="mt-2 text-xs text-white/45">No commercial approval</p></td><td className="px-4 py-4 text-right"><button type="button" onClick={()=>onReview(inquiry)} className="min-h-11 rounded-adm-sm border border-adm-line bg-white/5 px-4 font-semibold hover:bg-white/10">Review</button></td></tr>)}</tbody></table></div>
    </>}
  </section>
}

function WholesaleInquiryCard({inquiry,onReview}) {
  return <article className="rounded-adm-sm border border-adm-line bg-adm-sunken p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs font-semibold text-blue">{inquiry.publicReference}</p><h3 className="mt-1 truncate font-semibold">{inquiry.organizationName}</h3></div><StatusPill tone="info">{inquiry.status?.replaceAll('_',' ')}</StatusPill></div><p className="mt-3 text-sm leading-6 text-white/75">{inquiry.targetItems}</p><dl className="mt-3 grid gap-2 text-xs text-white/50"><div><dt className="sr-only">Contact</dt><dd>{inquiry.contactName} · {inquiry.email || inquiry.phone || 'Contact unavailable'}</dd></div><div><dt className="sr-only">Volume and area</dt><dd>{inquiry.volumeBand?.replaceAll('_',' ')} · {inquiry.deliveryArea}</dd></div></dl><p className="mt-3 border-t border-adm-line pt-3 text-xs font-semibold text-white/45">Inquiry only · no commercial approval</p><button type="button" onClick={()=>onReview(inquiry)} className="mt-3 min-h-11 w-full rounded-adm-sm border border-adm-line bg-white/5 px-4 text-sm font-semibold">Review inquiry</button></article>
}

export function WholesaleReviewDialog({inquiry,status,setStatus,reason,setReason,error,saving,onClose,onSubmit}) {
  const options=inquiry.status==='submitted'?['under_review','closed']:inquiry.status==='under_review'?['submitted','closed']:['under_review']
  const dialogRef=useRef(null)
  const closeRef=useRef(onClose); const savingRef=useRef(saving)
  closeRef.current=onClose; savingRef.current=saving
  useEffect(()=>{
    const previousOverflow=document.body.style.overflow; document.body.style.overflow='hidden'
    dialogRef.current?.querySelector('select')?.focus()
    const keydown=event=>{if(event.key==='Escape'&&!savingRef.current) closeRef.current()}
    document.addEventListener('keydown',keydown)
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keydown)}
  },[])
  return <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-6" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="wholesale-review-title" className="max-h-[90vh] w-full overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 shadow-2xl sm:max-w-lg sm:rounded-adm"><p className="font-mono text-xs font-semibold text-blue">{inquiry.publicReference}</p><h2 id="wholesale-review-title" className="mt-1 text-xl font-bold">Review {inquiry.organizationName}</h2><p className="mt-2 text-sm leading-6 text-white/60">This records triage only. It cannot approve a buyer, price, credit, stock, terms, or delivery.</p><form className="mt-5 space-y-4" onSubmit={onSubmit}><label className="block text-sm font-semibold" htmlFor="wholesale-review-status">New status<select id="wholesale-review-status" value={status} onChange={event=>setStatus(event.target.value)} className="mt-2 min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-white">{options.map(option=><option key={option} value={option}>{option.replaceAll('_',' ')}</option>)}</select></label><label className="block text-sm font-semibold" htmlFor="wholesale-review-reason">Reason<textarea id="wholesale-review-reason" required minLength={3} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)} rows={4} className="mt-2 w-full rounded-adm-sm border border-adm-line bg-adm-sunken p-3 text-white" placeholder="What staff verified or why this inquiry is being closed" /></label>{error&&<StateBanner tone="danger">{error}</StateBanner>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-adm-sm border border-adm-line px-4 font-semibold disabled:opacity-40">Cancel</button><button type="submit" disabled={saving||reason.trim().length<3} className="min-h-11 rounded-adm-sm bg-blue px-4 font-semibold text-white disabled:opacity-40">{saving?'Recording…':'Record status'}</button></div></form></section></div>
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
