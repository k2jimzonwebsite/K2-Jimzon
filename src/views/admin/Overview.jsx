import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import { overviewUnavailable } from '../../lib/overviewAvailability'
import { adminBffEnabled, getAdminOverview } from '../../services/adminBffService'
import { peso } from '../../data/products'
import {
  createSalesExportFilename,
  createSalesRecordCsv,
  filterSalesOrders,
  summarizeSalesReconciliation,
  summarizeSalesOrders,
} from '../../lib/salesCalculations'
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

import { DASHBOARD_WIDGETS } from './dashboardWidgets'

const RANGE_OPTIONS = [7, 30, 90]
const SALES_RECORD_FILTERS = [
  { id: 'all', label: 'All requests' },
  { id: 'verified', label: 'Payment verified' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'verified_fulfilled', label: 'Verified + fulfilled' },
  { id: 'verified_pending', label: 'Verified, not fulfilled' },
  { id: 'fulfilled_unverified', label: 'Fulfilled, payment not verified' },
  { id: 'other', label: 'Neither exact state' },
]
const SALES_RECORD_LIMIT = 25
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
  { id: 'other', label: 'Other / unrecognized', description: 'Preserved source; not attributed to Website' },
]

const OVERVIEW_LABELS = {
  orders: 'orders', orderBacklog: 'order backlog', pasabuy: 'Pasabuy',
  batches: 'batches', connections: 'connections', listings: 'listings',
  products: 'products', conversations: 'inbox',
}

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

const panelClass = 'rounded-adm border border-adm-line bg-adm-surface'
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
  if (!channel || channel === 'website' || channel === 'web') return 'website'
  return 'other'
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

function readableStatus(value) {
  return String(value || 'unknown').replaceAll('_', ' ')
}

function shortOrderReference(value) {
  const reference = String(value || '')
  return reference.length > 12 ? `…${reference.slice(-8)}` : reference || 'Unavailable'
}

function readableOrderDate(value) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date unavailable'
}

function safeOrderValue(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
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
        <p className="-mt-3 text-center text-xs text-white/65">No payment-verified revenue recorded in this period.</p>
      )}
    </div>
  )
}

