import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import {
  AlertIcon,
  BoxIcon,
  CheckIcon,
  GlobeIcon,
  PlusIcon,
  ShieldIcon,
  SyncIcon,
  XIcon,
} from '../../components/ui/icons'
import { AdminDialog } from '../../components/ui/AdminDialog'
import {
  computeProductShopAllocation,
  COVERAGE_STATUS,
  DEFAULT_TARGET_UNITS,
} from '../../lib/channelAllocationEngine'
import {
  createTransferRequest,
  TRANSFER_STATUS,
  transitionTransferStatus,
  validateTransferAvailability,
} from '../../lib/custodyTransferEngine'
import {
  MetricRail,
  SectionHeading,
  StateBanner,
  StatusPill,
  WorkspaceIntro,
  primaryButton,
  secondaryButton,
} from './AdminWorkspaceUi'

const DEFAULT_SHOPS = [
  { id: '30000000-0000-4000-8000-000000000001', shop_code: 'shopee-01', channel_code: 'shopee', display_name: 'Shopee Main Shop', priority: 1 },
  { id: '30000000-0000-4000-8000-000000000002', shop_code: 'shopee-02', channel_code: 'shopee', display_name: 'Shopee Outlet', priority: 2 },
  { id: '30000000-0000-4000-8000-000000000003', shop_code: 'tiktok-01', channel_code: 'tiktok', display_name: 'TikTok Main Shop', priority: 3 },
  { id: '30000000-0000-4000-8000-000000000004', shop_code: 'tiktok-02', channel_code: 'tiktok', display_name: 'TikTok Live Outlet', priority: 4 },
  { id: '30000000-0000-4000-8000-000000000005', shop_code: 'lazada-01', channel_code: 'lazada', display_name: 'Lazada Flagship', priority: 5 },
  { id: '30000000-0000-4000-8000-000000000006', shop_code: 'lazada-02', channel_code: 'lazada', display_name: 'Lazada Express', priority: 6 },
]

