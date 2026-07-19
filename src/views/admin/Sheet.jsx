import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const COLS = ['A', 'B', 'C', 'D', 'E', 'F']

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

  const setStock = async (index, value) => {
    const stock = Math.max(0, Number(value) || 0)
    const product = rows[index]
    
    // Optimistic UI update
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, total_stock: stock } : r)))
    
    // Push to Supabase
    const { error } = await supabase
      .from('products')
      .update({ total_stock: stock })
      .eq('sku', product.sku)
      
    if (error) {
      console.error('Failed to update stock:', error)
      fetchProducts() // Revert on failure
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
                {['SKU', 'Product', 'Master stock', 'Retail ₱', 'Wholesale ₱', 'Status'].map((h) => (
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
                    <Cell onSelect={() => setSelected({ row: i, col: 1 })} selected={selected.row === i && selected.col === 1} className="max-w-64 truncate">
                      {r.title}
                    </Cell>
                    <td
                      className={
                        'border px-0 tabular ' +
                        (selected.row === i && selected.col === 2
                          ? 'border-[2px] border-blue'
                          : 'border-line') +
                        (low ? ' bg-crimson-wash' : '')
                      }
                    >
                      <input
                        type="number"
                        value={r.total_stock}
                        min={0}
                        onFocus={() => setSelected({ row: i, col: 2 })}
                        onChange={(e) => setStock(i, e.target.value)}
                        className={
                          'w-full bg-transparent px-2.5 py-1.5 text-right font-semibold outline-none tabular ' +
                          (low ? 'text-crimson' : '')
                        }
                      />
                    </td>
                    <Cell onSelect={() => setSelected({ row: i, col: 3 })} selected={selected.row === i && selected.col === 3} className="text-right tabular">
                      {Number(r.retail_price).toLocaleString('en-PH')}
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 4 })} selected={selected.row === i && selected.col === 4} className="text-right text-blue tabular">
                      {Number(r.vip_price).toLocaleString('en-PH')}
                    </Cell>
                    <Cell onSelect={() => setSelected({ row: i, col: 5 })} selected={selected.row === i && selected.col === 5} className="text-center font-medium">
                      <span className={'px-2 py-0.5 rounded text-xs ' + (isDraft ? 'bg-amber-wash text-amber' : 'bg-forest-wash text-forest')}>
                        {r.status}
                      </span>
                    </Cell>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
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
