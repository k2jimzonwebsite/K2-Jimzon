import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'

import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import BatchExpiryManagerModal, { getExpiryHealth } from './BatchExpiryManagerModal'
import ProductAiEnrichmentModal from './ProductAiEnrichmentModal'
import DeleteProductsModal from './DeleteProductsModal'
import { BoxIcon, SearchIcon, PlusIcon } from '../../components/ui/icons'
import PhotoManagerModal from './PhotoManagerModal'
import ProductMediaCleanupModal from './ProductMediaCleanupModal'
import ProductIntakeSessionModal from './ProductIntakeSessionModal'
import {
  adminBffEnabled, commandAdminProductMasterBff, getAdminLots, getAdminProductMasterBff, getAdminProducts,
} from '../../services/adminBffService'
import { AdminDialog } from '../../components/ui/AdminDialog'
import ReferenceCreationDialog, { PendingReferenceCreation } from './ReferenceCreationDialog'
import { applyImageFallback } from '../../lib/imageFallback'
import useProductMasterRecovery from '../../hooks/useProductMasterRecovery'
import ProductMasterRecovery, { PendingProductDecision } from './ProductMasterRecovery'
import useWebsiteAssignmentRecovery from '../../hooks/useWebsiteAssignmentRecovery'
import WebsiteAssignmentDialog,{PendingWebsiteDecision} from './WebsiteAssignmentDialog'
import useProductFamilyRecovery from '../../hooks/useProductFamilyRecovery'
import ProductFamilyEditor, { PendingProductFamilyDecision } from './ProductFamilyEditor'
import ProductSkuMergeDialog from './ProductSkuMergeDialog'
import BulkStoreCategoryDialog from './BulkStoreCategoryDialog'
import { getStoreCategory, storeCategoryEntries } from '../../lib/storeCategories'
import {
  DetailBlock,
  EmptyState,
  MetricRail,
  SectionHeading,
  StateBanner,
  WorkspaceIntro,
  secondaryButton,
} from './AdminWorkspaceUi'

// ── Product lifecycle ─────────────────────────────────────────────────────────
// Mirrors the products_status_check constraint. 'Active' is a legacy alias for
// 'Live' and is treated as Live everywhere in the UI.
const STATUS_OPTIONS = [
  { value: 'Draft',        label: 'Draft',        hint: 'Invisible to customers' },
  { value: 'Under Review', label: 'Review',       hint: 'Awaiting an administrator publication decision' },
  { value: 'Live',         label: 'Live',         hint: 'In the catalogue, browsable and buyable' },
  { value: 'Unlisted',     label: 'Unlisted',     hint: 'Hidden from browse: direct link still works' },
  { value: 'Discontinued', label: 'Discontinued', hint: 'Permanently removed from sale, with history retained' },
]

const STATUS_LABEL = {
  Live: 'Live', Active: 'Live', Unlisted: 'Unlisted', Draft: 'Draft',
  'Under Review': 'Under Review', Discontinued: 'Discontinued',
}

const STATUS_TONE = {
  Live:         'bg-forest/20 text-forest border-forest/40',
  Active:       'bg-forest/20 text-forest border-forest/40',
  Unlisted:     'bg-blue/20 text-blue border-blue/40',
  Draft:        'bg-gold/20 text-gold border-gold/40',
  'Under Review': 'bg-violet-500/20 text-violet-200 border-violet-400/40',
  Discontinued: 'bg-crimson/20 text-crimson border-crimson/40',
}

const normalizeStatus = (s) => (s === 'Active' ? 'Live' : (s || 'Draft'))

export function computeInventoryMetrics(products, batchMap = {}) {
  let units = 0
  let out = 0
  let low = 0
  let unknown = 0
  let expiryRisk = 0
  let drafts = 0
  let unresolved = 0
  for (const product of products || []) {
    const raw = product?.stock_available
    const stock = raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw)
    const threshold = Number(product?.reorder_level) || 5
    if (!Number.isFinite(stock)) {
      unknown += 1
    } else {
      units += Math.max(0, stock)
      if (stock <= 0) out += 1
      else if (stock <= threshold) low += 1
    }
    if (batchMap[product?.sku]?.requiresReconciliation) {
      unresolved += 1
    }
    const expiry = getExpiryHealth(batchMap[product?.sku]?.earliestExpiry || product?.expiry_date)
    if (['EXPIRED', 'CRITICAL', 'WARNING'].includes(expiry.status)) expiryRisk += 1
    if (!['Live', 'Active'].includes(product?.status)) drafts += 1
  }
  return { units, out, low, unknown, expiryRisk, drafts, unresolved }
}


