import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peso } from '../../data/products'
import { useAdminStore as useStore } from '../../context/AdminStoreContext'
import { channelMeta } from '../../lib/channelMeta'
import { safeUiError } from '../../lib/safeUiError'
import { BarcodeIcon, BoxIcon, CheckIcon, UserIcon } from '../../components/ui/icons'
import PackingSlipModal from './PackingSlipModal'
import { AdminDialog } from '../../components/ui/AdminDialog'
import FulfillmentWorkflowDiagram from '../../components/admin/guides/FulfillmentWorkflowDiagram'
import CustodyWorkflowDiagram from '../../components/admin/guides/CustodyWorkflowDiagram'
import { useRetainedFulfillmentCommand } from './useRetainedFulfillmentCommand'
import {
  adminBffEnabled, assignBoxBff, confirmOrderBff, fulfillOrderBff, getAdminFulfillment,
  recordPackingScanBff, transferLotBff, updateDeliveryBff, updatePaymentBff,
  createRetainedOperationSession, commandOutcomeIsUncertain,
} from '../../services/adminBffService'
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
  const { user } = useStore()
  return <OmniOperationsWorkspace key={user?.id || 'signed-out'} />
}

function OmniOperationsWorkspace() {
  const { products, user } = useStore()
  const secureAdmin = adminBffEnabled()
  const paymentCommands = useRef(null)
  const packingCommands = useRef(null)
  const [packingReservation, setPackingReservation] = useState('')
  const [packingLotConfirmed, setPackingLotConfirmed] = useState(false)
  const [packingBusy, setPackingBusy] = useState(false)
  const [packingUncertain, setPackingUncertain] = useState(false)
  const packingPending = useRef(null)
  const [paymentUncertain, setPaymentUncertain] = useState(false)
  useEffect(() => {
    const session = createRetainedOperationSession(updatePaymentBff)
    paymentCommands.current = session
    const scans = createRetainedOperationSession(recordPackingScanBff)
    packingCommands.current = scans
    return () => { session.dispose(); scans.dispose() }
  }, [])
  useEffect(() => {
    if (!paymentUncertain && !packingUncertain) return undefined
    const guard = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [paymentUncertain, packingUncertain])
  const [activeRole, setActiveRole] = useState('manila_warehouse')
  const [activeStaff, setActiveStaff] = useState('')
  const [staffList, setStaffList] = useState([])
  const [cargoBoxes, setCargoBoxes] = useState([])
  const [orders, setOrders] = useState([])
  const [orderRequests, setOrderRequests] = useState([])
  const [scanBarcode, setScanBarcode] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [scanMessage, setScanMessage] = useState(null)
  const [packedCount, setPackedCount] = useState(0)
  const [printSlipOrder, setPrintSlipOrder] = useState(null)
  const [deliveryOrder, setDeliveryOrder] = useState(null)
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [handoverOrder, setHandoverOrder] = useState(null)
  const [actionReview, setActionReview] = useState(null)
  const [loadingBoxes, setLoadingBoxes] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [transferBatchId, setTransferBatchId] = useState('')
  const [transferQuantity, setTransferQuantity] = useState('1')
  const [transferTo, setTransferTo] = useState('')
  const [showFulfillmentGuide, setShowFulfillmentGuide] = useState(false)

  const nameFor = sku => (products || []).find(product => product.sku === sku)?.name || sku

  useEffect(() => {
    if (secureAdmin) return
    if (!supabase) return
    supabase.from('user_profiles').select('email, role').in('role', ['Admin', 'Staff', 'SuperAdmin'])
      .then(({ data }) => {
        const names = (data || []).map(profile => (profile.email || '').split('@')[0]).filter(Boolean)
        if (names.length) setStaffList(names)
      })
  }, [secureAdmin])

  useEffect(() => {
    setActiveStaff(user?.email ? user.email.split('@')[0] : '')
  }, [user?.email])

  useEffect(() => {
    if (secureAdmin) {
      fetchSecureSnapshot()
      const timer = window.setInterval(fetchSecureSnapshot, 30_000)
      return () => window.clearInterval(timer)
    }
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
  }, [secureAdmin])

  const fetchSecureSnapshot = async () => {
    setLoadingBoxes(true); setLoadingOrders(true)
    const response = await getAdminFulfillment()
    if (!response.ok) {
      setScanMessage({ success: false, text: response.error })
      setLoadingBoxes(false); setLoadingOrders(false)
      return
    }
    const data = response.data || {}
    setStaffList((data.staff || []).map(profile => profile.displayName).filter(Boolean))
    setOrderRequests(data.submitted || [])
    const formatted = (data.confirmed || []).map(order => {
      const reservations = order.inventory_reservations || []
      const items = (order.order_request_items || []).map(item => ({
        id: item.id, sku: item.sku, title: item.product_name || nameFor(item.sku), qty: item.quantity,
        packed: reservations.filter(row => row.order_request_item_id === item.id && row.status === 'active').reduce((sum, row) => sum + Number(row.packed_quantity || 0), 0),
      }))
      const complete = items.length > 0 && items.every(item => item.packed >= item.qty)
      return {
        id: order.id, publicReference: order.public_reference, shortId: String(order.id).slice(0, 8),
        channel: channelMeta(order.channel_source).label, channelColor: channelMeta(order.channel_source).color,
        customer: order.customer_name || 'Customer', customerEmail: order.customer_email || null,
        customerPhone: order.customer_phone || null, deliveryAddress: order.delivery_address || null,
        paymentStatus: order.payment_status || 'not recorded', updatedAt: order.updated_at, total: order.total_amount ?? null, items,
        allocations: reservations.filter(row => row.status === 'active').map(row => ({ ...row, lot: (data.lots || []).find(lot => lot.id === row.batch_id) })),
        status: complete ? 'Packed' : 'Picking', courier: order.courier_name || order.fulfillment_method || 'Not assigned',
        courierName: order.courier_name || '', shippingAmount: order.shipping_amount || 0,
        trackingNumber: order.tracking_number || '', waybillUrl: order.waybill_url || '',
        deliveryStatus: order.delivery_status, shippingQuoteStatus: order.shipping_quote_status,
      }
    })
    setOrders(formatted)
    setSelectedOrderId(current => formatted.some(order => order.id === current) ? current : (formatted[0]?.id || ''))
    setPackedCount(formatted.reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.packed, 0), 0))
    const boxes = {}
    for (const row of data.lots || []) {
      const code = row.box_code || 'No box code'
      const box = boxes[code] || (boxes[code] = { box_code: code, assigned_staff: row.custodian || '', location: row.hub || '', items: [] })
      if (!box.assigned_staff && row.custodian) box.assigned_staff = row.custodian
      if (!box.location && row.hub) box.location = row.hub
      box.items.push({ ...row, title: nameFor(row.sku), qty: row.quantity })
    }
    setCargoBoxes(Object.values(boxes))
    setLoadingBoxes(false); setLoadingOrders(false)
  }

  const fetchOrderRequests = async () => {
    const { data, error } = await supabase.from('order_requests')
      .select('id,public_reference,channel_source,customer_name,customer_email,customer_phone,delivery_address,fulfillment_method,subtotal,discount_amount,shipping_amount,shipping_quote_status,courier_name,tracking_number,waybill_url,total_amount,payment_status,created_at,order_request_items(sku,product_name,quantity,line_total)')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })
    if (error) setScanMessage({ success: false, text: safeUiError('FULFILLMENT_ACTION_FAILED') })
    else setOrderRequests(data || [])
  }

  const confirmOrderRequest = async request => {
    if (!secureAdmin && !supabase) return
    setScanMessage(null)
    if (secureAdmin) {
      setActionReview({ kind: 'confirm', title: 'Confirm this order', reference: request.public_reference,
        details: `${request.customer_name} · ${(request.order_request_items || []).map(item => `${item.quantity} × ${item.product_name || item.sku}`).join(', ')}`,
        impact: 'Confirm the reviewed customer request and create its packing lines. The server checks stock and reservation coverage.',
        payload: { orderRequestId: request.id, reason: 'Stock and contact details reviewed in fulfillment hub' } })
      return
    }
    const { error } = await supabase.rpc('confirm_order_request', {
      p_order_request_id: request.id,
      p_reason: 'Stock and contact details reviewed in fulfillment hub',
    })
    if (error) setScanMessage({ success: false, text: safeUiError('FULFILLMENT_ACTION_FAILED') })
    else {
      setScanMessage({ success: true, text: `${request.public_reference} confirmed. Inventory is now reserved and packing lines were created.` })
      await Promise.all([fetchOrderRequests(), fetchLiveOrders()])
    }
  }

  const fetchLiveOrders = async () => {
    setLoadingOrders(true)
    const { data, error } = await supabase.from('order_requests')
      .select('id,public_reference,channel_source,customer_name,customer_email,customer_phone,delivery_address,fulfillment_method,payment_status,subtotal,discount_amount,shipping_amount,total_amount,delivery_status,shipping_quote_status,courier_name,tracking_number,waybill_url,created_at,order_request_items(id,sku,product_name,quantity,line_total),inventory_reservations(order_request_item_id,sku,quantity,packed_quantity,status,batch_id)')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
    if (error) {
      setScanMessage({ success: false, text: safeUiError('FULFILLMENT_ACTION_FAILED') })
      setOrders([])
      setLoadingOrders(false)
      return
    }
    const formatted = (data || []).map(order => {
      const reservations = order.inventory_reservations || []
      const items = (order.order_request_items || []).map(item => ({
        id: item.id,
        sku: item.sku,
        title: item.product_name || nameFor(item.sku),
        qty: item.quantity,
        packed: reservations.filter(row => row.order_request_item_id === item.id && row.status === 'active').reduce((sum, row) => sum + Number(row.packed_quantity || 0), 0),
      }))
      const complete = items.length > 0 && items.every(item => item.packed >= item.qty)
      return {
        id: order.id,
        publicReference: order.public_reference,
        shortId: String(order.id).slice(0, 8),
        channel: channelMeta(order.channel_source).label,
        channelColor: channelMeta(order.channel_source).color,
        customer: order.customer_name || 'Customer',
        customerEmail: order.customer_email || null,
        customerPhone: order.customer_phone || null,
        deliveryAddress: order.delivery_address || null,
        paymentStatus: order.payment_status || 'not recorded',
        total: order.total_amount ?? null,
        items,
        status: complete ? 'Packed' : 'Picking',
        courier: order.courier_name || order.fulfillment_method || 'Not assigned',
        courierName: order.courier_name || '',
        shippingAmount: order.shipping_amount || 0,
        trackingNumber: order.tracking_number || '',
        waybillUrl: order.waybill_url || '',
        deliveryStatus: order.delivery_status,
        shippingQuoteStatus: order.shipping_quote_status,
      }
    })
    setOrders(formatted)
    if (formatted.length && !formatted.some(order => order.id === selectedOrderId)) setSelectedOrderId(formatted[0].id)
    if (!formatted.length) setSelectedOrderId('')
    setPackedCount(formatted.reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.packed, 0), 0))
    setLoadingOrders(false)
  }

  const fetchBoxes = async () => {
    setLoadingBoxes(true)
    const { data, error } = await supabase.from('product_batches')
      .select('id,box_code,batch_code,sku,quantity,reserved_quantity,custodian,hub,inventory_status,expiry_date').gt('quantity', 0)
    if (error) {
      setScanMessage({ success: false, text: safeUiError('INVENTORY_LOAD_FAILED') })
      setCargoBoxes([])
      setLoadingBoxes(false)
      return
    }
    const map = {}
    for (const row of data || []) {
      const code = row.box_code || 'No box code'
      const box = map[code] || (map[code] = { box_code: code, assigned_staff: row.custodian || '', location: row.hub || '', items: [] })
      if (!box.assigned_staff && row.custodian) box.assigned_staff = row.custodian
      if (!box.location && row.hub) box.location = row.hub
      box.items.push({ ...row, title: nameFor(row.sku), qty: row.quantity })
    }
    setCargoBoxes(Object.values(map))
    setLoadingBoxes(false)
  }

  const handleReassignBoxStaff = async (boxCode, newStaff) => {
    if ((!secureAdmin && !supabase) || !boxCode || boxCode === 'No box code') return
    if (secureAdmin) {
      setActionReview({ kind: 'assign', title: 'Assign box custody', reference: boxCode,
        details: `New custodian: ${newStaff || 'Unassigned'}`,
        impact: 'Move custody of the recorded box lots to this staff member. The signed-in operator remains the audit actor.',
        payload: { boxCode, toCustodian: newStaff, reason: 'Box custody reassigned from fulfillment hub' } })
      return
    }
    const { error } = await supabase.rpc('transfer_inventory_custody', {
      p_to_custodian: newStaff, p_box_code: boxCode, p_sku: null,
      p_reason: 'Box custody reassigned from fulfillment hub',
    })
    if (error) { setScanMessage({ success: false, text: safeUiError('FULFILLMENT_ACTION_FAILED') }); return }
    setCargoBoxes(previous => previous.map(box => box.box_code === boxCode ? { ...box, assigned_staff: newStaff } : box))
    setScanMessage({ success: true, text: `${boxCode} is now assigned to ${newStaff}.` })
  }

  const handleClaimBoxCustody = boxCode => handleReassignBoxStaff(boxCode, activeStaff)

  const handleTransfer = async event => {
    event.preventDefault()
    if (!transferBatchId || !transferTo || (!secureAdmin && !supabase)) return
    if (secureAdmin) {
      const lot = cargoBoxes.flatMap(box => box.items).find(item => item.id === transferBatchId)
      setActionReview({ kind: 'transfer', title: 'Transfer exact lot custody',
        reference: `${lot?.box_code || 'No box'} · ${lot?.batch_code || transferBatchId}`,
        details: `${transferQuantity} × ${lot?.sku || 'Selected lot'} to ${transferTo}`,
        impact: 'Move only this quantity from this lot. Reserved units cannot move; partial transfers preserve lot history.',
        payload: { batchId: transferBatchId, quantity: Number(transferQuantity), toCustodian: transferTo,
          toLocation: '', reason: 'Exact lot custody transfer from fulfillment hub' } })
      return
    }
    const { error } = await supabase.rpc('transfer_inventory_custody_exact', {
      p_batch_id: transferBatchId,
      p_quantity: Number(transferQuantity),
      p_to_custodian: transferTo,
      p_to_location: null,
      p_reason: 'Exact lot custody transfer from fulfillment hub',
    })
    if (error) { setScanMessage({ success: false, text: safeUiError('FULFILLMENT_ACTION_FAILED') }); return }
    setScanMessage({ success: true, text: `Moved ${transferQuantity} unit(s) to ${transferTo} with lot history preserved.` })
    setTransferBatchId(''); setTransferQuantity('1'); setTransferTo('')
    fetchBoxes()
  }

  const handleVerifyScan = async event => {
    event.preventDefault()
    if (packingBusy) return
    if (!scanBarcode.trim()) return
    const match = scanBarcode.trim()
    const found = orders.find(order => order.id === selectedOrderId)
    if (!found) setScanMessage({ success: false, text: 'Choose the exact order before scanning.' })
    else if (!secureAdmin && !supabase) setScanMessage({ success: false, text: 'Database is not configured.' })
    else if (secureAdmin) {
      const allocation = found.allocations?.find(row => row.id === packingReservation && row.packed_quantity < row.quantity)
      const lotIdentified = allocation?.lot?.batch_code && allocation?.lot?.expiry_date && allocation?.lot?.hub && allocation?.lot?.custodian
      if (!packingPending.current && (!lotIdentified || !packingLotConfirmed)) {
        setScanMessage({ success: false, text: 'Choose the exact allocation and confirm its physical lot before scanning.' }); return
      }
      const payload = packingPending.current || { orderRequestId: found.id, scannedCode: match, reservationId: packingReservation, lotConfirmed: true }
      packingPending.current = payload
      setPackingBusy(true)
      const result = await packingCommands.current.run(payload)
      setPackingBusy(false)
      if (!result.ok) {
        const uncertain = commandOutcomeIsUncertain(result) || result.code === 'FULFILLMENT_COMMAND_UNAVAILABLE'
        setPackingUncertain(uncertain)
        if (!uncertain) packingPending.current = null
        setScanMessage({ success: false, text: uncertain ? 'This scan did not confirm and may already be recorded. Retry the same scan to reconcile its receipt before scanning another unit.' : result.error })
        return
      }
      else {
        packingPending.current = null; setPackingUncertain(false); setPackingLotConfirmed(false)
        const saved = result.result || {}
        setScanMessage({ success: true, text: `${saved.product_name || match}: ${saved.packed_quantity || 0} of ${saved.required_quantity || 0} packed for ${saved.order_reference || found.publicReference}.` })
        await fetchSecureSnapshot()
      }
    }
    else {
      const { data, error } = await supabase.rpc('record_packing_scan', { p_order_request_id: found.id, p_scanned_code: match })
      if (error) setScanMessage({ success: false, text: safeUiError('INVENTORY_SCAN_FAILED') })
      else {
        const saved = Array.isArray(data) ? data[0] : data
        setScanMessage({ success: true, text: `${saved?.product_name || match}: ${saved?.packed_quantity || 0} of ${saved?.required_quantity || 0} packed for ${saved?.order_reference || found.publicReference}.` })
        await fetchLiveOrders()
      }
    }
    setScanBarcode('')
  }

  const updatePayment = async (order, target, note) => {
    if (secureAdmin) {
      const result = await paymentCommands.current.run({
        orderRequestId: order.id, toStatus: target, evidenceNote: note || '',
        expectedPaymentStatus: order.paymentStatus || order.payment_status,
        expectedUpdatedAt: order.updatedAt || order.updated_at,
      })
      const uncertain = commandOutcomeIsUncertain(result) || result.code === 'FULFILLMENT_COMMAND_UNAVAILABLE'
      if (uncertain) {
        setPaymentUncertain(true)
        await fetchSecureSnapshot()
        return { ...result, uncertain: true, error: 'The payment command did not confirm and may already be saved. Review the refreshed order before retrying; keep the same evidence for a retry.' }
      }
      if (!result.ok) return result
      setPaymentUncertain(false)
      await fetchSecureSnapshot()
      return result
    }
    const { error } = await supabase.rpc('set_order_request_payment_status', {
      p_order_request_id: order.id,
      p_to_status: target,
      p_evidence_note: note || null,
    })
    if (error) throw error
    await fetchLiveOrders()
    return { ok: true }
  }

  const fulfillOrder = async (order, handoverNote, key) => {
    if (!order || !handoverNote?.trim()) return { ok: false, error: 'Enter the courier handover reference.' }
    if (secureAdmin) {
      const result = await fulfillOrderBff(order.id, handoverNote.trim(), key)
      if (!result.ok) return result
      setScanMessage({ success: true, text: `${order.publicReference} was handed to the courier with exact lot deductions recorded.` })
      await fetchSecureSnapshot()
      return result
    }
    const { error } = await supabase.rpc('fulfill_order_request', {
      p_order_request_id: order.id,
      p_handover_note: handoverNote.trim(),
    })
    if (error) return { ok: false, error: safeUiError('FULFILLMENT_ACTION_FAILED') }
    setScanMessage({ success: true, text: `${order.publicReference} was handed to the courier with exact lot deductions recorded.` })
    await fetchLiveOrders()
    return { ok: true }
  }

  const staffBoxes = cargoBoxes.filter(box => box.assigned_staff === activeStaff)
  const unassignedBoxes = cargoBoxes.filter(box => !box.assigned_staff || box.box_code === 'No box code').length
  const boxUnits = useMemo(() => cargoBoxes.reduce((sum, box) => sum + box.items.reduce((boxSum, item) => boxSum + (Number(item.qty) || 0), 0), 0), [cargoBoxes])
  const pendingPickCount = orders.reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + Math.max(item.qty - item.packed, 0), 0), 0)
  const custodyLots = cargoBoxes.flatMap(box => box.items)
  const selectedPackingOrder = orders.find(order => order.id === selectedOrderId) || null

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-12 text-white">
      <div className="flex items-center justify-between">
        <WorkspaceIntro
          eyebrow="Fulfillment control"
          title="Order, packing, and custody desk"
          description="Confirm website requests before reserving stock, scan confirmed order lines, and keep every Italy box assigned to a real custodian. Payment evidence remains a separate verification state."
          status={activeStaff ? `Station: ${activeStaff}` : 'Staff identity unavailable'}
          statusTone={activeStaff ? 'success' : 'danger'}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowFulfillmentGuide((v) => !v)}
          className="flex items-center gap-1.5 rounded-adm-sm border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-400 hover:bg-purple-500/20"
        >
          <span>{showFulfillmentGuide ? 'Hide Fulfillment Map ▴' : '🗺️ View Packing & Custody Workflow Map ▸'}</span>
        </button>
      </div>

      {showFulfillmentGuide && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <FulfillmentWorkflowDiagram />
          {activeRole === 'inter_staff_transfer' && <CustodyWorkflowDiagram />}
        </div>
      )}

      <MetricRail columns="lg:grid-cols-5" items={[
        { label: 'Awaiting confirmation', value: loadingOrders ? '--' : orderRequests.length, detail: 'No stock reserved yet', tone: orderRequests.length ? 'text-amber' : 'text-white' },
        { label: 'Pending pick', value: loadingOrders ? '--' : pendingPickCount, detail: 'Confirmed, not packed', tone: pendingPickCount ? 'text-amber' : 'text-white' },
        { label: 'Packed units', value: loadingOrders ? '--' : packedCount, detail: 'Each unit has a scan event', tone: 'text-forest' },
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
              <label className="min-w-0 sm:w-72"><span className="sr-only">Selected order</span><select disabled={packingBusy || Boolean(packingPending.current)} value={selectedOrderId} onChange={event => { setSelectedOrderId(event.target.value); setPackingReservation(''); setPackingLotConfirmed(false) }} required className="adm-input min-h-11 w-full text-base sm:text-sm"><option value="">Choose exact order</option>{orders.filter(order => order.status !== 'Packed').map(order => <option key={order.id} value={order.id}>{order.publicReference} · {order.customer}</option>)}</select></label>
              <label className="relative min-w-0 flex-1"><span className="sr-only">Barcode or SKU</span><BarcodeIcon size={17} className="pointer-events-none absolute left-3 top-3.5 text-white/35" /><input type="text" disabled={packingBusy || Boolean(packingPending.current)} value={scanBarcode} onChange={event => setScanBarcode(event.target.value)} placeholder="Scan barcode or enter SKU" className="adm-input min-h-11 pl-10 font-mono text-base" /></label>
              <button type="submit" disabled={packingBusy || !selectedOrderId || !scanBarcode.trim() || (secureAdmin && !packingPending.current && !packingLotConfirmed)} className={primaryButton}>{packingBusy ? 'Recording…' : packingPending.current ? 'Retry same scan' : 'Record one unit'}</button>
            </form>
            {secureAdmin && <PackingLotProof allocations={selectedPackingOrder?.allocations || []} value={packingReservation} confirmed={packingLotConfirmed}
              disabled={packingBusy || Boolean(packingPending.current)} onSelect={value => { setPackingReservation(value); setPackingLotConfirmed(false) }} onConfirm={setPackingLotConfirmed} />}
            {selectedPackingOrder && <div className="flex flex-col gap-3 rounded-adm-sm border border-blue/25 bg-blue/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-xs font-bold text-blue">{selectedPackingOrder.publicReference}</p><p className="mt-1 text-xs text-white/50">Delivery: {String(selectedPackingOrder.shippingQuoteStatus).replaceAll('_', ' ')} · Payment: {String(selectedPackingOrder.paymentStatus).replaceAll('_', ' ')}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setDeliveryOrder(selectedPackingOrder)} className={`${secondaryButton} adm-btn-sm`}>Delivery & waybill</button><button type="button" onClick={() => setPaymentOrder(selectedPackingOrder)} className={`${secondaryButton} adm-btn-sm`}>Payment evidence</button><button type="button" onClick={() => setHandoverOrder(selectedPackingOrder)} disabled={selectedPackingOrder.status !== 'Packed' || selectedPackingOrder.paymentStatus !== 'verified' || !['platform_charged', 'customer_confirmed', 'waived'].includes(selectedPackingOrder.shippingQuoteStatus)} className={`${primaryButton} adm-btn-sm disabled:opacity-35`}>Handover to courier</button></div></div>}
          </section>

          <section className="space-y-3">
            <SectionHeading title="Confirmation queue" description="Review customer contact, item quantities, and stock before creating reservations and packing lines." count={orderRequests.length} />
            {orderRequests.length === 0 ? <EmptyState title="No submitted website requests" description="New requests appear here without reserving stock." /> : (
              <div className="overflow-hidden rounded-adm border border-adm-line bg-adm-surface">
                <div className="divide-y divide-adm-line">
                  {orderRequests.map(request => (
                    <article key={request.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.5fr)_130px_190px] lg:items-center">
                      <div><p className="font-mono text-xs font-semibold text-blue">{request.public_reference}</p><p className="mt-1 text-sm font-semibold text-white">{request.customer_name}</p><p className="mt-0.5 truncate text-xs text-white/40">{request.customer_email || request.customer_phone}</p></div>
                      <div><ul className="space-y-1">{(request.order_request_items || []).map(item => <li key={item.sku} className="flex justify-between gap-3 text-xs text-white/60"><span className="truncate">{item.product_name}</span><span className="shrink-0 font-mono">Qty {item.quantity}</span></li>)}</ul><p className="mt-2 line-clamp-1 text-xs text-white/35">{request.delivery_address} / {request.fulfillment_method}</p></div>
                      <div><p className="font-mono text-sm font-semibold text-white">{peso(request.total_amount)}</p><p className="mt-1 text-xs text-amber">Payment not assumed</p></div>
                      <div className="grid gap-2"><button onClick={() => setDeliveryOrder(request)} className={`${secondaryButton} w-full`}>{request.shipping_quote_status === 'customer_confirmed' ? 'Delivery confirmed' : 'Set delivery quote'}</button><button onClick={() => confirmOrderRequest(request)} className={`${primaryButton} w-full`}>Confirm and reserve</button></div>
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
                  <thead className="border-b border-adm-line bg-white/[0.025] text-xs font-semibold uppercase tracking-[0.09em] text-white/35"><tr><th className="px-4 py-3">Order and channel</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Pick line</th><th className="px-4 py-3">Payment evidence</th><th className="px-4 py-3">Packing state</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-adm-line">{orders.map(order => <tr key={order.id} className={`transition-colors hover:bg-white/[0.025] ${selectedOrderId === order.id ? 'bg-blue/[0.05]' : ''}`}><td className="px-4 py-3"><span className="rounded px-1.5 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: order.channelColor }}>{order.channel}</span><p className="mt-1 font-mono text-xs text-white/35">{order.publicReference || order.shortId}</p></td><td className="px-4 py-3"><p className="font-medium text-white">{order.customer}</p><p className="mt-0.5 text-xs text-white/35">{order.courier}</p></td><td className="px-4 py-3">{order.items.map(item => <p key={item.sku} className="text-xs text-white/65">{item.title} <span className="font-mono text-white">{item.packed}/{item.qty}</span></p>)}</td><td className="px-4 py-3"><StatusPill tone={order.paymentStatus === 'verified' ? 'success' : 'warning'}>{String(order.paymentStatus).replaceAll('_', ' ')}</StatusPill></td><td className="px-4 py-3"><StatusPill tone={orderTone(order.status)}>{order.status}</StatusPill></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelectedOrderId(order.id)} disabled={order.status === 'Packed'} className={`${secondaryButton} adm-btn-sm`}>Select</button><button onClick={() => setPrintSlipOrder(order)} className={`${secondaryButton} adm-btn-sm`}>Packing record</button></div></td></tr>)}</tbody>
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
          <SectionHeading title="Transfer exact lot custody" description="Choose the physical lot and quantity. Reserved units cannot be moved, and partial transfers preserve the parent lot history." />
          <form onSubmit={handleTransfer} className="space-y-4 rounded-adm border border-adm-line bg-adm-surface p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-3"><label className="text-xs font-semibold text-white/60">Physical lot<select value={transferBatchId} onChange={event => setTransferBatchId(event.target.value)} required className="adm-input mt-1.5 min-h-11 text-base sm:text-sm"><option value="">Select box and lot</option>{custodyLots.map(item => <option key={item.id} value={item.id}>{item.box_code || 'No box'} · {item.batch_code || 'No lot'} · {nameFor(item.sku)} · {Math.max(Number(item.quantity || 0) - Number(item.reserved_quantity || 0), 0)} movable</option>)}</select></label><label className="text-xs font-semibold text-white/60">Quantity<input type="number" min="1" value={transferQuantity} onChange={event => setTransferQuantity(event.target.value)} required className="adm-input mt-1.5 min-h-11 text-base sm:text-sm" /></label><label className="text-xs font-semibold text-white/60">Move to<select value={transferTo} onChange={event => setTransferTo(event.target.value)} required className="adm-input mt-1.5 min-h-11 text-base sm:text-sm"><option value="">Select staff</option>{staffList.map(name => <option key={name} value={name}>{name}</option>)}</select></label></div>
            <div className="flex flex-col gap-3 border-t border-adm-line pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-white/40"><UserIcon size={15} /> The signed-in operator remains the audit actor.</p><button type="submit" disabled={!transferBatchId || !transferTo || Number(transferQuantity) < 1} className={primaryButton}>Move exact quantity</button></div>
          </form>
        </section>
      )}

      {deliveryOrder && <DeliveryDetailsModal retrySafe={secureAdmin} key={deliveryOrder.id} order={deliveryOrder} onClose={() => setDeliveryOrder(null)} onSave={async (payload, key) => {
        if (secureAdmin) {
          const result = await updateDeliveryBff(payload, key)
          if (!result.ok) return result
          await fetchSecureSnapshot()
        } else {
          const { error } = await supabase.rpc('set_order_delivery_details', {
            p_order_request_id: payload.orderRequestId, p_shipping_amount: payload.shippingAmount,
            p_courier_name: payload.courierName, p_tracking_number: payload.trackingNumber || null,
            p_waybill_url: payload.waybillUrl || null, p_customer_confirmed: payload.customerConfirmed,
            p_note: payload.note,
          })
          if (error) throw error
          await Promise.all([fetchOrderRequests(), fetchLiveOrders()])
        }
        return { ok: true }
      }} />}
      {paymentOrder && <PaymentStatusModal key={paymentOrder.id} secure={secureAdmin} order={paymentOrder} onClose={() => setPaymentOrder(null)} onSave={async (target, note) => {
        const result = await updatePayment(paymentOrder, target, note)
        if (result?.ok) setPaymentOrder(null)
        return result
      }} />}
      {handoverOrder && <HandoverDialog retrySafe={secureAdmin} key={handoverOrder.id} order={handoverOrder} onClose={() => setHandoverOrder(null)} onSave={(note, key) => fulfillOrder(handoverOrder, note, key)} />}
      {actionReview && <FulfillmentActionDialog action={actionReview} onClose={() => setActionReview(null)} onSave={async (payload, key) => {
        const result = actionReview.kind === 'confirm'
          ? await confirmOrderBff(payload.orderRequestId, payload.reason, key)
          : actionReview.kind === 'assign'
            ? await assignBoxBff(payload.boxCode, payload.toCustodian, payload.reason, key)
            : await transferLotBff(payload, key)
        if (result.ok) {
          setScanMessage({ success: true, text: `${actionReview.reference}: ${actionReview.title.toLowerCase()} recorded.` })
          if (actionReview.kind === 'transfer') { setTransferBatchId(''); setTransferQuantity('1'); setTransferTo('') }
          await fetchSecureSnapshot()
        }
        return result
      }} />}
      <PackingSlipModal isOpen={!!printSlipOrder} onClose={() => setPrintSlipOrder(null)} order={printSlipOrder} />
    </div>
  )
}

