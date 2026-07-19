import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function Sheet() {
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState({ row: 0, col: 2 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

  const updateField = async (index, field, value) => {
    const product = rows[index]
    let finalValue = value
    if (field === 'retail_price' || field === 'vip_price' || field === 'total_stock') {
      finalValue = Math.max(0, Number(value) || 0)
    }

    // Optimistic UI update
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: finalValue } : r)))
    
    // Push to Supabase
    const { error } = await supabase
      .from('products')
      .update({ [field]: finalValue })
      .eq('sku', product.sku)
      
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
      image_url: '',
      retail_price: 0,
      vip_price: 0,
      total_stock: 0,
      status: 'Draft'
    }

    // Optimistic insert
    setRows(prev => [...prev, newProduct])
    
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
    <div className="overflow-hidden rounded-lg border border-line bg-cream shadow-card">
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

      <div className="max-h-[520px] overflow-auto">
        {loading && rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-navy-soft">Loading Master Inventory...</div>
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-shell text-xs text-navy-soft">
                <th className="w-8 border border-line py-1 font-medium"> </th>
                {COLS.map((c) => (
                  <th key={c} className="border border-line py-1 font-medium">{c}</th>
                ))}
              </tr>
              <tr className="bg-navy text-left text-xs font-semibold text-white">
                <th className="border border-navy-soft px-2 py-1.5 text-center tabular">1</th>
                {['SKU', 'Product', 'Description', 'Image URL', 'Master stock', 'Retail ₱', 'Wholesale ₱', 'Status'].map((h) => (
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
                    <Cell onSelect={() => setSelected({ row: i, col: 0 })} selected={selected.row === i && selected.col === 0} className="font-medium tabular">
                      {r.sku}
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 1 })} selected={selected.row === i && selected.col === 1} className="max-w-64 p-0">
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
                    <Cell onSelect={() => setSelected({ row: i, col: 2 })} selected={selected.row === i && selected.col === 2} className="max-w-64 p-0">
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
                    <Cell onSelect={() => setSelected({ row: i, col: 3 })} selected={selected.row === i && selected.col === 3} className="max-w-48 p-0">
                      <input 
                        type="text" 
                        value={r.image_url || ''} 
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, image_url: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'image_url', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 3 })}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none text-navy"
                        placeholder="URL..."
                      />
                    </Cell>
                    <td
                      className={
                        'border px-0 tabular ' +
                        (selected.row === i && selected.col === 4
                          ? 'border-[2px] border-blue'
                          : 'border-line') +
                        (low ? ' bg-crimson-wash' : '')
                      }
                    >
                      <input
                        type="number"
                        value={r.total_stock}
                        min={0}
                        onFocus={() => setSelected({ row: i, col: 4 })}
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
                    <Cell onSelect={() => setSelected({ row: i, col: 5 })} selected={selected.row === i && selected.col === 5} className="text-right tabular p-0">
                      <input
                        type="number"
                        value={r.retail_price}
                        min={0}
                        onFocus={() => setSelected({ row: i, col: 5 })}
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, retail_price: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'retail_price', e.target.value)}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-navy"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 6 })} selected={selected.row === i && selected.col === 6} className="text-right text-blue tabular p-0">
                      <input
                        type="number"
                        value={r.vip_price}
                        min={0}
                        onFocus={() => setSelected({ row: i, col: 6 })}
                        onChange={(e) => {
                          setRows(prev => prev.map((row, idx) => idx === i ? { ...row, vip_price: e.target.value } : row))
                        }}
                        onBlur={(e) => updateField(i, 'vip_price', e.target.value)}
                        className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none tabular text-blue"
                      />
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 7 })} selected={selected.row === i && selected.col === 7} className="text-center font-medium p-0">
                      <select 
                        value={r.status}
                        onChange={(e) => updateField(i, 'status', e.target.value)}
                        onFocus={() => setSelected({ row: i, col: 7 })}
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
        <div className="p-2 border-t border-line border-dashed">
          <button 
            onClick={handleAddRow}
            className="flex items-center gap-2 text-xs font-semibold text-blue hover:text-navy transition-colors px-2 py-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Row
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-line bg-paper px-3 py-1.5 text-xs text-navy-soft">
        <span className="border-b-2 border-forest pb-0.5 font-semibold text-navy">Master inventory</span>
        <span className="ml-auto tabular">{rows.filter((r) => r.total_stock <= 5).length} low-stock rows highlighted</span>
      </div>
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
