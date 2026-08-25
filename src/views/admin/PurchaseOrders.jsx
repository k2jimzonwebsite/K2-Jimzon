import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import { AlertIcon, CheckIcon } from '../../components/ui/icons'
import { peso } from '../../data/products'
import { adminBffEnabled, getAdminProcurementBff } from '../../services/adminBffService'

export default function PurchaseOrders({ secureMode }) {
  const secure = secureMode ?? adminBffEnabled()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    if (secure) {
      const response = await getAdminProcurementBff(signal)
      if (response.aborted) return
      if (!response.ok) setError(response.error || 'Purchase orders could not be loaded.')
      else setOrders(response.procurement?.purchaseOrders || [])
      setLoading(false)
      return
    }
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    const { data, error: loadError } = await supabase.from('purchase_orders')
      .select('*, suppliers(name), po_lines(id,sku,quantity,unit_cost)')
      .order('created_at', { ascending: false })
    if (loadError) setError(safeUiError('PURCHASE_ORDER_LOAD_FAILED'))
    else { setOrders((data || []).map((order) => ({
      id: order.id, poNumber: order.po_number, supplierName: order.suppliers?.name,
      expectedDelivery: order.expected_delivery, lines: order.po_lines || [],
      totalAmount: order.total_amount, status: order.status,
    }))); setError('') }
    setLoading(false)
  }, [secure])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 border-b border-adm-line pb-4 sm:flex-row sm:items-end"><div><h2 className="font-sans text-xl text-white">Purchase orders</h2><p className="mt-1 text-sm text-white/50">Saved supplier commitments and expected quantities.</p></div><span className="text-xs text-white/40">PO creation and batch-aware receiving are not enabled in this screen yet.</span></div>
    {error && <div role="alert" className="flex items-start gap-2 rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm text-amber"><AlertIcon size={17} /><span>{error}</span></div>}
    {!secure && <div className="rounded-adm-sm border border-gold/35 bg-gold/10 p-3 text-sm text-gold">Transitional staff database path. The named server boundary remains inactive until coordinated cutover.</div>}
    <div className="overflow-x-auto rounded-adm-sm border border-adm-line bg-adm-sunken"><table className="w-full min-w-[780px] text-left text-sm text-white/65"><thead className="bg-white/5 text-xs uppercase tracking-wider text-white/45"><tr><th className="px-5 py-3">PO number</th><th className="px-5 py-3">Supplier</th><th className="px-5 py-3">Expected</th><th className="px-5 py-3">Lines</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Receiving</th></tr></thead><tbody className="divide-y divide-adm-line">{loading ? <tr><td colSpan="7" className="px-5 py-8 text-center text-white/45">Loading purchase orders…</td></tr> : orders.length === 0 ? <tr><td colSpan="7" className="px-5 py-8 text-center text-white/45">No purchase orders recorded.</td></tr> : orders.map(order => <tr key={order.id}><td className="px-5 py-4 font-mono text-white">{order.poNumber}</td><td className="px-5 py-4">{order.supplierName || 'Not recorded'}</td><td className="px-5 py-4">{order.expectedDelivery || 'Not recorded'}</td><td className="px-5 py-4">{order.lines?.length || 0}</td><td className="px-5 py-4 font-mono text-white">{peso(Number(order.totalAmount || 0))}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${order.status === 'Received' ? 'bg-forest/15 text-forest' : order.status === 'Cancelled' ? 'bg-crimson/15 text-crimson' : 'bg-blue/15 text-blue'}`}>{order.status}</span></td><td className="px-5 py-4 text-right">{order.status === 'Received' ? <span className="inline-flex items-center gap-1 text-xs text-forest"><CheckIcon size={14} /> Recorded received</span> : <span className="text-xs text-white/35">Use consignment receiving with lot and expiry</span>}</td></tr>)}</tbody></table></div>
  </div>
}