export function FulfillmentActionDialog({ action, onClose, onSave }) {
  const { run, busy, uncertain, locked, error } = useRetainedFulfillmentCommand(onSave)
  const save = async event => {
    event.preventDefault()
    const result = await run(action.payload)
    if (result?.ok) onClose()
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
    <AdminDialog onClose={onClose} closeDisabled={locked} labelledBy="fulfillment-action-title" describedBy="fulfillment-action-impact">
      <form onSubmit={save} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-5 text-white">
        <h2 id="fulfillment-action-title" className="text-xl font-semibold">{action.title}</h2>
        <p className="break-words font-mono text-sm text-blue">{action.reference}</p>
        <p className="break-words text-sm text-white/80">{action.details}</p>
        <p id="fulfillment-action-impact" className="text-sm text-white/70">{action.impact}</p>
        {error && <StateBanner tone={uncertain ? 'warning' : 'danger'}>{error}</StateBanner>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" disabled={locked} onClick={onClose} className={`${secondaryButton} flex-1`}>Cancel</button>
          <button type="submit" disabled={busy} className={`${primaryButton} flex-1`}>{busy ? 'Recording…' : uncertain ? 'Retry same command' : 'Confirm command'}</button>
        </div>
      </form>
    </AdminDialog>
  </div>
}

export function HandoverDialog({ order, onClose, onSave, retrySafe = true }) {
  const [note, setNote] = useState('')
  const { run, busy, uncertain, locked, error } = useRetainedFulfillmentCommand(onSave, retrySafe)
  const noteRef = useRef(null)

  useEffect(() => {
    setNote('')
  }, [order?.id])

  if (!order) return null

  const save = async event => {
    event.preventDefault()
    const handoverNote = note.trim()
    if (handoverNote.length < 3) return
    const result = await run(handoverNote)
    if (result?.ok) onClose()
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" role="presentation">
    <AdminDialog onClose={onClose} closeDisabled={busy || (uncertain && retrySafe)} initialFocusRef={noteRef} labelledBy="handover-title" describedBy="handover-description">
      <form onSubmit={save} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-5 text-white">
        <div>
          <p className="font-mono text-xs text-blue">{order.publicReference || order.public_reference}</p>
          <h2 id="handover-title" className="mt-1 text-xl font-semibold">Record courier handover</h2>
          <p id="handover-description" className="mt-1 text-sm text-white/50">Record the actual courier receipt or dispatch reference. This deducts the exact reserved lots; it does not book a courier.</p>
        </div>
        <label htmlFor="handover-note" className="block text-xs font-semibold text-white/60">Courier handover or dispatch reference</label>
        <textarea ref={noteRef} id="handover-note" disabled={locked} required minLength={3} maxLength={500} value={note} onChange={event => setNote(event.target.value.slice(0, 500))} className="adm-input min-h-24 resize-y text-base" />
        {error && <StateBanner tone={uncertain ? 'warning' : 'danger'}>{error}</StateBanner>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onClose} disabled={busy || (uncertain && retrySafe)} className={`${secondaryButton} flex-1`}>Cancel</button>
          <button type="submit" disabled={busy || (uncertain && !retrySafe) || note.trim().length < 3} className={`${primaryButton} flex-1`}>{busy ? 'Recording…' : uncertain ? retrySafe ? 'Retry same command' : 'Reconcile order first' : 'Confirm handover'}</button>
        </div>
      </form>
    </AdminDialog>
  </div>
}

export function DeliveryDetailsModal({ order, onClose, onSave, retrySafe = true }) {
  const [form, setForm] = useState({ amount: '0', courier: '', tracking: '', waybill: '', confirmed: false, note: '' })
  const { run, busy, uncertain, locked, error } = useRetainedFulfillmentCommand(onSave, retrySafe)
  const courierRef = useRef(null)

  useEffect(() => {
    if (!order) return
    setForm({
      amount: String(order.shippingAmount ?? order.shipping_amount ?? 0),
      courier: order.courierName ?? order.courier_name ?? '',
      tracking: order.trackingNumber ?? order.tracking_number ?? '',
      waybill: order.waybillUrl ?? order.waybill_url ?? '',
      confirmed: ['platform_charged', 'customer_confirmed'].includes(order.shippingQuoteStatus ?? order.shipping_quote_status),
      note: '',
    })
  }, [order?.id])

  if (!order) return null
  const save = async event => {
    event.preventDefault()
    const result = await run({
        orderRequestId: order.id, shippingAmount: Number(form.amount), courierName: form.courier.trim(),
        trackingNumber: form.tracking.trim(), waybillUrl: form.waybill.trim(),
        customerConfirmed: form.confirmed, note: form.note.trim(),
      })
    if (result?.ok) onClose()
  }
  const update = key => event => setForm(current => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" role="presentation"><AdminDialog onClose={onClose} closeDisabled={busy || (uncertain && retrySafe)} initialFocusRef={courierRef} labelledBy="delivery-details-title"><form onSubmit={save} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-5 text-white"><div><p className="font-mono text-xs text-blue">{order.publicReference || order.public_reference}</p><h2 id="delivery-details-title" className="mt-1 text-xl font-semibold">Delivery quote and waybill</h2><p className="mt-1 text-sm text-white/50">Direct orders require the actual courier quote and customer confirmation. Marketplace delivery is recorded as platform charged.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-white/60">Courier<input disabled={locked} ref={courierRef} required value={form.courier} onChange={update('courier')} className="adm-input mt-1.5 min-h-11 text-base" /></label><label className="text-xs font-semibold text-white/60">Delivery amount<input disabled={locked} required type="number" min="0" step="0.01" value={form.amount} onChange={update('amount')} className="adm-input mt-1.5 min-h-11 text-base" /></label><label className="text-xs font-semibold text-white/60">Tracking number<input disabled={locked} value={form.tracking} onChange={update('tracking')} className="adm-input mt-1.5 min-h-11 text-base" /></label><label className="text-xs font-semibold text-white/60">Waybill URL<input disabled={locked} type="url" value={form.waybill} onChange={update('waybill')} className="adm-input mt-1.5 min-h-11 text-base" /></label></div><label className="flex min-h-11 items-center gap-3 rounded-adm-sm border border-adm-line bg-adm-sunken px-3 text-sm"><input disabled={locked} type="checkbox" checked={form.confirmed} onChange={update('confirmed')} /> Customer approved the quoted delivery charge</label><label className="block text-xs font-semibold text-white/60">Communication / reconciliation note<textarea disabled={locked} required value={form.note} onChange={update('note')} className="adm-input mt-1.5 min-h-24 resize-y text-base" /></label>{error && <StateBanner tone={uncertain ? 'warning' : 'danger'}>{error}</StateBanner>}<div className="flex gap-2"><button type="button" onClick={onClose} disabled={busy || (uncertain && retrySafe)} className={`${secondaryButton} flex-1`}>Cancel</button><button disabled={busy || (uncertain && !retrySafe)} className={`${primaryButton} flex-1`}>{busy ? 'Saving…' : uncertain ? retrySafe ? 'Retry same command' : 'Reconcile order first' : 'Save delivery details'}</button></div></form></AdminDialog></div>
}

export function PackingLotProof({ allocations, value, confirmed, disabled, onSelect, onConfirm }) {
  const available = allocations.filter(row => row.packed_quantity < row.quantity)
  const selected = available.find(row => row.id === value)
  const identifiable = Boolean(selected?.lot?.batch_code && selected?.lot?.expiry_date && selected?.lot?.hub && selected?.lot?.custodian)
  return <div className="space-y-2 rounded-adm border border-adm-line bg-adm-surface p-3">
    <label className="block text-sm text-white/80">Physical lot allocation
      <select disabled={disabled} value={value} onChange={event => onSelect(event.target.value)} className="adm-input mt-1 min-h-11 w-full text-base">
        <option value="">Choose the lot you are picking</option>
        {available.map(row => <option key={row.id} value={row.id}>{row.sku} · {row.lot?.batch_code || 'Batch unknown'} · {row.quantity-row.packed_quantity} remaining</option>)}
      </select>
    </label>
    {selected && <p className="break-words text-sm text-white/80">Batch {selected.lot?.batch_code || 'unknown'} · Best before {selected.lot?.expiry_date || 'unknown'} · Box {selected.lot?.box_code || 'unknown'} · {selected.lot?.hub || 'Location unknown'} · {selected.lot?.custodian || 'Custodian unknown'}</p>}
    <label className="flex min-h-11 items-center gap-3 text-sm text-white/80">
      <input type="checkbox" disabled={disabled || !identifiable} checked={confirmed && identifiable} onChange={event => onConfirm(event.target.checked)} />
      I checked this unit's physical batch, expiry and location against this allocation.
    </label>
    <p className="text-sm text-white/70">A product barcode identifies the SKU. This confirmation records which physical lot was picked. Reconcile missing lot details before scanning.</p>
  </div>
}

export function PaymentStatusModal({ order, onClose, onSave, secure = false }) {
  const [target, setTarget] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const saving = useRef(false)
  const current = order?.paymentStatus || order?.payment_status
  const versionAvailable = Boolean(order?.updatedAt || order?.updated_at)
  const choices = {
    not_requested: ['awaiting_instructions'],
    awaiting_instructions: ['evidence_submitted', 'failed'],
    evidence_submitted: ['verified', 'failed'],
    verified: ['refunded'],
    failed: secure && versionAvailable ? ['evidence_submitted'] : [], refunded: [],
  }[current] || []

  useEffect(() => { setTarget(choices[0] || ''); setNote(''); setError(''); setUncertain(false) }, [order?.id, current])
  if (!order) return null
  const save = async event => {
    event.preventDefault()
    if (saving.current || !choices.includes(target) || (secure && !versionAvailable)) return
    saving.current = true; setBusy(true); setError('')
    try {
      const result = await onSave(target, note.trim())
      if (result?.ok === false) { setError(result.error); setUncertain(Boolean(result.uncertain)) }
    } catch { setError(safeUiError('PAYMENT_STATE_FAILED')) }
    finally { saving.current = false; setBusy(false) }
  }
  return <AdminDialog onClose={onClose} closeDisabled={busy} labelledBy="payment-status-title">
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
      <form onSubmit={save} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-5 text-white">
        <div><p className="font-mono text-xs text-blue">{order.publicReference || order.public_reference}</p>
          <h2 id="payment-status-title" className="mt-1 text-xl font-semibold">Payment evidence state</h2>
          <p className="mt-1 text-sm text-white/70">Current: {String(current || 'not recorded').replaceAll('_', ' ')}. This records evidence; it does not process payment.</p>
        </div>
        {current === 'failed' && <p className="text-sm text-white/80">The rejected attempt stays in history. Submit corrected evidence for a different staff member to verify against the receiving account.</p>}
        {secure && !versionAvailable && <StateBanner tone="warning">Refresh this order to load its review version before recording payment evidence.</StateBanner>}
        {choices.length ? <>
          <label className="block text-xs font-semibold text-white/80">Next valid state
            <select disabled={busy || uncertain} value={target} onChange={event => setTarget(event.target.value)} className="adm-input mt-1.5 min-h-11 text-base">
              {choices.map(choice => <option key={choice} value={choice}>{choice.replaceAll('_', ' ')}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-white/80">Evidence or reconciliation note
            <textarea disabled={busy || uncertain} value={note} maxLength={1000} onChange={event => setNote(event.target.value)} required={target !== 'awaiting_instructions'} className="adm-input mt-1.5 min-h-24 resize-y text-base" />
          </label>
          <p className="text-sm text-white/70">Record the method, amount, currency, payer, reference and proof source. A screenshot alone does not establish payment.</p>
        </> : <StateBanner tone="info">{current === 'failed' ? 'Recovery requires the protected payment workflow and a current order review.' : 'No further payment transition is available for this record.'}</StateBanner>}
        {error && <StateBanner tone={uncertain ? 'warning' : 'danger'}>{error}</StateBanner>}
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={`${secondaryButton} flex-1`}>Close</button>
          {choices.length > 0 && <button disabled={busy || !target || (secure && !versionAvailable)} className={`${primaryButton} flex-1`}>{busy ? 'Saving…' : uncertain ? 'Retry same evidence' : 'Record transition'}</button>}
        </div>
      </form>
    </div>
  </AdminDialog>
}
