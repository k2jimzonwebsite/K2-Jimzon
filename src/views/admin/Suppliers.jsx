import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CheckIcon } from '../../components/ui/icons'
import { peso } from '../../data/products'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('suppliers').select('*').order('name')
    
    if (error) {
      // If table doesn't exist yet, just mock it so UI doesn't crash before migration
      setSuppliers([
        { id: '1', name: 'Milano Distributors', contact_email: 'sales@milanodist.it', lead_time_days: 14, performance_score: 98, outstanding_balance: 15400 },
        { id: '2', name: 'Roma Coffee Roasters', contact_email: 'b2b@romacoffee.it', lead_time_days: 21, performance_score: 85, outstanding_balance: 0 },
      ])
    } else {
      setSuppliers(data || [])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-serif text-white">Our Suppliers</h2>
        <button className="rounded bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue/90 transition-colors">
          + Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="text-white/50">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-white/50">No suppliers found.</div>
        ) : (
          suppliers.map(sup => (
            <div key={sup.id} className="rounded-xl border border-white/10 bg-[#05080f] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/10 bg-white/5">
                <h3 className="font-semibold text-white text-lg">{sup.name}</h3>
                <p className="text-sm text-white/50">{sup.contact_email}</p>
              </div>
              
              <div className="p-5 grid grid-cols-2 gap-4 flex-1">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-white/40">Lead Time</p>
                  <p className="mt-1 text-lg font-bold text-white/90">{sup.lead_time_days} days</p>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-white/40">Perf Score</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-lg font-bold ${sup.performance_score >= 90 ? 'text-forest' : sup.performance_score >= 70 ? 'text-amber' : 'text-crimson'}`}>
                      {sup.performance_score}/100
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-mono uppercase tracking-widest text-white/40">Balance</p>
                  <p className="mt-1 text-lg font-bold text-amber">{peso}{Number(sup.outstanding_balance).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="p-3 border-t border-white/10 bg-white/5 grid grid-cols-2 gap-2">
                <button className="rounded border border-white/10 bg-transparent px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 transition-colors">Edit Profile</button>
                <button className="rounded border border-blue bg-blue/10 px-3 py-1.5 text-xs font-medium text-blue hover:bg-blue/20 transition-colors">Draft PO</button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
