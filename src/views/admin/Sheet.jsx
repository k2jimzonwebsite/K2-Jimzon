import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import PhotoManagerModal from './PhotoManagerModal'
import BulkCsvImportModal from './BulkCsvImportModal'
import { useStore } from '../../context/StoreContext'
import Barcode from 'react-barcode'
import { EyeIcon, BarcodeIcon, XIcon } from '../../components/ui/icons'

const DOMAINS = [
  { name: 'Product', cols: ['SKU', 'Barcode', 'Product Name', 'Brand', 'Category', 'Subcategory', 'Origin', 'Net Weight', 'Package Type'] },
  { name: 'Content', cols: ['Description', 'Why Buy', 'Usage', 'Storage', 'Ingredients', 'Allergens', 'Finished Product'] },
  { name: 'Pricing', cols: ['Cost ₱', 'SRP ₱', 'Wholesale ₱', 'Dealer ₱'] },
  { name: 'Inventory', cols: ['Available', 'Reorder Level', 'Supplier', 'Warehouse'] },
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
  'Available': 'stock_available', 'Reorder Level': 'reorder_level', 'Supplier': 'supplier_id', 'Warehouse': 'warehouse_id',
  
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
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!error && data) setRows(data)
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

  return (
    <div className="flex flex-col h-full bg-[#05080f]">
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4 bg-[#0A101D] overflow-x-auto shrink-0">
        <button onClick={handleAddRow} className="flex shrink-0 items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20">
          <span className="text-forest text-lg leading-none">+</span> Add New Row
        </button>
        <div className="h-6 w-px bg-white/10" />
        <button onClick={() => setShowCsvImport(true)} className="flex shrink-0 items-center gap-2 rounded border border-white/10 px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
          <span className="text-lg leading-none">📂</span> Upload CSV
        </button>
        <button onClick={() => setShowAiScanner(true)} className="flex shrink-0 items-center gap-2 rounded border border-white/10 px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
          <span className="text-forest text-lg leading-none">⌂</span> Scan Box
        </button>
        <button onClick={() => setShowSmartPaste(true)} className="flex shrink-0 items-center gap-2 rounded border border-blue/30 bg-blue/10 px-3 py-1.5 text-sm font-medium text-blue transition hover:bg-blue/20">
          <span className="text-lg leading-none">✨</span> Smart Paste AI
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar relative bg-cream pb-32">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-navy-soft animate-pulse">Loading PIM Data...</div>
        ) : (
          <table className="w-max min-w-full border-collapse text-sm bg-white">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-navy text-xs text-white">
                <th className="w-8 border border-white/20 py-1.5 font-medium sticky left-0 z-30 bg-navy"></th>
                {DOMAINS.map((d, i) => (
                  <th key={d.name} colSpan={d.cols.length} className={`border border-white/20 py-1.5 px-4 font-bold uppercase tracking-wider text-center ${['bg-blue/20', 'bg-forest/20', 'bg-amber/20', 'bg-crimson/20', 'bg-purple-900/40', 'bg-pink-900/40', 'bg-slate-700'][i % 7]}`}>
                    {d.name}
                  </th>
                ))}
                <th className="w-8 border border-white/20 py-1.5 font-medium"></th>
              </tr>
              <tr className="bg-shell text-left text-xs font-semibold text-navy">
                <th className="border border-line px-2 py-2 text-center sticky left-0 z-30 bg-shell shadow-[1px_0_0_0_#e5e7eb]">#</th>
                {ALL_COLS.map(h => (
                  <th key={h} className="border border-line px-2.5 py-2 whitespace-nowrap">{h}</th>
                ))}
                <th className="border border-line px-2 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isDraft = r.status === 'Draft'
                return (
                  <tr key={r.sku} className="hover:bg-blue-wash transition-colors group">
                    <td className="border border-line bg-shell group-hover:bg-blue-wash px-1 text-center text-xs text-navy-soft tabular sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb]">
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
                              className={`w-full h-full bg-transparent px-2 py-1.5 text-xs outline-none cursor-pointer appearance-none text-center font-bold ${isDraft ? 'text-amber' : 'text-forest'}`}
                            >
                              <option value="Live">Live</option>
                              <option value="Draft">Draft</option>
                              <option value="Discontinued">Discontinued</option>
                            </select>
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
                        <Cell key={colIdx} onSelect={() => setSelected({ row: i, col: colIdx })} selected={selected.row === i && selected.col === colIdx} className="p-0 min-w-[120px]">
                          <input 
                            type={typeof val === 'number' ? 'number' : 'text'}
                            value={displayVal}
                            onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: e.target.value } : row))}
                            onBlur={(e) => updateField(i, col, e.target.value, col === 'SKU' ? r.sku : null)}
                            onFocus={() => setSelected({ row: i, col: colIdx })}
                            className={`w-full h-full bg-transparent px-2.5 py-1.5 outline-none font-mono text-xs ${col === 'SKU' ? 'font-bold text-blue' : 'text-navy'}`}
                            placeholder={col}
                          />
                        </Cell>
                      )
                    })}
                    <td className="border border-line px-2 text-center bg-paper group-hover:bg-blue-wash">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openProduct(r.sku)} className="text-navy-soft hover:text-navy hover:bg-shell rounded w-6 h-6 flex items-center justify-center transition-colors" title="Preview Product">
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
            <p className="mt-6 text-sm text-navy-soft">Scan directly from screen, or right-click to save and print.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Cell({ children, selected, onSelect, className = '' }) {
  return (
    <td onClick={onSelect} className={`border transition-colors ${selected ? 'border-[2px] border-blue bg-blue/5' : 'border-line'} ${className}`}>
      {children}
    </td>
  )
}
