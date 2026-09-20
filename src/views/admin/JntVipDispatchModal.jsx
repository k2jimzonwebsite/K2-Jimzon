import { useEffect, useMemo, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import {
  AlertIcon,
  ArrowIcon,
  BoxIcon,
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  PlayIcon,
  SyncIcon,
  UploadIcon,
  XIcon,
} from '../../components/ui/icons'
import {
  extractJntOrderDetails,
  formatJntSmartAddress,
  generateJntVipBulkCsv,
  generateJntVipSingleOrderCsv,
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
  const [guidedMode, setGuidedMode] = useState(false)
  const [guideStep, setGuideStep] = useState(1)
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

  const handleDownloadSingleOrderCsv = () => {
    if (!order) return
    const csvContent = generateJntVipSingleOrderCsv(order)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const ref = (order.public_reference || order.id || 'order').replace(/[^a-zA-Z0-9_-]/g, '_')
    link.setAttribute('href', url)
    link.setAttribute('download', `jnt-vip-single-${ref}.csv`)
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
      const result = await onSaveWaybill({
        orderId: order.id,
        trackingNumber: validation.normalized,
        courierName: 'J&T Express',
        deliveryStatus: 'handed_over',
      })
      if (result && result.ok === false) {
        setTrackingError(result.error || 'Failed to save tracking number')
        return
      }
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
                Copy details to book one J&T delivery, or prepare a bulk upload for many.
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
          <div className="mt-4 flex overflow-x-auto scrollbar-none border-b border-adm-line">
            {order && (
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={`flex shrink-0 min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
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
              className={`flex shrink-0 min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'bulk'
                  ? 'border-blue text-white'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <UploadIcon size={16} />
              <span>Bulk Upload ({eligibleBulkOrders.length} Ready)</span>
            </button>
          </div>

          {/* TAB 1: Single Order 1-Tap Booking */}
          {activeTab === 'single' && singleDetails && (
            <div className="mt-4 space-y-4">
              {/* Order summary banner and Quick Mode Actions */}
              <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-blue font-bold">
                      {order.public_reference || order.publicReference || order.id}
                    </span>
                    <h3 className="text-sm font-semibold text-white">
                      {singleDetails.receiverName} · {singleDetails.receiverPhone}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGuidedMode((curr) => !curr)}
                      className={`flex min-h-11 items-center gap-1.5 rounded-adm-sm px-3 text-xs font-semibold transition-colors ${
                        guidedMode
                          ? 'bg-blue text-white'
                          : 'border border-blue/40 bg-blue/10 text-blue hover:bg-blue/20'
                      }`}
                    >
                      <PlayIcon size={14} />
                      <span>{guidedMode ? 'Standard Overview' : 'Step-by-Step Guide'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadSingleOrderCsv}
                      title="Download 1-order CSV batch to upload directly into J&T VIP Bulk Upload"
                      className={`${secondaryButton} min-h-11 text-xs gap-1.5`}
                    >
                      <UploadIcon size={14} />
                      <span>1-Order Batch (.csv)</span>
                    </button>

                    <div className="text-right pl-2 border-l border-adm-line">
                      <span className="block font-mono text-sm font-bold text-forest">
                        ₱{Number(order.total_amount || order.total || 0).toLocaleString()}
                      </span>
                      <span className="block text-xs uppercase text-white/40 font-semibold">
                        {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid (GCash/Card)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GUIDED WALKTHROUGH MODE */}
              {guidedMode ? (
                <div className="space-y-4">
                  {/* Stepper Progress Bar */}
                  <div className="flex items-center justify-between border-b border-adm-line pb-3">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setGuideStep(s)}
                          className={`flex min-h-11 items-center gap-1.5 rounded-adm-sm px-3 text-xs font-semibold transition-colors ${
                            guideStep === s
                              ? 'bg-blue text-white'
                              : guideStep > s
                              ? 'bg-forest/20 text-forest'
                              : 'bg-white/[0.04] text-white/50 hover:bg-white/10'
                          }`}
                        >
                          {guideStep > s ? <CheckIcon size={14} /> : <span>{s}.</span>}
                          <span>{s === 1 ? 'Recipient Address' : s === 2 ? 'Package Specs' : 'Scan Waybill'}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuidedMode(false)}
                      className="min-h-11 px-2 text-xs text-white/60 hover:text-white underline"
                    >
                      Exit Guide
                    </button>
                  </div>

                  {/* GUIDE STEP 1: Address Copy */}
                  {guideStep === 1 && (
                    <div className="space-y-4 rounded-adm border border-blue/30 bg-blue/[0.03] p-4 sm:p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-blue">
                            Step 1 of 3: Recipient Address (Smart Recognition)
                          </span>
                          <h3 className="mt-1 text-base font-semibold text-white">
                            1-Tap Copy for J&T VIP Address Auto-Recognition
                          </h3>
                        </div>
                        {copiedKey === 'address' && (
                          <span className="flex items-center gap-1 rounded bg-forest/20 px-2.5 py-1 text-xs font-bold text-forest">
                            <CheckIcon size={14} /> Copied!
                          </span>
                        )}
                      </div>

                      <div className="rounded border border-adm-line bg-black/60 p-3 font-mono text-xs text-white/90 break-words leading-relaxed">
                        {singleDetails.smartAddress}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(singleDetails.smartAddress, 'address')}
                          className={`${primaryButton} min-h-11 w-full text-xs font-bold justify-center bg-blue hover:bg-blue/90`}
                        >
                          <CopyIcon size={16} className="mr-1.5" />
                          <span>Copy Address for J&T Smart Paste</span>
                        </button>

                        <a
                          href="https://vip.jtexpress.ph/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${secondaryButton} min-h-11 w-full text-xs font-semibold justify-center gap-1.5`}
                        >
                          <GlobeIcon size={15} />
                          <span>Open J&T VIP Portal ↗</span>
                        </a>
                      </div>

                      <div className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs text-white/70 space-y-1.5">
                        <p className="font-semibold text-white">Instructions for Staff / Manila receiver:</p>
                        <p>1. Click the blue copy button above to copy recipient tokens to your clipboard.</p>
                        <p>2. In your J&T VIP tab (<strong>My Order &gt; Create Waybill</strong>), click inside the address auto-recognition box.</p>
                        <p>3. Press <strong>Ctrl + V</strong> (or tap Paste). Receiver Name, Phone, Province, City, and Barangay will fill automatically.</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-adm-line pt-3">
                        <button
                          type="button"
                          onClick={handleDownloadSingleOrderCsv}
                          className={`${secondaryButton} min-h-11 text-xs gap-1`}
                        >
                          <UploadIcon size={14} />
                          <span>Or Download 1-Order Batch CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setGuideStep(2)}
                          className={`${primaryButton} min-h-11 text-xs font-bold px-5 bg-blue hover:bg-blue/90`}
                        >
                          <span>Next: Package Details →</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* GUIDE STEP 2: Package Specs */}
                  {guideStep === 2 && (
                    <div className="space-y-4 rounded-adm border border-blue/30 bg-blue/[0.03] p-4 sm:p-5">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue">
                          Step 2 of 3: Package & COD Specifications
                        </span>
                        <h3 className="mt-1 text-base font-semibold text-white">
                          Enter Order Information on J&T VIP
                        </h3>
                        <p className="mt-1 text-xs text-white/60">
                          Click each 1-tap copy chip below and paste into the corresponding field on J&T VIP:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="rounded border border-adm-line bg-adm-sunken p-3 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-white/50 block font-semibold">Item Weight (kg)</span>
                            <span className="font-mono text-sm font-bold text-forest">{singleDetails.itemWeight} kg</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(singleDetails.itemWeight, 'weight')}
                            className={`${secondaryButton} adm-btn-sm min-h-11 px-3 text-xs`}
                          >
                            {copiedKey === 'weight' ? '✓ Copied' : `Copy ${singleDetails.itemWeight}`}
                          </button>
                        </div>

                        <div className="rounded border border-adm-line bg-adm-sunken p-3 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-white/50 block font-semibold">Declared Item Value</span>
                            <span className="font-mono text-sm font-bold text-white">₱{singleDetails.itemValue}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(singleDetails.itemValue, 'value')}
                            className={`${secondaryButton} adm-btn-sm min-h-11 px-3 text-xs`}
                          >
                            {copiedKey === 'value' ? '✓ Copied' : `Copy ₱${singleDetails.itemValue}`}
                          </button>
                        </div>

                        <div className="rounded border border-adm-line bg-adm-sunken p-3 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-white/50 block font-semibold">COD Amount</span>
                            <span className="font-mono text-sm font-bold text-white">₱{singleDetails.codAmount}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(singleDetails.codAmount, 'cod')}
                            className={`${secondaryButton} adm-btn-sm min-h-11 px-3 text-xs`}
                          >
                            {copiedKey === 'cod' ? '✓ Copied' : `Copy ₱${singleDetails.codAmount}`}
                          </button>
                        </div>

                        <div className="rounded border border-adm-line bg-adm-sunken p-3 flex items-center justify-between">
                          <div className="min-w-0 mr-2">
                            <span className="text-xs text-white/50 block font-semibold">Remarks (Order Reference)</span>
                            <span className="font-mono text-xs text-white truncate block">{singleDetails.remarks}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(singleDetails.remarks, 'remarks')}
                            className={`${secondaryButton} adm-btn-sm min-h-11 px-3 text-xs shrink-0`}
                          >
                            {copiedKey === 'remarks' ? '✓ Copied' : 'Copy Remarks'}
                          </button>
                        </div>
                      </div>

                      <div className="rounded border border-white/10 bg-white/[0.02] p-3 text-xs text-white/70 space-y-1">
                        <p className="font-semibold text-white">Directive for Staff / Manila receiver:</p>
                        <p>After pasting these fields in J&T VIP, click the red <strong>Order</strong> button at the bottom of J&T VIP to generate and print the waybill.</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-adm-line pt-3">
                        <button
                          type="button"
                          onClick={() => setGuideStep(1)}
                          className={`${secondaryButton} min-h-11 text-xs`}
                        >
                          ← Previous: Address
                        </button>

                        <button
                          type="button"
                          onClick={() => setGuideStep(3)}
                          className={`${primaryButton} min-h-11 text-xs font-bold px-5 bg-blue hover:bg-blue/90`}
                        >
                          <span>Next: Scan Barcode →</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* GUIDE STEP 3: Scan / Save Waybill */}
                  {guideStep === 3 && (
                    <form onSubmit={handleSaveTracking} className="space-y-4 rounded-adm border border-forest/30 bg-forest/5 p-4 sm:p-5">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-forest">
                          Step 3 of 3: Scan / Enter Printed J&T Waybill
                        </span>
                        <h3 className="mt-1 text-base font-semibold text-white">
                          Complete Dispatch & Record Tracking Barcode
                        </h3>
                        <p className="mt-1 text-xs text-white/60">
                          Scan the barcode on the printed J&T sticker (starts with PH... or 10-16 digits) to deduct reserved stock and record handover:
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1">
                          J&T Tracking Barcode
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            ref={trackingInputRef}
                            type="text"
                            value={trackingNumber}
                            onChange={(e) => {
                              setTrackingNumber(e.target.value)
                              setTrackingError('')
                            }}
                            placeholder="Scan barcode or type tracking number..."
                            className="adm-input flex-1 min-h-11 font-mono text-sm uppercase"
                          />
                          <button
                            type="submit"
                            disabled={isSaving || !trackingNumber.trim()}
                            className={`${primaryButton} min-h-11 text-xs font-bold px-6 bg-forest hover:bg-forest/90`}
                          >
                            {isSaving ? 'Saving...' : 'Save & Mark Dispatched'}
                          </button>
                        </div>
                        {trackingError && (
                          <p className="text-xs font-semibold text-crimson mt-1.5">
                            {trackingError}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-adm-line pt-3">
                        <button
                          type="button"
                          onClick={() => setGuideStep(2)}
                          className={`${secondaryButton} min-h-11 text-xs`}
                        >
                          ← Previous: Package Details
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* STANDARD OVERVIEW MODE (All 3 steps visible) */
                <div className="space-y-4">
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

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(singleDetails.smartAddress, 'address')}
                        className={`${primaryButton} w-full min-h-11 font-bold text-xs justify-center`}
                      >
                        <CopyIcon size={16} className="mr-1.5" />
                        <span>Copy Address for J&T Smart Paste</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSingleOrderCsv}
                        className={`${secondaryButton} w-full min-h-11 font-semibold text-xs justify-center gap-1.5`}
                      >
                        <UploadIcon size={15} />
                        <span>Download 1-Order Batch CSV</span>
                      </button>
                    </div>

                    <p className="text-xs text-white/40 leading-normal">
                      In J&T VIP Create Waybill, paste this into the address auto-recognition box to fill name, phone, province, city, and barangay automatically. Or use the 1-Order Batch CSV to upload directly in Create Waybills in Bulk.
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
                            className="min-h-11 min-w-11 px-2 text-xs font-semibold text-blue hover:underline"
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
                            className="min-h-11 min-w-11 px-2 text-xs font-semibold text-blue hover:underline"
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
                            className="min-h-11 min-w-11 px-2 text-xs font-semibold text-blue hover:underline"
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
