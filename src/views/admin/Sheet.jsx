import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { products as localProducts } from '../../data/products'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import PhotoManagerModal from './PhotoManagerModal'
import BulkCsvImportModal from './BulkCsvImportModal'
import BatchExpiryManagerModal, { getExpiryHealth } from './BatchExpiryManagerModal'
import ProductAiEnrichmentModal from './ProductAiEnrichmentModal'
import { useStore } from '../../context/StoreContext'
import Barcode from 'react-barcode'
import { EyeIcon, BarcodeIcon, XIcon } from '../../components/ui/icons'

const DOMAINS = [
  { name: 'Product', cols: ['SKU', 'Barcode', 'Product Name', 'Brand', 'Category', 'Subcategory', 'Origin', 'Net Weight', 'Package Type'] },
  { name: 'Content', cols: ['Description', 'Why Buy', 'Usage', 'Storage', 'Ingredients', 'Allergens', 'Finished Product'] },
  { name: 'Pricing', cols: ['Cost ₱', 'SRP ₱', 'Wholesale ₱', 'Dealer ₱'] },
  { name: 'Inventory', cols: ['Available', 'Reorder Level', 'Expiry Date', 'Supplier', 'Warehouse'] },
  { name: 'Website', cols: ['Slug', 'SEO Keywords', 'Featured', 'Published'] },
  { name: 'Media', cols: ['Primary Image', 'Lifestyle Images', 'Video URL'] },
  { name: 'Management', cols: ['Status', 'Internal Notes'] }
]

const ALL_COLS = DOMAINS.flatMap(d => d.cols)

const FIELD_MAP = {
  // Product
  'SKU': 'sku', 'Barcode': 'barcode', 'Product Name': 'name', 
  'Brand': 'brand_id', 'Category': 'category_id', 'Subcategory': 'subcategory',
  'Origin': 'country_of_origin', 'Net Weight': 'net_weight', 'Package Type': 'package_type',
  
  // Content
  'Description': 'description', 'Why Buy': 'why_buy', 'Usage': 'usage_instructions',
  'Storage': 'storage_instructions', 'Ingredients': 'ingredients', 'Allergens': 'allergens',
  'Finished Product': 'finished_product_details',
  
  // Pricing
  'Cost ₱': 'cost_price', 'SRP ₱': 'srp', 'Wholesale ₱': 'wholesale_price', 'Dealer ₱': 'dealer_price',
  
  // Inventory
  'Available': 'stock_available', 'Reorder Level': 'reorder_level', 'Expiry Date': 'expiry_date', 'Supplier': 'supplier_id', 'Warehouse': 'warehouse_id',
  
  // Website
  'Slug': 'slug', 'SEO Keywords': 'seo_keywords', 'Featured': 'is_featured', 'Published': 'published',
  
  // Media
  'Primary Image': 'primary_image_url', 'Lifestyle Images': 'lifestyle_images', 'Video URL': 'product_video_url',
  
  // Management
  'Status': 'status', 'Internal Notes': 'internal_notes'
}

