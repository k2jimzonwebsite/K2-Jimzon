import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function playMilanBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime) // C6 tone
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  } catch (e) {}
}

export default function MilanPackingScannerModal({
  isOpen,
  onClose,
  items,
  products,
  onPackItem,
  onUnrecognizedBarcode,
  onQuickCreateProduct
}) {
  const [manualCode, setManualCode] = useState('')
  const [lastPacked, setLastPacked] = useState(null)
  const [scanFlash, setScanFlash] = useState(false)
  const [unrecognizedCode, setUnrecognizedCode] = useState(null)

  // Quick creation form states
  const [quickTitle, setQuickTitle] = useState('')
  const [quickSrp, setQuickSrp] = useState('750')
  const [quickBatch, setQuickBatch] = useState(`LOT-${new Date().toISOString().slice(0, 7).replace('-', '')}`)
  const [quickBestBefore, setQuickBestBefore] = useState('2028-12-31')

  const scannerRef = useRef(null)

  useEffect(() => {
    if (!isOpen || unrecognizedCode) return

    const timer = setTimeout(() => {
      if (!document.getElementById('milan-camera-reader')) return
      const html5QrCode = new Html5Qrcode('milan-camera-reader')
      scannerRef.current = html5QrCode

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 250, height: 180 }, aspectRatio: 1.0 },
        (decodedText) => {
          handleProcessScan(decodedText)
        },
        () => {}
      ).catch(() => {})
    }, 250)

    return () => {
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [isOpen, unrecognizedCode])

  const handleProcessScan = (codeOrSku) => {
    const cleanCode = codeOrSku.trim()
    if (!cleanCode) return

    const matchedProduct = (products || []).find(p => 
      p.sku.toLowerCase() === cleanCode.toLowerCase() || 
      (p.barcode && p.barcode === cleanCode)
    )

    const matchedManifestItem = (items || []).find(i => 
      i.sku.toLowerCase() === cleanCode.toLowerCase()
    )

    if (matchedProduct || matchedManifestItem) {
      playMilanBeep()
      if (navigator.vibrate) navigator.vibrate(60)

      const targetSku = matchedProduct ? matchedProduct.sku : matchedManifestItem.sku
      const updated = onPackItem(targetSku)

      if (updated) {
        setLastPacked({
          sku: updated.sku,
          name: updated.name || updated.sku,
          count: updated.italy_packed_qty
        })
        setScanFlash(true)
        setTimeout(() => setScanFlash(false), 400)
      }
    } else {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      setUnrecognizedCode(cleanCode)
    }
  }

  const handleInstantDraftPack = () => {
    if (!unrecognizedCode) return
    const code = unrecognizedCode
    const newSku = `IT-${code.slice(-6).toUpperCase()}`
    
    onQuickCreateProduct({
      sku: newSku,
      barcode: code,
      name: `Draft Italian Item (${code})`,
      srp: 750,
      batch_code: quickBatch,
      best_before_date: quickBestBefore,
      italy_packed_qty: 1
    })

    playMilanBeep()
    if (navigator.vibrate) navigator.vibrate(60)

    setLastPacked({ sku: newSku, name: `Draft Italian Item (${code})`, count: 1 })
    setUnrecognizedCode(null)
  }

  const handleQuickSubmit = (e) => {
    e.preventDefault()
    if (!quickTitle.trim() || !unrecognizedCode) return

    const newSku = `IT-${unrecognizedCode.slice(-6).toUpperCase()}`
    onQuickCreateProduct({
      sku: newSku,
      barcode: unrecognizedCode,
      name: quickTitle,
      srp: Number(quickSrp),
      batch_code: quickBatch,
      best_before_date: quickBestBefore,
      italy_packed_qty: 1
    })

    setLastPacked({ sku: newSku, name: quickTitle, count: 1 })
    setUnrecognizedCode(null)
    setQuickTitle('')
  }

  if (!isOpen) return null

  const totalPacked = items.reduce((sum, item) => sum + (item.italy_packed_qty || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#09090b] text-white animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0A101D] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-crimson/20 text-crimson px-2 py-0.5 rounded border border-crimson/30">
              Milan Packing POV
            </span>
            <span className="text-sm text-white/50">Milan, Italy</span>
          </div>
          <h2 className="font-serif font-semibold text-xl text-white">Flight Box Packing Scanner</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Milan Packing Scanner"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-neutral-300 hover:bg-white/20 transition-all"
        >
          Close
        </button>
      </div>

      {/* Progress Banner */}
      <div className="bg-[#020408] border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Milan Box Units Packed</p>
          <p className="text-base font-bold text-white">
            <span className="text-crimson font-mono text-lg">{totalPacked}</span> units packed into Flight Consignment
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close Milan Packing Scanner"
          className="bg-crimson hover:bg-crimson/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-crimson/20 transition-all"
        >
          Done Packing Box ✓
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-black overflow-hidden">
        <div 
          id="milan-camera-reader" 
          className={`w-full max-w-md h-full max-h-[380px] rounded-xl overflow-hidden transition-all ${
            scanFlash ? 'ring-4 ring-crimson scale-[1.01]' : 'border border-white/10'
          }`} 
        />

        {/* Camera Overlay Guide */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-64 h-44 border-2 border-dashed border-crimson/60 rounded-xl flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
            <span className="text-[10px] font-mono text-crimson bg-black/60 px-2 py-1 rounded tracking-widest uppercase animate-pulse">
              Pack & Scan Item (Milan)
            </span>
          </div>
        </div>

        {/* Scan Confirmation Banner */}
        {lastPacked && !unrecognizedCode && (
          <div className="absolute bottom-4 left-4 right-4 bg-crimson/90 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div>
              <p className="text-sm font-bold font-mono text-neutral-300">+1 PACKED IN MILAN</p>
              <p className="text-base font-semibold truncate max-w-[220px]">{lastPacked.name}</p>
            </div>
            <div className="text-right">
              <span className="bg-white/20 text-white font-mono font-bold text-base px-2.5 py-1 rounded">
                {lastPacked.count} Packed
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry & Quick Action Bar */}
      <div className="p-4 bg-[#0A101D] border-t border-white/10 space-y-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleProcessScan(manualCode); setManualCode('') }} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Milan Barcode / SKU entry (+1)..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-crimson"
          />
          <button
            type="submit"
            className="bg-crimson hover:bg-crimson/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-crimson/20"
          >
            +1 Pack
          </button>
        </form>

        {/* Quick Tap SKU Tiles for Italy */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Tap to Increment Milan Box (+1)</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {items.map(item => (
              <button
                key={item.sku}
                onClick={() => handleProcessScan(item.sku)}
                className="shrink-0 bg-white/5 border border-white/10 hover:border-crimson p-2 rounded-lg text-left transition-all active:scale-95"
              >
                <p className="text-sm font-semibold text-neutral-200 truncate max-w-[120px]">{item.sku}</p>
                <p className="text-[10px] text-white/50">
                  Packed: <span className="text-crimson font-bold">{item.italy_packed_qty}</span>
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unrecognized Barcode Modal */}
      {unrecognizedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-lg bg-[#0A101D] border border-amber/30 rounded-2xl p-6 text-white shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold uppercase tracking-wider bg-amber/20 text-amber px-2.5 py-1 rounded">
                Unrecognized Italian Item Barcode
              </span>
              <span className="text-sm font-mono text-white/40">{unrecognizedCode}</span>
            </div>

            <div>
              <h3 className="font-serif font-bold text-xl text-white">Unknown Barcode Detected</h3>
              <p className="text-sm text-white/60 mt-1">
                Barcode <span className="font-mono text-amber font-bold">{unrecognizedCode}</span> is not in master catalog. Tap below for ultra-fast packing:
              </p>
            </div>

            {/* Actions Grid */}
            <div className="space-y-3 pt-2">
              {/* PRIMARY 1-TAP ULTRA-FAST DRAFT BUTTON */}
              <button
                onClick={handleInstantDraftPack}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-crimson hover:bg-crimson/90 text-white font-bold text-base shadow-xl shadow-crimson/30 transition-all transform active:scale-98"
              >
                <div className="text-left">
                  <p className="font-extrabold text-base text-white flex items-center gap-1.5">
                    ⚡ Instant 1-Tap Draft & Pack (+1)
                  </p>
                  <p className="text-[11px] text-neutral-300 font-normal mt-0.5">
                    Registers SKU in inventory immediately & packs box (+1) without stopping scanner
                  </p>
                </div>
                <span className="text-xl">🚀</span>
              </button>

              <button
                onClick={() => {
                  const code = unrecognizedCode
                  setUnrecognizedCode(null)
                  onUnrecognizedBarcode(code, 'ai')
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-blue/10 border border-blue/30 text-blue font-bold text-sm hover:bg-blue/20 transition-all text-left group"
              >
                <div>
                  <p className="font-bold text-base text-white group-hover:text-blue">📷 Use AI Scan Box / Smart Paste</p>
                  <p className="text-[11px] text-white/50 font-normal mt-0.5">Stream packaging photos to AI vision model to generate full product JSON & specs</p>
                </div>
                <span className="text-xl">→</span>
              </button>

              {/* Quick Entry Form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-white uppercase tracking-wider font-mono">📝 Quick Create Italian Product</p>

                <form onSubmit={handleQuickSubmit} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-mono text-white/50 uppercase">Product Title</label>
                    <input
                      type="text"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      placeholder="e.g. Barilla Pesto Genovese 190g"
                      required
                      className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono text-white/50 uppercase">SRP (₱)</label>
                      <input
                        type="number"
                        value={quickSrp}
                        onChange={(e) => setQuickSrp(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-white/50 uppercase">Batch Code</label>
                      <input
                        type="text"
                        value={quickBatch}
                        onChange={(e) => setQuickBatch(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-white/50 uppercase">Best Before</label>
                      <input
                        type="date"
                        value={quickBestBefore}
                        onChange={(e) => setQuickBestBefore(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUnrecognizedCode(null)}
                      className="flex-1 py-2 text-sm font-semibold text-white/60 bg-white/5 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 text-sm font-bold text-white bg-crimson rounded-lg shadow-lg shadow-crimson/20"
                    >
                      Save & Add to Box (+1)
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