// Segmented lifecycle control — all legal states remain visible, so the current one
// reads as a position rather than a label you have to open a menu to check.
function StatusControl({ value, onChange, disabled }) {
  const current = normalizeStatus(value)
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-adm-sm border border-adm-line bg-adm-sunken p-0.5 sm:grid-cols-5" role="group" aria-label="Product status">
      {STATUS_OPTIONS.map(opt => {
        const on = current === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            title={opt.hint}
            aria-pressed={on}
            onClick={() => !on && onChange(opt.value)}
            className={`min-h-11 rounded-adm-sm text-xs font-bold transition-colors last:col-span-2 sm:last:col-span-1 disabled:cursor-not-allowed disabled:opacity-50 ${
              on ? STATUS_TONE[opt.value] + ' border' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function StatusDecisionDialog({ decision, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState(decision.reason || '')
  const [error, setError] = useState('')
  const closeRef = useRef(null)
  const submit = async (event) => {
    event.preventDefault()
    const trimmed = reason.trim()
    const effectiveReason = trimmed.length >= 8
      ? trimmed
      : (trimmed.length > 0 ? `Admin set status to ${decision.nextStatus} (${trimmed})` : `Admin set status to ${decision.nextStatus}`)
    setError('')
    const ok = await onConfirm(decision.reason ?? effectiveReason)
    if (ok === false) setError('The status change was not recorded. Review the current product state and try again.')
  }
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 sm:items-center sm:p-4" role="presentation">
    <AdminDialog onClose={onCancel} closeDisabled={busy} initialFocusRef={closeRef} labelledBy="product-status-title">
    <form onSubmit={submit} className="w-full space-y-4 rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:max-w-md sm:rounded-adm">
      <div className="flex items-start justify-between gap-4"><div><h2 id="product-status-title" className="font-sans text-xl font-bold">Set {decision.nextStatus}</h2><p className="mt-1 text-sm text-white/55">This changes {decision.skus.length} canonical product record{decision.skus.length === 1 ? '' : 's'}. Live requires reviewed content, price, category, brand, and a primary photo.</p></div><button ref={closeRef} type="button" onClick={onCancel} disabled={busy} aria-label="Close status decision" className="grid h-11 w-11 shrink-0 place-items-center rounded-adm-sm border border-adm-line disabled:opacity-50">×</button></div>
      <label className="block text-sm font-semibold text-white/70">Reason for the status change <span className="font-normal text-white/45">(optional)</span><textarea autoFocus={false} maxLength={500} readOnly={decision.reason !== undefined} disabled={busy} placeholder={`Default: Admin set status to ${decision.nextStatus}`} value={decision.reason ?? reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} className="mt-1 min-h-[96px] w-full resize-y rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-base text-white placeholder:text-white/30 outline-none focus:border-blue focus:ring-2 focus:ring-blue/25" /></label>
      {(decision.error || error) && <p role="alert" className="rounded-adm-sm border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm text-crimson">{decision.error || error}</p>}
      {decision.reason !== undefined && <p className="text-sm text-white/70">Retry keeps the original status, note and request identifier. Check the current product before starting a different change.</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-adm-sm border border-adm-line px-4 font-semibold disabled:opacity-50">Cancel</button><button type="submit" disabled={busy} className="min-h-11 rounded-adm-sm bg-blue px-4 font-bold text-white transition-transform duration-150 active:scale-[0.98] disabled:opacity-50">{busy ? 'Recording…' : decision.reason !== undefined ? 'Retry same change' : `Set ${decision.nextStatus}`}</button></div>
    </form>
    </AdminDialog>
  </div>
}

// ── Shared input/textarea styles ──────────────────────────────────────────────
const inp = 'w-full rounded-adm-sm border border-white/20 bg-adm-raised px-3.5 py-2.5 text-base text-white font-semibold focus:border-blue outline-none transition-colors shadow-sm'
const ta  = `${inp} resize-none`

function Label({ children, htmlFor, tip }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-extrabold uppercase tracking-wider text-white/70">{children}</label>
      {tip && (
        <span
          className="text-xs text-white/40 cursor-help hover:text-blue transition-colors px-1 font-mono select-none"
          title={tip}
          aria-label={tip}
        >
          (?)
        </span>
      )}
    </div>
  )
}

function calculateListingQuality(p) {
  if (!p) return { score: 0, nextHint: 'Enter product details' }
  const checks = [
    { key: 'name', label: 'Add product name', weight: 15, valid: Boolean(p.name?.trim()) },
    { key: 'sku', label: 'SKU identity', weight: 10, valid: Boolean(p.sku?.trim()) },
    { key: 'barcode', label: 'Scan or add barcode', weight: 10, valid: Boolean(p.barcode?.trim()) },
    { key: 'origin', label: 'Add origin (e.g. Parma, Italy)', weight: 10, valid: Boolean(p.origin?.trim() || p.country_of_origin?.trim()) },
    { key: 'net_weight', label: 'Add net weight', weight: 10, valid: Number(p.net_weight) > 0 },
    { key: 'pricing', label: 'Set cost & SRP price', weight: 15, valid: Number(p.srp) > 0 && Number(p.cost_price) > 0 },
    { key: 'description', label: 'Add description', weight: 15, valid: Boolean(p.description?.trim()) },
    { key: 'instructions', label: 'Add storage / usage guidelines', weight: 10, valid: Boolean(p.storage_instructions?.trim() || p.usage_instructions?.trim()) },
    { key: 'photo', label: 'Assign primary photo', weight: 5, valid: Boolean(p.primary_image_url || p.image_url) },
  ]
  const score = checks.reduce((acc, c) => acc + (c.valid ? c.weight : 0), 0)
  const firstMissing = checks.find(c => !c.valid)
  return {
    score,
    nextHint: firstMissing ? `Next: ${firstMissing.label}` : 'Listing specifications complete!',
  }
}

function Section({ color = 'blue', title, children }) {
  const colors = {
    blue:   'text-white border-blue',
    amber:  'text-white border-white/30',
    forest: 'text-white border-blue',
    purple: 'text-white border-white/30',
    crimson:'text-crimson border-crimson',
    slate:  'text-white border-white/30',
  }
  return (
    <div className={`border-l border-white/15 pl-4 space-y-3 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-extrabold uppercase tracking-wider text-white/70">{title}</p>
      {children}
    </div>
  )
}

// ── Stock breakdown chips (by location / channel / holder) ───────────────────
function BreakdownRow({ label, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/35">{label}</span>
      {entries.map(([entryKey, qty]) => (
        <span key={entryKey} className="text-xs font-mono bg-white/5 border border-adm-line rounded px-1.5 py-0.5 text-neutral-200" title={`${label} - ${entryKey}: ${qty} pcs`}>
          {entryKey} <span className="font-bold text-white">{qty}</span>
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryGrid({ actorId, launchTool, onLaunchToolHandled, canManageMediaCleanup = false, canManageProducts = false }) {
  const secure = adminBffEnabled()
  const [products, setProducts]       = useState([])
  const [batchMap, setBatchMap]       = useState({})
  const [batchReadStatus, setBatchReadStatus] = useState('loading')
  const catalogRead = useRef(0)
  const batchRead = useRef(0)
  const batchesReady = !secure || batchReadStatus === 'ready'
  const [loading, setLoading]         = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [photoProduct, setPhotoProduct] = useState(null)
  const [editTab, setEditTab] = useState('details')
  const [batchProduct, setBatchProduct]   = useState(null)
  const [saving, setSaving]           = useState(false)
  const [showAiScanner, setShowAiScanner] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [showMediaCleanup, setShowMediaCleanup] = useState(false)
  const [showPhoneIntake, setShowPhoneIntake] = useState(false)
  const [guidedIntake, setGuidedIntake] = useState(false)
  const openIntake = () => secure ? setShowPhoneIntake(true) : setShowAiScanner(true)

  useEffect(() => {
    if (!launchTool?.id) return
    if (['scan-product', 'smart-paste', 'add-inventory'].includes(launchTool.id)) openIntake()
    if (launchTool.id === 'guided-intake') { setGuidedIntake(true); setShowPhoneIntake(true) }
    onLaunchToolHandled?.(launchTool.token)
  }, [launchTool, onLaunchToolHandled, secure])
  const [enrichProduct, setEnrichProduct] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [showStoreCategories, setShowStoreCategories] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showFamilyEditor, setShowFamilyEditor] = useState(false)
  const [showSkuMerge, setShowSkuMerge] = useState(false)
  const familyRecovery = useProductFamilyRecovery({ actorId, enabled: secure, canManageProducts })
  const [deleteTargets, setDeleteTargets] = useState(null)
  const [statusBusy, setStatusBusy] = useState(null)
  const [statusDecision, setStatusDecision] = useState(null)
  const [statusSavingMode, setStatusSavingMode] = useState('immediate')
  const statusInFlight = useRef(false)
  const [editReason, setEditReason] = useState('')
  const [productTaxonomyReview, setProductTaxonomyReview] = useState(null)
  const [referenceKind, setReferenceKind] = useState(null)
  const [referenceNotice, setReferenceNotice] = useState('')
  const [editError, setEditError] = useState('')
  const recovery = useProductMasterRecovery({ actorId, enabled: secure, canManageProducts })
  const websiteRecovery=useWebsiteAssignmentRecovery({actorId,enabled:secure,canManageProducts})
  const [websiteSku,setWebsiteSku]=useState(null)
  const editPending = Boolean(recovery.pending)
  const [showProductRecovery, setShowProductRecovery] = useState(false)
  const editIdentity = useRef(null)
  if (editIdentity.current?.actorId !== actorId || editIdentity.current?.canManageProducts !== canManageProducts) editIdentity.current = { actorId, canManageProducts }
  useEffect(() => { setEditingProduct(null); setShowProductRecovery(false);setWebsiteSku(null); setSaving(false); setEditError(''); setStatusDecision(null); setStatusBusy(null); setShowStoreCategories(false) }, [actorId, canManageProducts])
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')

  useEffect(() => {
    fetchProducts()
    fetchBatches()
    if (secure) {
      const refresh = () => {
        if (document.visibilityState === 'visible') {
          fetchProducts()
          fetchBatches()
        }
      }
      const timer = window.setInterval(refresh, 30_000)
      document.addEventListener('visibilitychange', refresh)
      return () => { catalogRead.current++; batchRead.current++; window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
    }
    if (!supabase) return undefined
    const ch = supabase.channel('public:products:grid')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_batches' }, fetchBatches)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [secure])

  const fetchProducts = async () => {
    if (secure) {
      const read = ++catalogRead.current
      setLoading(true)
      const result = await getAdminProducts()
      if (read !== catalogRead.current) return
      if (!result.ok) flash(result.error || 'Product records could not be loaded.', true)
      else {
        setProducts(result.products || [])
        // A refresh can remove SKUs the bulk selection still names. Acting on
        // them afterwards would change the wrong records, so prune first.
        const live = new Set((result.products || []).map(product => product.sku))
        setSelected(prev => new Set([...prev].filter(sku => live.has(sku))))
      }
      setLoading(false)
      return
    }
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (error) flash(safeUiError('CATALOG_LOAD_FAILED'), true)
    else {
      setProducts(data || [])
      const live = new Set((data || []).map(product => product.sku))
      setSelected(prev => new Set([...prev].filter(sku => live.has(sku))))
    }
    setLoading(false)
  }

  // Load every batch once, then roll it up per-SKU: total, count, and the
  // splits by location (hub), channel, and holder (custodian). Also integrates
  // derived owned stock and flags unresolved allocations under OWNER-002.
  const fetchBatches = async () => {
    if (secure) {
      const read = ++batchRead.current
      setBatchReadStatus('loading')
      setBatchMap({})
      const result = await getAdminLots('')
      if (read !== batchRead.current) return
      try {
        if (!result.ok || result.data?.complete !== true || !Array.isArray(result.data.lots)
          || result.data.lots.length > 500 || !result.data.derivedStock) throw new Error('BATCH_READ_INCOMPLETE')
        for (const lot of result.data.lots) {
          if (!lot.sku || !Number.isSafeInteger(lot.quantity) || lot.quantity < 0
            || !result.data.derivedStock[lot.sku]) throw new Error('BATCH_READ_INCOMPLETE')
        }
        for (const ds of Object.values(result.data.derivedStock)) {
          if (typeof ds.requiresReconciliation !== 'boolean'
            || [ds.committedQuantity, ds.heldQuantity, ds.unresolvedCount, ds.unresolvedQuantity].some(q => !Number.isSafeInteger(q) || q < 0)
            || (!ds.requiresReconciliation && (!Number.isSafeInteger(ds.ownedQuantity) || ds.ownedQuantity < 0))) throw new Error('BATCH_READ_INCOMPLETE')
        }
        const map = {}
        for (const r of result.data.lots) {
          const q = Number(r.quantity) || 0
          const ds = result.data.derivedStock?.[r.sku]
          const m = map[r.sku] || (map[r.sku] = {
            total: 0, count: 0, hub: {}, channel: {}, custodian: {}, earliestExpiry: null, attention: 0,
            owned: ds?.requiresReconciliation ? null : ds?.ownedQuantity,
            committed: ds?.committedQuantity ?? 0,
            held: ds?.heldQuantity ?? 0,
            requiresReconciliation: ds?.requiresReconciliation ?? false,
            unresolvedCount: ds?.unresolvedCount ?? 0,
            unresolvedQuantity: ds?.unresolvedQuantity ?? 0,
            unresolvedAllocations: ds?.unresolvedAllocations ?? [],
          })
          if (q > 0) {
            m.total += q
            m.count += 1
            const hub = r.hub || 'Unassigned', ch = r.channel || 'Unassigned', cu = r.custodian || 'Unassigned'
            m.hub[hub]        = (m.hub[hub] || 0) + q
            m.channel[ch]     = (m.channel[ch] || 0) + q
            m.custodian[cu]   = (m.custodian[cu] || 0) + q
            if (r.expiry_date && (!m.earliestExpiry || r.expiry_date < m.earliestExpiry)) m.earliestExpiry = r.expiry_date
            if (r.is_pinned) m.attention += 1
          }
        }
        if (result.data.derivedStock) {
          for (const [sku, ds] of Object.entries(result.data.derivedStock)) {
            if (!map[sku]) {
              map[sku] = {
                total: 0, count: 0, hub: {}, channel: {}, custodian: {}, earliestExpiry: null, attention: 0,
                owned: ds.requiresReconciliation ? null : ds.ownedQuantity,
                committed: ds.committedQuantity ?? 0,
                held: ds.heldQuantity ?? 0,
                requiresReconciliation: ds.requiresReconciliation ?? false,
                unresolvedCount: ds.unresolvedCount ?? 0,
                unresolvedQuantity: ds.unresolvedQuantity ?? 0,
                unresolvedAllocations: ds.unresolvedAllocations ?? [],
              }
            }
          }
        }
        setBatchMap(map)
        setBatchReadStatus('ready')
      } catch {
        setBatchMap({})
        setBatchReadStatus('unavailable')
      }
      return
    }
    if (!supabase) return
    const { data, error } = await supabase.from('product_batches').select('sku, quantity, hub, custodian, channel, expiry_date, is_pinned, inventory_status, reserved_quantity')
    if (error) { flash(safeUiError('INVENTORY_LOAD_FAILED'), true); return }
    const map = {}
    for (const r of data) {
      const q = Number(r.quantity) || 0
      if (q <= 0) continue
      const m = map[r.sku] || (map[r.sku] = { total: 0, count: 0, hub: {}, channel: {}, custodian: {}, earliestExpiry: null, attention: 0 })
      m.total += q
      m.count += 1
      const hub = r.hub || 'Unassigned', ch = r.channel || 'Unassigned', cu = r.custodian || 'Unassigned'
      m.hub[hub]        = (m.hub[hub] || 0) + q
      m.channel[ch]     = (m.channel[ch] || 0) + q
      m.custodian[cu]   = (m.custodian[cu] || 0) + q
      if (r.expiry_date && (!m.earliestExpiry || r.expiry_date < m.earliestExpiry)) m.earliestExpiry = r.expiry_date
      if (r.is_pinned) m.attention += 1
    }
    setBatchMap(map)
  }


  // ── Build the full payload from editingProduct ─────────────────────────────
  const buildPayload = (p) => ({
    name:                     p.name || '',
    short:                    p.short || null,
    barcode:                  p.barcode || null,
    subcategory:              p.subcategory || null,
    country_of_origin:        p.country_of_origin || p.origin || null,
    origin:                   p.origin || p.country_of_origin || null,
    net_weight:               p.net_weight === '' || p.net_weight == null ? null : Number(p.net_weight),
    package_type:             p.package_type || null,
    size:                     p.size || null,
    expiry_date:              p.expiry_date || null,
    description:              p.description || '',
    why_buy:                  p.why_buy || '',
    why_rare:                 p.why_rare || null,
    usage_instructions:       p.usage_instructions || '',
    storage_instructions:     p.storage_instructions || '',
    ingredients:              p.ingredients || '',
    allergens:                p.allergens || '',
    finished_product_details: p.finished_product_details || '',
    pairings:                 Array.isArray(p.pairings) ? p.pairings : [],
    cost_price:               Number(p.cost_price) || 0,
    srp:                      Number(p.srp) || 0,
    wholesale_price:          Number(p.wholesale_price) || 0,
    dealer_price:             Number(p.dealer_price) || 0,
    reorder_level:            Number(p.reorder_level) || 0,
    slug:                     p.slug || null,
    seo_keywords:             Array.isArray(p.seo_keywords) ? p.seo_keywords : (p.seo_keywords ? String(p.seo_keywords).split(',').map(s => s.trim()) : []),
    is_featured:              Boolean(p.is_featured),
    ...(secure ? { is_human_reviewed: p.is_human_reviewed === true } : {}),
    product_video_url:        p.product_video_url || null,
    internal_notes:           p.internal_notes || null,
  })

  const openProductEditor = async (product, overrides = null) => {
    setReferenceNotice('')
    setEditTab('details')
    setEditReason(overrides ? 'AI auto-fill optimization verified by staff' : '')
    setEditError('')
    setProductTaxonomyReview(null)
    if (!secure) {
      setEditingProduct(overrides ? { ...product, ...overrides } : product)
      return
    }
    if (!canManageProducts) { flash('Only an administrator can change product-master records.', true); return }
    const result = await getAdminProductMasterBff(product.sku)
    if (!result.ok) { flash(result.error || 'The product record could not be loaded.', true); return }
    setEditingProduct(overrides ? { ...result.product, ...overrides } : result.product)
    setProductTaxonomyReview(result.taxonomyReview || null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setEditError('')
    if (secure) {
      const trimmedReason = editReason.trim()
      const effectiveReason = trimmedReason.length >= 8
        ? trimmedReason
        : (trimmedReason.length > 0 ? `Admin updated product details (${trimmedReason})` : 'Admin updated product details')
      if (productTaxonomyReview?.status === 'eligible'
          && (!editingProduct.brand_id || !editingProduct.category_id)) {
        setEditTab('details')
        setEditError('Choose an existing brand and category before saving this zero-stock Draft.')
        return
      }
      setSaving(true)
      const savingIdentity = editIdentity.current
      const patch = buildPayload(editingProduct)
      // Expiry is a batch fact, not product-master data. The legacy direct-write
      // editor still displays it, but the signed Product Master does not edit it.
      delete patch.expiry_date
      if (productTaxonomyReview?.status === 'eligible') {
        patch.brand_id = editingProduct.brand_id
        patch.category_id = editingProduct.category_id
      }
      const payload = {
        sku: editingProduct.sku, patch,
        expectedUpdatedAt: editingProduct.updated_at, reason: effectiveReason,
      }
      const result = await recovery.save(payload)
      if (editIdentity.current !== savingIdentity) return
      setSaving(false)
      if (!result.ok) { setEditError(result.error); return }
      const savedSku = editingProduct.sku
      setEditingProduct(null)
      setEditReason('')
      await fetchProducts()
      flash(`${savedSku} details were recorded.`)
      return
    }
    if (!editingProduct || !supabase) return
    setSaving(true)
    const payload = buildPayload(editingProduct)

    const { error } = await supabase.from('products').update(payload).eq('sku', editingProduct.sku)
    if (error) { setEditError(safeUiError('CATALOG_SAVE_FAILED')); setSaving(false); return }

    await fetchProducts()
    setEditingProduct(null)
    setSaving(false)
  }

  const set = (field, val) => {
    if (saving || editPending) return
    setEditError('')
    setEditingProduct(prev => ({ ...prev, [field]: val }))
  }

  const listingQuality = useMemo(() => calculateListingQuality(editingProduct), [editingProduct])

  const generateSlug = () => {
    if (!editingProduct?.name) return
    const generated = editingProduct.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
    set('slug', generated)
  }

  // ── Status lifecycle ───────────────────────────────────────────────────────
  const flash = (text, error = false) => {
    setNotice({ text, error })
    setTimeout(() => setNotice(null), 4000)
  }

  const saveStatusDecision = async (decision, reason) => {
    if (statusInFlight.current || !canManageProducts) return false
    const identity = editIdentity.current
    statusInFlight.current = true
    setStatusBusy(decision.nextStatus)
    try {
      const result = await commandAdminProductMasterBff('status', {
        skus: decision.skus, status: decision.nextStatus, reason,
      }, decision.operationKey)
      if (editIdentity.current !== identity) return false
      if (!result.ok) {
        setStatusDecision({ ...decision, reason, error: result.error || 'The status change could not be confirmed. Check the current product or retry the same change.' })
        return false
      }
      setStatusDecision(null)
      setSelected(new Set())
      await fetchProducts()
      if (editIdentity.current === identity) flash(`${decision.skus.length} product${decision.skus.length === 1 ? '' : 's'} set to ${decision.nextStatus}.`)
      return true
    } catch {
      if (editIdentity.current === identity) setStatusDecision({ ...decision, reason, error: 'The status change could not be confirmed. Check the current product or retry the same change.' })
      return false
    } finally {
      statusInFlight.current = false
      if (editIdentity.current === identity) setStatusBusy(null)
    }
  }

  const changeStatus = async (skus, nextStatus) => {
    if (skus.length === 0 || statusInFlight.current) return
    if (secure) {
      if (!canManageProducts) { flash('Only an administrator can change publication state.', true); return }
      const decision = { skus, nextStatus, operationKey: crypto.randomUUID() }
      if (statusSavingMode === 'note') setStatusDecision(decision)
      else await saveStatusDecision(decision, `Admin set status to ${nextStatus}`)
      return
    }
    setStatusBusy(nextStatus)

    // Optimistic — the realtime channel will reconcile if the write fails.
    setProducts(prev => prev.map(p => (skus.includes(p.sku) ? { ...p, status: nextStatus } : p)))

    if (supabase) {
      const { error } = await supabase.from('products').update({ status: nextStatus }).in('sku', skus)
      if (error) {
        setStatusBusy(null)
        await fetchProducts()
        return flash(safeUiError('CATALOG_STATUS_FAILED'), true)
      }
    }

    setStatusBusy(null)
    flash(
      skus.length === 1
        ? `${skus[0]} is now ${STATUS_LABEL[nextStatus]}.`
        : `${skus.length} products set to ${STATUS_LABEL[nextStatus]}.`
    )
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleOne = (sku) => setSelected(prev => {
    const next = new Set(prev)
    next.has(sku) ? next.delete(sku) : next.add(sku)
    return next
  })

  const clearSelection = () => setSelected(new Set())

  const selectedProducts = products.filter(p => selected.has(p.sku))
  const inventoryCategories = useMemo(() => storeCategoryEntries(products), [products])

  const inventoryMetrics = useMemo(() => computeInventoryMetrics(secure ? products.map(p => ({ ...p, expiry_date: null })) : products, batchMap), [batchMap, products, secure])

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter(product => {
      if (categoryFilter !== 'All' && (categoryFilter === 'Unassigned'
        ? !!product.subcategory?.trim() : getStoreCategory(product) !== categoryFilter)) return false
      const matchesSearch = !term || [
        product.sku,
        product.name,
        product.barcode,
        product.origin,
        product.country_of_origin,
        product.category,
        product.subcategory,
        product.category_name,
      ].some(value => String(value || '').toLowerCase().includes(term))
      if (!matchesSearch) return false
      const raw = product?.stock_available
      const stock = raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw)
      const threshold = Number(product.reorder_level) || 5
      const expiry = getExpiryHealth(batchMap[product.sku]?.earliestExpiry || (!secure ? product.expiry_date : null))
      if (stockFilter === 'out') return Number.isFinite(stock) && stock <= 0
      if (stockFilter === 'unknown') return !Number.isFinite(stock)
      if (stockFilter === 'low') return Number.isFinite(stock) && stock > 0 && stock <= threshold
      if (stockFilter === 'unresolved') return Boolean(batchMap[product.sku]?.requiresReconciliation)
      if (stockFilter === 'expiry') return ['EXPIRED', 'CRITICAL', 'WARNING'].includes(expiry.status)
      if (stockFilter === 'drafts') return !['Live', 'Active'].includes(product.status)
      return true
    })
  }, [batchMap, products, search, stockFilter, categoryFilter])
  const allSelected = visibleProducts.length > 0 && visibleProducts.every(product => selected.has(product.sku))
  const toggleAll = () => setSelected(previous => {
    const next = new Set(previous)
    if (allSelected) visibleProducts.forEach(product => next.delete(product.sku))
    else visibleProducts.forEach(product => next.add(product.sku))
    return next
  })

  const handleDeleted = (skus, deletedCount) => {
    setProducts(prev => prev.filter(p => !skus.includes(p.sku)))
    setSelected(new Set())
    setDeleteTargets(null)
    flash(`Deleted ${deletedCount} product${deletedCount !== 1 ? 's' : ''}.`)
  }

  return (
    <div className="relative mx-auto min-h-full max-w-[1600px] space-y-5 pb-12">
      <WorkspaceIntro
        eyebrow="Catalog and stock control"
        title="Inventory & stock checks"
        description="Find a product or batch and check stock or expiry. Counts come from saved records."
        status={loading ? 'Loading inventory evidence' : `${products.length} SKUs loaded`}
        statusTone={!batchesReady || inventoryMetrics.out || inventoryMetrics.expiryRisk || inventoryMetrics.unresolved ? 'warning' : 'success'}
        actions={(
          <div data-tour="inventory-actions" className="flex flex-wrap gap-2">
            <button
              data-tour="add-inventory-btn"
              onClick={openIntake}
              className="flex min-h-11 items-center gap-2 rounded-adm-sm bg-blue px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue/20 hover:bg-blue-deep active:scale-[0.98] transition-all cursor-pointer"
            >
              <PlusIcon size={16} />
              <span>Add inventory</span>
            </button>
            <button data-tour="scan-box-btn" onClick={openIntake} className={secondaryButton}><BoxIcon size={16} /> Scan box</button>
            {canManageMediaCleanup && adminBffEnabled() && <button onClick={() => setShowMediaCleanup(true)} className={secondaryButton}>Unused uploads</button>}
            <button data-tour="add-product-btn" onClick={openIntake} className={secondaryButton}>Add product</button>
          </div>
        )}
      />

      <MetricRail columns={
        (inventoryMetrics.unknown > 0 && inventoryMetrics.unresolved > 0) ? "lg:grid-cols-7" :
        (inventoryMetrics.unknown > 0 || inventoryMetrics.unresolved > 0) ? "lg:grid-cols-6" : "lg:grid-cols-5"
      } items={[
        { label: 'Active SKUs', value: loading ? '--' : products.length - inventoryMetrics.drafts, detail: `${products.length} total product records` },
        { label: 'Available units', value: loading ? '--' : inventoryMetrics.units.toLocaleString('en-PH'), detail: 'Product master available stock' },
        { label: 'Out of stock', value: loading ? '--' : inventoryMetrics.out, detail: 'Immediate replenishment review', tone: inventoryMetrics.out ? 'text-crimson' : 'text-white' },
        { label: 'Low stock', value: loading ? '--' : inventoryMetrics.low, detail: 'At or below reorder level', tone: inventoryMetrics.low ? 'text-amber' : 'text-white' },
        ...(inventoryMetrics.unknown > 0 ? [{ label: 'Unknown stock', value: loading ? '--' : inventoryMetrics.unknown, detail: 'Stock read unconfirmed or missing', tone: 'text-amber' }] : []),
        ...(!batchesReady || inventoryMetrics.unresolved > 0 ? [{ label: 'Unresolved stock', value: !batchesReady ? 'Unknown' : loading ? '--' : inventoryMetrics.unresolved, detail: batchesReady ? 'Attribution reconciliation required' : 'Allocation read unconfirmed', tone: batchesReady ? 'text-crimson' : 'text-amber' }] : []),
        { label: 'Expiry risk', value: !batchesReady ? 'Unknown' : loading ? '--' : inventoryMetrics.expiryRisk, detail: 'Expired or within 90 days', tone: inventoryMetrics.expiryRisk ? 'text-amber' : 'text-white' },
      ]} />

      {secure && !batchesReady && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken p-3 text-sm text-white/80">
        <p>{batchReadStatus === 'loading' ? 'Loading batch details…' : 'Batch details are unavailable. Counts, custody and expiry are unknown until the complete read succeeds.'}</p>
        {batchReadStatus === 'unavailable' && <button type="button" onClick={fetchBatches} className={secondaryButton}>Retry batch details</button>}
      </div>}

      {showAiScanner && (
        <ScanToAiModal onClose={() => setShowAiScanner(false)}
          onOpenSmartPaste={() => { setShowAiScanner(false); setShowSmartPaste(true) }}
          onExistingProduct={(product) => { setShowAiScanner(false); setBatchProduct(product) }} />
      )}
      {showSmartPaste && (
        <SmartPasteModal onClose={() => setShowSmartPaste(false)}
          onProductAdded={() => { fetchProducts(); setShowSmartPaste(false) }} />
      )}
      <ProductIntakeSessionModal
        isOpen={showPhoneIntake}
        guided={guidedIntake}
        onClose={() => { setShowPhoneIntake(false); setGuidedIntake(false) }}
        onProductCreated={() => { fetchProducts(); setShowPhoneIntake(false); setGuidedIntake(false) }}
        onExistingProduct={() => { setShowPhoneIntake(false); setGuidedIntake(false); flash('That product already exists. Find it in the inventory register.') }}
      />

      {notice && <StateBanner tone={notice.error ? 'danger' : 'success'}>{notice.text}</StateBanner>}

      <section className="space-y-3">
        <SectionHeading title="Products" description="Filters change the list. Bulk actions show how many products you selected." count={visibleProducts.length} />
        {secure && canManageProducts && <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <label htmlFor="status-saving-mode" className="text-sm font-semibold text-white/80">Status saving</label>
            <select id="status-saving-mode" value={statusSavingMode} onChange={event => setStatusSavingMode(event.target.value)} disabled={Boolean(statusBusy)} aria-describedby="status-saving-help" className="adm-input min-h-11 w-full text-base sm:w-auto sm:text-sm">
              <option value="immediate">Save immediately</option>
              <option value="note">Add a note</option>
            </select>
          </div>
          <p id="status-saving-help" className="text-sm text-white/70">{statusSavingMode === 'immediate' ? 'Selecting a status saves it with an automatic audit note.' : 'Selecting a status opens an optional note before saving.'}</p>
        </div>}
        <div className="flex flex-col gap-2 rounded-adm-sm border border-adm-line bg-adm-surface p-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search inventory</span>
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-3.5 text-white/35" />
            <input data-tour="search-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search SKU, product, barcode, or origin" className="adm-input min-h-11 pl-9 text-base sm:text-sm" />
          </label>
          <div className="flex gap-1 overflow-x-auto" aria-label="Filter inventory exceptions">
            {[
              ['all', 'All', products.length],
              ['out', 'Out', inventoryMetrics.out],
              ['low', 'Low', inventoryMetrics.low],
              ...(inventoryMetrics.unknown > 0 ? [['unknown', 'Unknown', inventoryMetrics.unknown]] : []),
              ...(inventoryMetrics.unresolved > 0 ? [['unresolved', 'Unresolved', inventoryMetrics.unresolved]] : []),
              ['expiry', 'Expiry', batchesReady ? inventoryMetrics.expiryRisk : 'Unknown'],
              ['drafts', 'Drafts', inventoryMetrics.drafts],
            ].map(([value, label, count]) => <button key={value} onClick={() => setStockFilter(value)} disabled={!batchesReady && ['expiry', 'unresolved'].includes(value)} aria-pressed={stockFilter === value} className={`min-h-11 shrink-0 rounded-adm-sm px-3 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${stockFilter === value ? 'bg-blue text-white' : 'text-white/45 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-60'}`}>{label} <span className="ml-1 font-mono text-xs opacity-70">{count}</span></button>)}
          </div>
        </div>
        <label className="block space-y-2 text-sm text-white/80"><span>Store category filter</span>
          <select className="adm-input min-h-11 w-full text-base sm:w-auto sm:text-sm" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
            <option value="All">All categories</option><option value="Unassigned">No custom store category</option>
            {inventoryCategories.map(({ name, count }) => <option key={name} value={name}>{name} ({count})</option>)}
          </select>
        </label>
      </section>


      {/* Select-all row */}
      {secure && actorId && <PendingReferenceCreation actorId={actorId} onReview={setReferenceKind} />}
      {secure && canManageProducts && <button type="button" className={secondaryButton} disabled={recovery.working||recovery.storageBlocked||!!recovery.pending} onClick={()=>setShowSkuMerge(true)}>Combine approved duplicates</button>}
      {secure && <PendingProductDecision recovery={recovery} onReview={() => recovery.pending&&JSON.parse(recovery.pending.payloadText).action==='merge'?setShowSkuMerge(true):setShowProductRecovery(true)} />}
      {secure && showSkuMerge && <ProductSkuMergeDialog key={actorId} actorId={actorId} canManageProducts={canManageProducts} recovery={recovery} onClose={()=>setShowSkuMerge(false)} onSaved={()=>{void fetchProducts();flash('Duplicate merge recorded. Refreshing inventory…')}} />}
      {secure&&<PendingWebsiteDecision recovery={websiteRecovery} onReview={setWebsiteSku}/>}
      {secure && <PendingProductFamilyDecision recovery={familyRecovery} onReview={() => setShowFamilyEditor(true)} />}
      {secure && showFamilyEditor && <ProductFamilyEditor key={actorId} selectedSkus={[...selected]} actorId={actorId} canManageProducts={canManageProducts} recovery={familyRecovery} onClose={() => setShowFamilyEditor(false)} onSaved={() => { flash('Product variations recorded.'); void fetchProducts() }} />}
      {secure && showStoreCategories && <BulkStoreCategoryDialog key={actorId} products={selectedProducts} allProducts={products} recovery={recovery} actorId={actorId} canManageProducts={canManageProducts} onClose={() => setShowStoreCategories(false)} onSaved={() => { void fetchProducts() }} />}
      {secure&&websiteSku&&<WebsiteAssignmentDialog key={`${actorId}:${websiteSku}:${canManageProducts}`} sku={websiteSku} actorId={actorId} canManageProducts={canManageProducts} recovery={websiteRecovery} onClose={()=>setWebsiteSku(null)}/>}
      {secure && showProductRecovery && <ProductMasterRecovery recovery={recovery} canManageProducts={canManageProducts}
        onNotApplied={(product, taxonomyReview) => {
          setShowProductRecovery(false); setEditingProduct(product); setProductTaxonomyReview(taxonomyReview)
          setEditTab('details'); setEditReason(''); setEditError(''); setReferenceNotice('')
          flash('Your previous change did not apply. Review the latest details and enter a new reason before saving.')
        }}
        onClose={() => setShowProductRecovery(false)} onRecorded={async sku => {
          setShowProductRecovery(false); setEditingProduct(null); setEditReason(''); setEditError('')
          await fetchProducts(); flash(`${sku} decision was recorded. Current product facts were refreshed.`)
        }} />}
      {visibleProducts.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-11">
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = selected.size > 0 && !allSelected }}
              onChange={toggleAll}
              className="h-5 w-5 shrink-0 accent-blue cursor-pointer"
            />
            <span className="text-sm font-semibold text-white">
              {selected.size > 0 ? `${selected.size} selected` : `Select visible (${visibleProducts.length})`}
            </span>
          </label>
          {selected.size > 0 && (
            <>
            {secure && canManageProducts && <button type="button" className={secondaryButton} disabled={recovery.working || !!recovery.pending || recovery.storageBlocked} onClick={() => setShowStoreCategories(true)}>Set store category</button>}
            {secure && canManageProducts && <button type="button" className={secondaryButton} disabled={selected.size > 100 || familyRecovery.working || !!familyRecovery.pending || familyRecovery.storageBlocked} onClick={() => setShowFamilyEditor(true)}>Manage variations</button>}
            <button onClick={clearSelection} className="ml-auto text-xs font-semibold text-white/50 hover:text-white transition-colors min-h-11 px-2">
              Clear
            </button>
            </>
          )}
        </div>
      )}

      {/* Product cards */}
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" role="status">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-adm border border-adm-line bg-adm-surface" />)}
        </div>
      ) : visibleProducts.length === 0 ? (
        <EmptyState icon={BoxIcon} title="No products match this view" description="Clear the search or change the stock filter to see more products." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleProducts.map(p => {
            const primaryExpiryDate = batchesReady ? (batchMap[p.sku]?.earliestExpiry || (!secure ? p.expiry_date : null)) : null
            const expiryHealth = getExpiryHealth(primaryExpiryDate)
            const attentionCount = batchMap[p.sku]?.attention || 0

            return (
              <div key={p.sku} className={`group relative rounded-adm-sm border bg-adm-sunken overflow-hidden flex flex-col transition-colors ${
                selected.has(p.sku) ? 'border-blue ring-1 ring-blue/40' : 'border-adm-line hover:border-blue/50'
              }`}>
                {/* ── MOBILE COMPACT CARD (< sm) ── */}
                <div className="flex sm:hidden flex-col p-3 space-y-2.5">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail + select + expiry */}
                    <div className="relative h-20 w-20 shrink-0 rounded-adm-sm bg-white/5 border border-adm-line flex items-center justify-center p-1.5">
                      <label className="absolute top-1 left-1 z-10 flex h-6 w-6 items-center justify-center rounded bg-adm-bg/85 border border-adm-line cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(p.sku)}
                          onChange={() => toggleOne(p.sku)}
                          aria-label={`Select ${p.name || p.sku}`}
                          className="h-3.5 w-3.5 accent-blue cursor-pointer"
                        />
                      </label>
                      <img src={p.primary_image_url || p.image_url || '/images/placeholder.svg'} alt={p.name} onError={applyImageFallback}
                        className="max-h-full max-w-full object-contain" />
                      {primaryExpiryDate && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setBatchProduct(p) }}
                          className={`absolute bottom-1 left-1 text-[9px] font-bold px-1 rounded border leading-tight ${
                            expiryHealth.color === 'crimson' ? 'bg-crimson border-crimson text-white' :
                            expiryHealth.color === 'amber' ? 'bg-gold border-gold text-navy' :
                            'bg-blue border-blue text-white'
                          }`}
                        >
                          {expiryHealth.text}
                        </button>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-mono text-neutral-300 font-semibold truncate">{p.sku}</span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider border ${STATUS_TONE[p.status] || STATUS_TONE.Draft}`}>
                          {STATUS_LABEL[p.status] || p.status || 'Draft'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">{p.name}</h3>
                      {p.origin && <p className="text-xs text-white/45 truncate mt-0.5">Origin: {p.origin}</p>}
                    </div>
                  </div>

                  {/* Stock & SRP row */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-2 rounded-adm-sm border border-adm-line">
                    <div>
                      <span className="text-white/50 uppercase text-xs font-bold tracking-wider block">Stock</span>
                      {(() => {
                        const raw = p.stock_available
                        const stock = raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw)
                        if (!Number.isFinite(stock)) {
                          return <span className="font-extrabold text-sm text-amber">Unknown</span>
                        }
                        return <span className={`font-extrabold text-sm ${stock <= 5 ? 'text-crimson' : 'text-white'}`}>{stock} pcs</span>
                      })()}
                    </div>
                    <div className="text-right">
                      <span className="text-white/50 uppercase text-xs font-bold tracking-wider block">SRP</span>
                      <span className="font-extrabold text-sm text-white tabular-nums">₱{Number(p.srp || 0).toLocaleString('en-PH')}</span>
                    </div>
                  </div>

                  {/* Batch breakdown row if any */}
                  {batchMap[p.sku] && (
                    <div className="space-y-1 bg-white/5 border border-adm-line rounded-adm-sm p-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-xs font-bold uppercase">
                          {batchMap[p.sku].total} pcs in {batchMap[p.sku].count} lot{batchMap[p.sku].count !== 1 ? 's' : ''}
                        </span>
                        {batchMap[p.sku].requiresReconciliation ? (
                          <span className="text-xs font-bold text-crimson bg-crimson/15 px-1 rounded border border-crimson/30">
                            Unresolved
                          </span>
                        ) : batchMap[p.sku].owned != null ? (
                          <span className="text-xs text-white/60">
                            Owned: <strong className="text-white font-bold">{batchMap[p.sku].owned}</strong>
                          </span>
                        ) : null}
                      </div>
                      <BreakdownRow label="Channel" data={batchMap[p.sku].channel} />
                    </div>
                  )}

                  {/* Mobile Actions Grid */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => setPhotoProduct(p)}
                      className="min-h-11 rounded-adm-sm border border-adm-line bg-adm-surface px-2 text-xs font-bold text-white hover:bg-white/10 active:scale-[0.98] transition-all text-center flex items-center justify-center"
                    >
                      Photos
                    </button>
                    <button
                      onClick={() => openProductEditor(p)}
                      disabled={secure && !canManageProducts}
                      className="min-h-11 rounded-adm-sm bg-blue px-2 text-xs font-bold text-white hover:bg-blue/90 active:scale-[0.98] transition-all text-center flex items-center justify-center disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setEnrichProduct(p)}
                      className="min-h-11 rounded-adm-sm border border-blue/40 bg-blue/10 px-2 text-xs font-bold text-blue hover:bg-blue/20 active:scale-[0.98] transition-all text-center flex items-center justify-center"
                    >
                      Specs
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setBatchProduct(p)}
                      className="flex-1 min-h-11 text-xs font-bold bg-white/10 hover:bg-white/15 text-neutral-200 py-2 rounded-adm-sm border border-adm-line transition-colors text-center"
                    >
                      Batches ({batchesReady ? (batchMap[p.sku]?.count ?? (!secure ? p.batches?.length : 0) ?? 0) : 'Unknown'})
                    </button>
                    {secure && (
                      <button
                        type="button"
                        onClick={() => setWebsiteSku(p.sku)}
                        aria-label="Website assignment"
                        data-admin-focus-key={`website-assignment:${p.sku}`}
                        disabled={!canManageProducts || Boolean(websiteRecovery.pending) || websiteRecovery.storageBlocked}
                        className="flex-1 min-h-11 text-xs font-bold border border-adm-line bg-adm-surface px-2 text-white/80 hover:text-white rounded-adm-sm"
                      >
                        Website
                      </button>
                    )}
                  </div>
                  <StatusControl
                    value={p.status}
                    disabled={Boolean(statusBusy) || (secure && !canManageProducts)}
                    onChange={(next) => changeStatus([p.sku], next)}
                  />
                </div>

                {/* ── DESKTOP CARD (sm:flex) ── */}
                <div className="hidden sm:flex sm:flex-col flex-1">
                  <div className="aspect-square bg-white/5 flex items-center justify-center p-4 relative">
                    {/* Selection checkbox — generous hit area, it sits over art */}
                    <label className="absolute top-2 left-2 z-10 flex h-10 w-10 items-center justify-center rounded-adm-sm bg-adm-bg/80 backdrop-blur-sm border border-adm-line cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(p.sku)}
                        onChange={() => toggleOne(p.sku)}
                        aria-label={`Select ${p.name || p.sku}`}
                        className="h-5 w-5 accent-blue cursor-pointer"
                      />
                    </label>
                    <img src={p.primary_image_url || p.image_url || '/images/placeholder.svg'} alt={p.name} onError={applyImageFallback}
                      className="max-h-full max-w-full object-contain drop-shadow-lg" />
                    
                    {/* FEFO uses the earliest real batch expiry. Attention pins never override it. */}
                    {primaryExpiryDate && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setBatchProduct(p) }}
                        className={`absolute bottom-2 left-2 text-sm font-bold px-2 py-0.5 rounded border transition-all ${
                          expiryHealth.color === 'crimson' ? 'bg-crimson border-crimson text-white font-bold' :
                          expiryHealth.color === 'amber' ? 'bg-gold border-gold text-navy font-extrabold' :
                          'bg-blue border-blue text-white font-bold'
                        }`}
                      >
                        {expiryHealth.text}{attentionCount > 0 ? ` · ${attentionCount} flagged` : ''}
                      </button>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-mono text-neutral-300 font-semibold uppercase truncate">{p.sku}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider border ${STATUS_TONE[p.status] || STATUS_TONE.Draft}`}>
                        {STATUS_LABEL[p.status] || p.status || 'Draft'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white line-clamp-2 mb-1.5">{p.name}</h3>
                    {p.origin && <p className="mb-2 text-xs font-medium text-white/45">Origin: {p.origin}</p>}
                    
                    <div className="mt-auto space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 text-base bg-white/5 p-2.5 rounded-adm-sm border border-adm-line">
                        <div>
                          <p className="text-white/60 uppercase text-sm font-bold tracking-wider mb-0.5">Stock</p>
                          {(() => {
                            const raw = p.stock_available
                            const stock = raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw)
                            if (!Number.isFinite(stock)) {
                              return <p className="font-extrabold text-lg text-amber">Unknown</p>
                            }
                            return <p className={`font-extrabold text-lg ${stock <= 5 ? 'text-crimson' : 'text-white'}`}>{stock}</p>
                          })()}
                        </div>
                        <div>
                          <p className="text-white/60 uppercase text-sm font-bold tracking-wider mb-0.5">Retail SRP</p>
                          <p className="font-extrabold text-lg text-white tabular-nums">₱{Number(p.srp || 0).toLocaleString('en-PH')}</p>
                        </div>
                      </div>

                      {/* Where it is / which channel — live from the batch bank */}
                      {batchMap[p.sku] && (
                        <div className="space-y-1.5 bg-white/5 border border-adm-line rounded-adm-sm p-2">
                          <div className="flex items-center justify-between">
                            <p className="text-white/40 uppercase text-xs font-bold tracking-wider">
                              {batchMap[p.sku].total} pcs in {batchMap[p.sku].count} lot{batchMap[p.sku].count !== 1 ? 's' : ''}
                            </p>
                            {batchMap[p.sku].requiresReconciliation ? (
                              <span className="text-xs font-bold text-crimson bg-crimson/15 px-1.5 py-0.5 rounded border border-crimson/30">
                                Owned: Unresolved
                              </span>
                            ) : batchMap[p.sku].owned != null ? (
                              <span className="text-xs font-medium text-white/60">
                                Owned: <strong className="text-white font-bold">{batchMap[p.sku].owned}</strong> pcs
                              </span>
                            ) : null}
                          </div>
                          <BreakdownRow label="Location" data={batchMap[p.sku].hub} />
                          <BreakdownRow label="Channel" data={batchMap[p.sku].channel} />
                          <BreakdownRow label="Holder" data={batchMap[p.sku].custodian} />
                        </div>
                      )}

                      <div className="pt-1">
                        <button
                          onClick={() => setBatchProduct(p)}
                          className="w-full min-h-11 text-sm font-sans font-bold bg-white/10 hover:bg-white/15 text-neutral-200 py-2 rounded-adm-sm border border-adm-line transition-colors text-center"
                        >
                          Batches ({batchesReady ? (batchMap[p.sku]?.count ?? (!secure ? p.batches?.length : 0) ?? 0) : 'Unknown'})
                        </button>
                      </div>

                      <button
                        onClick={() => setEnrichProduct(p)}
                        className="w-full min-h-11 text-sm font-sans font-bold bg-blue/10 hover:bg-blue/20 text-blue py-2 rounded-adm-sm border border-blue/30 transition-colors text-center flex items-center justify-center gap-1.5"
                      >
                        Enrich product specs
                      </button>

                      {/* Lifecycle: three visible states, plus a destructive
                          action kept deliberately separate from them. */}
                      <div className="pt-1 space-y-1.5">
                        {secure&&<button type="button" data-admin-focus-key={`website-assignment:${p.sku}`} onClick={()=>setWebsiteSku(p.sku)} disabled={!canManageProducts||!!websiteRecovery.pending||websiteRecovery.storageBlocked} className={`${secondaryButton} w-full`}>Website assignment</button>}
                        <StatusControl
                          value={p.status}
                          disabled={!!statusBusy || (secure && !canManageProducts)}
                          onChange={(next) => changeStatus([p.sku], next)}
                        />
                        <button
                          onClick={() => setDeleteTargets([p])}
                          disabled={secure && !canManageProducts}
                          title={secure && !canManageProducts ? 'Administrator permission is required' : 'Permanently delete this product'}
                          className="w-full min-h-11 text-xs font-bold text-crimson/70 hover:text-crimson hover:bg-crimson/10 rounded-adm-sm border border-transparent hover:border-crimson/30 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete product
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-2 top-2 flex gap-2">
                    <button onClick={() => setPhotoProduct(p)} className="min-h-11 rounded-adm-sm border border-adm-line bg-adm-surface/95 px-3 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-[0.98]">Photos</button>
                    <button onClick={() => openProductEditor(p)} disabled={secure && !canManageProducts} title={secure && !canManageProducts ? 'Administrator permission is required' : 'Edit product details'} className="min-h-11 rounded-adm-sm bg-blue px-3.5 text-sm font-extrabold text-white shadow-lg transition-[background-color,transform] duration-150 hover:bg-blue/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">Edit</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bulk action bar — floats above the mobile tab bar while a selection
          is live, so the actions are always in thumb reach. */}
      {selected.size > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-adm-line bg-adm-surface/95 backdrop-blur-md lg:left-60"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.25rem)' }}
        >
          <div className="mx-auto max-w-5xl px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-white">
                {selected.size} selected
              </p>
              <button onClick={clearSelection} className="text-xs font-semibold text-white/50 hover:text-white min-h-11 px-2 transition-colors">
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  disabled={!!statusBusy || (secure && !canManageProducts)}
                  onClick={() => changeStatus([...selected], opt.value)}
                  className={`shrink-0 min-h-[44px] px-3.5 rounded-adm-sm text-sm font-bold border transition-colors disabled:opacity-50 ${STATUS_TONE[opt.value]}`}
                >
                  {statusBusy === opt.value ? 'Saving…' : `Set ${opt.label}`}
                </button>
              ))}
              <button
                onClick={() => setDeleteTargets(selectedProducts)}
                disabled={secure && !canManageProducts}
                className="shrink-0 min-h-[44px] px-3.5 rounded-adm-sm bg-crimson hover:bg-crimson-deep text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargets && (
        <DeleteProductsModal
          products={deleteTargets}
          onClose={() => setDeleteTargets(null)}
          onDeleted={handleDeleted}
        />
      )}

      {statusDecision && <StatusDecisionDialog
        decision={statusDecision}
        busy={statusBusy === statusDecision.nextStatus}
        onCancel={() => !statusBusy && setStatusDecision(null)}
        onConfirm={reason => saveStatusDecision(statusDecision, reason)}
      />}

      <ProductAiEnrichmentModal
        product={enrichProduct}
        isOpen={Boolean(enrichProduct)}
        onClose={() => setEnrichProduct(null)}
        onEnriched={() => fetchProducts()}
        onOpenEditor={(p, overrides) => {
          setEnrichProduct(null)
          openProductEditor(p, overrides)
        }}
      />

      {/* ── FULL EDIT MODAL ─────────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 md:p-4 animate-in fade-in">
          <AdminDialog
            onClose={() => { setEditingProduct(null); setEditError('') }}
            closeDisabled={saving}
            labelledBy="product-editor-title"
          >
          <div className="w-full max-w-3xl rounded-adm border border-adm-line bg-adm-surface shadow-2xl flex flex-col max-h-[96vh]">

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-adm-line bg-white/5">
              <div>
                <h3 id="product-editor-title" className="font-sans text-xl font-semibold text-white">Edit Product</h3>
                <p className="text-sm text-white/60 font-mono mt-0.5">{editingProduct.sku}</p>
              </div>
              <button onClick={() => { setEditingProduct(null); setEditError('') }} disabled={saving} className="text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-adm-sm hover:bg-white/10 disabled:opacity-50" aria-label="Close product editor">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              {/* Listing completeness progress bar */}
              <div className="border-b border-adm-line bg-black/30 px-4 py-2.5 sm:px-6">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-white/80">
                    Listing Quality: <strong className={listingQuality.score >= 80 ? 'text-forest font-bold' : listingQuality.score >= 50 ? 'text-gold font-bold' : 'text-crimson font-bold'}>{listingQuality.score}%</strong>
                  </span>
                  <span className="text-white/50 text-xs font-mono">{listingQuality.nextHint}</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${listingQuality.score >= 80 ? 'bg-forest' : listingQuality.score >= 50 ? 'bg-gold' : 'bg-blue'}`}
                    style={{ width: `${listingQuality.score}%` }}
                  />
                </div>
              </div>

              {/* Section tabs — edit one focused part at a time */}
              <div className="flex gap-1 overflow-x-auto border-b border-adm-line px-3 sm:px-4 shrink-0 scrollbar-none">
                {[['details', 'Details'], ['pricing', 'Pricing & stock']].map(([id, lbl]) => (
                  <button key={id} type="button" onClick={() => setEditTab(id)}
                    className={'px-3 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ' +
                      (editTab === id ? 'border-blue text-white' : 'border-transparent text-white/50 hover:text-white')}>
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="min-h-0 p-4 sm:p-6 overflow-y-auto flex-1">
              <fieldset disabled={saving || editPending} className="m-0 min-w-0 border-0 p-0">

                {/* ── Details tab: Identity + Content ──────────────────── */}
                <div className={editTab === 'details' ? 'space-y-6' : 'hidden'}>

                  <Section color="blue" title="Product basics">
                    <div>
                      <Label tip="Official product name as shown to customers">Product name</Label>
                      <input type="text" value={editingProduct.name || ''} onChange={e => set('name', e.target.value)} className={inp} required />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label tip="Short name (max 25 characters) for cards and mobile listings">Short name for product cards</Label>
                        <input type="text" value={editingProduct.short || ''} onChange={e => set('short', e.target.value)} className={inp} />
                      </div>
                      <div>
                        <Label tip="Scanned 8-14 digit barcode (EAN-13, UPC) on packaging">Barcode / EAN</Label>
                        <input type="text" inputMode="numeric" value={editingProduct.barcode || ''} onChange={e => set('barcode', e.target.value)} className={`${inp} font-mono`} />
                      </div>
                      <div>
                        <Label tip="Customer-facing shelf. Bulk assign it with Select visible → Set store category. Operational taxonomy is separate.">Store category</Label>
                        <input type="text" value={editingProduct.subcategory || ''} onChange={e => set('subcategory', e.target.value)} className={inp} placeholder="e.g. Pasta Sauces" />
                      </div>
                      <div>
                        <Label tip="Place of origin in Italy, e.g. Parma, Italy">Origin</Label>
                        <input type="text" value={editingProduct.country_of_origin || editingProduct.origin || ''} onChange={e => { set('country_of_origin', e.target.value); set('origin', e.target.value) }} className={inp} placeholder="e.g. Parma, Italy" />
                      </div>
                      <div>
                        <Label tip="Net physical weight in grams without packaging">Net Weight</Label>
                        <input type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={editingProduct.net_weight ?? ''} onChange={e => set('net_weight', e.target.value)} className={inp} placeholder="Weight in grams" />
                      </div>
                      <div>
                        <Label tip="Packaging format: Glass Jar, Tin, Pouch, Box, Bottle">Package Type</Label>
                        <input type="text" value={editingProduct.package_type || ''} onChange={e => set('package_type', e.target.value)} className={inp} placeholder="e.g. Glass Jar" />
                      </div>
                      <div>
                        <Label tip="Display pack size for shoppers, e.g. 400g jar or 500ml bottle">Pack size</Label>
                        <input type="text" value={editingProduct.size || ''} onChange={e => set('size', e.target.value)} className={inp} placeholder="e.g. 400g jar" />
                      </div>
                      <div>
                        <Label htmlFor="product-expiry-date" tip="Earliest batch expiration date">Expiry Date</Label>
                        <input id="product-expiry-date" type="date" value={editingProduct.expiry_date || ''} onChange={e => set('expiry_date', e.target.value)}
                          disabled={secure} aria-describedby={secure ? 'product-expiry-help' : undefined}
                          className={`${inp} text-neutral-300 disabled:cursor-not-allowed disabled:opacity-60`} />
                        {secure && <p id="product-expiry-help" className="mt-1 text-xs text-white/45">Expiry is recorded on each batch during receiving.</p>}
                      </div>
                    </div>
                  </Section>

                  {secure && productTaxonomyReview && (
                    <Section color="blue" title="Initial brand and category">
                      {productTaxonomyReview.status === 'eligible' ? (
                        <>
                          <p className="text-sm text-white/55">This unpublished Draft has no stock or inventory history. Assign existing canonical records before receiving begins. These IDs cannot be changed after assignment.</p>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="product-initial-brand" tip="Canonical brand attribution">Brand</Label>
                              <select id="product-initial-brand" value={editingProduct.brand_id || ''}
                                onChange={event => set('brand_id', event.target.value)}
                                disabled={saving || Boolean(productTaxonomyReview.originalBrandId)}
                                className={`${inp} min-h-11 disabled:cursor-not-allowed disabled:opacity-60`}>
                                <option value="">Choose an existing brand</option>
                                {productTaxonomyReview.brandOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                              </select>
                              {!productTaxonomyReview.originalBrandId && actorId && <button type="button" disabled={saving || !canManageProducts} onClick={() => setReferenceKind('brand')} className={`${secondaryButton} mt-2`}>Create brand</button>}
                            </div>
                            <div>
                              <Label htmlFor="product-initial-category" tip="Canonical product category">Canonical category</Label>
                              <select id="product-initial-category" value={editingProduct.category_id || ''}
                                onChange={event => set('category_id', event.target.value)}
                                disabled={saving || Boolean(productTaxonomyReview.originalCategoryId)}
                                className={`${inp} min-h-11 disabled:cursor-not-allowed disabled:opacity-60`}>
                                <option value="">Choose an existing category</option>
                                {productTaxonomyReview.categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                              </select>
                              {!productTaxonomyReview.originalCategoryId && actorId && <button type="button" disabled={saving || !canManageProducts} onClick={() => setReferenceKind('category')} className={`${secondaryButton} mt-2`}>Create category</button>}
                            </div>
                          </div>
                          {referenceNotice && <p role="status" className="text-base text-white/80">{referenceNotice}</p>}
                        </>
                      ) : productTaxonomyReview.status === 'blocked' ? (
                        <p role="status" className="text-sm text-white/55">Initial assignment is closed because this product has stock or inventory history. Ask an administrator to review the existing records.</p>
                      ) : (
                        <p role="status" className="text-sm text-white/55">Initial assignment eligibility or canonical choices could not be verified. Refresh later; no IDs can be entered manually.</p>
                      )}
                    </Section>
                  )}

                  <DetailBlock title="Product description">
                    <div>
                      <Label tip="Customer-facing description highlighting origin and taste">Description (3 sentences)</Label>
                      <textarea rows={3} value={editingProduct.description || ''} onChange={e => set('description', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label tip="Short editorial hook for product discovery cards">Why buy this? (max 18 words)</Label>
                      <textarea rows={2} value={editingProduct.why_buy || ''} onChange={e => set('why_buy', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label tip="Import rarity explanation, e.g. artisanal small-batch import">Why is it hard to find in the Philippines?</Label>
                      <textarea rows={2} value={editingProduct.why_rare || ''} onChange={e => set('why_rare', e.target.value)} className={ta} />
                    </div>
                  </DetailBlock>

                  <DetailBlock title="Use & ingredients">
                    <div>
                      <Label tip="Serving suggestions, heating or preparation guidelines">How to use</Label>
                      <textarea rows={2} value={editingProduct.usage_instructions || ''} onChange={e => set('usage_instructions', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label tip="Storage instructions: cool dry place, refrigerate after opening, etc.">How to store</Label>
                      <textarea rows={2} value={editingProduct.storage_instructions || ''} onChange={e => set('storage_instructions', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label tip="Full ingredient list as printed on packaging">Ingredients</Label>
                      <textarea rows={3} value={editingProduct.ingredients || ''} onChange={e => set('ingredients', e.target.value)} className={ta} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label tip="Known allergens, e.g. Contains gluten, milk, tree nuts">Allergens</Label>
                        <input type="text" value={editingProduct.allergens || ''} onChange={e => set('allergens', e.target.value)} className={inp} />
                      </div>
                      <div>
                        <Label tip="Visual dish or prepared food outcome, e.g. Cooked pasta dish">Prepared result</Label>
                        <input type="text" value={editingProduct.finished_product_details || ''} onChange={e => set('finished_product_details', e.target.value)} className={inp} placeholder="e.g. Cooked pasta dish" />
                      </div>
                    </div>
                    <div>
                      <Label tip="Recommended Italian pairings, wine, bread, or coffee">Pairings (comma-separated)</Label>
                      <input type="text"
                        value={Array.isArray(editingProduct.pairings) ? editingProduct.pairings.join(', ') : (editingProduct.pairings || '')}
                        onChange={e => set('pairings', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className={inp} placeholder="Spread on warm pandesal, Pair with espresso, …" />
                     </div>
                   </DetailBlock>
                 </div>

                 {/* ── Pricing & stock tab: Pricing, Inventory, Website, Management ── */}
                <div className={editTab === 'pricing' ? 'space-y-6' : 'hidden'}>

                  <Section color="forest" title="Pricing">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        ['Cost ₱', 'cost_price', 'Direct landed cost per unit in Philippine Pesos'],
                        ['SRP ₱', 'srp', 'Suggested retail price in Philippine Pesos'],
                        ['Wholesale ₱', 'wholesale_price', 'Wholesale / bulk price tier'],
                        ['Dealer ₱', 'dealer_price', 'Distributor / reseller price tier'],
                      ].map(([lbl, field, fieldTip]) => (
                        <div key={field}>
                          <Label tip={fieldTip}>{lbl}</Label>
                          <input type="number" inputMode="decimal" min="0" step="0.01"
                            value={editingProduct[field] || 0}
                            onChange={e => set(field, Math.max(0, Number(e.target.value)))}
                            className={`${inp} tabular-nums`} />
                        </div>
                      ))}
                    </div>

                    {/* Live Gross Margin & Unit Profit Calculation */}
                    {Number(editingProduct.srp) > 0 && Number(editingProduct.cost_price) > 0 && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-adm-sm border border-adm-line bg-white/5 p-3 text-xs">
                        <div>
                          <span className="text-white/50 uppercase font-bold tracking-wider text-xs block">Gross Margin</span>
                          <p className="text-base font-extrabold text-forest tabular-nums">
                            {Math.round(((editingProduct.srp - editingProduct.cost_price) / editingProduct.srp) * 1000) / 10}%
                          </p>
                        </div>
                        <div>
                          <span className="text-white/50 uppercase font-bold tracking-wider text-xs block">Unit Profit</span>
                          <p className="text-base font-extrabold text-white tabular-nums">
                            ₱{(editingProduct.srp - editingProduct.cost_price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-white/50 uppercase font-bold tracking-wider text-xs block">Markup</span>
                          <p className="text-base font-extrabold text-neutral-300 tabular-nums">
                            {Math.round(((editingProduct.srp - editingProduct.cost_price) / editingProduct.cost_price) * 1000) / 10}%
                          </p>
                        </div>
                      </div>
                    )}
                  </Section>

                  <Section color="crimson" title="Inventory">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label tip="Total available units from active lots">Available Stock</Label>
                        <div className={`${inp} flex items-center tabular-nums text-white/70`}>
                          {(() => {
                            const raw = editingProduct.stock_available
                            const stock = raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw)
                            return Number.isFinite(stock) ? stock : 'Unknown'
                          })()}
                        </div>
                        <button type="button" onClick={() => setBatchProduct(editingProduct)} className="mt-2 min-h-11 w-full rounded-adm-sm border border-blue/35 bg-blue/10 px-3 text-xs font-semibold text-blue">Reconcile batches and stock</button>
                      </div>
                      <div>
                        <Label tip="Minimum stock threshold before low-stock alert triggers">Reorder Level</Label>
                        <input type="number" inputMode="numeric" min="0" value={editingProduct.reorder_level || 0} onChange={e => set('reorder_level', Math.max(0, Number(e.target.value)))} className={`${inp} tabular-nums`} />
                      </div>
                    </div>
                  </Section>

                  <DetailBlock title="Website settings">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label tip="Unique URL slug on storefront, e.g. mutti-polpa-400g">Page address (slug)</Label>
                        <button
                          type="button"
                          onClick={generateSlug}
                          className="text-xs font-semibold text-blue hover:text-blue/80 underline cursor-pointer select-none"
                          title="Generate URL slug automatically from product name"
                        >
                          Auto-generate slug
                        </button>
                      </div>
                      <input type="text" value={editingProduct.slug || ''} onChange={e => set('slug', e.target.value)} className={`${inp} font-mono`} placeholder="e.g. mutti-polpa-400g" />
                    </div>
                    <div>
                      <Label tip="Comma-separated search keywords for storefront discovery">Search keywords (separate with commas)</Label>
                      <input type="text"
                        value={Array.isArray(editingProduct.seo_keywords) ? editingProduct.seo_keywords.join(', ') : (editingProduct.seo_keywords || '')}
                        onChange={e => set('seo_keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className={inp} placeholder="italian tomatoes, polpa, mutti…" />
                    </div>
                    <div>
                      <Label tip="Demonstration video URL (YouTube, Vimeo)">Product video URL</Label>
                      <input type="url" value={editingProduct.product_video_url || ''} onChange={e => set('product_video_url', e.target.value)} className={inp} placeholder="https://…" />
                    </div>
                    <div className="flex items-center gap-6">
                      {([['Featured', 'is_featured'], ...(!secure ? [['Published', 'published']] : [])]).map(([lbl, field]) => (
                        <label key={field} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={Boolean(editingProduct[field])} onChange={e => set(field, e.target.checked)}
                            className="w-4 h-4 rounded border border-white/20 bg-adm-sunken text-blue cursor-pointer" />
                          <span className="text-base text-neutral-300">{lbl}</span>
                        </label>
                       ))}
                      </div>
                   </DetailBlock>

                   {secure && <DetailBlock title="Human review" defaultOpen>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 py-3 text-base text-white/90">
                      <input type="checkbox" checked={editingProduct.is_human_reviewed === true}
                        disabled={saving || !canManageProducts}
                        onChange={event => set('is_human_reviewed', event.target.checked)}
                        aria-describedby="product-human-review-help"
                        className="h-5 w-5 shrink-0 rounded border border-adm-line accent-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue disabled:cursor-not-allowed" />
                      <span>I reviewed this product’s details and pricing</span>
                    </label>
                    <p id="product-human-review-help" className="text-sm leading-relaxed text-white/70">
                      Save Changes records this decision with your reason. Clear it if the product needs another review.
                      Publication and Website assignment remain separate decisions.
                    </p>
                   </DetailBlock>}

                   <DetailBlock title="Status & staff notes">
                    <div>
                      <Label>Status</Label>
                      <select disabled={secure} value={normalizeStatus(editingProduct.status)} onChange={e => set('status', e.target.value)} className={`${inp} cursor-pointer disabled:opacity-60`}>
                        <option value="Live">Live: in the catalogue</option>
                        <option value="Unlisted">Unlisted: direct link only</option>
                        <option value="Draft">Draft: hidden</option>
                        <option value="Discontinued">Discontinued: retired</option>
                      </select>
                      <p className="mt-1.5 text-xs text-white/45 leading-snug">
                        {secure ? 'Change status from the product card or selection bar. Choose Add a note above the product list when needed.' : (STATUS_OPTIONS.find(o => o.value === normalizeStatus(editingProduct.status))?.hint
                          || 'Retired product, kept for order history.')}
                      </p>
                    </div>
                    <div>
                      <Label>Internal Notes</Label>
                        <textarea rows={3} value={editingProduct.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} className={ta} placeholder="Notes visible only to staff…" />
                     </div>
                   </DetailBlock>

                 </div>
              </fieldset>
              </div>

              {/* Footer */}
              <div className="shrink-0 space-y-3 border-t border-adm-line bg-black/20 px-4 py-4 sm:px-6">
                <p className="text-sm text-white/55 italic">Product details save separately from photos, publication, and batch reconciliation.</p>
                {editError && <StateBanner tone="danger">{editError}</StateBanner>}
                {editPending && <StateBanner tone="warning">A product decision is saved for confirmation. Closing or reloading keeps it. Review the pending decision before another save.</StateBanner>}
                {secure && <label className="block text-sm font-semibold text-white/70">Reason for this change <span className="font-normal text-white/45">(optional)</span>
                  <textarea disabled={saving || editPending} value={editReason} onChange={(event) => setEditReason(event.target.value.slice(0, 500))} maxLength={500} placeholder="Default: Admin updated product details" className="mt-1 min-h-[88px] w-full resize-y rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2 text-base text-white placeholder:text-white/30 outline-none focus:border-blue focus:ring-2 focus:ring-blue/25" />
                      <span className="mt-1 block text-xs font-normal text-white/45">Saved permanently in this product's change history.</span>
                </label>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => { setEditingProduct(null); setEditError('') }}
                    disabled={saving}
                    className="min-h-11 rounded-adm-sm px-4 py-2 text-base font-semibold text-white/60 transition-colors hover:text-white">
                    Cancel
                  </button>
                  <button type={editPending ? 'button' : 'submit'} onClick={editPending ? () => setShowProductRecovery(true) : undefined} disabled={saving}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-adm-sm bg-blue px-6 py-2 text-base font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-blue/90 active:scale-[0.98] disabled:opacity-50">
                    {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {saving ? 'Saving…' : editPending ? 'Review saved decision' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
          </AdminDialog>
        </div>
      )}

      {batchProduct && (
        <BatchExpiryManagerModal
          product={batchProduct}
          onClose={() => setBatchProduct(null)}
          onSaveBatches={(sku, updatedBatches) => {
            setProducts(prev => prev.map(p => (p.sku === sku || p.id === sku) ? {
              ...p,
              batches: updatedBatches,
              expiry_date: updatedBatches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))[0]?.expiry_date || p.expiry_date
            } : p))
            fetchBatches()
          }}
        />
      )}

      {photoProduct && (
        <PhotoManagerModal
          product={photoProduct}
          onClose={() => setPhotoProduct(null)}
          onSave={fetchProducts}
        />
      )}

      {showMediaCleanup && <ProductMediaCleanupModal onClose={() => setShowMediaCleanup(false)} />}

      {referenceKind && <ReferenceCreationDialog key={`${actorId}:${referenceKind}`} actorId={actorId} kind={referenceKind} canCreate={canManageProducts}
        onClose={() => setReferenceKind(null)} onConfirmed={(reference, refs, message) => {
          if (editingProduct && productTaxonomyReview?.status === 'eligible') {
            if (refs) setProductTaxonomyReview(previous => ({ ...previous, brandOptions: refs.brands, categoryOptions: refs.categories }))
            const original = reference?.kind === 'brand' ? productTaxonomyReview.originalBrandId : productTaxonomyReview.originalCategoryId
            if (reference && !original) setEditingProduct(previous => ({ ...previous, [reference.kind === 'brand' ? 'brand_id' : 'category_id']: reference.id }))
            setReferenceNotice(message)
          } else flash(`${message} Open the product Edit workflow to review existing choices.`)
        }} />}

    </div>
  )
}