export default function Sheet() {
  const { openProduct, isDark } = useStore()
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState({ row: -1, col: -1 })
  const [loading, setLoading] = useState(true)
  const [showAiScanner, setShowAiScanner] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [showBarcode, setShowBarcode] = useState(null)
  const [batchProduct, setBatchProduct] = useState(null)
  const [enrichProduct, setEnrichProduct] = useState(null)

  useEffect(() => {
    if (!supabase) return;
    fetchProducts()
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    let fetched = []
    if (supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
        if (!error && data && data.length > 0) fetched = data
      } catch (e) {
        console.warn("Sheet Supabase fetch warning:", e)
      }
    }

    if (fetched.length === 0) {
      fetched = localProducts.map(p => ({
        sku: p.id,
        barcode: p.barcode || '8050031123456',
        name: p.name,
        short: p.short,
        origin: p.origin,
        category_id: p.category,
        srp: p.retail,
        wholesale_price: p.wholesale,
        stock_available: p.stock,
        primary_image_url: p.img,
        description: p.inside,
        usage_instructions: p.guide?.steps ? p.guide.steps.join(' ') : 'Store in a cool dry place.',
        status: 'Active'
      }))
    }
    setRows(fetched)
    setLoading(false)
  }

  const updateField = async (index, colName, value, oldSku = null) => {
    const field = FIELD_MAP[colName]
    const product = rows[index]
    let finalValue = value
    
    // Numbers
    if (['srp', 'wholesale_price', 'cost_price', 'dealer_price', 'promo_price', 'vat_percent', 'discount_percent', 'stock_available', 'stock_reserved', 'stock_incoming', 'reorder_level', 'case_quantity', 'net_weight', 'display_order'].includes(field)) {
      finalValue = Number(value) || 0
    }
    // Booleans
    if (['is_ai_generated', 'is_human_reviewed', 'is_featured', 'published'].includes(field)) {
      finalValue = Boolean(value)
    }
    // Arrays
    if (['seo_keywords', 'lifestyle_images', 'documents', 'certificates'].includes(field) && typeof value === 'string') {
      finalValue = value.split(',').map(s => s.trim()).filter(Boolean)
    }

    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: finalValue } : r))
    
    if (!supabase) return;
    await supabase.from('products').update({ [field]: finalValue }).eq('sku', oldSku || product.sku)
  }

  const handleDeleteRow = async (sku) => {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;
    setRows(prev => prev.filter(r => r.sku !== sku))
    if (supabase) await supabase.from('products').delete().eq('sku', sku)
  }

  const handleAddRow = async () => {
    const newSku = `NEW-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const newRow = { sku: newSku, name: '', status: 'Draft' }
    setRows(prev => [newRow, ...prev])
    if (supabase) await supabase.from('products').insert([newRow])
  }

  const tableContainerRef = useRef(null)

  const handleScrollToDomain = (pixelOffset) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: pixelOffset, behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Top Action & Horizontal Navigation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-3.5 bg-[#0A101D] shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleAddRow} className="flex shrink-0 items-center gap-2 rounded-lg bg-forest text-white px-3.5 py-2.5 min-h-[44px] text-sm font-bold transition hover:bg-forest/90 shadow-md">
            <span className="text-lg leading-none">+</span> Add Row
          </button>
          <button onClick={() => setShowCsvImport(true)} className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 min-h-[44px] text-sm font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white">
            <span>📂</span> CSV Import
          </button>
          <button onClick={() => setShowAiScanner(true)} className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 min-h-[44px] text-sm font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white">
            <span>⌂</span> Scan Box
          </button>
          <button onClick={() => setShowSmartPaste(true)} className="flex shrink-0 items-center gap-2 rounded-lg border border-blue/30 bg-blue/10 px-3 py-2.5 min-h-[44px] text-sm font-medium text-blue transition hover:bg-blue/20">
            <span>✨</span> Smart Paste AI
          </button>
          <button onClick={() => rows.length > 0 && setEnrichProduct(rows[0])} className="flex shrink-0 items-center gap-2 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2.5 min-h-[44px] text-sm font-medium text-amber transition hover:bg-amber/20">
            <span>✨</span> AI Spec Enricher
          </button>
        </div>

        {/* Sticky Viewport Horizontal Domain Jump Controls */}
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="text-gold font-extrabold uppercase hidden md:inline">Domain Jump:</span>
          <button onClick={() => handleScrollToDomain(0)} className="px-3.5 py-2 min-h-[38px] rounded-xl bg-gold hover:bg-gold-deep text-navy font-black transition-all shadow">
            📋 Product & Content
          </button>
          <button onClick={() => handleScrollToDomain(600)} className="px-3.5 py-2 min-h-[38px] rounded-xl bg-gold hover:bg-gold-deep text-navy font-black transition-all shadow">
            💰 Pricing
          </button>
          <button onClick={() => handleScrollToDomain(1200)} className="px-3.5 py-2 min-h-[38px] rounded-xl bg-blue hover:bg-blue-deep text-white font-black transition-all shadow">
            📦 Stock & FEFO
          </button>
          <button onClick={() => handleScrollToDomain(2000)} className="px-3.5 py-2 min-h-[38px] rounded-xl bg-white/20 hover:bg-white/30 text-white font-black transition-all border border-white/20 shadow">
            ▶ End
          </button>
        </div>
      </div>

      {/* Viewport Frame Constrained Scroll Container */}
      <div ref={tableContainerRef} className="flex-1 max-h-[calc(100vh-210px)] overflow-x-auto overflow-y-auto custom-scrollbar relative bg-[#09090b] border-t border-white/20">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-white font-extrabold animate-pulse font-sans text-lg">Loading Product Masters...</div>
        ) : (
          <table className="w-max min-w-full border-collapse text-base bg-[#18181b]">
            <thead className="sticky top-0 z-30 shadow-lg">
              <tr className="bg-[#09090b] text-sm text-white">
                <th className="w-10 border border-white/20 py-3 font-black sticky left-0 z-40 bg-[#09090b] text-gold">#</th>
                {DOMAINS.map((d, i) => (
                  <th key={d.name} colSpan={d.cols.length} className={`border border-white/20 py-3 px-4 font-black uppercase tracking-wider text-center text-sm ${['bg-blue text-white', 'bg-gold text-navy', 'bg-blue text-white', 'bg-gold text-navy', 'bg-blue text-white', 'bg-gold text-navy', 'bg-blue text-white'][i % 7]}`}>
                    {d.name}
                  </th>
                ))}
                <th className="w-20 border border-white/20 py-3 font-black text-sm text-gold">Action</th>
              </tr>
              <tr className="bg-[#27272a] text-left text-sm font-black text-white">
                <th className="border border-white/20 px-2 py-3 text-center sticky left-0 z-40 bg-[#27272a] text-gold shadow-[2px_0_5px_rgba(0,0,0,0.5)]">#</th>
                {ALL_COLS.map((h, colIdx) => (
                  <th
                    key={h}
                    className={`border border-white/20 px-4 py-3 whitespace-nowrap font-mono text-sm font-extrabold ${
                      h === 'SKU' ? 'sticky left-10 z-40 bg-[#27272a] text-gold shadow-[2px_0_5px_rgba(0,0,0,0.5)]' : 'text-white'
                    }`}
                  >
                    {h}
                  </th>
                ))}
                <th className="border border-white/20 px-3 py-3 text-center text-gold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isDraft = r.status === 'Draft'
                return (
                  <tr key={r.sku} className="hover:bg-blue/10 transition-colors group">
                    <td className="border border-white/10 bg-[#0A101D] group-hover:bg-blue/10 px-2 py-1.5 text-center text-sm text-white/40 font-mono sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      {i + 1}
                    </td>
                    {ALL_COLS.map((col, colIdx) => {
                      const field = FIELD_MAP[col]
                      const val = r[field]
                      const isBool = ['is_ai_generated', 'is_human_reviewed', 'is_featured', 'published'].includes(field)
                      const isArray = Array.isArray(val)
                      const displayVal = isArray ? val.join(', ') : (val ?? '')
                      
                      if (field === 'status') {
                        return (
                          <Cell key={colIdx} onSelect={() => setSelected({ row: i, col: colIdx })} selected={selected.row === i && selected.col === colIdx} className="text-center p-0 min-w-[100px]">
                            <select 
                              value={r.status || 'Draft'}
                              onChange={(e) => updateField(i, col, e.target.value)}
                              className={`w-full h-full bg-transparent px-2 py-1.5 text-sm outline-none cursor-pointer appearance-none text-center font-bold ${isDraft ? 'text-amber' : 'text-forest'}`}
                            >
                              <option value="Live">Live</option>
                              <option value="Draft">Draft</option>
                              <option value="Discontinued">Discontinued</option>
                            </select>
                          </Cell>
                        )
                      }
                      
                      if (col === 'Expiry Date') {
                        const health = getExpiryHealth(val)
                        return (
                          <Cell key={colIdx} onSelect={() => setSelected({ row: i, col: colIdx })} selected={selected.row === i && selected.col === colIdx} className="p-1 min-w-[150px]">
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="date"
                                value={val || ''}
                                onChange={(e) => updateField(i, col, e.target.value, r.sku)}
                                className="bg-transparent text-sm font-mono text-white outline-none w-24"
                              />
                              {val && (
                                <button
                                  onClick={() => setBatchProduct(r)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                    health.color === 'crimson' ? 'bg-crimson/20 border-crimson text-crimson animate-pulse' :
                                    health.color === 'amber' ? 'bg-amber/20 border-amber text-amber' :
                                    'bg-forest/20 border-forest text-forest'
                                  }`}
                                >
                                  {health.text}
                                </button>
                              )}
                            </div>
                          </Cell>
                        )
                      }
                      
                      if (isBool) {
                        return (
                          <Cell key={colIdx} onSelect={() => setSelected({ row: i, col: colIdx })} selected={selected.row === i && selected.col === colIdx} className="text-center p-0 min-w-[60px]">
                            <input type="checkbox" checked={Boolean(val)} onChange={(e) => updateField(i, col, e.target.checked)} className="cursor-pointer mx-auto block w-4 h-4 text-blue" />
                          </Cell>
                        )
                      }

                      return (
                        <Cell
                          key={colIdx}
                          onSelect={() => setSelected({ row: i, col: colIdx })}
                          selected={selected.row === i && selected.col === colIdx}
                          className={`p-0 min-w-[120px] ${
                            col === 'SKU' ? 'sticky left-8 z-20 bg-[#0A101D] group-hover:bg-[#0A101D] shadow-[2px_0_5px_rgba(0,0,0,0.5)]' : ''
                          }`}
                        >
                          <input 
                            type={typeof val === 'number' ? 'number' : 'text'}
                            value={displayVal}
                            onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: e.target.value } : row))}
                            onBlur={(e) => updateField(i, col, e.target.value, col === 'SKU' ? r.sku : null)}
                            onFocus={() => setSelected({ row: i, col: colIdx })}
                            className={`w-full h-full bg-transparent px-2.5 py-1.5 outline-none font-mono text-sm ${col === 'SKU' ? 'font-bold text-blue' : 'text-navy dark:text-neutral-300'}`}
                            placeholder={col}
                          />
                        </Cell>
                      )
                    })}
                    <td className="border border-line dark:border-white/10 px-2 text-center bg-paper dark:bg-[#0A101D] group-hover:bg-blue-wash dark:group-hover:bg-blue/10">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEnrichProduct(r)} className="text-amber/70 hover:text-amber hover:bg-amber/10 rounded w-6 h-6 flex items-center justify-center transition-colors text-sm font-bold" title="Enrich Product Specs with AI">
                          ✨
                        </button>
                        <button onClick={() => openProduct(r.sku)} className="text-navy-soft hover:text-navy hover:bg-shell rounded w-6 h-6 flex items-center justify-center transition-colors" title="View Store Page">
                          <EyeIcon size={14} />
                        </button>
                        <button onClick={() => setShowBarcode(r.barcode || r.sku)} className="text-navy-soft hover:text-navy hover:bg-shell rounded w-6 h-6 flex items-center justify-center transition-colors" title="View Barcode">
                          <BarcodeIcon size={14} />
                        </button>
                        <button onClick={() => handleDeleteRow(r.sku)} className="text-crimson/50 hover:text-crimson hover:bg-crimson/10 rounded w-6 h-6 flex items-center justify-center transition-colors" title="Delete Row">×</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      {showAiScanner && <ScanToAiModal onClose={() => setShowAiScanner(false)} />}
      {showSmartPaste && <SmartPasteModal onClose={() => setShowSmartPaste(false)} />}
      {showCsvImport && <BulkCsvImportModal onClose={() => setShowCsvImport(false)} />}
      
      {showBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/20 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl bg-cream p-8 shadow-float text-center">
            <button onClick={() => setShowBarcode(null)} className="absolute right-4 top-4 text-navy-soft hover:text-navy hover:bg-shell rounded p-1 transition-colors">
              <XIcon size={20} />
            </button>
            <h3 className="font-serif text-xl font-medium tracking-tight text-navy mb-6">Product Barcode</h3>
            <div className="bg-white p-4 rounded-xl flex items-center justify-center overflow-hidden">
              <Barcode 
                value={showBarcode} 
                background="#ffffff"
                lineColor="#000000"
                width={2}
                height={80}
                fontSize={16}
                margin={0}
              />
            </div>
            <p className="mt-6 text-base text-navy-soft">Scan directly from screen, or right-click to save and print.</p>
          </div>
        </div>
      )}

      {batchProduct && (
        <BatchExpiryManagerModal
          product={batchProduct}
          onClose={() => setBatchProduct(null)}
          onSaveBatches={(sku, updatedBatches) => {
            setRows(prev => prev.map(r => r.sku === sku ? {
              ...r,
              batches: updatedBatches,
              expiry_date: updatedBatches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))[0]?.expiry_date || r.expiry_date
            } : r))
          }}
        />
      )}

      <ProductAiEnrichmentModal
        product={enrichProduct}
        isOpen={!!enrichProduct}
        onClose={() => setEnrichProduct(null)}
        onEnriched={() => fetchProducts()}
      />
    </div>
  )
}

function Cell({ children, selected, onSelect, className = '' }) {
  return (
    <td onClick={onSelect} className={`border transition-colors ${selected ? 'border-[2px] border-blue bg-blue/5 dark:bg-blue/10' : 'border-line dark:border-white/10'} ${className}`}>
      {children}
    </td>
  )
}
