import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import { CheckIcon, GlobeIcon, XIcon } from '../../components/ui/icons'
import { adminBffEnabled, getAdminChannelsBff, verifyInternalChannelBff } from '../../services/adminBffService'
import {
  MetricRail,
  SectionHeading,
  StateBanner,
  StatusPill,
  WorkspaceIntro,
  primaryButton,
  secondaryButton,
} from './AdminWorkspaceUi'

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || ''
const REF = (SUPA_URL.match(/https?:\/\/([a-z0-9-]+)\.supabase\./i) || [])[1] || ''
const SUPA_BASE = REF ? `https://supabase.com/dashboard/project/${REF}` : 'https://supabase.com/dashboard'
const SUPA_SECRETS = REF ? `${SUPA_BASE}/settings/functions` : SUPA_BASE
const SUPA_FUNCTIONS = REF ? `${SUPA_BASE}/functions` : SUPA_BASE

const CHANNELS = [
  { key: 'website', name: 'K2 Jimzon Website', color: '#9f1f2f', internal: true, description: 'Storefront catalog and order-request intake.' },
  { key: 'pasabuy', name: 'K2 Jimzon Pasabuy', color: '#b99045', internal: true, description: 'Customer sourcing requests, quote versions, and status trail.' },
  { key: 'shopee', name: 'Shopee', color: '#c44b35', portal: 'https://open.shopee.com', secrets: ['SHOPEE_PARTNER_ID', 'SHOPEE_PARTNER_KEY', 'SHOPEE_SHOP_ID'], description: 'Product listings, orders, and stock updates after connector activation.' },
  { key: 'tiktok', name: 'TikTok Shop', color: '#202734', portal: 'https://partner.tiktokshop.com', secrets: ['TIKTOK_APP_KEY', 'TIKTOK_APP_SECRET', 'TIKTOK_SHOP_ID'], description: 'Catalog and order sync after partner access and webhooks are configured.' },
  { key: 'lazada', name: 'Lazada', color: '#27306f', portal: 'https://open.lazada.com', secrets: ['LAZADA_APP_KEY', 'LAZADA_APP_SECRET', 'LAZADA_SELLER_ID'], description: 'Catalog, orders, and inventory sync after Open Platform access.' },
]

