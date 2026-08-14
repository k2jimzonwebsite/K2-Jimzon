import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import PhotoManagerModal from './PhotoManagerModal'
import BulkCsvImportModal from './BulkCsvImportModal'
import BatchExpiryManagerModal, { getExpiryHealth } from './BatchExpiryManagerModal'
import ProductAiEnrichmentModal from './ProductAiEnrichmentModal'
import DeleteProductsModal from './DeleteProductsModal'
import ProductIntakeSessionModal from './ProductIntakeSessionModal'
import { useAdminStore as useStore } from '../../context/AdminStoreContext'
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
  const [showPhoneIntake, setShowPhoneIntake] = useState(false)
  const [showBarcode, setShowBarcode] = useState(null)
  const [batchProduct, setBatchProduct] = useState(null)
  const [enrichProduct, setEnrichProduct] = useState(null)
  const [operationError, setOperationError] = useState('')

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
    setOperationError('')
    if (!supabase) {
      setRows([])
      setOperationError('Supabase is not configured. Product records are unavailable.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (error) {
      setRows([])
      setOperationError(`Could not load product records: ${error.message}`)
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  const updateField = async (index, colName, value, oldSku = null) => {
    const field = FIELD_MAP[colName]
    if (field === 'stock_available') return
    const product = rows[index]
    if (!product || !field) return
    const previousValue = product[field]
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
    
    if (!supabase) {
      setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: previousValue } : r))
      setOperationError('Could not save the change because Supabase is not configured.')
      return false
    }
    const { error } = await supabase.from('products').update({ [field]: finalValue }).eq('sku', oldSku || product.sku)
    if (error) {
      setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: previousValue } : r))
      setOperationError(`Could not save ${colName} for ${oldSku || product.sku}: ${error.message}`)
      return false
    }
    setOperationError('')
    return true
  }

  const [deleteTargets, setDeleteTargets] = useState(null)

  const handleAddRow = () => {
    setShowPhoneIntake(true)
  }

  const tableContainerRef = useRef(null)
  const domainRefs = useRef({})

  const handleScrollToDomain = (name) => {
    const el = domainRefs.current[name]
    const container = tableContainerRef.current
    if (!el || !container) return
    const stickyGutter = window.innerWidth < 640 ? 8 : 88
    container.scrollTo({ left: Math.max(0, el.offsetLeft - stickyGutter), behavior: 'smooth' })
  }

  const DOMAIN_TONE = {
    Product: 'bg-gold text-navy',
    Content: 'bg-gold text-navy',
    Pricing: 'bg-gold text-navy',
    Inventory: 'bg-blue text-white',
    Website: 'bg-white/15 text-white border border-white/20',
    Media: 'bg-white/15 text-white border border-white/20',
    Management: 'bg-white/15 text-white border border-white/20',
  }

  return (
    <div className="flex flex-col h-full bg-adm-sunken">
      <div className="shrink-0 border-b border-adm-line bg-adm-surface">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-3 py-2 lg:px-6 lg:py-3">
          <button onClick={handleAddRow} className="flex shrink-0 items-center gap-2 rounded-adm-sm bg-forest text-white px-3.5 min-h-[44px] text-sm font-bold transition hover:bg-forest/90">
            <span className="text-lg leading-none">+</span> Phone Intake
          </button>
          <button onClick={() => setShowCsvImport(true)} className="flex shrink-0 items-center gap-2 rounded-adm-sm border border-adm-line px-3 min-h-[44px] text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white">
            <span>📂</span> CSV Import
          </button>
          <button onClick={() => setShowAiScanner(true)} className="flex shrink-0 items-center gap-2 rounded-adm-sm border border-adm-line px-3 min-h-[44px] text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white">
            <span>⌂</span> Scan Box
          </button>
          <button onClick={() => setShowSmartPaste(true)} className="flex shrink-0 items-center gap-2 rounded-adm-sm border border-blue/30 bg-blue/10 px-3 min-h-[44px] text-sm font-medium text-blue transition hover:bg-blue/20">
            <span>✨</span> Smart Paste AI
          </button>
          <button
            onClick={() => rows.length > 0 && setEnrichProduct(rows[0])}
            disabled={rows.length === 0}
            className="flex shrink-0 items-center gap-2 rounded-adm-sm border border-amber/30 bg-amber/10 px-3 min-h-[44px] text-sm font-medium text-amber transition hover:bg-amber/20 disabled:opacity-40"
          >
            <span>✨</span> AI Spec Enricher
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-adm-line px-3 py-2 lg:px-6">
          <span className="shrink-0 text-xs font-mono font-extrabold uppercase text-gold hidden lg:inline">Jump:</span>
          {DOMAINS.map(d => (
            <button
              key={d.name}
              onClick={() => handleScrollToDomain(d.name)}
              className={`shrink-0 px-3 min-h-[38px] rounded-adm-sm text-xs font-bold font-mono transition-all ${DOMAIN_TONE[d.name] || 'bg-white/15 text-white'}`}
            >
              {d.name}
            </button>
          ))}
        </div>
        {operationError && (
          <div role="alert" className="mx-3 mb-3 rounded-adm-sm border border-crimson/35 bg-crimson/10 px-3 py-2 text-sm text-crimson lg:mx-6">
            {operationError}
          </div>
        )}
      </div>

      <div ref={tableContainerRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar relative bg-adm-sunken">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-white font-extrabold animate-pulse font-sans text-lg">Loading Product Masters...</div>
        ) : (
          <table className="w-max min-w-full border-collapse text-base bg-adm-surface">
            <thead className="sticky top-0 z-30">
              <tr className="bg-adm-sunken text-sm text-white">
                <th className="hidden sm:table-cell w-10 min-w-10 border border-adm-line py-2.5 font-bold sticky left-0 z-40 bg-adm-sunken text-gold">#</th>
                {DOMAINS.map((d) => (
                  <th
                    key={d.name}
                    ref={(el) => { domainRefs.current[d.name] = el }}
                    colSpan={d.cols.length}
                    className={`border border-adm-line py-2.5 px-4 font-bold uppercase tracking-wider text-center text-xs ${DOMAIN_TONE[d.name] || 'bg-white/15 text-white'}`}
                  >
                    {d.name}
                  </th>
                ))}
                <th className="w-20 border border-adm-line py-2.5 font-bold text-xs text-gold">Action</th>
              </tr>
              <tr className="bg-adm-raised text-left text-sm font-bold text-white">
                <th className="hidden sm:table-cell w-10 min-w-10 border border-adm-line px-2 py-2.5 text-center sticky left-0 z-40 bg-adm-raised text-gold">#</th>
                {ALL_COLS.map((h) => (
                  <th
                    key={h}
                    className={`border border-adm-line px-3 py-2.5 whitespace-nowrap font-mono text-xs font-extrabold ${
                      h === 'SKU'
                        ? 'sticky left-0 sm:left-10 z-40 bg-adm-raised text-gold shadow-[2px_0_6px_rgba(0,0,0,0.6)]'
                        : 'text-white'
                    }`}
                  >
                    {h}
                  </th>
                ))}
                <th className="border border-adm-line px-3 py-2.5 text-center text-gold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                return (
                  <tr key={r.sku} className="hover:bg-blue/10 transition-colors group">
                    <td className="hidden sm:table-cell w-10 min-w-10 border border-adm-line bg-adm-surface px-2 py-1.5 text-center text-xs text-white/50 font-mono sticky left-0 z-20">
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
                              value={r.status || 'draft'}
                              onChange={(e) => updateField(i, col, e.target.value)}
                              className={`w-full h-full bg-transparent px-2 py-1.5 text-sm outline-none cursor-pointer appearance-none text-center font-bold ${
                                r.status === 'draft' ? 'text-amber'
                                : r.status === 'unlisted' ? 'text-blue'
                                : r.status === 'discontinued' ? 'text-crimson'
                                : 'text-forest'
                              }`}
                            >
                              <option value="live">Live</option>
                              <option value="under_review">Under Review</option>
                              <option value="draft">Draft</option>
                              <option value="unlisted">Unlisted</option>
                              <option value="discontinued">Discontinued</option>
                            </select>
                          </Cell>
                        )
                      }
                      
                      if (col === 'Expiry Date') {
                        const health = getExpiryHealth(val)
                        return (
                          <Cell key={colIdx} onSelect={() => setSelected({ row: i, col: colIdx })} selected={selected.row === i && selected.col === colIdx} className="p-1 min-w-[150px]">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-transparent text-sm font-mono text-white outline-none w-24">
                                {val || 'Lots Summary'}
                              </span>
                              <button
                                onClick={() => setBatchProduct(r)}
                                className="px-1.5 py-0.5 rounded text-xs font-bold border border-amber/40 bg-amber/10 text-amber"
                              >
                                View Lots
                              </button>
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

                      if (field === 'stock_available') {
                        return <Cell key={colIdx} className="min-w-[120px] p-0"><button type="button" onClick={() => setBatchProduct(r)} className="min-h-11 w-full px-2.5 text-left font-mono text-sm font-bold text-blue" title="Stock changes use batch reconciliation">{displayVal || 0} · batches</button></Cell>
                      }

                      return (
                        <Cell
                          key={colIdx}
                          onSelect={() => setSelected({ row: i, col: colIdx })}
                          selected={selected.row === i && selected.col === colIdx}
                          className={`p-0 min-w-[120px] ${
                            col === 'SKU' ? 'sticky left-0 sm:left-10 z-20 bg-adm-surface shadow-[2px_0_6px_rgba(0,0,0,0.6)]' : ''
                          }`}
                        >
                          <input
                            type={typeof val === 'number' ? 'number' : 'text'}
                            value={displayVal}
                            disabled={col === 'SKU'}
                            onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: e.target.value } : row))}
                            onBlur={(e) => updateField(i, col, e.target.value, col === 'SKU' ? r.sku : null)}
                            onFocus={() => setSelected({ row: i, col: colIdx })}
                            className={`w-full h-full bg-transparent px-2.5 py-1.5 outline-none font-mono text-sm ${col === 'SKU' ? 'font-bold text-blue cursor-not-allowed' : 'text-neutral-200'}`}
                            placeholder={col}
                          />
                        </Cell>
                      )
                    })}
                    <td className="border border-adm-line px-2 text-center bg-adm-surface group-hover:bg-blue/10">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => setEnrichProduct(r)} className="text-amber/70 hover:text-amber hover:bg-amber/10 rounded-adm-sm w-9 h-9 flex items-center justify-center transition-colors text-sm font-bold" title="Enrich Product Specs with AI">
                          ✨
                        </button>
                        <button onClick={() => openProduct(r.sku)} className="text-white/55 hover:text-white hover:bg-white/10 rounded-adm-sm w-9 h-9 flex items-center justify-center transition-colors" title="View Store Page">
                          <EyeIcon size={15} />
                        </button>
                        <button onClick={() => setShowBarcode(r.barcode || r.sku)} className="text-white/55 hover:text-white hover:bg-white/10 rounded-adm-sm w-9 h-9 flex items-center justify-center transition-colors" title="View Barcode">
                          <BarcodeIcon size={15} />
                        </button>
                        <button onClick={() => setDeleteTargets([r])} className="text-crimson/60 hover:text-crimson hover:bg-crimson/10 rounded-adm-sm w-9 h-9 flex items-center justify-center transition-colors text-lg leading-none" title="Delete Row">×</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ProductIntakeSessionModal
        isOpen={showPhoneIntake}
        onClose={() => setShowPhoneIntake(false)}
        onProductCreated={fetchProducts}
        onExistingProduct={(product) => {
          setShowPhoneIntake(false)
          setBatchProduct(product)
        }}
      />

      {deleteTargets && (
        <DeleteProductsModal
          products={deleteTargets}
          onClose={() => setDeleteTargets(null)}
          onDeleted={(skus) => { setRows(prev => prev.filter(r => !skus.includes(r.sku))); setDeleteTargets(null) }}
        />
      )}

      {showAiScanner && <ScanToAiModal onClose={() => setShowAiScanner(false)} />}
      {showSmartPaste && <SmartPasteModal onClose={() => setShowSmartPaste(false)} />}
      {showCsvImport && <BulkCsvImportModal onClose={() => setShowCsvImport(false)} />}
      
      {showBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/20 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-adm bg-cream p-8 shadow-float text-center">
            <button onClick={() => setShowBarcode(null)} className="absolute right-4 top-4 text-navy-soft hover:text-navy hover:bg-shell rounded p-1 transition-colors">
              <XIcon size={20} />
            </button>
            <h3 className="font-sans text-xl font-medium tracking-tight text-navy mb-6">Product Barcode</h3>
            <div className="bg-white p-4 rounded-adm-sm flex items-center justify-center overflow-hidden">
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
    <td onClick={onSelect} className={`border transition-colors ${selected ? 'border-blue bg-blue/10' : 'border-adm-line'} ${className}`}>
      {children}
    </td>
  )
}
