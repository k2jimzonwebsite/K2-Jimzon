import { useState, useEffect } from 'react'
import { UserIcon, CheckIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return;
    fetchCustomers()

    const channel = supabase
      .channel('public:user_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, payload => {
        fetchCustomers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchCustomers = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCustomers(data)
    }
    setLoading(false)
  }

  const toggleRole = async (id, currentRole) => {
    if (!supabase) return;
    const nextRole = currentRole === 'VIP' ? 'Customer' : 'VIP'
    
    // Optimistic UI
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, role: nextRole } : c))

    const { error } = await supabase
      .from('user_profiles')
      .update({ role: nextRole })
      .eq('id', id)

    if (error) {
      console.error('Failed to update role:', error)
      fetchCustomers() // revert
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-line bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-navy flex items-center gap-2">
            <UserIcon size={18} />
            Customer CRM & VIP Access
          </h2>
          <p className="mt-0.5 text-sm text-navy-soft">Approve wholesale accounts to grant them access to VIP pricing on the storefront.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card overflow-x-auto">
        {loading && customers.length === 0 ? (
          <div className="p-8 text-center text-sm text-navy-soft">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-sm text-navy-soft">No customers registered yet. Send them your VIP login link!</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-shell text-xs text-navy-soft border-b border-line">
              <tr>
                <th className="px-6 py-3 font-medium">Customer Email</th>
                <th className="px-6 py-3 font-medium">Role Status</th>
                <th className="px-6 py-3 font-medium">Registered</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-shell/50 transition">
                  <td className="px-6 py-4 font-medium text-navy">{c.email || 'Anonymous'}</td>
                  <td className="px-6 py-4">
                    <span className={'px-2.5 py-1 rounded text-xs font-semibold ' + (c.role === 'VIP' ? 'bg-amber-wash text-amber' : c.role === 'Admin' ? 'bg-navy/10 text-navy' : 'bg-line text-navy-soft')}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-navy-soft tabular">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {c.role !== 'Admin' && (
                      <button
                        onClick={() => toggleRole(c.id, c.role)}
                        className="text-xs font-bold text-blue hover:underline"
                      >
                        {c.role === 'VIP' ? 'Revoke VIP' : 'Upgrade to VIP'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
