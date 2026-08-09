import { useState, useEffect } from 'react'
import { UserIcon } from '../../components/ui/icons'
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-adm-sm border border-line bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <UserIcon size={18} />
            Registered customers
          </h2>
          <p className="mt-0.5 text-base text-navy-soft">Supabase customer profiles only. Wholesale pricing and broadcasts are not enabled in Step 1.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-adm-sm border border-line bg-white shadow-card overflow-x-auto">
        {loading && customers.length === 0 ? (
          <div className="p-8 text-center text-base text-navy-soft">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-base text-navy-soft">No registered customer profiles yet.</div>
        ) : (
          <table className="w-full text-left text-base">
            <thead className="bg-shell text-sm text-navy-soft border-b border-line">
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
                    <span className={'px-2.5 py-1 rounded text-sm font-semibold ' + (c.role === 'VIP' ? 'bg-amber-wash text-amber' : c.role === 'Admin' ? 'bg-navy/10 text-navy' : 'bg-line text-navy-soft')}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-navy-soft tabular">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-navy-faint">No customer action</span>
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
