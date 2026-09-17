import { useEffect, useMemo, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import {
  AlertIcon,
  BoxIcon,
  CheckIcon,
  GlobeIcon,
  SyncIcon,
  UploadIcon,
  XIcon,
} from '../../components/ui/icons'
import {
  extractJntOrderDetails,
  formatJntSmartAddress,
  generateJntVipBulkCsv,
  validateJntTrackingNumber,
} from '../../lib/jntVipBulkEngine'
import {
  primaryButton,
  secondaryButton,
  StateBanner,
} from './AdminWorkspaceUi'

export default function JntVipDispatchModal({
  order,
  allOrders = [],
  onClose,
  onSaveWaybill,
  returnFocusRef,
}) {
  const [activeTab, setActiveTab] = useState(order ? 'single' : 'bulk')
  const [copiedKey, setCopiedKey] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingError, setTrackingError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const trackingInputRef = useRef(null)

  // Orders eligible for bulk packing
  const eligibleBulkOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const status = (o.delivery_status || o.deliveryStatus || '').toLowerCase()
      const method = (o.fulfillment_method || o.fulfillmentMethod || '').toLowerCase()
      // Skip warehouse pickup and already handed-over orders
      if (method.includes('pickup')) return false
      return ['awaiting_quote', 'awaiting_customer', 'ready_to_pack'].includes(status)
    })
  }, [allOrders])

  const singleDetails = useMemo(() => {
    return order ? extractJntOrderDetails(order) : null
  }, [order])

  const copyToClipboard = async (text, key) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 2500)
    } catch {
      // Fallback for older webviews
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 2500)
    }
  }

  const handleDownloadCsv = () => {
    const targetOrders = eligibleBulkOrders.length > 0 ? eligibleBulkOrders : (order ? [order] : [])
    if (targetOrders.length === 0) return

    const csvContent = generateJntVipBulkCsv(targetOrders)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    link.setAttribute('href', url)
    link.setAttribute('download', `jnt-vip-batch-${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSaveTracking = async (e) => {
    e.preventDefault()
    if (!order || !onSaveWaybill) return

    const validation = validateJntTrackingNumber(trackingNumber)
    if (!validation.valid) {
      setTrackingError(validation.error || 'Please enter a valid J&T tracking barcode')
      return
    }

    setTrackingError('')
    setIsSaving(true)
    try {
      await onSaveWaybill({
        orderId: order.id,
        trackingNumber: validation.normalized,
        courierName: 'J&T Express',
        deliveryStatus: 'handed_over',
      })
      onClose()
    } catch (err) {
      setTrackingError(err.message || 'Failed to save tracking number')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md"
      role="presentation"
    >
      <AdminDialog
        onClose={onClose}
        initialFocusRef={trackingInputRef}
        returnFocusRef={returnFocusRef}
        labelledBy="jnt-vip-dispatch-title"
      >
        <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-4 sm:p-6 text-white">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-adm-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-crimson/20 text-crimson font-bold text-xs">
                  J&T
                </span>
                <h2 id="jnt-vip-dispatch-title" className="text-lg sm:text-xl font-bold text-white">
                  J&T VIP Dispatch Assistant
                </h2>
              </div>
              <p className="mt-1 text-xs text-white/60">
                1-tap booking assistant and bulk waybill generation for J&T Express Philippines.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-adm-sm text-white/50 hover:bg-white/10 hover:text-white"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="mt-4 flex border-b border-adm-line">
            {order && (
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === 'single'
                    ? 'border-blue text-white'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                <BoxIcon size={16} />
                <span>Single Order ({order.public_reference || order.id?.slice(0, 8)})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'bulk'
                  ? 'border-blue text-white'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <UploadIcon size={16} />
              <span>Bulk Batch Upload ({eligibleBulkOrders.length} Ready)</span>
            </button>
          </div>

          {/* TAB 1: Single Order 1-Tap Booking */}
          {activeTab === 'single' && singleDetails && (
            <div className="mt-4 space-y-4">
              {/* Order summary banner */}
              <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-blue">
                      {order.public_reference || order.id}
                    </span>
                    <h3 className="text-sm font-semibold text-white">
                      {singleDetails.receiverName} · {singleDetails.receiverPhone}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono text-sm font-bold text-forest">
                      ₱{Number(order.total_amount || order.total || 0).toLocaleString()}
                    </span>
                    <span className="block text-xs uppercase text-white/40 font-semibold">
                      {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid (GCash/Card)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 1: Smart Recognition Address Copy */}
              <div className="space-y-2 rounded-adm-sm border border-adm-line bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Step 1: Recipient Address (Smart Recognition)
                  </span>
                  {copiedKey === 'address' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-forest">
                      <CheckIcon size={14} /> Copied!
                    </span>
                  )}
                </div>

                <p className="text-xs text-white/80 bg-black/40 p-2.5 rounded font-mono leading-relaxed break-words">
                  {singleDetails.smartAddress}
                </p>

                <button
                  type="button"
                  onClick={() => copyToClipboard(singleDetails.smartAddress, 'address')}
                  className={`${primaryButton} w-full min-h-11 font-bold text-xs justify-center`}
                >
                  <span>Copy Address for J&T Smart Paste</span>
                </button>
                <p className="text-xs text-white/40 leading-normal">
                  In J&T VIP Create Waybill, paste this into the address auto-recognition box to fill name, phone, province, city, and barangay automatically.
                </p>
              </div>

              {/* Step 2: Order Information fields */}
              <div className="space-y-2 rounded-adm-sm border border-adm-line bg-white/[0.02] p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  Step 2: J&T VIP Form Fields
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <div className="bg-adm-sunken p-2.5 rounded border border-adm-line">
                    <span className="text-xs text-white/40 block font-semibold">Express Type</span>
                    <span className="font-mono text-xs font-bold text-white block mt-0.5">
                      {singleDetails.expressType}
                    </span>
                  </div>

                  <div className="bg-adm-sunken p-2.5 rounded border border-adm-line">
                    <span className="text-xs text-white/40 block font-semibold">Item Weight (kg)</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-xs font-bold text-forest">
                        {singleDetails.itemWeight} kg
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(singleDetails.itemWeight, 'weight')}
                        className="text-xs text-blue hover:underline"
                      >
                        {copiedKey === 'weight' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-adm-sunken p-2.5 rounded border border-adm-line">
                    <span className="text-xs text-white/40 block font-semibold">Item Value (PHP)</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-xs font-bold text-white">
                        ₱{singleDetails.itemValue}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(singleDetails.itemValue, 'value')}
                        className="text-xs text-blue hover:underline"
                      >
                        {copiedKey === 'value' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-adm-sunken p-2.5 rounded border border-adm-line">
                    <span className="text-xs text-white/40 block font-semibold">COD Amount</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-xs font-bold text-white">
                        ₱{singleDetails.codAmount}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(singleDetails.codAmount, 'cod')}
                        className="text-xs text-blue hover:underline"
                      >
                        {copiedKey === 'cod' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-adm-sunken p-2.5 rounded border border-adm-line col-span-2">
                    <span className="text-xs text-white/40 block font-semibold">Remarks (Reference)</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-xs text-white truncate mr-2">
                        {singleDetails.remarks}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(singleDetails.remarks, 'remarks')}
                        className="text-xs text-blue hover:underline shrink-0"
                      >
                        {copiedKey === 'remarks' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <a
                    href="https://vip.jtexpress.ph/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${secondaryButton} min-h-11 text-xs gap-1.5`}
                  >
                    <GlobeIcon size={15} />
                    <span>Open J&T VIP Portal in New Tab ↗</span>
                  </a>
                </div>
              </div>

              {/* Step 3: Waybill Assignment & Barcode Scanning */}
              <form onSubmit={handleSaveTracking} className="space-y-3 rounded-adm-sm border border-forest/30 bg-forest/5 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-forest block">
                  Step 3: Scan / Enter Printed J&T Waybill Barcode
                </span>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    J&T Waybill Tracking Number (e.g. PH260123456789 or 12 digits)
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={trackingInputRef}
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => {
                        setTrackingNumber(e.target.value)
                        setTrackingError('')
                      }}
                      placeholder="Laser scan barcode or paste tracking..."
                      className="adm-input flex-1 min-h-11 font-mono text-sm uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isSaving || !trackingNumber.trim()}
                      className={`${primaryButton} min-h-11 text-xs font-bold px-5 shrink-0 bg-forest hover:bg-forest/90`}
                    >
                      {isSaving ? 'Saving...' : 'Save & Hand Over'}
                    </button>
                  </div>
                  {trackingError && (
                    <p className="text-xs font-semibold text-crimson mt-1.5">
                      {trackingError}
                    </p>
                  )}
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Scanning the waybill barcode automatically marks this order as packed and handed over, locking the tracking details for customer notification.
                </p>
              </form>
            </div>
          )}

          {/* TAB 2: Bulk CSV Batch Export */}
          {activeTab === 'bulk' && (
            <div className="mt-4 space-y-4">
              <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Batch Dispatch Queue
                    </h3>
                    <p className="text-xs text-white/60 mt-0.5">
                      {eligibleBulkOrders.length} website orders are currently ready for courier pickup.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={eligibleBulkOrders.length === 0}
                    className={`${primaryButton} min-h-11 text-xs font-bold px-4 gap-2`}
                  >
                    <UploadIcon size={16} />
                    <span>Download J&T VIP Bulk CSV</span>
                  </button>
                </div>
              </div>

              {/* 3-Step Guide matching J&T screenshot */}
              <div className="rounded-adm-sm border border-adm-line bg-white/[0.02] p-4 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/70 block">
                  How to Upload to J&T VIP (3-Step Bulk Flow)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded bg-adm-sunken border border-adm-line space-y-1">
                    <span className="font-bold text-blue block">1. Sender Profile</span>
                    <p className="text-white/60 leading-relaxed">
                      On J&T VIP, select your saved sender: <strong className="text-white">JWORLDBASKETPH ONLINE STORE</strong> (Bulacan/SJDM).
                    </p>
                  </div>
                  <div className="p-3 rounded bg-adm-sunken border border-adm-line space-y-1">
                    <span className="font-bold text-blue block">2. Bulk Upload</span>
                    <p className="text-white/60 leading-relaxed">
                      Click the <strong className="text-white">Bulk Upload</strong> button on J&T and select this downloaded CSV.
                    </p>
                  </div>
                  <div className="p-3 rounded bg-adm-sunken border border-adm-line space-y-1">
                    <span className="font-bold text-blue block">3. Print & Scan</span>
                    <p className="text-white/60 leading-relaxed">
                      J&T will stage and print all waybills at once. Scan waybills into K2 to finalize handover.
                    </p>
                  </div>
                </div>
              </div>

              {/* Order preview table */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60 block">
                  Orders Included in Batch
                </span>
                <div className="max-h-60 overflow-y-auto rounded border border-adm-line divide-y divide-adm-line">
                  {eligibleBulkOrders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-white/40">
                      No orders currently waiting for packaging.
                    </div>
                  ) : (
                    eligibleBulkOrders.map((o) => {
                      const d = extractJntOrderDetails(o)
                      return (
                        <div key={o.id} className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                          <div>
                            <span className="font-mono font-bold text-blue">{o.public_reference || o.id?.slice(0, 8)}</span>
                            <span className="text-white font-semibold ml-2">{d.receiverName}</span>
                            <span className="block text-xs text-white/40 mt-0.5 truncate max-w-xs">{d.receiverAddress}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-forest">{d.itemWeight} kg</span>
                            <span className="block text-xs text-white/40">{d.expressType}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="mt-6 flex justify-end gap-2 border-t border-adm-line pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`${secondaryButton} min-h-11 px-5 text-xs`}
            >
              Close
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  )
}
