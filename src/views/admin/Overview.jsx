import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peso } from '../../data/products'
import {
  AlertIcon,
  ArrowIcon,
  BagIcon,
  BoxIcon,
  CheckIcon,
  ClockIcon,
  GlobeIcon,
  InboxIcon,
  SyncIcon,
  TrendIcon,
} from '../../components/ui/icons'

const RANGE_OPTIONS = [7, 30, 90]
const ACTIVE_PASABUY = new Set([
  'request_received', 'researching', 'quoted', 'approved', 'purchasing',
  'purchased', 'in_transit', 'arrived',
])

const CHANNELS = [
  { id: 'website', label: 'Website', description: 'Direct order requests' },
  { id: 'pasabuy', label: 'Pasabuy', description: 'Custom sourcing' },
  { id: 'shopee', label: 'Shopee', description: 'Seller Center' },
  { id: 'tiktok', label: 'TikTok Shop', description: 'Shop operations' },
  { id: 'lazada', label: 'Lazada', description: 'Open Platform' },
]

const PASABUY_STAGES = [
  { label: 'Intake', statuses: ['request_received', 'researching'] },
  { label: 'Quoted', statuses: ['quoted'] },
  { label: 'Approved', statuses: ['approved'] },
  { label: 'Buying', statuses: ['purchasing', 'purchased'] },
  { label: 'In transit', statuses: ['in_transit', 'arrived'] },
]

const EMPTY_DATA = {
  orders: [],
  orderBacklog: 0,
  pasabuy: [],
  batches: [],
  connections: [],
  listings: [],
  products: [],
  conversations: [],
}

const panelClass = 'rounded-adm border border-adm-line bg-adm-surface shadow-adm'
const actionClass = 'transition-[transform,border-color,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-adm-bg'

function startOfPeriod(days, periodOffset = 0) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - (days - 1) - (days * periodOffset))
  return date
}

