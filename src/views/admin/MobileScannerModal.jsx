import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// Synthetic web audio beep for scanner feedback without external audio assets
function playScanBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 tone
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch (e) {
    // Audio context fallback if muted
  }
}

export default function MobileScannerModal({ isOpen, onClose, items, onScanItem, onFinishScanning }) {
  const [manualCode, setManualCode] = useState('')
  const [lastScanned, setLastScanned] = useState(null)
  const [scanFlash, setScanFlash] = useState(false)
  const scannerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      if (!document.getElementById('mobile-camera-reader')) return
      const html5QrCode = new Html5Qrcode('mobile-camera-reader')
      scannerRef.current = html5QrCode

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 250, height: 180 }, aspectRatio: 1.0 },
        (decodedText) => {
          handleIncrement(decodedText)
        },
        () => {}
      ).catch(() => {
        // Camera access fallback note
      })
    }, 250)

    return () => {
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [isOpen])

  const handleIncrement = (codeOrSku) => {
    playScanBeep()
    if (navigator.vibrate) navigator.vibrate(60)

    const updatedItem = onScanItem(codeOrSku)
    if (updatedItem) {
      setLastScanned({
        sku: updatedItem.sku,
        name: updatedItem.name || updatedItem.sku,
        count: updatedItem.manila_scanned_qty,
        target: updatedItem.italy_packed_qty
      })
      setScanFlash(true)
      setTimeout(() => setScanFlash(false), 400)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleIncrement(manualCode.trim())
    setManualCode('')
  }

  if (!isOpen) return null

  const totalPacked = items.reduce((sum, item) => sum + (item.italy_packed_qty || 0), 0)
  const totalScanned = items.reduce((sum, item) => sum + (item.manila_scanned_qty || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05080f] text-white animate-in fade-in duration-300">
      
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0A101D] shrink-0">
        <div>
          <h2 className="font-serif font-semibold text-lg text-white">Manila Receiving Camera Scanner</h2>
          <p className="text-xs text-white/50">Point phone camera at item barcode · +1 per scan</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/20 transition-all"
        >
          Close
        </button>
      </div>

      {/* Progress & Live Stat Banner */}
      <div className="bg-[#020408] border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Shipment Progress</p>
          <p className="text-sm font-bold text-white">
            <span className="text-forest">{totalScanned}</span> / <span className="text-white/70">{totalPacked} units</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onFinishScanning}
            className="bg-forest hover:bg-forest/90 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg shadow-forest/20 transition-all"
          >
            Review Discrepancies & Sync →
          </button>
        </div>
      </div>

      {/* Camera Stream Viewport */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-black overflow-hidden">
        <div 
          id="mobile-camera-reader" 
          className={`w-full max-w-md h-full max-h-[380px] rounded-xl overflow-hidden transition-all ${
            scanFlash ? 'ring-4 ring-forest scale-[1.01]' : 'border border-white/10'
          }`} 
        />

        {/* Reticle Guide Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-64 h-44 border-2 border-dashed border-forest/60 rounded-xl flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
            <span className="text-[10px] font-mono text-forest bg-black/60 px-2 py-1 rounded tracking-widest uppercase animate-pulse">
              Align Barcode
            </span>
          </div>
        </div>

        {/* Scan Confirmation Flash Banner */}
        {lastScanned && (
          <div className="absolute bottom-4 left-4 right-4 bg-forest/90 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div>
              <p className="text-xs font-bold font-mono text-white/80">+1 INCREMENTED</p>
              <p className="text-sm font-semibold truncate max-w-[220px]">{lastScanned.name}</p>
            </div>
            <div className="text-right">
              <span className="bg-white/20 text-white font-mono font-bold text-sm px-2.5 py-1 rounded">
                {lastScanned.count} / {lastScanned.target}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Manual Entry & Direct Item Tap Bar */}
      <div className="p-4 bg-[#0A101D] border-t border-white/10 space-y-3 shrink-0">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Manual SKU or Barcode entry (+1)..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-forest"
          />
          <button
            type="submit"
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold"
          >
            +1 Scan
          </button>
        </form>

        {/* Quick Tap SKU Tiles */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Quick Tap to Increment (+1)</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {items.map(item => (
              <button
                key={item.sku}
                onClick={() => handleIncrement(item.sku)}
                className="shrink-0 bg-white/5 border border-white/10 hover:border-forest p-2 rounded-lg text-left transition-all active:scale-95"
              >
                <p className="text-xs font-semibold text-white/90 truncate max-w-[120px]">{item.sku}</p>
                <p className="text-[10px] text-white/50">
                  Scanned: <span className="text-forest font-bold">{item.manila_scanned_qty}</span> / {item.italy_packed_qty}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