export default function ShopAllocationManager({ secureMode }) {
  const [activeTab, setActiveTab] = useState('matrix') // 'matrix' | 'transfers'
  const [shops, setShops] = useState(DEFAULT_SHOPS)
  const [products, setProducts] = useState([])
  const [allocations, setAllocations] = useState([])
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rebalanceProduct, setRebalanceProduct] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (!supabase) {
        setLoading(false)
        return
      }

      const [shopsRes, productsRes, balancesRes, allocRes, transferRes] = await Promise.all([
        supabase.from('channel_shops').select('*').order('sort_order', { ascending: true, nullsFirst: false }),
        supabase.from('products').select('sku, name, status, stock_available').order('name'),
        supabase.from('inventory_balances').select('*').eq('location_code', 'MANILA_MAIN'),
        supabase.from('channel_shop_allocations').select('*'),
        supabase.from('inventory_transfer_requests').select('*').order('requested_at', { ascending: false }).limit(25),
      ])

      if (shopsRes.data && shopsRes.data.length > 0) {
        setShops(shopsRes.data)
      }

      const balanceMap = new Map()
      for (const b of balancesRes.data || []) {
        balanceMap.set(b.sku, b.available ?? b.on_hand ?? 0)
      }

      const combinedProducts = (productsRes.data || []).map(p => ({
        ...p,
        masterAvailable: balanceMap.has(p.sku) ? balanceMap.get(p.sku) : (p.stock_available || 0),
      }))
      setProducts(combinedProducts)

      setAllocations(allocRes.data || [])
      setTransfers(transferRes.data || [])
    } catch {
      setError(safeUiError('FAILED_TO_LOAD_ALLOCATIONS'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Compute metrics
  const totalMasterUnits = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.masterAvailable || 0), 0)
  }, [products])

  const totalAllocatedUnits = useMemo(() => {
    return allocations.reduce((sum, a) => sum + (a.allocated_units || 0), 0)
  }, [allocations])

  const thinStockCount = useMemo(() => {
    return allocations.filter(a => a.status === COVERAGE_STATUS.THIN).length
  }, [allocations])

  const pendingTransferCount = useMemo(() => {
    return transfers.filter(t => t.status === TRANSFER_STATUS.PENDING_APPROVAL).length
  }, [transfers])

  return (
    <div className="space-y-6">
      <WorkspaceIntro
        eyebrow="Channel allocation and custody"
        title="Multi-shop inventory and custody"
        description="Two sellable units per active shop account is the planning target. Master Inventory remains the physical ground truth in Manila. Physical movement requires staff request and admin approval."
        status={loading ? 'Reading shop allocations...' : `${shops.length} active shops`}
        statusTone="info"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowTransferModal(true)}
              className={`${primaryButton} flex items-center gap-2 bg-blue font-bold min-h-11`}
            >
              <PlusIcon size={16} />
              <span>Request stock transfer</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className={`${secondaryButton} flex items-center gap-2 min-h-11`}
              title="Refresh inventory balances"
            >
              <SyncIcon size={16} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      <MetricRail
        columns="lg:grid-cols-4"
        items={[
          {
            label: 'Active seller accounts',
            value: shops.length,
            detail: 'Shopee, TikTok, Lazada',
            tone: 'text-white',
          },
          {
            label: 'Master sellable units',
            value: totalMasterUnits,
            detail: 'Warehouse A (Manila Main)',
            tone: 'text-forest',
          },
          {
            label: 'Allocated shop units',
            value: totalAllocatedUnits,
            detail: 'Availability projections',
            tone: 'text-blue',
          },
          {
            label: 'Pending transfers',
            value: pendingTransferCount,
            detail: 'Awaiting admin review',
            tone: pendingTransferCount > 0 ? 'text-amber' : 'text-white/60',
          },
        ]}
      />

      {error && <StateBanner tone="danger">{error}</StateBanner>}

      {/* View Switcher Tabs */}
      <div className="flex border-b border-adm-line">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'matrix'
              ? 'border-blue text-white'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          <GlobeIcon size={16} />
          <span>Shop allocation matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'transfers'
              ? 'border-blue text-white'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          <BoxIcon size={16} />
          <span>Custody transfers ({transfers.length})</span>
          {pendingTransferCount > 0 && (
            <span className="ml-1 rounded-full bg-amber/20 px-2 py-0.5 text-xs text-amber">
              {pendingTransferCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'matrix' ? (
        <AllocationMatrixSection
          products={products}
          shops={shops}
          allocations={allocations}
          onRebalance={(prod) => setRebalanceProduct(prod)}
        />
      ) : (
        <CustodyTransferSection
          transfers={transfers}
          onReload={loadData}
        />
      )}

      {/* Modals */}
      {rebalanceProduct && (
        <RebalanceModal
          product={rebalanceProduct}
          shops={shops}
          allocations={allocations.filter(a => a.sku === rebalanceProduct.sku)}
          onClose={() => setRebalanceProduct(null)}
          onCommitted={async () => {
            setRebalanceProduct(null)
            await loadData()
          }}
        />
      )}

      {showTransferModal && (
        <CreateTransferModal
          products={products}
          shops={shops}
          onClose={() => setShowTransferModal(false)}
          onCreated={async () => {
            setShowTransferModal(false)
            await loadData()
          }}
        />
      )}
    </div>
  )
}

