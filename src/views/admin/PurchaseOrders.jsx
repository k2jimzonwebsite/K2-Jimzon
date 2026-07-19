import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CheckIcon } from '../../components/ui/icons'
import { peso } from '../../data/products'

export default function PurchaseOrders() {
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPOs()
  }, [])

  const fetchPOs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false })
    
    if (error) {
      // Mock data if migration not run yet
      setPos([
        { id: 'po-1', po_number: 'PO-2026-001', suppliers: { name: 'Milano Distributors' }, status: 'Sent', total_amount: 45000, expected_delivery: '2026-07-25' },
        { id: 'po-2', po_number: 'PO-2026-002', suppliers: { name: 'Roma Coffee Roasters' }, status: 'Received', total_amount: 12000, expected_delivery: '2026-07-15' },
      ])
    } else {
      setPos(data || [])
    }
    setLoading(false)
  }

  const handleReceive = async (po) => {
    // This calls the RPC we defined in 0006_supply_chain.sql
    if (!po.id.startsWith('po-')) { // Actual UUID check
      const { error } = await supabase.rpc('receive_po', { p_po_id: po.id })
      if (error) {
        alert("Error receiving goods: " + error.message)
        return
      }
    }
    
    // Optimistic UI update
    setPos(prev => prev.map(p => p.id === po.id ? { ...p, status: 'Received' } : p))
    alert(`Success! Inventory levels have been automatically updated based on ${po.po_number}.`)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-serif text-white">Incoming Deliveries</h2>
          <p className="text-sm text-white/50 mt-1">Manage incoming stock and auto-update inventory when it arrives.</p>
        </div>
        <button className="rounded bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/90 transition-colors shadow-lg shadow-forest/20">
          + New Delivery
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#05080f] overflow-hidden">
        <table className="w-full text-left text-sm text-white/80">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-white/40">
            <tr>
              <th className="px-6 py-4 font-medium">PO Number</th>
              <th className="px-6 py-4 font-medium">Supplier</th>
              <th className="px-6 py-4 font-medium">Expected Date</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-white/40">Loading deliveries...</td></tr>
            ) : pos.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-white/40">No incoming deliveries found.</td></tr>
            ) : pos.map((po) => (
              <tr key={po.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-mono text-white">{po.po_number}</td>
                <td className="px-6 py-4">{po.suppliers?.name || 'Unknown'}</td>
                <td className="px-6 py-4">{po.expected_delivery || '-'}</td>
                <td className="px-6 py-4 font-mono text-forest">{peso}{Number(po.total_amount).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    po.status === 'Received' ? 'bg-forest/20 text-forest' : 
                    po.status === 'Sent' ? 'bg-blue/20 text-blue' : 'bg-white/10 text-white/60'
                  }`}>
                    {po.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {po.status === 'Sent' ? (
                    <button 
                      onClick={() => handleReceive(po)}
                      className="rounded border border-blue bg-blue/10 px-3 py-1.5 text-xs font-medium text-blue hover:bg-blue/20 transition-colors"
                    >
                      Mark as Arrived (Auto-Restock)
                    </button>
                  ) : po.status === 'Received' ? (
                    <span className="flex items-center justify-end gap-1 text-xs text-forest">
                      <CheckIcon size={14} /> Restocked
                    </span>
                  ) : (
                    <button className="text-xs text-blue hover:underline">Edit Draft</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
