import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { products as localProducts } from '../../data/products'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import BatchExpiryManagerModal, { getExpiryHealth } from './BatchExpiryManagerModal'
import StaffAllocationModal from './StaffAllocationModal'
import ProductAiEnrichmentModal from './ProductAiEnrichmentModal'

// ── Shared input/textarea styles ──────────────────────────────────────────────
const inp = 'w-full rounded-xl border border-white/20 bg-[#161B29] px-3.5 py-2.5 text-sm text-white font-semibold focus:border-gold outline-none transition-colors shadow-sm'
const ta  = `${inp} resize-none`

function Label({ children }) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-gold mb-1.5">{children}</label>
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
      <p className="text-xs font-extrabold uppercase tracking-wider text-gold">{title}</p>
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
        className="relative rounded-xl border border-white/10 bg-[#05080f] overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '1 / 1' }}
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-xs font-semibold text-white">Change Photo</p>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/40 transition-colors">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-blue border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[10px] font-semibold uppercase tracking-wider">Upload</p>
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
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-[11px] text-white/50 placeholder-white/20 focus:border-blue outline-none" />
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
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
            <img src={url} alt={`gallery-${i}`} className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 bg-crimson/90 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-white/15 hover:border-blue/50 hover:bg-blue/5 transition-colors flex items-center justify-center text-white/20 hover:text-white/50">
            {uploading ? <div className="w-4 h-4 border-2 border-blue border-t-transparent rounded-full animate-spin" /> : <span className="text-xl leading-none">+</span>}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryGrid() {
  const [products, setProducts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [batchProduct, setBatchProduct]   = useState(null)
  const [allocatingProduct, setAllocatingProduct] = useState(null)
  const [isAdding, setIsAdding]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [showAiScanner, setShowAiScanner] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [enrichProduct, setEnrichProduct] = useState(null)

  useEffect(() => {
    if (!supabase) return
    fetchProducts()
    const ch = supabase.channel('public:products:grid')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
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
    stock_available:          Number(p.stock_available) || 0,
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

  return (
    <div className="animate-in fade-in duration-500 relative min-h-full">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-white/50">Manage your inventory visually. Click Edit to update product details.</p>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAiScanner(true)}
            className="flex items-center gap-2 rounded bg-forest/20 text-forest hover:bg-forest hover:text-white transition-colors px-3 py-1.5 text-xs font-semibold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan Box
          </button>
          <button onClick={() => setShowSmartPaste(true)}
            className="flex items-center gap-2 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors px-3 py-1.5 text-xs font-semibold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Smart Paste AI
          </button>
          <button onClick={() => { setIsAdding(true); setEditingProduct({ sku: `MANUAL-${Math.floor(Math.random()*10000)}`, status: 'Draft', srp: 0, wholesale_price: 0, stock_available: 0 }) }}
            className="flex items-center gap-2 rounded bg-blue/20 text-blue hover:bg-blue hover:text-white transition-colors px-3 py-1.5 text-xs font-semibold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Manual Add
          </button>
        </div>
      </div>

      {showAiScanner && (
        <ScanToAiModal onClose={() => setShowAiScanner(false)}
          onOpenSmartPaste={() => { setShowAiScanner(false); setShowSmartPaste(true) }} />
      )}
      {showSmartPaste && (
        <SmartPasteModal onClose={() => setShowSmartPaste(false)}
          onProductAdded={() => { fetchProducts(); setShowSmartPaste(false) }} />
      )}

      {/* Product cards */}
      {loading && products.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-white/40">Loading products...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
          {products.map(p => {
            const pinnedBatch = p.batches?.find(b => b.is_pinned)
            const primaryExpiryDate = pinnedBatch?.expiry_date || p.expiry_date || (p.batches && p.batches[0]?.expiry_date)
            const expiryHealth = getExpiryHealth(primaryExpiryDate)

            return (
              <div key={p.sku} className="group relative rounded-xl border border-white/10 bg-[#05080f] overflow-hidden flex flex-col hover:border-blue/50 transition-colors">
                <div className="aspect-square bg-white/5 flex items-center justify-center p-4 relative">
                  <img src={p.primary_image_url || p.image_url || '/placeholder.png'} alt={p.name}
                    className="max-h-full max-w-full object-contain drop-shadow-lg" />
                  
                  {/* FEFO Color-Coded Expiration & Pinned Batch Badge */}
                  {primaryExpiryDate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setBatchProduct(p) }}
                      className={`absolute bottom-2 left-2 text-xs font-bold px-2 py-0.5 rounded border transition-all ${
                        pinnedBatch ? 'bg-gold text-navy font-extrabold border-gold shadow-md' :
                        expiryHealth.color === 'crimson' ? 'bg-crimson border-crimson text-white font-bold' :
                        expiryHealth.color === 'amber' ? 'bg-gold border-gold text-navy font-extrabold' :
                        'bg-blue border-blue text-white font-bold'
                      }`}
                    >
                      {pinnedBatch ? `📌 Pinned: ${pinnedBatch.box_code} (${pinnedBatch.expiry_date})` : expiryHealth.text}
                    </button>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-white/70 font-semibold uppercase truncate">{p.sku}</span>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider ${p.status === 'Draft' ? 'bg-gold/20 text-gold border border-gold/30' : p.status === 'Discontinued' ? 'bg-crimson/20 text-crimson border border-crimson/30' : 'bg-blue/20 text-blue border border-blue/30'}`}>
                      {p.status}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white line-clamp-2 mb-1.5">{p.name}</h3>
                  {p.origin && <p className="text-xs text-gold font-medium mb-2">🇮🇹 {p.origin}</p>}
                  
                  <div className="mt-auto space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-sm bg-white/5 p-2.5 rounded-lg border border-white/10">
                      <div>
                        <p className="text-white/60 uppercase text-xs font-bold tracking-wider mb-0.5">Stock</p>
                        <p className={`font-extrabold text-base ${(p.stock_available ?? 0) <= 5 ? 'text-crimson' : 'text-white'}`}>{p.stock_available ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-white/60 uppercase text-xs font-bold tracking-wider mb-0.5">Retail SRP</p>
                        <p className="font-extrabold text-base text-gold tabular-nums">₱{Number(p.srp || 0).toLocaleString('en-PH')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => setBatchProduct(p)}
                        className="text-xs font-sans font-bold bg-white/10 hover:bg-white/15 text-white/90 py-2 rounded-lg border border-white/15 transition-colors text-center"
                      >
                        📦 Batches ({p.batches?.length || 1})
                      </button>
                      <button
                        onClick={() => setAllocatingProduct(p)}
                        className="text-xs font-sans font-bold bg-blue/15 hover:bg-blue/25 text-blue py-2 rounded-lg border border-blue/30 transition-colors text-center"
                      >
                        👤 Custody
                      </button>
                    </div>

                    <button
                      onClick={() => setEnrichProduct(p)}
                      className="w-full text-xs font-sans font-bold bg-gold/15 hover:bg-gold/25 text-gold py-2 rounded-lg border border-gold/30 transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      ✨ Enrich Specs with AI
                    </button>
                  </div>
                </div>

                <button onClick={() => { setIsAdding(false); setEditingProduct(p) }}
                  className="absolute top-2 right-2 rounded-lg bg-blue hover:bg-blue/90 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                  Edit
                </button>
              </div>
            )
          })}
        </div>
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
          <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0A101D] shadow-2xl flex flex-col max-h-[96vh]">

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <div>
                <h3 className="font-serif text-lg font-semibold text-white">{isAdding ? 'Add New Product' : 'Edit Product'}</h3>
                <p className="text-xs text-white/40 font-mono mt-0.5">{editingProduct.sku}</p>
              </div>
              <button onClick={() => { setEditingProduct(null); setIsAdding(false) }} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── LEFT: Photos ─────────────────────────────────────── */}
                <div className="space-y-4">
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

                {/* ── MIDDLE: Identity + Content ───────────────────────── */}
                <div className="space-y-6">

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
                          className={`${inp} text-white/80`} />
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

                {/* ── RIGHT: Pricing, Inventory, Website, Management ───── */}
                <div className="space-y-6">

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
                        <input type="number" min="0" value={editingProduct.stock_available || 0} onChange={e => set('stock_available', Math.max(0, Number(e.target.value)))} className={`${inp} tabular-nums`} />
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
                            className="w-4 h-4 rounded border border-white/20 bg-[#05080f] text-blue cursor-pointer" />
                          <span className="text-sm text-white/70">{lbl}</span>
                        </label>
                      ))}
                    </div>
                  </Section>

                  <Section color="slate" title="Management">
                    <div>
                      <Label>Status</Label>
                      <select value={editingProduct.status || 'Draft'} onChange={e => set('status', e.target.value)} className={`${inp} cursor-pointer`}>
                        <option value="Active">Active</option>
                        <option value="Draft">Draft</option>
                        <option value="Discontinued">Discontinued</option>
                      </select>
                    </div>
                    <div>
                      <Label>Internal Notes</Label>
                      <textarea rows={3} value={editingProduct.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} className={ta} placeholder="Notes visible only to staff…" />
                    </div>
                  </Section>

                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
                <p className="text-xs text-white/30 italic">All changes save directly to Supabase.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setEditingProduct(null); setIsAdding(false) }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white/60 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-6 py-2 rounded-lg text-sm font-semibold bg-blue text-white hover:bg-blue/90 disabled:opacity-50 transition-colors shadow-lg shadow-blue/20 flex items-center gap-2">
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
          }}
        />
      )}

      {allocatingProduct && (
        <StaffAllocationModal
          product={allocatingProduct}
          onClose={() => setAllocatingProduct(null)}
          onSaveAllocations={(sku, updatedAllocations) => {
            setProducts(prev => prev.map(p => (p.sku === sku || p.id === sku) ? {
              ...p,
              staff_allocations: updatedAllocations
            } : p))
          }}
        />
      )}
    </div>
  )
}