function PanelHeading({ icon: Icon, title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-adm-line px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-adm-sm bg-white/[0.04] text-white/75">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-white/65">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export default function Overview({ setSection, pending = null, widget = 'metrics', onWidget }) {
  const requestSequence = useRef(0)
  const [unavailable, setUnavailable] = useState(Object.keys(EMPTY_DATA))
  const [stale, setStale] = useState(false)
  const [range, setRange] = useState(30)
  const [loadedRange, setLoadedRange] = useState(null)
  const reportingRange = loadedRange ?? range
  const [salesRecordsOpen, setSalesRecordsOpen] = useState(false)
  const [salesRecordFilter, setSalesRecordFilter] = useState('all')
  const [data, setData] = useState(EMPTY_DATA)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async ({ quiet = false } = {}) => {
    const sequence = ++requestSequence.current
    const useSecureBoundary = adminBffEnabled()
    if (!useSecureBoundary && !supabase) {
      setError('Supabase is not configured. Operational analytics are unavailable.')
      setLoading(false)
      return
    }

    if (!quiet) setRefreshing(true)
    const priorStart = startOfPeriod(range, 1).toISOString()
    try {
      if (useSecureBoundary) {
        const result = await getAdminOverview(range)
        if (!result.ok) throw new Error(result.error)
        if (sequence !== requestSequence.current) return
        setUnavailable(result.unavailable.map(item => item.key))
        setStale(false)
        setLoadedRange(range)
        setData({ ...EMPTY_DATA, ...result.data })
        const unavailable = result.unavailable.map((item) => OVERVIEW_LABELS[item.key] || item.key)
        setError(unavailable.length
          ? `Some analytics are unavailable — ${unavailable.join(' · ')}`
          : '')
        setLastUpdated(new Date())
        return
      }
      const results = await Promise.all([
        supabase.from('order_requests').select('id,channel_source,status,payment_status,total_amount,created_at', { count: 'exact' }).gte('created_at', priorStart),
        supabase.from('order_requests').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('pasabuy_requests').select('id,status,target_budget_php,assigned_to,created_at', { count: 'exact' }),
        supabase.from('product_batches').select('id,quantity,quantity_available,expiry_date,best_before_date', { count: 'exact' }),
        supabase.from('channel_connections').select('channel,display_name,status,last_event_at,note', { count: 'exact' }),
        supabase.from('channel_listings').select('channel_source,publication_status,validation_errors,last_synced_at,sync_error', { count: 'exact' }),
        supabase.from('products').select('sku,status,stock_available', { count: 'exact' }),
        supabase.from('conversations').select('id,status,priority,unread_count,response_due_at,assigned_to,last_message_at', { count: 'exact' }),
      ])

      if (sequence !== requestSequence.current) return
      const unavailableResults = overviewUnavailable(results, Object.keys(EMPTY_DATA))
      setUnavailable(unavailableResults.map(item => item.key))
      setStale(false)
      setLoadedRange(range)

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
      setError(unavailableResults.length ? 'Some analytics are unavailable or incomplete. Narrow the reporting period or retry the source.' : '')
      setLastUpdated(new Date())
    } catch (loadError) {
      if (sequence !== requestSequence.current) return
      setStale(true)
      setError(safeUiError('OVERVIEW_PARTIAL'))
    } finally {
      if (sequence === requestSequence.current) { setLoading(false); setRefreshing(false) }
    }
  }, [range])

  useEffect(() => {
    setLoading(true)
    load({ quiet: true })
    if (adminBffEnabled()) {
      const refresh = () => {
        if (document.visibilityState === 'visible') load({ quiet: true })
      }
      const interval = window.setInterval(refresh, 30_000)
      document.addEventListener('visibilitychange', refresh)
      return () => {
        requestSequence.current++
        window.clearInterval(interval)
        document.removeEventListener('visibilitychange', refresh)
      }
    }
    if (!supabase) return undefined

    const channel = supabase.channel('admin:command-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pasabuy_requests' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_connections' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_listings' }, () => load({ quiet: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load({ quiet: true }))
      .subscribe()

    return () => { requestSequence.current++; supabase.removeChannel(channel) }
  }, [load, range])

  const analytics = useMemo(() => {
    const currentStart = startOfPeriod(reportingRange).getTime()
    const previousStart = startOfPeriod(reportingRange, 1).getTime()
    const currentOrders = data.orders.filter(order => new Date(order.created_at).getTime() >= currentStart)
    const previousOrders = data.orders.filter(order => {
      const created = new Date(order.created_at).getTime()
      return created >= previousStart && created < currentStart
    })
    const currentVerified = currentOrders.filter(order => order.payment_status === 'verified')
    const previousVerified = previousOrders.filter(order => order.payment_status === 'verified')
    const sales = summarizeSalesOrders(currentOrders)
    const reconciliation = summarizeSalesReconciliation(currentOrders)
    const previousSales = summarizeSalesOrders(previousOrders)
    const verifiedRevenue = sales.verifiedPaymentValue
    const previousRevenue = previousSales.verifiedPaymentValue
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
      sales,
      reconciliation,
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
      revenueSeries: buildRevenueSeries(currentOrders, reportingRange),
    }
  }, [data, reportingRange])

  const missing = source => (Array.isArray(source) ? source : [source]).some(key => unavailable.includes(key))
  const display = (source, value) => loading ? '—' : missing(source) ? 'Unavailable' : value
  const widgetSources = { sales: ['orders'], revenue: ['orders'], priority: ['orderBacklog', 'conversations', 'pasabuy', 'products', 'batches', 'listings'], inbox: ['conversations'], pasabuy: ['pasabuy'], stock: ['products', 'batches'] }
  const widgetUnavailable = missing(widgetSources[widget] || [])

  const metrics = [
    { source: 'orders', label: 'Verified payments', value: peso(analytics.verifiedRevenue), detail: `${reportingRange}-day payment-verified total`, change: analytics.revenueChange },
    { source: 'orders', label: 'Verified orders', value: analytics.verifiedOrders, detail: 'Counted only after verification', change: analytics.orderChange },
    { source: 'orders', label: 'Average order value', value: peso(analytics.averageOrder), detail: 'Across verified orders' },
    { source: 'orderBacklog', label: 'Requests to review', value: data.orderBacklog, detail: 'Submitted; stock not reserved', tone: data.orderBacklog > 0 ? 'warning' : 'normal' },
    { source: 'pasabuy', label: 'Open Pasabuy', value: analytics.openPasabuy.length, detail: 'Intake through arrival', tone: analytics.openPasabuy.length > 0 ? 'warning' : 'normal' },
    { source: 'conversations', label: 'Unread messages', value: analytics.unread, detail: `${analytics.overdue} response deadline${analytics.overdue === 1 ? '' : 's'} missed`, tone: analytics.overdue > 0 ? 'danger' : analytics.unread > 0 ? 'warning' : 'normal' },
  ]

  const filteredSalesRecords = filterSalesOrders(analytics.currentOrders, salesRecordFilter)
  const visibleSalesRecords = filteredSalesRecords.slice(0, SALES_RECORD_LIMIT)
  const filteredSalesSummary = summarizeSalesOrders(filteredSalesRecords)
  const filteredSalesValue = salesRecordFilter === 'verified'
    ? filteredSalesSummary.verifiedPaymentValue
    : salesRecordFilter === 'fulfilled'
      ? filteredSalesSummary.fulfilledValue
      : filteredSalesSummary.submittedValue

  const downloadSalesRecords = () => {
    const csv = createSalesRecordCsv(analytics.currentOrders, salesRecordFilter)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = createSalesExportFilename({ range: reportingRange, filter: salesRecordFilter })
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

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
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Operations command center</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/65">
            Choose a widget from the left panel. Each view keeps its own records and operational meaning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-h-11 items-center rounded-adm-sm border border-adm-line bg-adm-sunken p-1" aria-label="Reporting period">
            {RANGE_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => setRange(option)}
                aria-pressed={range === option}
                className={`${actionClass} min-h-11 rounded-md px-3 text-xs font-semibold ${range === option ? 'bg-adm-raised text-white shadow-adm' : 'text-white/65 hover:text-white'}`}
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/65">
        <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for the first data refresh'}</span>
        <span>{stale ? `Refresh failed — showing the last retrieved ${reportingRange}-day snapshot.` : 'Internal K2 records · external channel feeds are separate'}</span>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm text-amber">
          <AlertIcon size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="lg:hidden">
        <label htmlFor="dashboard-widget" className="block pb-2 text-sm text-white/75">Dashboard widget</label>
        <select id="dashboard-widget" value={widget} onChange={event => onWidget?.(event.target.value)} className="min-h-11 w-full rounded-adm-sm border border-adm-line bg-adm-surface px-3 text-sm text-white">
          {DASHBOARD_WIDGETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div><h3 className="text-lg font-semibold text-white">{DASHBOARD_WIDGETS.find(item => item.id === widget)?.label}</h3><p className="mt-1 text-sm text-white/65">{DASHBOARD_WIDGETS.find(item => item.id === widget)?.description}</p></div>
      {widgetUnavailable && <p role="status" className="rounded-adm border border-adm-line p-5 text-sm text-white/75">{loading ? 'Loading this widget’s records…' : 'This widget is unavailable because its records could not be retrieved. Refresh to retry or choose another widget.'}</p>}
      <section hidden={widget !== 'metrics'} aria-label="Key performance indicators" className={`${panelClass} [&[hidden]]:hidden grid overflow-hidden grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`}>
        {metrics.map((metric, index) => (
          <div key={metric.label} className="min-w-0 border-b border-adm-line p-4">
            <p className="text-xs font-medium text-white/65">{metric.label}</p>
            <p className={`mt-2 truncate font-mono text-xl font-semibold tabular-nums ${metric.tone === 'danger' ? 'text-crimson' : metric.tone === 'warning' ? 'text-amber' : 'text-white'}`}>
              {display(metric.source, metric.value)}
            </p>
            <p className="mt-1.5 min-h-8 text-xs leading-relaxed text-white/65">{missing(metric.source) ? 'This source could not be retrieved.' : metric.detail}</p>
            {!loading && !missing(metric.source) && metric.change && (
              <p className={`mt-1 text-xs font-medium ${metric.change.positive ? 'text-emerald-400' : 'text-crimson'}`}>{metric.change.label}</p>
            )}
          </div>
        ))}
      </section>

      <section hidden={widget !== 'sales' || widgetUnavailable} aria-label="Sales computation summary" className={`${panelClass} [&[hidden]]:hidden`}>
        <PanelHeading
          icon={TrendIcon}
          title="Sales computation summary"
          description="Order, payment, fulfillment, payout, and profit remain separate facts."
          action={(
            <button
              type="button"
              onClick={() => setSalesRecordsOpen(open => !open)}
              aria-expanded={salesRecordsOpen}
              aria-controls="sales-record-ledger"
              className={`${actionClass} min-h-11 shrink-0 rounded-adm-sm px-3 text-xs font-semibold text-blue hover:bg-blue/10`}
            >
              {salesRecordsOpen ? 'Hide records' : 'Review records'}
            </button>
          )}
        />
        <div className="grid sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Submitted request value', value: peso(analytics.sales.submittedValue), detail: `${analytics.sales.submittedCount} request${analytics.sales.submittedCount === 1 ? '' : 's'} created in period` },
            { label: 'Payment-verified value', value: peso(analytics.sales.verifiedPaymentValue), detail: `${analytics.sales.verifiedPaymentCount} verified payment${analytics.sales.verifiedPaymentCount === 1 ? '' : 's'}` },
            { label: 'Fulfilled order value', value: peso(analytics.sales.fulfilledValue), detail: `${analytics.sales.fulfilledCount} fulfilled order${analytics.sales.fulfilledCount === 1 ? '' : 's'}` },
            { label: 'Settled payouts', value: 'Unavailable', detail: 'No canonical settlement ledger yet', unavailable: true },
            { label: 'Actual profit', value: 'Unavailable', detail: 'No exact-lot cost snapshot per order line yet', unavailable: true },
          ].map((item, index) => (
            <div key={item.label} className={`min-w-0 p-4 sm:p-5 ${index < 4 ? 'border-b border-adm-line xl:border-b-0 xl:border-r' : ''} ${index % 2 === 0 ? 'sm:border-r xl:border-r-0' : ''}`}>
              <p className="text-xs font-medium text-white/65">{item.label}</p>
              <p className={`mt-2 font-mono text-xl font-semibold tabular-nums ${item.unavailable ? 'text-amber' : 'text-white'}`}>{loading ? '—' : item.value}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/65">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-adm-line">
          <div className="px-4 py-3 sm:px-5">
            <h4 className="text-sm font-semibold text-white">Payment × fulfillment reconciliation</h4>
            <p className="mt-1 text-xs leading-relaxed text-white/65">Four mutually exclusive buckets reproduce every request and peso in the selected period. Select one to review its exact records.</p>
          </div>
          <div className="grid border-t border-adm-line sm:grid-cols-2 xl:grid-cols-4">
            {[
              { filter: 'verified_fulfilled', label: 'Verified + fulfilled', bucket: analytics.reconciliation.verifiedFulfilled, detail: 'Both exact states recorded' },
              { filter: 'verified_pending', label: 'Verified, not fulfilled', bucket: analytics.reconciliation.verifiedPending, detail: 'Operational fulfillment follow-up' },
              { filter: 'fulfilled_unverified', label: 'Fulfilled, payment not verified', bucket: analytics.reconciliation.fulfilledUnverified, detail: 'Payment-state review; not an unpaid claim', exception: true },
              { filter: 'other', label: 'Neither exact state', bucket: analytics.reconciliation.other, detail: 'All remaining request states' },
            ].map((item, index) => (
              <button
                key={item.filter}
                type="button"
                onClick={() => { setSalesRecordFilter(item.filter); setSalesRecordsOpen(true) }}
                aria-label={`Review ${item.label} records`}
                aria-pressed={salesRecordsOpen && salesRecordFilter === item.filter}
                className={`${actionClass} min-h-[112px] p-4 text-left hover:bg-white/[0.035] sm:p-5 ${index < 3 ? 'border-b border-adm-line xl:border-b-0 xl:border-r' : ''} ${index % 2 === 0 ? 'sm:border-r xl:border-r-0' : ''}`}
              >
                <span className="block text-xs font-medium text-white/65">{item.label}</span>
                <span className={`mt-2 block font-mono text-lg font-semibold tabular-nums ${item.exception && item.bucket.count > 0 ? 'text-crimson' : 'text-white'}`}>{loading ? '—' : peso(item.bucket.value)}</span>
                <span className="mt-1 block text-xs text-white/65">{loading ? '—' : `${item.bucket.count} record${item.bucket.count === 1 ? '' : 's'}`} · {item.detail}</span>
              </button>
            ))}
          </div>
          <p className="border-t border-adm-line px-4 py-3 text-xs leading-relaxed text-white/65 sm:px-5">
            Payment not verified means only that the exact verified state is absent. It does not mean unpaid, missing, failed, or lost.
          </p>
        </div>
        {salesRecordsOpen && (
          <div id="sales-record-ledger" className="border-t border-adm-line">
            <div className="flex flex-col gap-3 border-b border-adm-line p-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div>
                <h4 className="text-sm font-semibold text-white">Records behind these totals</h4>
                <p className="mt-1 text-xs leading-relaxed text-white/65">
                  Read-only order requests in the retrieved {reportingRange}-day period. Filters never change a record.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2" aria-label="Sales record filter">
                  {SALES_RECORD_FILTERS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSalesRecordFilter(option.id)}
                      aria-pressed={salesRecordFilter === option.id}
                      className={`${actionClass} min-h-11 rounded-adm-sm border px-3 text-xs font-semibold ${salesRecordFilter === option.id ? 'border-blue/50 bg-white/[0.04] text-white/75' : 'border-adm-line bg-adm-sunken text-white/65 hover:text-white'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={downloadSalesRecords}
                  disabled={loading || missing('orders') || filteredSalesRecords.length === 0}
                  className={`${actionClass} min-h-11 rounded-adm-sm border border-adm-line bg-adm-raised px-3 text-xs font-semibold text-white/75 hover:border-adm-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  Download CSV ({filteredSalesRecords.length})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-adm-line bg-adm-sunken/50 px-4 py-3 text-xs sm:px-5">
              <span className="text-white/65" aria-live="polite">
                {filteredSalesRecords.length} matching record{filteredSalesRecords.length === 1 ? '' : 's'}
              </span>
              <span className="font-semibold tabular-nums text-white">
                Visible filter total: <span className="font-mono">{peso(filteredSalesValue)}</span>
              </span>
            </div>

            <div className="hidden grid-cols-[minmax(110px,.8fr)_minmax(90px,.7fr)_minmax(100px,.8fr)_minmax(120px,1fr)_minmax(110px,.8fr)] gap-3 border-b border-adm-line px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/65 md:grid">
              <span>Date / reference</span><span>Channel</span><span>Order state</span><span>Payment state</span><span className="text-right">Request value</span>
            </div>
            <div className="divide-y divide-adm-line">
              {visibleSalesRecords.map(order => (
                <div key={order.id} className="grid gap-3 px-4 py-3.5 text-xs md:grid-cols-[minmax(110px,.8fr)_minmax(90px,.7fr)_minmax(100px,.8fr)_minmax(120px,1fr)_minmax(110px,.8fr)] md:items-center md:px-5">
                  <div className="min-w-0">
                    <span className="block text-white/70">{readableOrderDate(order.created_at)}</span>
                    <span className="mt-0.5 block truncate font-mono text-white/65" title={String(order.id || '')}>{shortOrderReference(order.id)}</span>
                  </div>
                  <div><span className="md:hidden text-white/65">Channel · </span><span className="capitalize text-white/70">{normalizeChannel(order.channel_source)}</span></div>
                  <div><span className="md:hidden text-white/65">Order · </span><span className="capitalize text-white/70">{readableStatus(order.status)}</span></div>
                  <div><span className="md:hidden text-white/65">Payment · </span><span className={order.payment_status === 'verified' ? 'capitalize text-emerald-400' : 'capitalize text-amber'}>{readableStatus(order.payment_status)}</span></div>
                  <div className="flex items-center justify-between gap-4 md:block md:text-right">
                    <span className="text-white/65 md:hidden">Request value</span>
                    <span className="font-mono font-semibold tabular-nums text-white">{peso(safeOrderValue(order.total_amount))}</span>
                  </div>
                </div>
              ))}
              {!loading && filteredSalesRecords.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-white/65">No matching order records exist in this period.</p>
              )}
            </div>
            {filteredSalesRecords.length > SALES_RECORD_LIMIT && (
              <p className="border-t border-adm-line px-4 py-3 text-xs text-amber sm:px-5">
                Showing the newest {SALES_RECORD_LIMIT} of {filteredSalesRecords.length} matching records. Change the reporting period to narrow the review.
              </p>
            )}
            <p className="border-t border-adm-line px-4 py-3 text-xs leading-relaxed text-white/65 sm:px-5">
              Request value is not a payout or actual profit. This ledger and its selected-period CSV expose no customer contact details, perform no accounting, payment, or order write, and are not a backup.
            </p>
          </div>
        )}
      </section>

      <div className="contents">
        <section hidden={widget !== 'revenue' || widgetUnavailable} className={`${panelClass} [&[hidden]]:hidden min-w-0`}>
          <PanelHeading icon={TrendIcon} title="Verified revenue trend" description={`Daily payment-verified revenue for the selected ${reportingRange}-day window.`} />
          <div className="p-3 sm:p-5">
            {loading ? <div className="h-56 animate-pulse rounded-adm-sm bg-white/[0.04]" /> : <RevenueChart points={analytics.revenueSeries} />}
          </div>
        </section>

        <section hidden={widget !== 'priority' || widgetUnavailable} className={`${panelClass} [&[hidden]]:hidden min-w-0`}>
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
                  <span className={`flex h-8 w-8 items-center justify-center rounded-adm-sm ${active ? 'bg-amber/10 text-amber' : 'bg-white/[0.04] text-white/65'}`}><Icon size={16} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-white/85">{queue.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/65">{queue.detail}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`font-mono text-base font-semibold tabular-nums ${active ? queue.severity === 'critical' ? 'text-crimson' : 'text-amber' : 'text-white/65'}`}>{loading ? '—' : queue.count}</span>
                    <ArrowIcon size={13} className="text-white/65 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white/60" />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className="contents">
        <section hidden={widget !== 'metrics'} className={`${panelClass} [&[hidden]]:hidden min-w-0`}>
          <PanelHeading
            icon={GlobeIcon}
            title="Channel performance and readiness"
            description="Selected-period K2 order records and current listing states. Connection records do not verify a working API feed."
            action={<button onClick={() => setSection('integrations')} className={`${actionClass} hidden min-h-9 items-center gap-1.5 rounded-adm-sm px-2 text-xs font-semibold text-blue hover:bg-blue/10 sm:flex`}>Manage <ArrowIcon size={13} /></button>}
          />
          <div className="divide-y divide-adm-line">
            <div className="hidden grid-cols-[minmax(160px,1.5fr)_1fr_.7fr_1fr_1fr] gap-3 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/65 md:grid">
              <span>Channel</span><span>Status</span><span>Requests</span><span>Verified revenue</span><span>Listings</span>
            </div>
            {analytics.channelRows.map(channel => (
              <div key={channel.id} role="group" aria-label={`${channel.label} metrics`} className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3.5 md:grid-cols-[minmax(160px,1.5fr)_1fr_.7fr_1fr_1fr] md:items-center md:gap-3 md:px-5">
                <div className="col-span-2 min-w-0 md:col-span-1">
                  <p className="text-xs font-semibold text-white">{channel.label}</p>
                  <p className="mt-0.5 text-xs text-white/65">{channel.description}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${channel.status === 'live' ? 'text-emerald-400' : 'text-white/65'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${channel.status === 'live' ? 'bg-emerald-400' : 'bg-white/25'}`} />
                    {display('connections', channel.id === 'other' ? 'Unmapped source' : channel.status === 'live' ? 'Recorded as live' : readableStatus(channel.status))}
                  </span>
                </div>
                <div className="text-right md:text-left">
                  <span className="md:hidden text-xs uppercase tracking-wider text-white/65">Requests </span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-white/75">{display('orders', channel.orders)}</span>
                </div>
                <div>
                  <span className="md:hidden block text-xs uppercase tracking-wider text-white/65">Verified revenue</span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-white/75">{display('orders', peso(channel.revenue))}</span>
                </div>
                <div className="text-right md:text-left">
                  <span className="md:hidden block text-xs uppercase tracking-wider text-white/65">Listings</span>
                  <span className={`font-mono text-xs font-semibold tabular-nums ${channel.issues > 0 ? 'text-crimson' : channel.ready > 0 ? 'text-amber' : 'text-white/65'}`}>
                    {display('listings', `${channel.published} published · ${channel.ready} ready${channel.issues > 0 ? ` · ${channel.issues} blocked` : ''}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-adm-line px-4 py-4 text-sm text-white/75 sm:px-5">
            <h4 className="font-semibold text-white">Metric coverage</h4>
            <dl className="mt-3 space-y-3">
              <div><dt>Traffic, conversion and ad spend</dt><dd className="text-white/65">Unavailable — no verified analytics or advertising feed.</dd></div>
              <div><dt>Settled payouts and actual profit</dt><dd className="text-white/65">Unavailable — settlement and exact-lot cost records are required.</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-white/65">Zero means no matching internal records were returned. It does not mean zero activity in an external shop. Use the other widgets for sales reconciliation, inbox, sourcing and stock detail.</p>
          </div>
        </section>

        <section hidden={widget !== 'inbox' || widgetUnavailable} className={`${panelClass} [&[hidden]]:hidden min-w-0`}>
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
                <p className="mt-1 text-xs text-white/65">{item.label}</p>
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

      <div className="contents">
        <section hidden={widget !== 'pasabuy' || widgetUnavailable} className={`${panelClass} [&[hidden]]:hidden min-w-0`}>
          <PanelHeading icon={BagIcon} title="Pasabuy pipeline" description="Open requests by the next operational milestone." />
          <div className="space-y-3 p-4 sm:p-5">
            {analytics.pasabuyStages.map(stage => {
              const total = Math.max(analytics.openPasabuy.length, 1)
              const width = `${(stage.count / total) * 100}%`
              return (
                <div key={stage.label} className="grid grid-cols-[72px_1fr_28px] items-center gap-3">
                  <span className="text-xs text-white/65">{stage.label}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-blue" style={{ width }} />
                  </span>
                  <span className="text-right font-mono text-xs font-semibold tabular-nums text-white/75">{stage.count}</span>
                </div>
              )
            })}
            {!loading && analytics.openPasabuy.length === 0 && <p className="pt-1 text-xs text-white/65">No active Pasabuy cases. New requests will appear here automatically.</p>}
          </div>
          <div className="border-t border-adm-line p-3">
            <button onClick={() => setSection('pasabuy_manager')} className={`${actionClass} flex min-h-11 w-full items-center justify-center gap-2 rounded-adm-sm text-xs font-semibold text-white/60 hover:bg-white/[0.04] hover:text-white`}>
              Review Pasabuy cases <ArrowIcon size={13} />
            </button>
          </div>
        </section>

        <section hidden={widget !== 'stock' || widgetUnavailable} className={`${panelClass} [&[hidden]]:hidden min-w-0`}>
          <PanelHeading icon={BoxIcon} title="Inventory health" description="SKU availability and FEFO batch risk requiring staff review." />
          <div className="divide-y divide-adm-line px-4 sm:px-5">
            {[
              { label: 'Catalog SKUs', value: data.products.length, detail: 'Current product records', tone: 'text-white' },
              { label: 'Out of stock', value: analytics.outOfStock, detail: 'No sellable units', tone: analytics.outOfStock > 0 ? 'text-crimson' : 'text-white' },
              { label: 'Low stock', value: analytics.lowStock, detail: '1–5 units available', tone: analytics.lowStock > 0 ? 'text-amber' : 'text-white' },
              { label: 'Expiry risk', value: analytics.expired + analytics.expiring, detail: `${analytics.expired} expired · ${analytics.expiring} within 30 days`, tone: analytics.expired > 0 ? 'text-crimson' : analytics.expiring > 0 ? 'text-amber' : 'text-white' },
            ].map(item => (
              <div key={item.label} className="flex min-h-[58px] items-center justify-between gap-4 py-3">
                <div><p className="text-xs font-medium text-white/75">{item.label}</p><p className="mt-0.5 text-xs text-white/65">{item.detail}</p></div>
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

      <section className="flex flex-col gap-3 border-t border-adm-line pt-4 text-xs leading-relaxed text-white/65 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-4xl items-start gap-2">
          <CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-400" />
          <p>Revenue includes only payment-verified order requests. Marketplace connectors and online payment remain deferred; channel figures are internal records, not marketplace analytics. Missing sources are marked unavailable.</p>
        </div>
        {pending == null
          ? <p className="shrink-0 text-white/65">Legacy fulfillment queue unavailable</p>
          : pending > 0 && <p className="shrink-0 text-amber">Legacy fulfillment queue: {pending}</p>}
      </section>
    </div>
  )
}