export default function ChannelIntegrations({ secureMode }) {
  const secure = secureMode ?? adminBffEnabled()
  const [connections, setConnections] = useState({})
  const [readiness, setReadiness] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [guide, setGuide] = useState(null)
  const [verify, setVerify] = useState(null)

  const load = useCallback(async (signal) => {
    if (secure) {
      const response = await getAdminChannelsBff(signal)
      if (response.aborted) return
      if (!response.ok) setError(response.error || 'Channel evidence could not be loaded.')
      else {
        const map = {}
        for (const row of response.channels.connections || []) map[row.channel] = {
          ...row, last_event_at: row.lastEventAt, updated_at: row.updatedAt,
        }
        setConnections(map)
        setReadiness(response.channels.readiness || [])
        setError('')
      }
      setLoading(false)
      return
    }
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    const [connectionRows, readinessRows] = await Promise.all([
      supabase.from('channel_connections').select('channel,status,last_event_at,note,updated_at'),
      supabase.from('v_channel_catalog_readiness').select('*'),
    ])
    const firstError = connectionRows.error || readinessRows.error
    setError(firstError ? safeUiError('CHANNEL_LOAD_FAILED') : '')
    const map = {}
    for (const row of connectionRows.data || []) map[row.channel] = row
    setConnections(map)
    setReadiness(readinessRows.data || [])
    setLoading(false)
  }, [secure])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    if (secure) {
      const refresh = () => { if (document.visibilityState === 'visible') load(controller.signal) }
      const interval = window.setInterval(refresh, 30_000)
      document.addEventListener('visibilitychange', refresh)
      return () => { controller.abort(); window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
    }
    if (!supabase) return undefined
    const channel = supabase.channel('admin:channel-readiness')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_connections' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_listings' }, load)
      .subscribe()
    return () => { controller.abort(); supabase.removeChannel(channel) }
  }, [load, secure])

  const stats = useMemo(() => Object.fromEntries(CHANNELS.map(channel => {
    const rows = readiness.filter(row => row.channel === channel.key)
    const aggregate = rows.find(row => Number.isInteger(row.total))
    return [channel.key, aggregate || {
      total: rows.length,
      ready: rows.filter(row => (row.missing_fields || []).length === 0 && ['ready', 'published'].includes(row.publication_status)).length,
      incomplete: rows.filter(row => (row.missing_fields || []).length > 0).length,
      published: rows.filter(row => row.publication_status === 'published').length,
    }]
  })), [readiness])

  const liveCount = CHANNELS.filter(channel => connections[channel.key]?.status === 'live').length
  const blockedChannels = CHANNELS.length - liveCount
  const marketplaceTotals = CHANNELS.filter(channel => !channel.internal).reduce((totals, channel) => {
    const channelStats = stats[channel.key] || {}
    totals.rows += channelStats.total || 0
    totals.ready += channelStats.ready || 0
    totals.incomplete += channelStats.incomplete || 0
    totals.published += channelStats.published || 0
    return totals
  }, { rows: 0, ready: 0, incomplete: 0, published: 0 })

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-12">
      <WorkspaceIntro
        eyebrow="Multichannel control"
        title="Channel readiness board"
        description="One product master feeds the Website, Shopee, TikTok Shop, and Lazada. Pasabuy remains a request-and-quote channel. Operational means a real event was reconciled; it is never a manual test toggle."
        status={loading ? 'Checking channel evidence' : `${liveCount} of ${CHANNELS.length} operational`}
        statusTone={liveCount === CHANNELS.length ? 'success' : 'warning'}
      />

      <MetricRail columns="lg:grid-cols-5" items={[
        { label: 'Operational channels', value: loading ? '--' : `${liveCount}/${CHANNELS.length}`, detail: 'Reconciled real events', tone: liveCount === CHANNELS.length ? 'text-forest' : 'text-amber' },
        { label: 'Blocked channels', value: loading ? '--' : blockedChannels, detail: 'Connector or verification work', tone: blockedChannels ? 'text-amber' : 'text-white' },
        { label: 'Marketplace rows', value: loading ? '--' : marketplaceTotals.rows, detail: 'Shopee, TikTok, Lazada' },
        { label: 'Ready drafts', value: loading ? '--' : marketplaceTotals.ready, detail: 'Validated, not necessarily live', tone: 'text-blue' },
        { label: 'Incomplete rows', value: loading ? '--' : marketplaceTotals.incomplete, detail: 'Missing listing data', tone: marketplaceTotals.incomplete ? 'text-crimson' : 'text-white' },
      ]} />

      {error && <StateBanner tone="warning">{error}. Apply the launch-core migration to enable readiness reporting.</StateBanner>}
      {!secure && <StateBanner tone="warning">Transitional staff database path. The signed channel boundary remains inactive until coordinated cutover.</StateBanner>}

      <section className="space-y-3">
        <SectionHeading title="Channel evidence and next action" description="Connection truth, catalog preparation, and the next safe operational step for each income channel." count={CHANNELS.length} />
        <div className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
          <div className="hidden grid-cols-[minmax(220px,1.4fr)_130px_minmax(220px,1fr)_220px] gap-4 border-b border-adm-line bg-white/[0.025] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.09em] text-white/35 lg:grid">
            <span>Channel</span><span>State</span><span>Catalog evidence</span><span className="text-right">Next action</span>
          </div>
          <div className="divide-y divide-adm-line">
            {CHANNELS.map(channel => {
              const connection = connections[channel.key]
              const live = connection?.status === 'live'
              const degraded = connection?.status === 'degraded'
              const failed = connection?.status === 'error'
              const channelStats = stats[channel.key] || { total: 0, ready: 0, incomplete: 0, published: 0 }
              const lastEvent = connection?.last_event_at ? new Date(connection.last_event_at).toLocaleString() : 'No reconciled event'
              return (
                <article key={channel.key} className="grid gap-3 px-4 py-4 transition-colors duration-150 hover:bg-white/[0.025] lg:grid-cols-[minmax(220px,1.4fr)_130px_minmax(220px,1fr)_220px] lg:items-center lg:gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-adm-sm border border-white/10 text-white" style={{ backgroundColor: channel.color }}><GlobeIcon size={17} /></span>
                    <div className="min-w-0"><h3 className="text-sm font-semibold text-white">{channel.name}</h3><p className="mt-0.5 text-xs leading-relaxed text-white/45">{channel.description}</p></div>
                  </div>
                  <div><StatusPill tone={live ? 'success' : failed ? 'danger' : degraded ? 'warning' : 'neutral'}>{live ? 'Operational' : failed ? 'Connector error' : degraded ? 'Events only' : 'Not connected'}</StatusPill></div>
                  <div>
                    {channel.internal ? (
                      <><p className="text-xs font-medium text-white/65">{lastEvent}</p><p className="mt-1 text-xs text-white/35">{connection?.note || 'Internal intake requires reconciliation.'}</p></>
                    ) : (
                      <><div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular-nums"><span className="text-white/65">{channelStats.total} rows</span><span className="text-blue">{channelStats.ready} ready</span><span className={channelStats.incomplete ? 'text-crimson' : 'text-white/45'}>{channelStats.incomplete} incomplete</span></div><p className="mt-1 text-xs text-white/35">{live ? `Last reconciled event ${lastEvent}` : degraded ? connection?.note : 'Seller Center remains the Step 1 fallback.'}</p></>
                    )}
                  </div>
                  <div className="flex lg:justify-end">
                    {channel.internal && !live ? <button onClick={() => setVerify(channel)} className={`${secondaryButton} border-forest/35 bg-forest/10 text-forest`}>Verify real event</button> : !channel.internal ? <button onClick={() => setGuide(channel)} className={live ? secondaryButton : primaryButton}>Connector checklist</button> : <span className="text-xs text-white/35">Monitor real events</span>}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <StateBanner tone="info"><strong className="font-semibold text-white/80">Operating rule:</strong> External marketplaces are not connected. Prepare channel titles, prices, images, and identifiers as drafts. Do not mark a marketplace row published or include it in synchronized stock until a real connector returns success. Marketplace Seller Centers remain the manual fallback during Step 1.</StateBanner>

      {guide && <ConnectorGuide channel={guide} onClose={() => setGuide(null)} />}
      {verify && <InternalVerification secure={secure} channel={verify} onClose={() => setVerify(null)} onVerified={async () => { setVerify(null); await load() }} />}
    </div>
  )
}

function InternalVerification({ secure, channel, onClose, onVerified }) {
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = event => { if (event.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [busy, onClose])
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('')
    const result = secure
      ? await verifyInternalChannelBff({ channel: channel.key, publicReference: reference.trim(), reason: note.trim() })
      : await supabase.rpc('verify_internal_channel_event', { p_channel: channel.key, p_public_reference: reference.trim(), p_note: note.trim() })
    setBusy(false)
    if ((secure && !result.ok) || (!secure && result.error)) { setError(secure ? (result.error || 'The event could not be verified.') : safeUiError('UI_OPERATION_FAILED')); return }
    await onVerified()
  }
  const input = 'mt-1.5 min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-base text-white outline-none focus:border-forest'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 sm:items-center sm:p-3" role="presentation">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:rounded-adm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="internal-verification-title">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-forest">Real-event reconciliation</p><h2 id="internal-verification-title" className="mt-1 text-xl font-semibold">Verify {channel.name}</h2><p className="mt-2 text-sm leading-relaxed text-white/55">Enter a request that you opened in the dashboard and checked against the submitted customer details. This status is operational evidence, not a test toggle.</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close verification dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-adm-sm border border-adm-line"><XIcon size={18} /></button></div>
        <label className="block text-xs font-semibold text-white/60">Public request reference<input className={input} value={reference} onChange={event => setReference(event.target.value)} placeholder={channel.key === 'website' ? 'WEB-...' : 'PB-...'} required /></label>
        <label className="block text-xs font-semibold text-white/60">Reconciliation note<textarea className={`${input} min-h-24 resize-y`} value={note} onChange={event => setNote(event.target.value)} placeholder="What was checked and by whom?" required /></label>
        {error && <StateBanner tone="danger">{error}</StateBanner>}
        <div className="flex gap-2"><button type="button" onClick={onClose} className={`${secondaryButton} flex-1`}>Cancel</button><button type="submit" disabled={busy} className={`${primaryButton} flex-1 bg-forest`}>{busy ? 'Verifying...' : 'Mark operational'}</button></div>
      </form>
    </div>
  )
}

function ConnectorGuide({ channel, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
  const steps = [
    ['Prepare catalog drafts', 'Validate names, channel price, stock, images, and identifiers in the readiness board.'],
    ['Obtain partner access', `Create the approved app in ${channel.name} and record which shop or account it controls.`],
    ['Store secrets server-side', `Add ${channel.secrets.join(', ')} only to Supabase function secrets.`],
    ['Deploy and verify webhooks', 'Test signatures, retries, idempotency, order detail retrieval, and stock update failures.'],
    ['Reconcile the first real event', 'Compare the marketplace order and inventory result before changing status to operational.'],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 sm:items-center sm:p-3" role="presentation">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:rounded-adm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="connector-guide-title">
        <div className="flex items-start justify-between gap-3 border-b border-adm-line pb-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue">Not connected</p><h2 id="connector-guide-title" className="mt-1 text-xl font-semibold">{channel.name} connector checklist</h2></div><button ref={closeRef} onClick={onClose} aria-label="Close connector checklist" className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm bg-white/5 text-white/55 hover:text-white"><XIcon size={18} /></button></div>
        <ol className="mt-5 divide-y divide-adm-line border-y border-adm-line">
          {steps.map(([title, detail], index) => <li key={title} className="flex gap-3 py-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue/30 bg-blue/10 font-mono text-xs font-semibold text-blue">{index + 1}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-sm leading-relaxed text-white/55">{detail}</p></div></li>)}
        </ol>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row"><a href={channel.portal} target="_blank" rel="noreferrer" className={`${secondaryButton} flex-1`}>Open partner portal</a><a href={SUPA_SECRETS} target="_blank" rel="noreferrer" className={`${secondaryButton} flex-1 border-forest/35 text-forest`}>Function secrets</a><a href={SUPA_FUNCTIONS} target="_blank" rel="noreferrer" className={`${primaryButton} flex-1`}>Functions</a></div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-white/45"><CheckIcon size={15} className="mt-0.5 shrink-0 text-forest" />Secrets never enter this dashboard or a listing CSV. Connection status is updated only by the backend connector.</p>
      </div>
    </div>
  )
}
