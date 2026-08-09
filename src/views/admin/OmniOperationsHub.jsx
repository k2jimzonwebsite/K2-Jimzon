import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peso } from '../../data/products'
import { useStore } from '../../context/StoreContext'
import { channelMeta } from '../../lib/channelMeta'
import { BarcodeIcon, BoxIcon, CheckIcon, UserIcon } from '../../components/ui/icons'
import PackingSlipModal from './PackingSlipModal'
import {
  EmptyState,
  MetricRail,
  SectionHeading,
  StateBanner,
  StatusPill,
  WorkspaceIntro,
  primaryButton,
  secondaryButton,
} from './AdminWorkspaceUi'

const MODES = [
  { id: 'manila_warehouse', label: 'Pack and ship' },
  { id: 'box_handover', label: 'Box handover' },
  { id: 'inter_staff_transfer', label: 'Custody transfer' },
]

function orderTone(status = '') {
  const value = String(status).toLowerCase()
  if (value.includes('packed')) return 'success'
  if (value.includes('blocked') || value.includes('cancel')) return 'danger'
  return 'warning'
}

export default function OmniOperationsHub() {
  const { products, user } = useStore()
  const [activeRole, setActiveRole] = useState('manila_warehouse')
  const [activeStaff, setActiveStaff] = useState('')
  const [staffList, setStaffList] = useState([])
  const [cargoBoxes, setCargoBoxes] = useState([])
  const [orders, setOrders] = useState([])
  const [orderRequests, setOrderRequests] = useState([])
  const [scanBarcode, setScanBarcode] = useState('')
  const [scanMessage, setScanMessage] = useState(null)
  const [packedCount, setPackedCount] = useState(0)
  const [printSlipOrder, setPrintSlipOrder] = useState(null)
  const [loadingBoxes, setLoadingBoxes] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [transferSku, setTransferSku] = useState('')
  const [transferTo, setTransferTo] = useState('')

  const nameFor = sku => (products || []).find(product => product.sku === sku)?.name || sku

  useEffect(() => {
    if (!supabase) return
    supabase.from('user_profiles').select('email, role').in('role', ['Admin', 'Staff'])
      .then(({ data }) => {
        const names = (data || []).map(profile => (profile.email || '').split('@')[0]).filter(Boolean)
        if (names.length) setStaffList(names)
      })
  }, [])

  useEffect(() => {
    setActiveStaff(user?.email ? user.email.split('@')[0] : '')
  }, [user?.email])

  useEffect(() => {
    if (!supabase) { setLoadingBoxes(false); setLoadingOrders(false); return }
    fetchLiveOrders()
    fetchOrderRequests()
    fetchBoxes()
    const channel = supabase.channel('omni_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchLiveOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, fetchOrderRequests)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_batches' }, fetchBoxes)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchOrderRequests = async () => {
    const { data, error } = await supabase.from('order_requests')
      .select('id,public_reference,customer_name,customer_email,customer_phone,delivery_address,fulfillment_method,total_amount,created_at,order_request_items(sku,product_name,quantity,line_total)')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })
    if (!error) setOrderRequests(data || [])
  }

  const confirmOrderRequest = async request => {
    if (!supabase) return
    setScanMessage(null)
    const { error } = await supabase.rpc('confirm_order_request', {
      p_order_request_id: request.id,
      p_reason: 'Stock and contact details reviewed in fulfillment hub',
    })
    if (error) setScanMessage({ success: false, text: error.message })
    else {
      setScanMessage({ success: true, text: `${request.public_reference} confirmed. Inventory is now reserved and packing lines were created.` })
      await Promise.all([fetchOrderRequests(), fetchLiveOrders()])
    }
  }

  const fetchLiveOrders = async () => {
    setLoadingOrders(true)
    const { data } = await supabase.from('orders')
      .select('*, order_requests(public_reference,customer_phone,delivery_address,payment_status,total_amount)')
      .not('order_status', 'in', '("Shipped","Cancelled")')
      .order('created_at', { ascending: false })
    const formatted = (data || []).map(order => {
      const request = Array.isArray(order.order_requests) ? order.order_requests[0] : order.order_requests
      return {
        id: order.id,
        publicReference: request?.public_reference || null,
        shortId: String(order.id).slice(0, 8),
        channel: channelMeta(order.channel_source).label,
        channelColor: channelMeta(order.channel_source).color,
        customer: order.customer_name || 'Customer',
        customerEmail: order.customer_email || null,
        customerPhone: request?.customer_phone || null,
        deliveryAddress: request?.delivery_address || null,
        paymentStatus: request?.payment_status || order.payment_status || 'not recorded',
        total: request?.total_amount ?? order.total_amount ?? null,
        items: [{ sku: order.sku, title: nameFor(order.sku), qty: order.quantity || 1 }],
        status: order.order_status || 'Pending',
        courier: order.fulfillment_method || 'Not assigned',
      }
    })
    setOrders(formatted)
    setPackedCount(formatted.filter(order => String(order.status).includes('Packed')).length)
    setLoadingOrders(false)
  }

  const fetchBoxes = async () => {
    setLoadingBoxes(true)
    const { data } = await supabase.from('product_batches')
      .select('box_code, sku, quantity, custodian, hub').gt('quantity', 0)
    const map = {}
    for (const row of data || []) {
      const code = row.box_code || 'No box code'
      const box = map[code] || (map[code] = { box_code: code, assigned_staff: row.custodian || '', location: row.hub || '', items: [] })
      if (!box.assigned_staff && row.custodian) box.assigned_staff = row.custodian
      if (!box.location && row.hub) box.location = row.hub
      box.items.push({ sku: row.sku, title: nameFor(row.sku), qty: row.quantity })
    }
    setCargoBoxes(Object.values(map))
    setLoadingBoxes(false)
  }

  const handleReassignBoxStaff = async (boxCode, newStaff) => {
    if (!supabase || !boxCode || boxCode === 'No box code') return
    const { error } = await supabase.rpc('transfer_inventory_custody', {
      p_to_custodian: newStaff, p_box_code: boxCode, p_sku: null,
      p_reason: 'Box custody reassigned from fulfillment hub',
    })
    if (error) { setScanMessage({ success: false, text: error.message }); return }
    setCargoBoxes(previous => previous.map(box => box.box_code === boxCode ? { ...box, assigned_staff: newStaff } : box))
    setScanMessage({ success: true, text: `${boxCode} is now assigned to ${newStaff}.` })
  }

  const handleClaimBoxCustody = boxCode => handleReassignBoxStaff(boxCode, activeStaff)

  const handleTransfer = async event => {
    event.preventDefault()
    if (!transferSku || !transferTo || !supabase) return
    const { error } = await supabase.rpc('transfer_inventory_custody', {
      p_to_custodian: transferTo, p_box_code: null, p_sku: transferSku,
      p_reason: 'SKU custody transfer from fulfillment hub',
    })
    if (error) { setScanMessage({ success: false, text: error.message }); return }
    setScanMessage({ success: true, text: `Moved custody of ${nameFor(transferSku)} to ${transferTo}.` })
    setTransferSku(''); setTransferTo('')
    fetchBoxes()
  }

  const handleVerifyScan = async event => {
    event.preventDefault()
    if (!scanBarcode.trim()) return
    const match = scanBarcode.trim().toUpperCase()
    const found = orders.find(order => order.status === 'Pending' && order.items.some(item => item.sku.toUpperCase() === match || item.title.toUpperCase().includes(match)))
    if (!found) setScanMessage({ success: false, text: `Barcode [${match}] is not in the pending pick queue for ${activeStaff || 'this station'}.` })
    else if (!supabase) setScanMessage({ success: false, text: 'Database is not configured.' })
    else {
      const { error } = await supabase.rpc('mark_order_line_packed', { p_order_id: found.id })
      if (error) setScanMessage({ success: false, text: error.message })
      else {
        setOrders(current => current.map(order => order.id === found.id ? { ...order, status: 'Packed' } : order))
        setPackedCount(previous => previous + 1)
        setScanMessage({ success: true, text: `Barcode [${match}] verified and the order line was marked Packed. Inventory remains reserved until fulfillment.` })
      }
    }
    setScanBarcode('')
  }

  const staffBoxes = cargoBoxes.filter(box => box.assigned_staff === activeStaff)
  const unassignedBoxes = cargoBoxes.filter(box => !box.assigned_staff || box.box_code === 'No box code').length
  const boxUnits = useMemo(() => cargoBoxes.reduce((sum, box) => sum + box.items.reduce((boxSum, item) => boxSum + (Number(item.qty) || 0), 0), 0), [cargoBoxes])
  const pendingPickCount = orders.filter(order => !String(order.status).includes('Packed')).length

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-12 text-white">
      <WorkspaceIntro
        eyebrow="Fulfillment control"
        title="Order, packing, and custody desk"
        description="Confirm website requests before reserving stock, scan confirmed order lines, and keep every Italy box assigned to a real custodian. Payment evidence remains a separate verification state."
        status={activeStaff ? `Station: ${activeStaff}` : 'Staff identity unavailable'}
        statusTone={activeStaff ? 'success' : 'danger'}
      />

      <MetricRail columns="lg:grid-cols-5" items={[
        { label: 'Awaiting confirmation', value: loadingOrders ? '--' : orderRequests.length, detail: 'No stock reserved yet', tone: orderRequests.length ? 'text-amber' : 'text-white' },
        { label: 'Pending pick', value: loadingOrders ? '--' : pendingPickCount, detail: 'Confirmed, not packed', tone: pendingPickCount ? 'text-amber' : 'text-white' },
        { label: 'Packed lines', value: loadingOrders ? '--' : packedCount, detail: 'Awaiting next fulfillment step', tone: 'text-forest' },
        { label: 'Custody boxes', value: loadingBoxes ? '--' : cargoBoxes.length, detail: `${boxUnits} recorded units` },
        { label: 'Custody exceptions', value: loadingBoxes ? '--' : unassignedBoxes, detail: 'Unassigned or missing box code', tone: unassignedBoxes ? 'text-crimson' : 'text-white' },
      ]} />

      {scanMessage && <StateBanner tone={scanMessage.success ? 'success' : 'danger'}>{scanMessage.text}</StateBanner>}

      <nav className="flex max-w-full gap-1 overflow-x-auto rounded-adm-sm border border-adm-line bg-adm-surface p-1" aria-label="Fulfillment work modes">
        {MODES.map(mode => {
          const count = mode.id === 'manila_warehouse' ? orderRequests.length + orders.length : mode.id === 'box_handover' ? staffBoxes.length : null
          return <button key={mode.id} onClick={() => setActiveRole(mode.id)} aria-current={activeRole === mode.id ? 'page' : undefined} className={`min-h-11 shrink-0 rounded-adm-sm px-4 text-sm font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${activeRole === mode.id ? 'bg-blue text-white' : 'text-white/50 hover:bg-white/[0.05] hover:text-white'}`}>{mode.label}{count !== null ? ` (${count})` : ''}</button>
        })}
      </nav>

      {activeRole === 'manila_warehouse' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <SectionHeading title="Scan station" description={`Operator ${activeStaff || 'not identified'} / scan only items already present in the pending pick queue.`} action={<StatusPill tone="success">{packedCount} packed</StatusPill>} />
            <form onSubmit={handleVerifyScan} className="flex flex-col gap-2 rounded-adm border border-adm-line bg-adm-surface p-3 sm:flex-row">
              <label className="relative min-w-0 flex-1"><span className="sr-only">Barcode or SKU</span><BarcodeIcon size={17} className="pointer-events-none absolute left-3 top-3.5 text-white/35" /><input type="text" value={scanBarcode} onChange={event => setScanBarcode(event.target.value)} placeholder="Scan barcode or enter SKU" className="adm-input min-h-11 pl-10 font-mono text-base" /></label>
              <button type="submit" className={primaryButton}>Verify and mark packed</button>
            </form>
          </section>

          <section className="space-y-3">
            <SectionHeading title="Confirmation queue" description="Review customer contact, item quantities, and stock before creating reservations and packing lines." count={orderRequests.length} />
            {orderRequests.length === 0 ? <EmptyState title="No submitted website requests" description="New requests appear here without reserving stock." /> : (
              <div className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
                <div className="divide-y divide-adm-line">
                  {orderRequests.map(request => (
                    <article key={request.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.5fr)_130px_190px] lg:items-center">
                      <div><p className="font-mono text-xs font-semibold text-blue">{request.public_reference}</p><p className="mt-1 text-sm font-semibold text-white">{request.customer_name}</p><p className="mt-0.5 truncate text-xs text-white/40">{request.customer_email || request.customer_phone}</p></div>
                      <div><ul className="space-y-1">{(request.order_request_items || []).map(item => <li key={item.sku} className="flex justify-between gap-3 text-xs text-white/60"><span className="truncate">{item.product_name}</span><span className="shrink-0 font-mono">Qty {item.quantity}</span></li>)}</ul><p className="mt-2 line-clamp-1 text-[11px] text-white/35">{request.delivery_address} / {request.fulfillment_method}</p></div>
                      <div><p className="font-mono text-sm font-semibold text-white">{peso(request.total_amount)}</p><p className="mt-1 text-[11px] text-amber">Payment not assumed</p></div>
                      <button onClick={() => confirmOrderRequest(request)} className={`${primaryButton} w-full`}>Confirm and reserve</button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeading title="Packing queue" description="Confirmed order lines still inside the warehouse workflow." count={orders.length} />
            {loadingOrders ? <div className="h-44 animate-pulse rounded-adm border border-adm-line bg-adm-surface" role="status" /> : orders.length === 0 ? <EmptyState title="No orders to pack" description="Only confirmed orders from persisted sources appear here." /> : (
              <div className="overflow-x-auto rounded-adm border border-adm-line bg-adm-surface">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-adm-line bg-white/[0.025] text-[10px] font-semibold uppercase tracking-[0.09em] text-white/35"><tr><th className="px-4 py-3">Order and channel</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Pick line</th><th className="px-4 py-3">Payment evidence</th><th className="px-4 py-3">Packing state</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-adm-line">{orders.map(order => <tr key={order.id} className="transition-colors hover:bg-white/[0.025]"><td className="px-4 py-3"><span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: order.channelColor }}>{order.channel}</span><p className="mt-1 font-mono text-[11px] text-white/35">{order.publicReference || order.shortId}</p></td><td className="px-4 py-3"><p className="font-medium text-white">{order.customer}</p><p className="mt-0.5 text-xs text-white/35">{order.courier}</p></td><td className="px-4 py-3">{order.items.map(item => <p key={item.sku} className="text-xs text-white/65">{item.title} <span className="font-mono text-white">x{item.qty}</span></p>)}</td><td className="px-4 py-3"><StatusPill tone={order.paymentStatus === 'verified' ? 'success' : 'warning'}>{String(order.paymentStatus).replaceAll('_', ' ')}</StatusPill></td><td className="px-4 py-3"><StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill></td><td className="px-4 py-3 text-right"><button onClick={() => setPrintSlipOrder(order)} className={`${secondaryButton} adm-btn-sm`}>Packing record</button></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {activeRole === 'box_handover' && (
        <section className="space-y-3">
          <SectionHeading title="Italy box handover" description={`Assign every box to a custodian. Signed-in operator: ${activeStaff || 'unavailable'}.`} count={cargoBoxes.length} />
          {loadingBoxes ? <div className="h-52 animate-pulse rounded-adm border border-adm-line bg-adm-surface" role="status" /> : cargoBoxes.length === 0 ? <EmptyState icon={BoxIcon} title="No custody boxes recorded" description="Record received batches with a box code in Inventory before handover." /> : (
            <div className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
              <div className="divide-y divide-adm-line">{cargoBoxes.map(box => {
                const isAssignedToActive = box.assigned_staff === activeStaff
                const total = box.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
                return <article key={box.box_code} className={`grid gap-3 px-4 py-4 lg:grid-cols-[180px_minmax(260px,1.5fr)_220px_170px] lg:items-center ${isAssignedToActive ? 'bg-blue/[0.045]' : ''}`}><div><p className="font-mono text-xs font-semibold text-blue">{box.box_code}</p><p className="mt-1 text-xs text-white/40">{box.location || 'Location unassigned'} / {total} units</p></div><div className="flex flex-wrap gap-1.5">{box.items.map(item => <span key={`${box.box_code}-${item.sku}`} className="rounded-adm-sm border border-adm-line bg-white/[0.035] px-2 py-1 text-xs text-white/55">{item.title} <strong className="font-mono text-white">x{item.qty}</strong></span>)}</div><label className="text-xs font-semibold text-white/50">Custodian<select value={box.assigned_staff} onChange={event => handleReassignBoxStaff(box.box_code, event.target.value)} className="adm-input mt-1 min-h-11 text-base sm:text-sm"><option value="">Unassigned</option>{Array.from(new Set([box.assigned_staff, ...staffList])).filter(Boolean).map(name => <option key={name} value={name}>{name}</option>)}</select></label><div className="flex lg:justify-end">{isAssignedToActive ? <StatusPill tone="success"><CheckIcon size={13} className="mr-1" /> In my custody</StatusPill> : <button onClick={() => handleClaimBoxCustody(box.box_code)} disabled={!activeStaff || box.box_code === 'No box code'} className={secondaryButton}>Claim to me</button>}</div></article>
              })}</div>
            </div>
          )}
        </section>
      )}

      {activeRole === 'inter_staff_transfer' && (
        <section className="max-w-3xl space-y-3">
          <SectionHeading title="Transfer SKU custody" description="Move every recorded unit of one SKU to another authenticated staff custodian. The database records the action reason." />
          <form onSubmit={handleTransfer} className="space-y-4 rounded-adm border border-adm-line bg-adm-surface p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-white/60">Product<select value={transferSku} onChange={event => setTransferSku(event.target.value)} required className="adm-input mt-1.5 min-h-11 text-base sm:text-sm"><option value="">Select a product</option>{Array.from(new Set(cargoBoxes.flatMap(box => box.items.map(item => item.sku)))).map(sku => <option key={sku} value={sku}>{nameFor(sku)}</option>)}</select></label><label className="text-xs font-semibold text-white/60">Move to<select value={transferTo} onChange={event => setTransferTo(event.target.value)} required className="adm-input mt-1.5 min-h-11 text-base sm:text-sm"><option value="">Select staff</option>{staffList.map(name => <option key={name} value={name}>{name}</option>)}</select></label></div>
            <div className="flex flex-col gap-3 border-t border-adm-line pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-white/40"><UserIcon size={15} /> The signed-in operator remains the audit actor.</p><button type="submit" disabled={!transferSku || !transferTo} className={primaryButton}>Move custody</button></div>
          </form>
        </section>
      )}

      <PackingSlipModal isOpen={!!printSlipOrder} onClose={() => setPrintSlipOrder(null)} order={printSlipOrder} />
    </div>
  )
}
