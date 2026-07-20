import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import PhotoManagerModal from './PhotoManagerModal'

const DOMAINS = [
  { name: 'Identity', cols: ['SKU', 'Barcode', 'Product Name', 'Short Name', 'Manufacturer', 'Brand', 'Category', 'Subcategory', 'Origin', 'Net Weight', 'Unit', 'Package Type', 'Case Qty'] },
  { name: 'Content', cols: ['Short Desc', 'Why Buy', 'Usage', 'Storage', 'Ingredients', 'Allergens', 'Finished Product'] },
  { name: 'Pricing', cols: ['Cost ₱', 'SRP ₱', 'Wholesale ₱', 'Dealer ₱', 'Promo ₱', 'VAT %', 'Discount %'] },
  { name: 'Inventory', cols: ['Available', 'Reserved', 'Incoming', 'Reorder Lvl', 'Supplier', 'Warehouse', 'Shelf'] },
  { name: 'Web & SEO', cols: ['Slug', 'Meta Title', 'SEO Keywords', 'Display Order', 'Featured', 'Published'] },
  { name: 'Media', cols: ['Video URL', 'Lifestyle Images', 'Documents', 'Certificates'] },
  { name: 'AI & Ops', cols: ['AI Gen', 'Human Reviewed', 'Last Review', 'Internal Notes', 'Status'] }
]

const ALL_COLS = DOMAINS.flatMap(d => d.cols)

const FIELD_MAP = {
  // Identity
  'SKU': 'sku', 'Barcode': 'barcode', 'Product Name': 'name', 'Short Name': 'short_name', 
  'Manufacturer': 'manufacturer', 'Brand': 'brand_id', 'Category': 'category_id', 'Subcategory': 'subcategory',
  'Origin': 'country_of_origin', 'Net Weight': 'net_weight', 'Unit': 'unit_of_measure', 
  'Package Type': 'package_type', 'Case Qty': 'case_quantity',
  
  // Content
  'Short Desc': 'short_description', 'Why Buy': 'why_buy', 'Usage': 'usage_instructions',
  'Storage': 'storage_instructions', 'Ingredients': 'ingredients', 'Allergens': 'allergens',
  'Finished Product': 'finished_product_details',
  
  // Pricing
  'Cost ₱': 'cost_price', 'SRP ₱': 'srp', 'Wholesale ₱': 'wholesale_price', 'Dealer ₱': 'dealer_price',
  'Promo ₱': 'promo_price', 'VAT %': 'vat_percent', 'Discount %': 'discount_percent',
  
  // Inventory
  'Available': 'stock_available', 'Reserved': 'stock_reserved', 'Incoming': 'stock_incoming',
  'Reorder Lvl': 'reorder_level', 'Supplier': 'supplier_id', 'Warehouse': 'warehouse_id', 'Shelf': 'shelf_location',
  
  // Web & SEO
  'Slug': 'slug', 'Meta Title': 'meta_title', 'SEO Keywords': 'seo_keywords', 
  'Display Order': 'display_order', 'Featured': 'is_featured', 'Published': 'published',
  
  // Media
  'Video URL': 'product_video_url', 'Lifestyle Images': 'lifestyle_images', 
  'Documents': 'documents', 'Certificates': 'certificates',
  
  // AI & Ops
  'AI Gen': 'is_ai_generated', 'Human Reviewed': 'is_human_reviewed', 'Last Review': 'last_human_review_date',
  'Internal Notes': 'internal_notes', 'Status': 'status'
}

export default function Sheet() {
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState({ row: -1, col: -1 })
  const [loading, setLoading] = useState(true)
  const [showAiScanner, setShowAiScanner] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)

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
                    <td className="border border-line px-2 text-center bg-white group-hover:bg-blue-wash">
                      <button onClick={() => handleDeleteRow(r.sku)} className="text-crimson/50 hover:text-crimson hover:bg-crimson/10 rounded w-6 h-6 flex items-center justify-center mx-auto transition-colors" title="Delete Row">×</button>
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