function dateKey(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeChannel(value = '') {
  const channel = String(value).toLowerCase()
  if (channel.startsWith('shopee')) return 'shopee'
  if (channel.startsWith('tiktok')) return 'tiktok'
  if (channel.startsWith('lazada')) return 'lazada'
  if (channel.startsWith('pasabuy')) return 'pasabuy'
  return 'website'
}

function percentageChange(current, previous) {
  if (previous === 0) return current > 0 ? { label: 'New activity', positive: true } : null
  const value = ((current - previous) / previous) * 100
  return {
    label: `${value >= 0 ? '+' : ''}${value.toFixed(1)}% vs prior period`,
    positive: value >= 0,
  }
}

function compactNumber(value) {
  return new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
}

function buildRevenueSeries(orders, days) {
  const totals = new Map()
  orders
    .filter(order => order.payment_status === 'verified')
    .forEach(order => {
      const key = dateKey(order.created_at)
      totals.set(key, (totals.get(key) || 0) + Number(order.total_amount || 0))
    })

  const formatter = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' })
  return Array.from({ length: days }, (_, index) => {
    const date = startOfPeriod(days)
    date.setDate(date.getDate() + index)
    const key = dateKey(date)
    return { key, label: formatter.format(date), value: totals.get(key) || 0 }
  })
}

function RevenueChart({ points }) {
  const width = 760
  const height = 236
  const pad = { top: 18, right: 14, bottom: 30, left: 58 }
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  const maxValue = Math.max(...points.map(point => point.value), 1)
  const coordinates = points.map((point, index) => ({
    ...point,
    x: pad.left + (index / Math.max(points.length - 1, 1)) * chartWidth,
    y: pad.top + chartHeight - (point.value / maxValue) * chartHeight,
  }))
  const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${linePath} L ${pad.left + chartWidth} ${pad.top + chartHeight} L ${pad.left} ${pad.top + chartHeight} Z`
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Verified revenue by day"
        className="h-auto w-full overflow-visible"
      >
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = pad.top + chartHeight - chartHeight * ratio
          return (
            <g key={ratio}>
              <line x1={pad.left} x2={pad.left + chartWidth} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" />
              <text x={pad.left - 10} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.62)" fontSize="12">
                {compactNumber(maxValue * ratio)}
              </text>
            </g>
          )
        })}
        <path d={areaPath} fill="rgba(59,130,246,0.10)" />
        <path d={linePath} fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point, index) => (
          <g key={point.key}>
            <circle
              cx={point.x}
              cy={point.y}
              r={point.value > 0 ? 3.5 : 2}
              fill={point.value > 0 ? '#93C5FD' : '#334155'}
              stroke="#12161F"
              strokeWidth="2"
              tabIndex="0"
              aria-label={`${point.label}: ${peso(point.value)}`}
            >
              <title>{point.label}: {peso(point.value)}</title>
            </circle>
            {labelIndexes.has(index) && (
              <text x={point.x} y={height - 6} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fill="rgba(255,255,255,0.62)" fontSize="12">
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {points.every(point => point.value === 0) && (
        <p className="-mt-3 text-center text-xs text-white/45">No payment-verified revenue recorded in this period.</p>
      )}
    </div>
  )
}

function PanelHeading({ icon: Icon, title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-adm-line px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-adm-sm bg-blue/10 text-blue">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-white/45">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export default function Overview({ setSection, pending = 0 }) {
  const [range, setRange] = useState(30)
  const [data, setData] = useState(EMPTY_DATA)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!supabase) {
      setError('Supabase is not configured. Operational analytics are unavailable.')
      setLoading(false)
      return
    }

    if (!quiet) setRefreshing(true)
    const priorStart = startOfPeriod(range, 1).toISOString()
    try {
      const results = await Promise.all([
        supabase.from('order_requests').select('id,channel_source,status,payment_status,total_amount,created_at').gte('created_at', priorStart),
        supabase.from('order_requests').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('pasabuy_requests').select('id,status,target_budget_php,assigned_to,created_at'),
        supabase.from('product_batches').select('id,quantity,quantity_available,expiry_date,best_before_date'),
        supabase.from('channel_connections').select('channel,display_name,status,last_event_at,note'),
        supabase.from('channel_listings').select('channel_source,publication_status,validation_errors,last_synced_at,sync_error'),
        supabase.from('products').select('sku,status,stock_available'),
        supabase.from('conversations').select('id,status,priority,unread_count,response_due_at,assigned_to,last_message_at'),
      ])

      const labels = ['orders', 'order backlog', 'Pasabuy', 'batches', 'connections', 'listings', 'products', 'inbox']
      const failures = results
        .map((result, index) => result.error ? `${labels[index]}: ${result.error.message}` : null)
        .filter(Boolean)

      setData({
        orders: results[0].data || [],
        orderBacklog: results[1].count || 0,
        pasabuy: results[2].data || [],
        batches: results[3].data || [],
        connections: results[4].data || [],
        listings: results[5].data || [],
        products: results[6].data || [],
        conversations: results[7].data || [],
      })
      setError(failures.length ? `Some analytics are unavailable — ${failures.join(' · ')}` : '')
      setLastUpdated(new Date())
    } catch (loadError) {
      setError(loadError?.message || 'The analytics workspace could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [range])

  useEffect(() => {
    load({ quiet: true })
    if (!supabase) return undefined

    const channel = supabase.channel(`admin:command-center:${range}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pasabuy_requests' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_connections' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_listings' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load({ quiet: true }))
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [load, range])

  const analytics = useMemo(() => {
    const currentStart = startOfPeriod(range).getTime()
    const previousStart = startOfPeriod(range, 1).getTime()
    const currentOrders = data.orders.filter(order => new Date(order.created_at).getTime() >= currentStart)
    const previousOrders = data.orders.filter(order => {
      const created = new Date(order.created_at).getTime()
      return created >= previousStart && created < currentStart
    })
    const currentVerified = currentOrders.filter(order => order.payment_status === 'verified')
    const previousVerified = previousOrders.filter(order => order.payment_status === 'verified')
    const verifiedRevenue = currentVerified.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    const previousRevenue = previousVerified.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    const openPasabuy = data.pasabuy.filter(request => ACTIVE_PASABUY.has(request.status))
    const now = Date.now()
    const conversations = data.conversations.filter(conversation => !['Resolved', 'Closed'].includes(conversation.status))
    const unread = conversations.reduce((sum, conversation) => sum + Number(conversation.unread_count || 0), 0)
    const overdue = conversations.filter(conversation => conversation.response_due_at && new Date(conversation.response_due_at).getTime() < now).length
    const urgent = conversations.filter(conversation => conversation.priority === 'urgent').length
    const unassigned = conversations.filter(conversation => !conversation.assigned_to).length
    const products = data.products
    const outOfStock = products.filter(product => Number(product.stock_available || 0) <= 0).length
    const lowStockCount = products.filter(product => Number(product.stock_available || 0) > 0 && Number(product.stock_available || 0) <= 5).length
    const thirtyDays = now + (30 * 86400000)
    const expired = data.batches.filter(batch => {
      const date = batch.expiry_date || batch.best_before_date
      return date && new Date(date).getTime() < now && Number(batch.quantity_available ?? batch.quantity ?? 0) > 0
    }).length
    const expiring = data.batches.filter(batch => {
      const date = batch.expiry_date || batch.best_before_date
      const timestamp = date ? new Date(date).getTime() : 0
      return timestamp >= now && timestamp <= thirtyDays && Number(batch.quantity_available ?? batch.quantity ?? 0) > 0
    }).length
    const listingIssues = data.listings.filter(listing => listing.publication_status === 'error' || listing.sync_error || (Array.isArray(listing.validation_errors) && listing.validation_errors.length > 0)).length
    const listingsReady = data.listings.filter(listing => listing.publication_status === 'ready').length

    const channelRows = CHANNELS.map(channel => {
      const orders = currentOrders.filter(order => normalizeChannel(order.channel_source) === channel.id)
      const verified = orders.filter(order => order.payment_status === 'verified')
      const listings = data.listings.filter(listing => normalizeChannel(listing.channel_source) === channel.id)
      const connection = data.connections.find(item => item.channel === channel.id)
      return {
        ...channel,
        status: connection?.status || 'not_connected',
        lastEventAt: connection?.last_event_at || null,
        orders: orders.length,
        revenue: verified.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
        published: listings.filter(listing => listing.publication_status === 'published').length,
        ready: listings.filter(listing => listing.publication_status === 'ready').length,
        issues: listings.filter(listing => listing.publication_status === 'error' || listing.sync_error || (Array.isArray(listing.validation_errors) && listing.validation_errors.length > 0)).length,
      }
    })

    const pasabuyStages = PASABUY_STAGES.map(stage => ({
      ...stage,
      count: openPasabuy.filter(request => stage.statuses.includes(request.status)).length,
    }))

    return {
      currentOrders,
      verifiedRevenue,
      verifiedOrders: currentVerified.length,
      averageOrder: currentVerified.length ? verifiedRevenue / currentVerified.length : 0,
      revenueChange: percentageChange(verifiedRevenue, previousRevenue),
      orderChange: percentageChange(currentVerified.length, previousVerified.length),
      openPasabuy,
      unread,
      overdue,
      urgent,
      unassigned,
      outOfStock,
      lowStock: lowStockCount,
      expiring,
      expired,
      listingIssues,
      listingsReady,
      channelRows,
      liveChannels: channelRows.filter(channel => channel.status === 'live').length,
      pasabuyStages,
      revenueSeries: buildRevenueSeries(currentOrders, range),
    }
  }, [data, range])

  const metrics = [
    { label: 'Verified revenue', value: peso(analytics.verifiedRevenue), detail: `${range}-day payment-verified total`, change: analytics.revenueChange },
    { label: 'Verified orders', value: analytics.verifiedOrders, detail: 'Counted only after verification', change: analytics.orderChange },
    { label: 'Average order value', value: peso(analytics.averageOrder), detail: 'Across verified orders' },
    { label: 'Requests to review', value: data.orderBacklog, detail: 'Submitted; stock not reserved', tone: data.orderBacklog > 0 ? 'warning' : 'normal' },
    { label: 'Open Pasabuy', value: analytics.openPasabuy.length, detail: 'Intake through arrival', tone: analytics.openPasabuy.length > 0 ? 'warning' : 'normal' },
    { label: 'Unread messages', value: analytics.unread, detail: `${analytics.overdue} response deadline${analytics.overdue === 1 ? '' : 's'} missed`, tone: analytics.overdue > 0 ? 'danger' : analytics.unread > 0 ? 'warning' : 'normal' },
  ]

  const queues = [
    { title: 'Website requests awaiting review', count: data.orderBacklog, detail: 'Confirm contact details and available stock.', target: 'omni_hub', icon: InboxIcon, severity: 'high' },
    { title: 'Inbox response deadlines missed', count: analytics.overdue, detail: 'Prioritize overdue customer conversations.', target: 'inbox', icon: ClockIcon, severity: 'critical' },
    { title: 'Open Pasabuy sourcing cases', count: analytics.openPasabuy.length, detail: 'Advance research, quotes, and purchase states.', target: 'pasabuy_manager', icon: BagIcon, severity: 'high' },
    { title: 'Inventory exceptions', count: analytics.outOfStock + analytics.lowStock + analytics.expired + analytics.expiring, detail: `${analytics.outOfStock} out · ${analytics.lowStock} low · ${analytics.expired + analytics.expiring} expiry risk`, target: 'inventory', icon: BoxIcon, severity: 'critical' },
    { title: 'Listings ready or blocked', count: analytics.listingsReady + analytics.listingIssues, detail: `${analytics.listingsReady} ready · ${analytics.listingIssues} with issues`, target: 'integrations', icon: GlobeIcon, severity: 'normal' },
  ].sort((a, b) => (b.count > 0) - (a.count > 0) || b.count - a.count)

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 pb-6">
      <section className="flex flex-col gap-4 border-b border-adm-line pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue">
            <span className="h-1.5 w-1.5 rounded-full bg-blue" />
            Live operations workspace
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Operations command center</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/55">
            Revenue, inventory, customer workload, and channel readiness across Website, Pasabuy, Shopee, TikTok Shop, and Lazada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-h-11 items-center rounded-adm-sm border border-adm-line bg-adm-sunken p-1" aria-label="Reporting period">
            {RANGE_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => setRange(option)}
                aria-pressed={range === option}
                className={`${actionClass} min-h-9 rounded-md px-3 text-xs font-semibold ${range === option ? 'bg-adm-raised text-white shadow-adm' : 'text-white/45 hover:text-white'}`}
              >
                {option}D
              </button>
            ))}
          </div>
          <button
            onClick={() => load()}
            disabled={refreshing}
            className={`${actionClass} flex min-h-11 items-center gap-2 rounded-adm-sm border border-adm-line bg-adm-surface px-3.5 text-xs font-semibold text-white/65 hover:border-adm-line-strong hover:text-white disabled:cursor-wait disabled:opacity-60`}
          >
            <SyncIcon size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/40">
        <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for the first data refresh'}</span>
        <button onClick={() => setSection('integrations')} className={`${actionClass} flex min-h-9 items-center gap-2 rounded-adm-sm px-2 text-white/55 hover:text-white`}>
          <span className={`h-2 w-2 rounded-full ${analytics.liveChannels === CHANNELS.length ? 'bg-emerald-400' : 'bg-amber'}`} />
          {analytics.liveChannels}/{CHANNELS.length} channels operational
          <ArrowIcon size={13} />
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm text-amber">
          <AlertIcon size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section aria-label="Key performance indicators" className={`${panelClass} grid overflow-hidden grid-cols-2 md:grid-cols-3 xl:grid-cols-6`}>
        {metrics.map((metric, index) => (
          <div key={metric.label} className={`min-w-0 border-adm-line p-4 ${index < metrics.length - 1 ? 'border-b xl:border-b-0 xl:border-r' : ''} ${index % 2 === 0 ? 'border-r md:border-r-0' : ''} ${index % 3 !== 2 ? 'md:border-r xl:border-r-0' : ''}`}>
            <p className="text-xs font-medium text-white/50">{metric.label}</p>
            <p className={`mt-2 truncate font-mono text-xl font-semibold tabular-nums ${metric.tone === 'danger' ? 'text-crimson' : metric.tone === 'warning' ? 'text-amber' : 'text-white'}`}>
              {loading ? '—' : metric.value}
            </p>
            <p className="mt-1.5 min-h-8 text-xs leading-relaxed text-white/38">{metric.detail}</p>
            {metric.change && (
              <p className={`mt-1 text-xs font-medium ${metric.change.positive ? 'text-emerald-400' : 'text-crimson'}`}>{metric.change.label}</p>
            )}
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className={`${panelClass} min-w-0 xl:col-span-8`}>
          <PanelHeading icon={TrendIcon} title="Verified revenue trend" description={`Daily payment-verified revenue for the selected ${range}-day window.`} />
          <div className="p-3 sm:p-5">
            {loading ? <div className="h-56 animate-pulse rounded-adm-sm bg-white/[0.04]" /> : <RevenueChart points={analytics.revenueSeries} />}
          </div>
        </section>

        <section className={`${panelClass} xl:col-span-4`}>
          <PanelHeading icon={AlertIcon} title="Priority queue" description="Database-backed work ranked by immediate operational impact." />
          <div className="divide-y divide-adm-line">
            {queues.map(queue => {
              const Icon = queue.icon
              const active = queue.count > 0
              return (
                <button
                  key={queue.title}
                  onClick={() => setSection(queue.target)}
                  className={`${actionClass} group grid min-h-[76px] w-full grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.035] sm:px-5`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-adm-sm ${active ? 'bg-amber/10 text-amber' : 'bg-white/[0.04] text-white/35'}`}><Icon size={16} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-white/85">{queue.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/40">{queue.detail}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`font-mono text-base font-semibold tabular-nums ${active ? queue.severity === 'critical' ? 'text-crimson' : 'text-amber' : 'text-white/35'}`}>{loading ? '—' : queue.count}</span>
                    <ArrowIcon size={13} className="text-white/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white/60" />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className={`${panelClass} min-w-0 xl:col-span-8`}>
          <PanelHeading
            icon={GlobeIcon}
            title="Channel performance and readiness"
            description="Revenue reflects verified internal records; connection status never implies an API connector."
            action={<button onClick={() => setSection('integrations')} className={`${actionClass} hidden min-h-9 items-center gap-1.5 rounded-adm-sm px-2 text-xs font-semibold text-blue hover:bg-blue/10 sm:flex`}>Manage <ArrowIcon size={13} /></button>}
          />
          <div className="divide-y divide-adm-line">
            <div className="hidden grid-cols-[minmax(160px,1.5fr)_1fr_.7fr_1fr_1fr] gap-3 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/35 md:grid">
              <span>Channel</span><span>Status</span><span>Requests</span><span>Verified revenue</span><span>Listings</span>
            </div>
            {analytics.channelRows.map(channel => (
              <div key={channel.id} className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3.5 md:grid-cols-[minmax(160px,1.5fr)_1fr_.7fr_1fr_1fr] md:items-center md:gap-3 md:px-5">
                <div className="col-span-2 min-w-0 md:col-span-1">
                  <p className="text-xs font-semibold text-white">{channel.label}</p>
                  <p className="mt-0.5 text-xs text-white/38">{channel.description}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${channel.status === 'live' ? 'text-emerald-400' : 'text-white/45'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${channel.status === 'live' ? 'bg-emerald-400' : 'bg-white/25'}`} />
                    {channel.status === 'live' ? 'Operational' : 'Not connected'}
                  </span>
                </div>
                <div className="text-right md:text-left">
                  <span className="md:hidden text-xs uppercase tracking-wider text-white/35">Requests </span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-white/75">{channel.orders}</span>
                </div>
                <div>
                  <span className="md:hidden block text-xs uppercase tracking-wider text-white/35">Verified revenue</span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-white/75">{peso(channel.revenue)}</span>
                </div>
                <div className="text-right md:text-left">
                  <span className="md:hidden block text-xs uppercase tracking-wider text-white/35">Listings</span>
                  <span className={`font-mono text-xs font-semibold tabular-nums ${channel.issues > 0 ? 'text-crimson' : channel.ready > 0 ? 'text-amber' : 'text-white/65'}`}>
                    {channel.published} live · {channel.ready} ready{channel.issues > 0 ? ` · ${channel.issues} blocked` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${panelClass} xl:col-span-4`}>
          <PanelHeading icon={InboxIcon} title="Inbox workload" description="Current open-conversation pressure and response risk." />
          <div className="grid grid-cols-2">
            {[
              { label: 'Unread', value: analytics.unread, tone: analytics.unread > 0 ? 'text-amber' : 'text-white' },
              { label: 'Overdue SLA', value: analytics.overdue, tone: analytics.overdue > 0 ? 'text-crimson' : 'text-white' },
              { label: 'Urgent', value: analytics.urgent, tone: analytics.urgent > 0 ? 'text-crimson' : 'text-white' },
              { label: 'Unassigned', value: analytics.unassigned, tone: analytics.unassigned > 0 ? 'text-amber' : 'text-white' },
            ].map((item, index) => (
              <div key={item.label} className={`p-4 sm:p-5 ${index % 2 === 0 ? 'border-r border-adm-line' : ''} ${index < 2 ? 'border-b border-adm-line' : ''}`}>
                <p className={`font-mono text-2xl font-semibold tabular-nums ${item.tone}`}>{loading ? '—' : item.value}</p>
                <p className="mt-1 text-xs text-white/45">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-adm-line p-3">
            <button onClick={() => setSection('inbox')} className={`${actionClass} flex min-h-11 w-full items-center justify-center gap-2 rounded-adm-sm bg-blue/10 text-xs font-semibold text-blue hover:bg-blue/15`}>
              Open unified inbox <ArrowIcon size={13} />
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panelClass}>
          <PanelHeading icon={BagIcon} title="Pasabuy pipeline" description="Open requests by the next operational milestone." />
          <div className="space-y-3 p-4 sm:p-5">
            {analytics.pasabuyStages.map(stage => {
              const total = Math.max(analytics.openPasabuy.length, 1)
              const width = `${(stage.count / total) * 100}%`
              return (
                <div key={stage.label} className="grid grid-cols-[72px_1fr_28px] items-center gap-3">
                  <span className="text-xs text-white/55">{stage.label}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-blue" style={{ width }} />
                  </span>
                  <span className="text-right font-mono text-xs font-semibold tabular-nums text-white/75">{stage.count}</span>
                </div>
              )
            })}
            {!loading && analytics.openPasabuy.length === 0 && <p className="pt-1 text-xs text-white/40">No active Pasabuy cases. New requests will appear here automatically.</p>}
          </div>
          <div className="border-t border-adm-line p-3">
            <button onClick={() => setSection('pasabuy_manager')} className={`${actionClass} flex min-h-11 w-full items-center justify-center gap-2 rounded-adm-sm text-xs font-semibold text-white/60 hover:bg-white/[0.04] hover:text-white`}>
              Review Pasabuy cases <ArrowIcon size={13} />
            </button>
          </div>
        </section>

        <section className={panelClass}>
          <PanelHeading icon={BoxIcon} title="Inventory health" description="SKU availability and FEFO batch risk requiring staff review." />
          <div className="divide-y divide-adm-line px-4 sm:px-5">
            {[
              { label: 'Catalog SKUs', value: data.products.length, detail: 'Current product records', tone: 'text-white' },
              { label: 'Out of stock', value: analytics.outOfStock, detail: 'No sellable units', tone: analytics.outOfStock > 0 ? 'text-crimson' : 'text-white' },
              { label: 'Low stock', value: analytics.lowStock, detail: '1–5 units available', tone: analytics.lowStock > 0 ? 'text-amber' : 'text-white' },
              { label: 'Expiry risk', value: analytics.expired + analytics.expiring, detail: `${analytics.expired} expired · ${analytics.expiring} within 30 days`, tone: analytics.expired > 0 ? 'text-crimson' : analytics.expiring > 0 ? 'text-amber' : 'text-white' },
            ].map(item => (
              <div key={item.label} className="flex min-h-[58px] items-center justify-between gap-4 py-3">
                <div><p className="text-xs font-medium text-white/75">{item.label}</p><p className="mt-0.5 text-xs text-white/38">{item.detail}</p></div>
                <p className={`font-mono text-lg font-semibold tabular-nums ${item.tone}`}>{loading ? '—' : item.value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-adm-line p-3">
            <button onClick={() => setSection('inventory')} className={`${actionClass} flex min-h-11 w-full items-center justify-center gap-2 rounded-adm-sm text-xs font-semibold text-white/60 hover:bg-white/[0.04] hover:text-white`}>
              Open inventory workspace <ArrowIcon size={13} />
            </button>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3 border-t border-adm-line pt-4 text-xs leading-relaxed text-white/40 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-4xl items-start gap-2">
          <CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-400" />
          <p>Revenue includes only payment-verified order requests. Marketplace connectors and online payment remain deferred; disconnected channels display zero instead of simulated activity.</p>
        </div>
        {pending > 0 && <p className="shrink-0 text-amber">Legacy fulfillment queue: {pending}</p>}
      </section>
    </div>
  )
}