function AllocationMatrixSection({ products, shops, allocations, onRebalance }) {
  const [filterQuery, setFilterQuery] = useState('')

  const filteredProducts = useMemo(() => {
    if (!filterQuery.trim()) return products
    const q = filterQuery.toLowerCase()
    return products.filter(p => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
  }, [products, filterQuery])

  // Lookup allocation map: `${sku}::${shop_id}` -> allocation
  const allocMap = useMemo(() => {
    const map = new Map()
    for (const a of allocations) {
      map.set(`${a.sku}::${a.shop_id}`, a)
    }
    return map
  }, [allocations])

  return (
    <section className="space-y-4">
      <SectionHeading
        title="Product shop allocation matrix"
        description="Availability target is 2 units per shop. When inventory is scarce, units are allocated by sales priority. Skipped shops do not generate low stock alerts."
        count={filteredProducts.length}
        action={
          <input
            type="search"
            placeholder="Filter by SKU or name..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            className="min-h-11 w-full sm:w-64 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-blue"
          />
        }
      />

      <div className="overflow-x-auto rounded-adm border border-adm-line bg-adm-surface">
        <table className="w-full text-left text-xs text-white">
          <thead className="border-b border-adm-line bg-white/[0.025] text-white/40 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold">SKU and product</th>
              <th className="px-4 py-3 font-semibold text-center">Master stock</th>
              {shops.map(s => (
                <th key={s.id} className="px-3 py-3 font-semibold text-center">
                  <div className="truncate max-w-[120px]" title={s.display_name}>
                    {s.display_name}
                  </div>
                  <span className="block text-[10px] text-white/30 font-mono lowercase">
                    {s.channel_code}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-line">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={shops.length + 3} className="px-4 py-8 text-center text-white/40">
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map(prod => {
                const isScarce = prod.masterAvailable < (shops.length * DEFAULT_TARGET_UNITS)
                return (
                  <tr key={prod.sku} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-semibold text-white">{prod.name}</div>
                      <div className="font-mono text-xs text-white/40">{prod.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-sm font-bold tabular-nums text-forest">
                        {prod.masterAvailable}
                      </span>
                      {isScarce && (
                        <span className="block text-[10px] text-amber">
                          Scarce
                        </span>
                      )}
                    </td>
                    {shops.map(s => {
                      const alloc = allocMap.get(`${prod.sku}::${s.id}`)
                      const units = alloc ? alloc.allocated_units : 0
                      const status = alloc ? alloc.status : (prod.masterAvailable >= 2 ? COVERAGE_STATUS.COVERED : COVERAGE_STATUS.OUT)

                      return (
                        <td key={s.id} className="px-3 py-3 text-center">
                          <div className="font-mono font-bold text-xs text-white">
                            {units} / {DEFAULT_TARGET_UNITS}
                          </div>
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            status === COVERAGE_STATUS.COVERED
                              ? 'bg-forest/15 text-forest border border-forest/30'
                              : status === COVERAGE_STATUS.THIN
                              ? 'bg-amber/15 text-amber border border-amber/30'
                              : status === COVERAGE_STATUS.SKIPPED
                              ? 'bg-white/10 text-white/50 border border-white/20'
                              : 'bg-crimson/15 text-crimson border border-crimson/30'
                          }`}>
                            {status}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onRebalance(prod)}
                        className={`${secondaryButton} min-h-11 px-3 text-xs hover:border-blue`}
                      >
                        Rebalance
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CustodyTransferSection({ transfers, onReload }) {
  const [busyId, setBusyId] = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState('')

  const handleApprove = async (id) => {
    setBusyId(id)
    setError('')
    try {
      if (supabase) {
        const { data, error: err } = await supabase.rpc('review_inventory_transfer', {
          p_request_id: id,
          p_approve: true,
          p_rejection_reason: null,
        })
        if (err) throw err
      }
      await onReload()
    } catch (e) {
      setError(e.message || 'Failed to approve transfer.')
    } finally {
      setBusyId(null)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectId || !rejectionReason.trim()) return
    setBusyId(rejectId)
    setError('')
    try {
      if (supabase) {
        const { error: err } = await supabase.rpc('review_inventory_transfer', {
          p_request_id: rejectId,
          p_approve: false,
          p_rejection_reason: rejectionReason.trim(),
        })
        if (err) throw err
      }
      setRejectId(null)
      setRejectionReason('')
      await onReload()
    } catch (e) {
      setError(e.message || 'Failed to reject transfer.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-4">
      <SectionHeading
        title="Physical inventory transfer requests"
        description="Custody movements between warehouse hubs, staff custodians, or dedicated shop allocations. Every move requires admin review."
        count={transfers.length}
      />

      {error && <StateBanner tone="danger">{error}</StateBanner>}

      <div className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
        <div className="divide-y divide-adm-line">
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-xs text-white/40">
              No transfer requests on record.
            </div>
          ) : (
            transfers.map(t => {
              const isPending = t.status === TRANSFER_STATUS.PENDING_APPROVAL
              return (
                <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{t.sku}</span>
                      <StatusPill tone={
                        t.status === TRANSFER_STATUS.APPROVED
                          ? 'success'
                          : t.status === TRANSFER_STATUS.REJECTED
                          ? 'danger'
                          : isPending
                          ? 'warning'
                          : 'neutral'
                      }>
                        {t.status}
                      </StatusPill>
                    </div>
                    <p className="text-xs text-white/70">
                      Quantity: <strong className="text-white font-mono">{t.quantity} units</strong> from{' '}
                      <span className="text-blue">{t.source_hub}</span> to{' '}
                      <span className="text-forest">{t.destination_hub}</span>
                    </p>
                    <p className="text-xs text-white/40 italic">
                      "{t.reason}"
                    </p>
                    {t.rejection_reason && (
                      <p className="text-xs text-crimson">
                        Rejection reason: {t.rejection_reason}
                      </p>
                    )}
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(t.id)}
                        disabled={busyId === t.id}
                        className={`${primaryButton} bg-forest min-h-11 px-4 text-xs font-semibold`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectId(t.id); setRejectionReason('') }}
                        disabled={busyId === t.id}
                        className={`${secondaryButton} border-crimson/40 text-crimson min-h-11 px-4 text-xs hover:bg-crimson/10`}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="presentation">
          <form onSubmit={handleRejectSubmit} className="w-full max-w-md rounded-adm border border-adm-line bg-adm-surface p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Reject stock transfer</h3>
            <p className="text-xs text-white/60">
              Provide an explicit operational reason for refusing this custody transfer.
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Insufficient verified lot count in Manila Main warehouse."
              required
              className="w-full min-h-24 rounded-adm-sm border border-adm-line bg-adm-sunken p-3 text-xs text-white outline-none focus:border-crimson"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className={`${secondaryButton} flex-1 min-h-11`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rejectionReason.trim()}
                className={`${primaryButton} flex-1 min-h-11 bg-crimson text-white`}
              >
                Confirm rejection
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

function RebalanceModal({ product, shops, allocations, onClose, onCommitted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Compute proposal using pure allocation engine
  const proposal = useMemo(() => {
    const candidateShops = shops.map((s, idx) => {
      const existing = allocations.find(a => a.shop_id === s.id)
      return {
        shopId: s.id,
        shopCode: s.shop_code,
        channelCode: s.channel_code,
        displayName: s.display_name,
        priority: existing?.priority || (idx + 1),
        skipped: existing?.is_skipped || false,
        needsReview: false,
      }
    })

    return computeProductShopAllocation({
      masterStock: product.masterAvailable,
      shops: candidateShops,
      targetUnits: DEFAULT_TARGET_UNITS,
    })
  }, [product, shops, allocations])

  const handleCommit = async () => {
    setBusy(true)
    setError('')
    try {
      if (supabase) {
        const { data, error: err } = await supabase.rpc('rebalance_shop_allocations_v1', {
          p_sku: product.sku,
          p_location_code: 'MANILA_MAIN',
        })
        if (err) throw err
      }
      await onCommitted()
    } catch (e) {
      setError(e.message || 'Failed to commit allocation rebalance.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="presentation">
      <div className="w-full max-w-2xl rounded-adm border border-adm-line bg-adm-surface p-6 space-y-5 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue">2-unit target allocation</p>
            <h2 className="text-xl font-bold mt-1">Rebalance {product.name}</h2>
            <p className="text-xs font-mono text-white/50">{product.sku}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm border border-adm-line text-white/60 hover:text-white"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-adm-sunken p-4 rounded-adm-sm border border-adm-line">
          <div>
            <span className="text-[10px] uppercase text-white/40 font-semibold block">Master stock</span>
            <span className="font-mono text-lg font-bold text-forest">{proposal.masterStock}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-white/40 font-semibold block">Total allocated</span>
            <span className="font-mono text-lg font-bold text-blue">{proposal.totalAllocated}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-white/40 font-semibold block">Unallocated stock</span>
            <span className="font-mono text-lg font-bold text-white/60">{proposal.unallocatedMasterStock}</span>
          </div>
        </div>

        {proposal.scarcityWarning && (
          <StateBanner tone="warning">
            Inventory is scarce: {proposal.masterStock} units available, but {proposal.activeShopsCount * proposal.targetUnitsPerShop} units required for full 2-unit coverage across all shops. Units were distributed in sales priority order.
          </StateBanner>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Proposed shop breakdown</h4>
          <div className="divide-y divide-adm-line border border-adm-line rounded-adm-sm overflow-hidden">
            {proposal.breakdown.map(item => (
              <div key={item.shopCode} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                <div>
                  <span className="font-semibold text-white">{item.displayName}</span>
                  <span className="block text-[10px] text-white/40 font-mono lowercase">{item.channelCode} · Priority {item.priority}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold">{item.allocatedUnits} / {item.targetUnits}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    item.status === COVERAGE_STATUS.COVERED
                      ? 'bg-forest/15 text-forest border border-forest/30'
                      : item.status === COVERAGE_STATUS.THIN
                      ? 'bg-amber/15 text-amber border border-amber/30'
                      : item.status === COVERAGE_STATUS.SKIPPED
                      ? 'bg-white/10 text-white/50 border border-white/20'
                      : 'bg-crimson/15 text-crimson border border-crimson/30'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <StateBanner tone="danger">{error}</StateBanner>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`${secondaryButton} flex-1 min-h-11`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={busy}
            className={`${primaryButton} flex-1 min-h-11 bg-blue font-bold`}
          >
            {busy ? 'Saving...' : 'Apply rebalance'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateTransferModal({ products, shops, onClose, onCreated }) {
  const [sku, setSku] = useState(products[0]?.sku || '')
  const [quantity, setQuantity] = useState(1)
  const [sourceHub, setSourceHub] = useState('MANILA_MAIN')
  const [destinationHub, setDestinationHub] = useState('MANILA_DEPOT_2')
  const [targetShopId, setTargetShopId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedProduct = products.find(p => p.sku === sku)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sku || !reason.trim() || quantity <= 0) return

    setBusy(true)
    setError('')
    try {
      if (supabase) {
        const { data, error: err } = await supabase.rpc('request_inventory_transfer', {
          p_sku: sku,
          p_quantity: quantity,
          p_reason: reason.trim(),
          p_source_hub: sourceHub,
          p_destination_hub: destinationHub,
          p_target_shop_id: targetShopId || null,
        })
        if (err) throw err
      }
      await onCreated()
    } catch (e) {
      setError(e.message || 'Failed to submit transfer request.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass = "w-full min-h-11 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-xs text-white outline-none focus:border-blue"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="presentation">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-adm border border-adm-line bg-adm-surface p-6 space-y-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue">Physical stock movement</p>
            <h2 className="text-xl font-bold mt-1">Request custody transfer</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm border border-adm-line text-white/60 hover:text-white"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/60 mb-1">Product SKU</label>
          <select value={sku} onChange={e => setSku(e.target.value)} className={inputClass}>
            {products.map(p => (
              <option key={p.sku} value={p.sku}>
                {p.name} ({p.sku}) | {p.masterAvailable} units available
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              max={selectedProduct?.masterAvailable || 999}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Destination shop (optional)</label>
            <select value={targetShopId} onChange={e => setTargetShopId(e.target.value)} className={inputClass}>
              <option value="">General warehouse</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Source hub</label>
            <input type="text" value={sourceHub} onChange={e => setSourceHub(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Destination hub</label>
            <input type="text" value={destinationHub} onChange={e => setDestinationHub(e.target.value)} className={inputClass} required />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/60 mb-1">Operational reason</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why this physical movement is required..."
            required
            className={`${inputClass} min-h-20`}
          />
        </div>

        {error && <StateBanner tone="danger">{error}</StateBanner>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={busy} className={`${secondaryButton} flex-1 min-h-11`}>
            Cancel
          </button>
          <button type="submit" disabled={busy || !reason.trim()} className={`${primaryButton} flex-1 min-h-11 bg-blue font-bold`}>
            {busy ? 'Submitting...' : 'Submit transfer request'}
          </button>
        </div>
      </form>
    </div>
  )
}
