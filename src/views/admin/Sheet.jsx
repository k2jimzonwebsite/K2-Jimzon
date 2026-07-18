import { useState } from 'react'
import { products } from '../../data/products'

// Sheet Mode: a Google-Sheets-style dense grid for rapid manual entry.
// One master stock number fans out to every channel — edit it once.

export const EXTRA = [
  { id: 'milano-12', name: 'Milano № 12 eau de parfum — inspired 85ml', retail: 549, wholesale: 419 },
  { id: 'kinder-card', name: 'Kinder Cards biscuits 128g', retail: 189, wholesale: 148 },
  { id: 'mulino-cookies', name: 'Mulino Bianco Baiocchi 168g', retail: 249, wholesale: 196 },
]

export const seedStock = () => {
  let seed = 7
  const rand = (max) => {
    seed = (seed * 73 + 41) % 211
    return seed % max
  }
  return [...products, ...EXTRA].map((p, i) => ({
    sku: 'K2-' + String(1001 + i * 7),
    name: p.name,
    stock: rand(60) + (i % 4 === 1 ? 0 : 6),
    retail: p.retail,
    wholesale: p.wholesale,
  }))
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export default function Sheet({ rows, setRows }) {
  const [selected, setSelected] = useState({ row: 0, col: 2 })

  const setStock = (index, value) => {
    const stock = Math.max(0, Number(value) || 0)
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, stock } : r)))
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
        <span className="truncate text-navy-soft">{active ? `${active.name} — master stock ${active.stock}` : ''}</span>
        <span className="ml-auto hidden items-center gap-1.5 text-xs font-medium text-forest md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-forest pulse-dot" />
          Edits push to Shopee, Lazada + website in ~30s
        </span>
      </div>

      <div className="max-h-[520px] overflow-auto">
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
              {['SKU', 'Product', 'Master stock', 'Shopee', 'Lazada', 'Retail ₱', 'Wholesale ₱'].map((h) => (
                <th key={h} className="border border-navy-soft px-2.5 py-1.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const low = r.stock <= 5
              return (
                <tr key={r.sku} className="hover:bg-shell">
                  <td className="border border-line bg-shell px-1 text-center text-xs text-navy-soft tabular">
                    {i + 2}
                  </td>
                  <Cell onSelect={() => setSelected({ row: i, col: 0 })} selected={selected.row === i && selected.col === 0} className="font-medium tabular">
                    {r.sku}
                  </Cell>
                  <Cell onSelect={() => setSelected({ row: i, col: 1 })} selected={selected.row === i && selected.col === 1} className="max-w-64 truncate">
                    {r.name}
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
                      value={r.stock}
                      min={0}
                      onFocus={() => setSelected({ row: i, col: 2 })}
                      onChange={(e) => setStock(i, e.target.value)}
                      className={
                        'w-full bg-transparent px-2.5 py-1.5 text-right font-semibold outline-none tabular ' +
                        (low ? 'text-crimson' : '')
                      }
                    />
                  </td>
                  <Cell onSelect={() => setSelected({ row: i, col: 3 })} selected={selected.row === i && selected.col === 3} className="text-right text-navy-soft tabular">
                    {r.stock}
                  </Cell>
                  <Cell onSelect={() => setSelected({ row: i, col: 4 })} selected={selected.row === i && selected.col === 4} className="text-right text-navy-soft tabular">
                    {r.stock}
                  </Cell>
                  <Cell onSelect={() => setSelected({ row: i, col: 5 })} selected={selected.row === i && selected.col === 5} className="text-right tabular">
                    {r.retail.toLocaleString('en-PH')}
                  </Cell>
                  <Cell onSelect={() => setSelected({ row: i, col: 6 })} selected={selected.row === i && selected.col === 6} className="text-right text-blue tabular">
                    {r.wholesale.toLocaleString('en-PH')}
                  </Cell>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 border-t border-line bg-paper px-3 py-1.5 text-xs text-navy-soft">
        <span className="border-b-2 border-forest pb-0.5 font-semibold text-navy">Master inventory</span>
        <span>Reorder list</span>
        <span>Incoming — Milan flight 22 Jul</span>
        <span className="ml-auto tabular">{rows.filter((r) => r.stock <= 5).length} low-stock rows highlighted</span>
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
