import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { products as localProducts } from '../../data/products'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import BatchExpiryManagerModal, { getExpiryHealth } from './BatchExpiryManagerModal'
import ProductAiEnrichmentModal from './ProductAiEnrichmentModal'
import DeleteProductsModal from './DeleteProductsModal'
import { BoxIcon, SearchIcon, UploadIcon } from '../../components/ui/icons'
import {
  EmptyState,
  MetricRail,
  SectionHeading,
  StateBanner,
  WorkspaceIntro,
  primaryButton,
  secondaryButton,
} from './AdminWorkspaceUi'

// ── Product lifecycle ─────────────────────────────────────────────────────────
// Mirrors the products_status_check constraint. 'Active' is a legacy alias for
// 'Live' and is treated as Live everywhere in the UI.
const STATUS_OPTIONS = [
  { value: 'Live',     label: 'Live',     hint: 'In the catalogue, browsable and buyable' },
  { value: 'Unlisted', label: 'Unlisted', hint: 'Hidden from browse — direct link still works' },
  { value: 'Draft',    label: 'Draft',    hint: 'Invisible to customers' },
]

const STATUS_LABEL = {
  Live: 'Live', Active: 'Live', Unlisted: 'Unlisted', Draft: 'Draft', Discontinued: 'Discontinued',
}

const STATUS_TONE = {
  Live:         'bg-forest/20 text-forest border-forest/40',
  Active:       'bg-forest/20 text-forest border-forest/40',
  Unlisted:     'bg-blue/20 text-blue border-blue/40',
  Draft:        'bg-gold/20 text-gold border-gold/40',
  Discontinued: 'bg-crimson/20 text-crimson border-crimson/40',
}

const normalizeStatus = (s) => (s === 'Active' ? 'Live' : (s || 'Draft'))

// Segmented lifecycle control — three states always visible, so the current one
// reads as a position rather than a label you have to open a menu to check.
function StatusControl({ value, onChange, disabled }) {
  const current = normalizeStatus(value)
  return (
    <div className="grid grid-cols-3 gap-0.5 rounded-adm-sm border border-adm-line bg-adm-sunken p-0.5" role="group" aria-label="Product status">
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
            className={`min-h-[36px] rounded-adm-sm text-xs font-bold transition-colors disabled:opacity-50 ${
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

// ── Shared input/textarea styles ──────────────────────────────────────────────
const inp = 'w-full rounded-adm-sm border border-white/20 bg-adm-raised px-3.5 py-2.5 text-base text-white font-semibold focus:border-gold outline-none transition-colors shadow-sm'
const ta  = `${inp} resize-none`

function Label({ children }) {
  return <label className="block text-sm font-extrabold uppercase tracking-wider text-gold mb-1.5">{children}</label>
}

function Section({ color = 'blue', title, children }) {
  const colors = {
    blue:   'text-white border-blue',
    amber:  'text-gold border-gold',
    forest: 'text-white border-blue',
    purple: 'text-gold border-gold',
    crimson:'text-crimson border-crimson',
    slate:  'text-white border-white/30',
  }
  return (
    <div className={`border-l-4 pl-4 space-y-3 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-extrabold uppercase tracking-wider text-gold">{title}</p>
      {children}
    </div>
  )
}

// ── Photo slot with preview + upload ─────────────────────────────────────────
function PhotoSlot({ label, value, onChange, bucket = 'product-images' }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const upload = async (file) => {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(publicUrl)
    }
    setUploading(false)
  }

  return (
    <div>
      <Label>{label}</Label>
      <div
        className="relative rounded-adm-sm border border-adm-line bg-adm-sunken overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '1 / 1' }}
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-sm font-semibold text-white">Change Photo</p>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-neutral-300 hover:text-white/60 transition-colors">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-blue border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs font-semibold uppercase tracking-wider">Upload</p>
              </>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
      </div>
      {/* Also allow pasting a URL directly */}
      <input type="url" value={value || ''} onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste image URL"
        className="mt-1.5 w-full rounded-adm-sm border border-adm-line bg-transparent px-2 py-1.5 text-xs text-white/50 placeholder-white/20 focus:border-blue outline-none" />
    </div>
  )
}

