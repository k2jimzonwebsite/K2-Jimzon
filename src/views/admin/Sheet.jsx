import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'
import PhotoManagerModal from './PhotoManagerModal'

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']

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
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        fetchProducts() // Re-fetch to ensure order and consistency
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
    if (field === 'retail_price' || field === 'vip_price' || field === 'total_stock') {
      finalValue = Math.max(0, Number(value) || 0)
    }

    // Optimistic UI update
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: finalValue } : r)))
    
    if (!supabase) return;

    // Use oldSku for the query if we are updating the SKU primary key itself
    const targetSku = oldSku || product.sku

    // Push to Supabase
    const { error } = await supabase
      .from('products')
      .update({ [field]: finalValue })
      .eq('sku', targetSku)
      
    if (error) {
      console.error(`Failed to update ${field}:`, error)
      fetchProducts() // Revert on failure
    }
  }

  const handleAddRow = async () => {
    const newSku = `MANUAL-${Math.floor(Math.random() * 10000)}`
    const newProduct = {
      sku: newSku,
      title: '',
      why_buy: '',
      usage_instructions: '',
      primary_image_url: null,
      after_use_image_url: null,
      sample_image_urls: [],
      retail_price: 0,
      vip_price: 0,
      total_stock: 0,
      status: 'Draft'
    }

    // Optimistic insert
    setRows(prev => [...prev, newProduct])
    
    if (!supabase) return;

    // Push to Supabase
    const { error } = await supabase.from('products').insert([newProduct])
    
    if (error) {
      console.error('Failed to add new row:', error)
      fetchProducts()
    } else {
      // Focus the new row's title cell (it will be at the bottom)
      setSelected({ row: rows.length, col: 1 })
    }
  }

  const active = rows[selected.row]

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-cream shadow-card flex flex-col h-[calc(100vh-180px)]">
      {/* Formula bar */}
      <div className="flex items-center gap-2 border-b border-line bg-paper px-3 py-1.5 text-sm">
        <span className="rounded border border-[#d5dae2] bg-cream px-2 py-0.5 font-semibold tabular">
          {COLS[selected.col]}{selected.row + 2}
        </span>
        <span className="italic text-navy-faint">fx</span>
        <span className="truncate text-navy-soft">{active ? `${active.title} — master stock ${active.total_stock}` : ''}</span>
        <span className="ml-auto hidden items-center gap-1.5 text-xs font-medium text-forest md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-forest pulse-dot" />
          Edits push to live database instantly
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-navy-soft">Loading Master Inventory...</div>
        ) : (
          <table className="w-max min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-shell text-xs text-navy-soft">
                <th className="w-8 border border-line py-1 font-medium"> </th>
                {COLS.map((c) => (
                  <th key={c} className="border border-line py-1 font-medium">{c}</th>
                ))}
              </tr>
              <tr className="bg-navy text-left text-xs font-semibold text-white">
                <th className="border border-navy-soft px-2 py-1.5 text-center tabular">1</th>
                {['SKU', 'Product', 'Description', 'Usage', 'Primary Photo', 'After-Use', 'Samples', 'Master stock', 'Retail ₱', 'Wholesale ₱', 'Status'].map((h) => (
                  <th key={h} className="border border-navy-soft px-2.5 py-1.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const low = r.total_stock <= 5
                const isDraft = r.status === 'Draft'
                return (
                  <tr key={r.sku} className="hover:bg-shell">
                    <td className="border border-line bg-shell px-1 text-center text-xs text-navy-soft tabular">
                      {i + 2}
                    </td>
                    <Cell onSelect={() => setSelected({ row: i, col: 0 })} selected={selected.row === i && selected.col === 0} className="font-medium tabular p-0 min-w-[150px]">
                      <input 
                        type="text" 
                        defaultValue={r.sku || ''} 
                        onBlur={(e) => {
                          if (e.target.value !== r.sku) {
                            updateField(i, 'sku', e.target.value, r.sku)
                          }
                        }}
                        onFocus={() => setSelected({ row: i, col: 0 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-blue font-bold"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 1 })} selected={selected.row === i && selected.col === 1} className="min-w-[300px] p-0">
                      <input 
                        type="text" 
                        value={r.title || ''} 
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, title: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'title', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 1 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-navy"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 2 })} selected={selected.row === i && selected.col === 2} className="min-w-[400px] p-0">
                      <input 
                        type="text" 
                        value={r.why_buy || ''} 
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, why_buy: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'why_buy', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 2 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-navy"
                        placeholder="Description..."
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 3 })} selected={selected.row === i && selected.col === 3} className="min-w-[250px] p-0">
                      <input 
                        type="text" 
                        value={r.usage_instructions || ''} 
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, usage_instructions: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'usage_instructions', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 3 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-navy"
                        placeholder="Usage..."
                      />
                    </Cell>
                    <Cell onSelect={() => setPhotoModalProduct(r)} selected={false} className="text-center p-0 cursor-pointer hover:bg-black/5 transition-colors">
                      <div className="w-full h-full flex items-center justify-center p-1" onClick={() => setPhotoModalProduct(r)}>
                        {r.primary_image_url ? <span className="text-forest text-xs font-bold" title="Uploaded">✅</span> : <span className="text-crimson text-xs font-bold" title="Missing">❌</span>}
                      </div>
                    </Cell>
                    <Cell onSelect={() => setPhotoModalProduct(r)} selected={false} className="text-center p-0 cursor-pointer hover:bg-black/5 transition-colors">
                      <div className="w-full h-full flex items-center justify-center p-1" onClick={() => setPhotoModalProduct(r)}>
                        {r.after_use_image_url ? <span className="text-forest text-xs font-bold" title="Uploaded">✅</span> : <span className="text-crimson text-xs font-bold" title="Missing">❌</span>}
                      </div>
                    </Cell>
                    <Cell onSelect={() => setPhotoModalProduct(r)} selected={false} className="text-center p-0 cursor-pointer hover:bg-black/5 transition-colors">
                      <div className="w-full h-full flex items-center justify-center p-1 text-[10px] font-bold text-navy/60" onClick={() => setPhotoModalProduct(r)}>
                        {r.sample_image_urls?.length || 0}/5
                      </div>
                    </Cell>
                    <td
                      className={
                        'border px-0 tabular min-w-[100px] ' +
                        (selected.row === i && selected.col === 7
                          ? 'border-[2px] border-blue'
                          : 'border-line') +
                        (low ? ' bg-crimson-wash' : '')
                      }
                    >
                      <input
                        type="number"
                        value={r.total_stock}
                        min={0}
                        onFocus={() => setSelected({ row: i, col: 7 })}
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, total_stock: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'total_stock', e.target.value)}
                        className={
                          'w-full h-full bg-transparent px-2.5 py-1.5 text-right font-semibold outline-none tabular ' +
                          (low ? 'text-crimson' : 'text-navy')
                        }
                      />
                    </td>
                    <Cell onSelect={() => setSelected({ row: i, col: 8 })} selected={selected.row === i && selected.col === 8} className="text-right tabular p-0 min-w-[100px]">
                      <input
                        type="number"
                        value={r.retail_price}
                        min={0}
                        onFocus={() => setSelected({ row: i, col: 8 })}
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, retail_price: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'retail_price', e.target.value)}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-navy"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 9 })} selected={selected.row === i && selected.col === 9} className="text-right text-blue tabular p-0 min-w-[100px]">
                      <input
                        type="number"
                        value={r.vip_price}
                        min={0}
                        onFocus={() => setSelected({ row: i, col: 9 })}
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, vip_price: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'vip_price', e.target.value)}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-blue"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 10 })} selected={selected.row === i && selected.col === 10} className="text-center font-medium p-0 min-w-[120px]">
                      <select 
                        value={r.status}
                        onChange={(e) => updateField(i, 'status', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 10 })}
                        className={'w-full h-full bg-transparent px-2 py-1.5 text-xs outline-none cursor-pointer appearance-none text-center ' + (isDraft ? 'text-amber font-bold' : 'text-forest font-bold')}
                      >
                        <option value="Active">Active</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </Cell>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="p-2 border-t border-line border-dashed flex items-center gap-3">
          <button 
            onClick={handleAddRow}
            className="flex items-center gap-2 text-xs font-semibold text-blue hover:text-navy transition-colors px-2 py-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Row
          </button>
          <button 
            onClick={() => setShowAiScanner(true)}
            className="flex items-center gap-2 text-xs font-semibold text-forest hover:text-forest/80 transition-colors px-2 py-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Scan Box
          </button>
          <button 
            onClick={() => setShowSmartPaste(true)}
            className="flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors px-2 py-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Smart Paste AI
          </button>
        </div>
      </div>

      {showAiScanner && (
        <ScanToAiModal 
          onClose={() => setShowAiScanner(false)} 
          onOpenSmartPaste={() => {
            setShowAiScanner(false)
            setShowSmartPaste(true)
          }}
        />
      )}

      {showSmartPaste && (
        <SmartPasteModal 
          onClose={() => setShowSmartPaste(false)} 
          onProductAdded={() => {
            fetchProducts()
            setShowSmartPaste(false)
          }} 
        />
      )}

      <div className="flex items-center gap-4 border-t border-line bg-paper px-3 py-1.5 text-xs text-navy-soft">
        <span className="border-b-2 border-forest pb-0.5 font-semibold text-navy">Master inventory</span>
        <button 
          onClick={handleAddRow}
          className="ml-4 flex items-center gap-1 rounded bg-navy/5 px-2 py-1 font-medium text-navy hover:bg-navy/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Blank Row
        </button>
        <span className="ml-auto tabular">{rows.filter((r) => r.total_stock <= 5).length} low-stock rows highlighted</span>
      </div>
      {photoModalProduct && (
        <PhotoManagerModal 
          product={photoModalProduct} 
          onClose={() => setPhotoModalProduct(null)} 
          onSave={() => fetchProducts()}
        />
      )}
    </div>
  )
}

function Cell({ children, selected, onSelect, className = '' }) {
  return (
    <td
      onClick={onSelect}
      className={
        'cursor-cell border px-2.5 py-1.5 ' +
        (selected ? 'border-[2px] border-blue ' : 'border-line ') +
        className
      }
    >
      {children}
    </td>
  )
}
