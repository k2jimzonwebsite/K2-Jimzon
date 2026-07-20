import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import PhotoManagerModal from './PhotoManagerModal'

// Extended columns for PIM
const COL_HEADERS = [
  'SKU', 'Barcode', 'Product Name', 'Short Desc', 'Cost ₱', 'SRP ₱', 'Wholesale ₱',
  'Available', 'Reserved', 'Incoming', 'Reorder Lvl', 
  'SEO Keywords', 'AI Gen', 'Reviewed', 'Status'
]

const COLS = Array.from({length: COL_HEADERS.length}, (_, i) => String.fromCharCode(65 + i))

export default function Sheet() {
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState({ row: -1, col: -1 })
  const [loading, setLoading] = useState(true)
  const [showAiScanner, setShowAiScanner] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [photoModalProduct, setPhotoModalProduct] = useState(null)

  useEffect(() => {
    if (!supabase) return;
    fetchProducts()
    
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        fetchProducts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchProducts = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setRows(data)
    }
    setLoading(false)
  }

  const updateField = async (index, field, value, oldSku = null) => {
    const product = rows[index]
    let finalValue = value
    
    // Numeric fields
    if (['srp', 'wholesale_price', 'cost_price', 'stock_available', 'stock_reserved', 'stock_incoming', 'reorder_level'].includes(field)) {
      finalValue = Math.max(0, Number(value) || 0)
    }
    
    // Boolean fields
    if (['is_ai_generated', 'is_human_reviewed'].includes(field)) {
      finalValue = Boolean(value)
    }
    
    // Array fields (SEO)
    if (field === 'seo_keywords') {
      if (typeof value === 'string') {
        finalValue = value.split(',').map(s => s.trim()).filter(Boolean)
      }
    }

    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: finalValue } : r)))
    
    if (!supabase) return;

    const targetSku = oldSku || product.sku

    const { error } = await supabase
      .from('products')
      .update({ [field]: finalValue })
      .eq('sku', targetSku)
      
    if (error) {
      console.error(`Failed to update ${field}:`, error)
      fetchProducts()
    }
  }

  const handleDeleteRow = async (sku) => {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;
    
    setRows(prev => prev.filter(r => r.sku !== sku))
    
    if (!supabase) return;
    const { error } = await supabase.from('products').delete().eq('sku', sku)
    if (error) {
      console.error('Failed to delete row:', error)
      fetchProducts()
    }
  }

  const handleAddRow = async () => {
    const newSku = `NEW-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const newRow = { 
      sku: newSku, 
      name: '', 
      status: 'Draft', 
      srp: 0, 
      wholesale_price: 0, 
      stock_available: 0,
      is_ai_generated: false,
      is_human_reviewed: false
    }
    
    setRows(prev => [newRow, ...prev])
    setSelected({ row: 0, col: 0 })
    
    if (!supabase) return;
    const { error } = await supabase.from('products').insert([newRow])
    if (error) {
      console.error('Failed to add row:', error)
      fetchProducts()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#05080f]">
      {/* Tools Header */}
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4 bg-[#0A101D] overflow-x-auto shrink-0">
        <button 
          onClick={handleAddRow}
          className="flex shrink-0 items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          <span className="text-forest text-lg leading-none">+</span> Add New Row
        </button>
        <div className="h-6 w-px bg-white/10" />
        <button 
          onClick={() => setShowAiScanner(true)}
          className="flex shrink-0 items-center gap-2 rounded border border-white/10 px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <span className="text-forest text-lg leading-none">⌂</span> Scan Box
        </button>
        <button 
          onClick={() => setShowSmartPaste(true)}
          className="flex shrink-0 items-center gap-2 rounded border border-blue/30 bg-blue/10 px-3 py-1.5 text-sm font-medium text-blue transition hover:bg-blue/20"
        >
          <span className="text-lg leading-none">✨</span> Smart Paste AI
        </button>
        <div className="ml-auto text-xs font-mono text-white/40 tabular">
          {rows.filter(r => r.stock_available <= 5).length} low-stock rows highlighted
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div className="flex-1 overflow-auto custom-scrollbar relative bg-cream">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-navy-soft animate-pulse">Loading PIM Data...</div>
        ) : (
          <table className="w-max min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-shell text-xs text-navy-soft">
                <th className="w-8 border border-line py-1 font-medium"> </th>
                {COLS.map((c) => (
                  <th key={c} className="border border-line py-1 font-medium">{c}</th>
                ))}
                <th className="w-8 border border-line py-1 font-medium"></th>
              </tr>
              <tr className="bg-navy text-left text-xs font-semibold text-white">
                <th className="border border-navy-soft px-2 py-1.5 text-center tabular">1</th>
                {COL_HEADERS.map((h) => (
                  <th key={h} className="border border-navy-soft px-2.5 py-1.5 whitespace-nowrap">{h}</th>
                ))}
                <th className="border border-navy-soft px-2 py-1.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const low = r.stock_available <= 5
                const isDraft = r.status === 'Draft'
                return (
                  <tr key={r.sku} className="hover:bg-shell">
                    <td className="border border-line bg-shell px-1 text-center text-xs text-navy-soft tabular sticky left-0 z-10">
                      {i + 2}
                    </td>
                    <Cell onSelect={() => setSelected({ row: i, col: 0 })} selected={selected.row === i && selected.col === 0} className="font-medium tabular p-0 min-w-[120px]">
                      <input 
                        type="text" 
                        defaultValue={r.sku || ''} 
                        onBlur={(e) => { if (e.target.value !== r.sku) updateField(i, 'sku', e.target.value, r.sku) }}
                        onFocus={() => setSelected({ row: i, col: 0 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-blue font-bold"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 1 })} selected={selected.row === i && selected.col === 1} className="p-0 min-w-[120px]">
                      <input 
                        type="text" 
                        value={r.barcode || ''} 
                        onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, barcode: e.target.value } : row))}
                        onBlur={(e) => updateField(i, 'barcode', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 1 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-navy font-mono text-xs"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 2 })} selected={selected.row === i && selected.col === 2} className="min-w-[250px] p-0">
                      <input 
                        type="text" 
                        value={r.name || ''} 
                        onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, name: e.target.value } : row))}
                        onBlur={(e) => updateField(i, 'name', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 2 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-navy"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 3 })} selected={selected.row === i && selected.col === 3} className="min-w-[250px] p-0">
                      <input 
                        type="text" 
                        value={r.short_description || ''} 
                        onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, short_description: e.target.value } : row))}
                        onBlur={(e) => updateField(i, 'short_description', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 3 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-navy"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 4 })} selected={selected.row === i && selected.col === 4} className="text-right p-0 min-w-[80px]">
                      <input type="number" value={r.cost_price ?? ''} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, cost_price: e.target.value } : row))} onBlur={(e) => updateField(i, 'cost_price', e.target.value)} onFocus={() => setSelected({ row: i, col: 4 })} className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-navy-soft" />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 5 })} selected={selected.row === i && selected.col === 5} className="text-right p-0 min-w-[80px]">
                      <input type="number" value={r.srp ?? ''} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, srp: e.target.value } : row))} onBlur={(e) => updateField(i, 'srp', e.target.value)} onFocus={() => setSelected({ row: i, col: 5 })} className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-navy font-medium" />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 6 })} selected={selected.row === i && selected.col === 6} className="text-right p-0 min-w-[80px]">
                      <input type="number" value={r.wholesale_price ?? ''} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, wholesale_price: e.target.value } : row))} onBlur={(e) => updateField(i, 'wholesale_price', e.target.value)} onFocus={() => setSelected({ row: i, col: 6 })} className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-blue font-medium" />
                    </Cell>
                    
                    <td className={`border px-0 tabular min-w-[80px] ${selected.row === i && selected.col === 7 ? 'border-[2px] border-blue' : 'border-line'} ${low ? 'bg-crimson-wash' : ''}`}>
                      <input type="number" value={r.stock_available ?? ''} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, stock_available: e.target.value } : row))} onBlur={(e) => updateField(i, 'stock_available', e.target.value)} onFocus={() => setSelected({ row: i, col: 7 })} className={`w-full h-full bg-transparent px-2.5 py-1.5 text-right font-semibold outline-none tabular ${low ? 'text-crimson' : 'text-navy'}`} />
                    </td>
                    <Cell onSelect={() => setSelected({ row: i, col: 8 })} selected={selected.row === i && selected.col === 8} className="text-right p-0 min-w-[80px]">
                      <input type="number" value={r.stock_reserved ?? ''} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, stock_reserved: e.target.value } : row))} onBlur={(e) => updateField(i, 'stock_reserved', e.target.value)} onFocus={() => setSelected({ row: i, col: 8 })} className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-navy-soft" />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 9 })} selected={selected.row === i && selected.col === 9} className="text-right p-0 min-w-[80px]">
                      <input type="number" value={r.stock_incoming ?? ''} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, stock_incoming: e.target.value } : row))} onBlur={(e) => updateField(i, 'stock_incoming', e.target.value)} onFocus={() => setSelected({ row: i, col: 9 })} className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-forest" />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 10 })} selected={selected.row === i && selected.col === 10} className="text-right p-0 min-w-[80px]">
                      <input type="number" value={r.reorder_level ?? ''} onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, reorder_level: e.target.value } : row))} onBlur={(e) => updateField(i, 'reorder_level', e.target.value)} onFocus={() => setSelected({ row: i, col: 10 })} className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-navy-soft" />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 11 })} selected={selected.row === i && selected.col === 11} className="min-w-[200px] p-0">
                      <input 
                        type="text" 
                        value={Array.isArray(r.seo_keywords) ? r.seo_keywords.join(', ') : ''} 
                        onChange={(e) => setRows(prev => prev.map((row, idx) => idx === i ? { ...row, seo_keywords: e.target.value } : row))}
                        onBlur={(e) => updateField(i, 'seo_keywords', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 11 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-navy font-mono text-xs"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 12 })} selected={selected.row === i && selected.col === 12} className="text-center p-0">
                      <input type="checkbox" checked={r.is_ai_generated || false} onChange={(e) => updateField(i, 'is_ai_generated', e.target.checked)} className="cursor-pointer mx-auto block w-4 h-4 text-blue" />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 13 })} selected={selected.row === i && selected.col === 13} className="text-center p-0">
                      <input type="checkbox" checked={r.is_human_reviewed || false} onChange={(e) => updateField(i, 'is_human_reviewed', e.target.checked)} className="cursor-pointer mx-auto block w-4 h-4 text-blue" />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 14 })} selected={selected.row === i && selected.col === 14} className="text-center font-medium p-0 min-w-[100px]">
                      <select 
                        value={r.status}
                        onChange={(e) => updateField(i, 'status', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 14 })}
                        className={'w-full h-full bg-transparent px-2 py-1.5 text-xs outline-none cursor-pointer appearance-none text-center ' + (isDraft ? 'text-amber font-bold' : 'text-forest font-bold')}
                      >
                        <option value="Live">Live</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 15 })} selected={selected.row === i && selected.col === 15} className="text-center p-0">
                      <button 
                        onClick={() => handleDeleteRow(r.sku)}
                        className="text-crimson/50 hover:text-crimson hover:bg-crimson/10 rounded w-6 h-6 flex items-center justify-center mx-auto transition-colors"
                        title="Delete Row"
                      >
                        ×
                      </button>
                    </Cell>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAiScanner && <ScanToAiModal onClose={() => setShowAiScanner(false)} />}
      {showSmartPaste && <SmartPasteModal onClose={() => setShowSmartPaste(false)} />}
      {photoModalProduct && (
        <PhotoManagerModal 
          product={photoModalProduct} 
          onClose={() => setPhotoModalProduct(null)}
          onUpdate={() => fetchProducts()}
        />
      )}
    </div>
  )
}

function Cell({ children, selected, onSelect, className = '' }) {
  return (
    <td 
      onClick={onSelect}
      className={`border transition-colors ${selected ? 'border-[2px] border-blue bg-blue/5' : 'border-line'} ${className}`}
    >
      {children}
    </td>
  )
}