// ── Gallery slot (up to N images) ────────────────────────────────────────────
function GallerySlots({ value = [], onChange, max = 5 }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const upload = async (file) => {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `gallery_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
      onChange([...value, publicUrl])
    }
    setUploading(false)
  }

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div>
      <Label>Lifestyle / Gallery Photos (up to {max})</Label>
      <div className="grid grid-cols-5 gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-adm-sm overflow-hidden border border-adm-line group">
            <img src={url} alt={`gallery-${i}`} className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 bg-crimson/90 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-adm-sm border-2 border-dashed border-adm-line hover:border-blue/50 hover:bg-blue/5 transition-colors flex items-center justify-center text-neutral-300 hover:text-white/50">
            {uploading ? <div className="w-4 h-4 border-2 border-blue border-t-transparent rounded-full animate-spin" /> : <span className="text-xl leading-none">+</span>}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
    </div>
  )
}

// ── Stock breakdown chips (by location / channel / holder) ───────────────────
function BreakdownRow({ label, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</span>
      {entries.map(([label, qty]) => (
        <span key={label} className="text-xs font-mono bg-white/5 border border-adm-line rounded px-1.5 py-0.5 text-neutral-200">
          {label} <span className="font-bold text-white">{qty}</span>
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryGrid() {
  const [products, setProducts]       = useState([])
  const [batchMap, setBatchMap]       = useState({})
  const [loading, setLoading]         = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editTab, setEditTab] = useState('details')
  const [batchProduct, setBatchProduct]   = useState(null)
  const [isAdding, setIsAdding]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [showAiScanner, setShowAiScanner] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [enrichProduct, setEnrichProduct] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [deleteTargets, setDeleteTargets] = useState(null)
  const [statusBusy, setStatusBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')

  useEffect(() => {
    if (!supabase) return
    fetchProducts()
    fetchBatches()
    const ch = supabase.channel('public:products:grid')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_batches' }, fetchBatches)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const fetchProducts = async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!error && data) setProducts(data)
    setLoading(false)
  }

  // Load every batch once, then roll it up per-SKU: total, count, and the
  // splits by location (hub), channel, and holder (custodian).
  const fetchBatches = async () => {
    if (!supabase) return
    const { data } = await supabase.from('product_batches').select('sku, quantity, hub, custodian, channel, expiry_date, is_pinned')
    if (!data) return
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
    net_weight:               p.net_weight || null,
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
    published:                Boolean(p.published),
    primary_image_url:        p.primary_image_url || null,
    lifestyle_images:         Array.isArray(p.lifestyle_images) ? p.lifestyle_images : [],
    product_video_url:        p.product_video_url || null,
    status:                   p.status || 'Draft',
    internal_notes:           p.internal_notes || null,
  })

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editingProduct || !supabase) return
    setSaving(true)
    const payload = buildPayload(editingProduct)

    if (isAdding) {
      if (!editingProduct.sku) { alert('SKU is required'); setSaving(false); return }
      const { error } = await supabase.from('products').insert([{ sku: editingProduct.sku, ...payload }])
      if (error) { alert('Error creating: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('products').update(payload).eq('sku', editingProduct.sku)
      if (error) { alert('Error saving: ' + error.message); setSaving(false); return }
    }

    await fetchProducts()
    setEditingProduct(null)
    setIsAdding(false)
    setSaving(false)
  }

  const set = (field, val) => setEditingProduct(prev => ({ ...prev, [field]: val }))

  // ── Status lifecycle ───────────────────────────────────────────────────────
  const flash = (text, error = false) => {
    setNotice({ text, error })
    setTimeout(() => setNotice(null), 4000)
  }

  const changeStatus = async (skus, nextStatus) => {
    if (skus.length === 0) return
    setStatusBusy(nextStatus)

    // Optimistic — the realtime channel will reconcile if the write fails.
    setProducts(prev => prev.map(p => (skus.includes(p.sku) ? { ...p, status: nextStatus } : p)))

    if (supabase) {
      const { error } = await supabase.from('products').update({ status: nextStatus }).in('sku', skus)
      if (error) {
        setStatusBusy(null)
        await fetchProducts()
        return flash(`Could not update status: ${error.message}`, true)
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

  const inventoryMetrics = useMemo(() => {
    let units = 0
    let out = 0
    let low = 0
    let expiryRisk = 0
    let drafts = 0
    for (const product of products) {
      const stock = Number(product.stock_available) || 0
      const threshold = Number(product.reorder_level) || 5
      units += stock
      if (stock <= 0) out += 1
      else if (stock <= threshold) low += 1
      const expiry = getExpiryHealth(batchMap[product.sku]?.earliestExpiry || product.expiry_date)
      if (['EXPIRED', 'CRITICAL', 'WARNING'].includes(expiry.status)) expiryRisk += 1
      if (!['Live', 'Active'].includes(product.status)) drafts += 1
    }
    return { units, out, low, expiryRisk, drafts }
  }, [batchMap, products])

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter(product => {
      const matchesSearch = !term || [product.sku, product.name, product.barcode, product.origin, product.country_of_origin]
        .some(value => String(value || '').toLowerCase().includes(term))
      if (!matchesSearch) return false
      const stock = Number(product.stock_available) || 0
      const threshold = Number(product.reorder_level) || 5
      const expiry = getExpiryHealth(batchMap[product.sku]?.earliestExpiry || product.expiry_date)
      if (stockFilter === 'out') return stock <= 0
      if (stockFilter === 'low') return stock > 0 && stock <= threshold
      if (stockFilter === 'expiry') return ['EXPIRED', 'CRITICAL', 'WARNING'].includes(expiry.status)
      if (stockFilter === 'drafts') return !['Live', 'Active'].includes(product.status)
      return true
    })
  }, [batchMap, products, search, stockFilter])
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
        title="Inventory exception board"
        description="Search the product master, isolate stock and FEFO risks, then open the exact SKU or batch that needs action. Stock metrics use persisted product and batch records only."
        status={loading ? 'Loading inventory evidence' : `${products.length} SKUs loaded`}
        statusTone={inventoryMetrics.out || inventoryMetrics.expiryRisk ? 'warning' : 'success'}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowAiScanner(true)} className={secondaryButton}><BoxIcon size={16} /> Scan box</button>
            <button onClick={() => setShowSmartPaste(true)} className={secondaryButton}><UploadIcon size={16} /> Smart paste</button>
            <button onClick={() => { setIsAdding(true); setEditTab('details'); setEditingProduct({ sku: `MANUAL-${Math.floor(Math.random() * 10000)}`, status: 'Draft', srp: 0, wholesale_price: 0, stock_available: 0 }) }} className={primaryButton}>Add product</button>
          </div>
        )}
      />

      <MetricRail columns="lg:grid-cols-5" items={[
        { label: 'Active SKUs', value: loading ? '--' : products.length - inventoryMetrics.drafts, detail: `${products.length} total product records` },
        { label: 'Available units', value: loading ? '--' : inventoryMetrics.units.toLocaleString('en-PH'), detail: 'Product master available stock' },
        { label: 'Out of stock', value: loading ? '--' : inventoryMetrics.out, detail: 'Immediate replenishment review', tone: inventoryMetrics.out ? 'text-crimson' : 'text-white' },
        { label: 'Low stock', value: loading ? '--' : inventoryMetrics.low, detail: 'At or below reorder level', tone: inventoryMetrics.low ? 'text-amber' : 'text-white' },
        { label: 'Expiry risk', value: loading ? '--' : inventoryMetrics.expiryRisk, detail: 'Expired or within 90 days', tone: inventoryMetrics.expiryRisk ? 'text-amber' : 'text-white' },
      ]} />

      {showAiScanner && (
        <ScanToAiModal onClose={() => setShowAiScanner(false)}
          onOpenSmartPaste={() => { setShowAiScanner(false); setShowSmartPaste(true) }} />
      )}
      {showSmartPaste && (
        <SmartPasteModal onClose={() => setShowSmartPaste(false)}
          onProductAdded={() => { fetchProducts(); setShowSmartPaste(false) }} />
      )}

      {notice && <StateBanner tone={notice.error ? 'danger' : 'success'}>{notice.text}</StateBanner>}

      <section className="space-y-3">
        <SectionHeading title="Product master" description="Filters change the working set only; bulk actions still show their exact selection count." count={visibleProducts.length} />
        <div className="flex flex-col gap-2 rounded-adm-sm border border-adm-line bg-adm-surface p-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search inventory</span>
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-3.5 text-white/35" />
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search SKU, product, barcode, or origin" className="adm-input min-h-11 pl-9 text-base sm:text-sm" />
          </label>
          <div className="flex gap-1 overflow-x-auto" aria-label="Filter inventory exceptions">
            {[
              ['all', 'All', products.length],
              ['out', 'Out', inventoryMetrics.out],
              ['low', 'Low', inventoryMetrics.low],
              ['expiry', 'Expiry', inventoryMetrics.expiryRisk],
              ['drafts', 'Drafts', inventoryMetrics.drafts],
            ].map(([value, label, count]) => <button key={value} onClick={() => setStockFilter(value)} aria-pressed={stockFilter === value} className={`min-h-10 shrink-0 rounded-adm-sm px-3 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${stockFilter === value ? 'bg-blue text-white' : 'text-white/45 hover:bg-white/[0.05] hover:text-white'}`}>{label} <span className="ml-1 font-mono text-[10px] opacity-70">{count}</span></button>)}
          </div>
        </div>
      </section>

      {/* Select-all row */}
      {visibleProducts.length > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 py-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[36px]">
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
            <button onClick={clearSelection} className="ml-auto text-xs font-semibold text-white/50 hover:text-white transition-colors min-h-[36px] px-2">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Product cards */}
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" role="status">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-adm border border-adm-line bg-adm-surface" />)}
        </div>
      ) : visibleProducts.length === 0 ? (
        <EmptyState icon={BoxIcon} title="No products match this view" description="Clear the search or switch the exception filter to return to the full product master." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleProducts.map(p => {
            const primaryExpiryDate = batchMap[p.sku]?.earliestExpiry || p.expiry_date
            const expiryHealth = getExpiryHealth(primaryExpiryDate)
            const attentionCount = batchMap[p.sku]?.attention || 0

            return (
              <div key={p.sku} className={`group relative rounded-adm-sm border bg-adm-sunken overflow-hidden flex flex-col transition-colors ${
                selected.has(p.sku) ? 'border-blue ring-1 ring-blue/40' : 'border-adm-line hover:border-blue/50'
              }`}>
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
                  <img src={p.primary_image_url || p.image_url || '/placeholder.png'} alt={p.name}
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
                        <p className={`font-extrabold text-lg ${(p.stock_available ?? 0) <= 5 ? 'text-crimson' : 'text-white'}`}>{p.stock_available ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-white/60 uppercase text-sm font-bold tracking-wider mb-0.5">Retail SRP</p>
                        <p className="font-extrabold text-lg text-gold tabular-nums">₱{Number(p.srp || 0).toLocaleString('en-PH')}</p>
                      </div>
                    </div>

                    {/* Where it is / which channel — live from the batch bank */}
                    {batchMap[p.sku] && (
                      <div className="space-y-1.5 bg-white/5 border border-adm-line rounded-adm-sm p-2">
                        <p className="text-white/40 uppercase text-[10px] font-bold tracking-wider">
                          {batchMap[p.sku].total} pcs in {batchMap[p.sku].count} lot{batchMap[p.sku].count !== 1 ? 's' : ''}
                        </p>
                        <BreakdownRow label="Location" data={batchMap[p.sku].hub} />
                        <BreakdownRow label="Channel" data={batchMap[p.sku].channel} />
                        <BreakdownRow label="Holder" data={batchMap[p.sku].custodian} />
                      </div>
                    )}

                    <div className="pt-1">
                      <button
                        onClick={() => setBatchProduct(p)}
                        className="w-full text-sm font-sans font-bold bg-white/10 hover:bg-white/15 text-neutral-200 py-2 rounded-adm-sm border border-adm-line transition-colors text-center"
                      >
                        Batches ({batchMap[p.sku]?.count ?? p.batches?.length ?? 0})
                      </button>
                    </div>

                    <button
                      onClick={() => setEnrichProduct(p)}
                      className="w-full text-sm font-sans font-bold bg-gold/15 hover:bg-gold/25 text-gold py-2 rounded-adm-sm border border-gold/30 transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      Enrich product specs
                    </button>

                    {/* Lifecycle: three visible states, plus a destructive
                        action kept deliberately separate from them. */}
                    <div className="pt-1 space-y-1.5">
                      <StatusControl
                        value={p.status}
                        disabled={!!statusBusy}
                        onChange={(next) => changeStatus([p.sku], next)}
                      />
                      <button
                        onClick={() => setDeleteTargets([p])}
                        className="w-full min-h-[36px] text-xs font-bold text-crimson/70 hover:text-crimson hover:bg-crimson/10 rounded-adm-sm border border-transparent hover:border-crimson/30 transition-colors"
                      >
                        Delete product
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={() => { setIsAdding(false); setEditTab('details'); setEditingProduct(p) }}
                  className="absolute top-2 right-2 rounded-adm-sm bg-blue hover:bg-blue/90 px-3.5 py-1.5 text-sm font-extrabold text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                  Edit
                </button>
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
              <button onClick={clearSelection} className="text-xs font-semibold text-white/50 hover:text-white min-h-[36px] px-2 transition-colors">
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  disabled={!!statusBusy}
                  onClick={() => changeStatus([...selected], opt.value)}
                  className={`shrink-0 min-h-[44px] px-3.5 rounded-adm-sm text-sm font-bold border transition-colors disabled:opacity-50 ${STATUS_TONE[opt.value]}`}
                >
                  {statusBusy === opt.value ? 'Saving…' : `Set ${opt.label}`}
                </button>
              ))}
              <button
                onClick={() => setDeleteTargets(selectedProducts)}
                className="shrink-0 min-h-[44px] px-3.5 rounded-adm-sm bg-crimson hover:bg-crimson-deep text-sm font-bold text-white transition-colors"
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

      <ProductAiEnrichmentModal
        product={enrichProduct}
        isOpen={!!enrichProduct}
        onClose={() => setEnrichProduct(null)}
        onEnriched={() => fetchProducts()}
      />

      {/* ── FULL EDIT MODAL ─────────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 md:p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-adm border border-adm-line bg-adm-surface shadow-2xl flex flex-col max-h-[96vh]">

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-adm-line bg-white/5">
              <div>
                <h3 className="font-serif text-xl font-semibold text-white">{isAdding ? 'Add New Product' : 'Edit Product'}</h3>
                <p className="text-sm text-white/60 font-mono mt-0.5">{editingProduct.sku}</p>
              </div>
              <button onClick={() => { setEditingProduct(null); setIsAdding(false) }} className="text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-adm-sm hover:bg-white/10" aria-label="Close modal">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              {/* Section tabs — edit one focused part at a time */}
              <div className="flex gap-1 overflow-x-auto border-b border-adm-line px-3 sm:px-4 shrink-0 scrollbar-none">
                {[['details', 'Details'], ['pricing', 'Pricing & stock'], ['photos', 'Photos']].map(([id, lbl]) => (
                  <button key={id} type="button" onClick={() => setEditTab(id)}
                    className={'px-3 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ' +
                      (editTab === id ? 'border-blue text-white' : 'border-transparent text-white/50 hover:text-white')}>
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto flex-1">

                {/* ── Photos tab ───────────────────────────────────────── */}
                <div className={editTab === 'photos' ? 'space-y-4' : 'hidden'}>
                  <Section color="purple" title="Media">
                    <PhotoSlot label="Primary Photo (Studio White)"
                      value={editingProduct.primary_image_url}
                      onChange={v => set('primary_image_url', v)} />
                    <PhotoSlot label="After-Use / Lifestyle Photo (lifestyle_images[0])"
                      value={Array.isArray(editingProduct.lifestyle_images) ? editingProduct.lifestyle_images[0] : null}
                      onChange={v => {
                        const arr = Array.isArray(editingProduct.lifestyle_images) ? [...editingProduct.lifestyle_images] : []
                        arr[0] = v
                        set('lifestyle_images', arr)
                      }} />
                    <GallerySlots
                      value={Array.isArray(editingProduct.lifestyle_images) ? editingProduct.lifestyle_images.slice(1) : []}
                      onChange={arr => {
                        const first = Array.isArray(editingProduct.lifestyle_images) ? editingProduct.lifestyle_images[0] : null
                        set('lifestyle_images', first ? [first, ...arr] : arr)
                      }}
                      max={5} />
                    <div>
                      <Label>Video URL</Label>
                      <input type="url" value={editingProduct.product_video_url || ''} onChange={e => set('product_video_url', e.target.value)} className={inp} placeholder="https://…" />
                    </div>
                  </Section>
                </div>

                {/* ── Details tab: Identity + Content ──────────────────── */}
                <div className={editTab === 'details' ? 'space-y-6' : 'hidden'}>

                  {isAdding && (
                    <Section color="blue" title="SKU">
                      <div>
                        <Label>SKU / Product ID (kebab-case)</Label>
                        <input type="text" value={editingProduct.sku || ''} onChange={e => set('sku', e.target.value)}
                          className={`${inp} font-mono`} placeholder="e.g. mutti-polpa-400g" required />
                      </div>
                    </Section>
                  )}

                  <Section color="blue" title="Product Identity">
                    <div>
                      <Label>Full Product Name</Label>
                      <input type="text" value={editingProduct.name || ''} onChange={e => set('name', e.target.value)} className={inp} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Short Name (UI Card)</Label>
                        <input type="text" value={editingProduct.short || ''} onChange={e => set('short', e.target.value)} className={inp} />
                      </div>
                      <div>
                        <Label>Barcode / EAN</Label>
                        <input type="text" value={editingProduct.barcode || ''} onChange={e => set('barcode', e.target.value)} className={`${inp} font-mono`} />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <input type="text" value={editingProduct.subcategory || ''} onChange={e => set('subcategory', e.target.value)} className={inp} placeholder="e.g. Pasta Sauces" />
                      </div>
                      <div>
                        <Label>Origin</Label>
                        <input type="text" value={editingProduct.country_of_origin || editingProduct.origin || ''} onChange={e => { set('country_of_origin', e.target.value); set('origin', e.target.value) }} className={inp} placeholder="e.g. Parma, Italy" />
                      </div>
                      <div>
                        <Label>Net Weight</Label>
                        <input type="text" value={editingProduct.net_weight || ''} onChange={e => set('net_weight', e.target.value)} className={inp} placeholder="e.g. 400g" />
                      </div>
                      <div>
                        <Label>Package Type</Label>
                        <input type="text" value={editingProduct.package_type || ''} onChange={e => set('package_type', e.target.value)} className={inp} placeholder="e.g. Glass Jar" />
                      </div>
                      <div>
                        <Label>Size / Display Size</Label>
                        <input type="text" value={editingProduct.size || ''} onChange={e => set('size', e.target.value)} className={inp} placeholder="e.g. 400g jar" />
                      </div>
                      <div>
                        <Label>Expiry Date</Label>
                        <input type="date" value={editingProduct.expiry_date || ''} onChange={e => set('expiry_date', e.target.value)}
                          className={`${inp} text-neutral-300`} />
                      </div>
                    </div>
                  </Section>

                  <Section color="amber" title="Content & Copywriting">
                    <div>
                      <Label>Description (3 elegant sentences)</Label>
                      <textarea rows={3} value={editingProduct.description || ''} onChange={e => set('description', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label>Why Buy (max 18 words)</Label>
                      <textarea rows={2} value={editingProduct.why_buy || ''} onChange={e => set('why_buy', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label>Why Rare in PH</Label>
                      <textarea rows={2} value={editingProduct.why_rare || ''} onChange={e => set('why_rare', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label>Usage Instructions</Label>
                      <textarea rows={2} value={editingProduct.usage_instructions || ''} onChange={e => set('usage_instructions', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label>Storage Instructions</Label>
                      <textarea rows={2} value={editingProduct.storage_instructions || ''} onChange={e => set('storage_instructions', e.target.value)} className={ta} />
                    </div>
                    <div>
                      <Label>Ingredients</Label>
                      <textarea rows={3} value={editingProduct.ingredients || ''} onChange={e => set('ingredients', e.target.value)} className={ta} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Allergens</Label>
                        <input type="text" value={editingProduct.allergens || ''} onChange={e => set('allergens', e.target.value)} className={inp} />
                      </div>
                      <div>
                        <Label>Finished Product</Label>
                        <input type="text" value={editingProduct.finished_product_details || ''} onChange={e => set('finished_product_details', e.target.value)} className={inp} placeholder="e.g. Cooked pasta dish" />
                      </div>
                    </div>
                    <div>
                      <Label>Pairings (comma-separated)</Label>
                      <input type="text"
                        value={Array.isArray(editingProduct.pairings) ? editingProduct.pairings.join(', ') : (editingProduct.pairings || '')}
                        onChange={e => set('pairings', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className={inp} placeholder="Spread on warm pandesal, Pair with espresso, …" />
                    </div>
                  </Section>
                </div>

                {/* ── Pricing & stock tab: Pricing, Inventory, Website, Management ── */}
                <div className={editTab === 'pricing' ? 'space-y-6' : 'hidden'}>

                  <Section color="forest" title="Pricing">
                    <div className="grid grid-cols-2 gap-3">
                      {[['Cost ₱', 'cost_price'], ['SRP ₱', 'srp'], ['Wholesale ₱', 'wholesale_price'], ['Dealer ₱', 'dealer_price']].map(([lbl, field]) => (
                        <div key={field}>
                          <Label>{lbl}</Label>
                          <input type="number" min="0" step="0.01"
                            value={editingProduct[field] || 0}
                            onChange={e => set(field, Math.max(0, Number(e.target.value)))}
                            className={`${inp} tabular-nums`} />
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section color="crimson" title="Inventory">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Available Stock</Label>
                        <div className={`${inp} flex items-center tabular-nums text-white/70`}>{editingProduct.stock_available || 0}</div>
                        <button type="button" disabled={isAdding} onClick={() => setBatchProduct(editingProduct)} className="mt-2 min-h-11 w-full rounded-adm-sm border border-blue/35 bg-blue/10 px-3 text-xs font-semibold text-blue disabled:opacity-40">{isAdding ? 'Save the draft before adding batches' : 'Reconcile batches and stock'}</button>
                      </div>
                      <div>
                        <Label>Reorder Level</Label>
                        <input type="number" min="0" value={editingProduct.reorder_level || 0} onChange={e => set('reorder_level', Math.max(0, Number(e.target.value)))} className={`${inp} tabular-nums`} />
                      </div>
                    </div>
                  </Section>

                  <Section color="slate" title="Website & SEO">
                    <div>
                      <Label>Slug</Label>
                      <input type="text" value={editingProduct.slug || ''} onChange={e => set('slug', e.target.value)} className={`${inp} font-mono`} placeholder="e.g. mutti-polpa-400g" />
                    </div>
                    <div>
                      <Label>SEO Keywords (comma-separated)</Label>
                      <input type="text"
                        value={Array.isArray(editingProduct.seo_keywords) ? editingProduct.seo_keywords.join(', ') : (editingProduct.seo_keywords || '')}
                        onChange={e => set('seo_keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className={inp} placeholder="italian tomatoes, polpa, mutti…" />
                    </div>
                    <div className="flex items-center gap-6">
                      {[['Featured', 'is_featured'], ['Published', 'published']].map(([lbl, field]) => (
                        <label key={field} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={Boolean(editingProduct[field])} onChange={e => set(field, e.target.checked)}
                            className="w-4 h-4 rounded border border-white/20 bg-adm-sunken text-blue cursor-pointer" />
                          <span className="text-base text-neutral-300">{lbl}</span>
                        </label>
                      ))}
                    </div>
                  </Section>

                  <Section color="slate" title="Management">
                    <div>
                      <Label>Status</Label>
                      <select value={normalizeStatus(editingProduct.status)} onChange={e => set('status', e.target.value)} className={`${inp} cursor-pointer`}>
                        <option value="Live">Live — in the catalogue</option>
                        <option value="Unlisted">Unlisted — direct link only</option>
                        <option value="Draft">Draft — hidden</option>
                        <option value="Discontinued">Discontinued — retired</option>
                      </select>
                      <p className="mt-1.5 text-xs text-white/45 leading-snug">
                        {STATUS_OPTIONS.find(o => o.value === normalizeStatus(editingProduct.status))?.hint
                          || 'Retired product, kept for order history.'}
                      </p>
                    </div>
                    <div>
                      <Label>Internal Notes</Label>
                      <textarea rows={3} value={editingProduct.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} className={ta} placeholder="Notes visible only to staff…" />
                    </div>
                  </Section>

                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 px-6 py-4 border-t border-adm-line bg-black/20 flex items-center justify-between">
                <p className="text-sm text-white/55 italic">All changes save directly to Supabase.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setEditingProduct(null); setIsAdding(false) }}
                    className="px-4 py-2 rounded-adm-sm text-base font-semibold text-white/60 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-6 py-2 rounded-adm-sm text-base font-semibold bg-blue text-white hover:bg-blue/90 disabled:opacity-50 transition-colors shadow-lg shadow-blue/20 flex items-center gap-2">
                    {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {saving ? 'Saving…' : (isAdding ? 'Create Product' : 'Save Changes')}
                  </button>
                </div>
              </div>
            </form>
          </div>
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

    </div>
  )
}
