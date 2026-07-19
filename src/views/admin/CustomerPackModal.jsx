import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BoxIcon, CheckIcon, AlertIcon, GridIcon } from '../../components/ui/icons'
import { Html5Qrcode } from 'html5-qrcode'

export default function CustomerPackModal({ order, onClose, onConfirmPacked }) {
  const [scanned, setScanned] = useState(0)
  const [lastScan, setLastScan] = useState(null)
  
  const scannerRef = useRef(null)
  const [scannerActive, setScannerActive] = useState(false)

  const isComplete = scanned >= order.quantity

  const startScanner = () => {
    if (scannerActive) return
    setScannerActive(true)
    setTimeout(() => {
      if (!document.getElementById("customer-qr-reader")) return;
      const html5QrCode = new Html5Qrcode("customer-qr-reader")
      scannerRef.current = html5QrCode
      
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
        (decodedText) => {
          handleScan(decodedText)
        },
        (errorMessage) => {}
      ).catch((err) => {
        console.error("Failed to start camera", err)
        setScannerActive(false)
      })
    }, 300)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      } catch (e) {
        console.error(e)
      }
    }
    setScannerActive(false)
  }

  const handleScan = (sku) => {
    if (isComplete) return
    if (navigator.vibrate) navigator.vibrate(50)

    if (sku === order.sku) {
      // Match!
      setScanned(prev => {
        const next = prev + 1
        if (next >= order.quantity) {
          stopScanner() // Stop scanner if complete
        }
        return next
      })
      setLastScan({ type: 'success', message: `Matched! ${order.products?.title || order.sku}` })
    } else {
      // Wrong item
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      setLastScan({ type: 'error', message: `Wrong Item: ${sku}` })
    }
    
    setTimeout(() => setLastScan(null), 2500)
  }

  useEffect(() => {
    startScanner()
    return () => stopScanner()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05080f]/95 backdrop-blur-sm animate-in fade-in p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col bg-[#0A101D] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 shrink-0">
          <div>
            <h2 className="font-serif text-xl font-semibold text-white">Pack Order #{order.id.split('-')[0]}</h2>
            <p className="text-sm text-white/50 mt-1">Scan items to pack this parcel.</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded bg-white/5 p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            Cancel
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Side: Camera Scanner */}
          <div className="flex-1 flex flex-col p-6 border-r border-white/10 bg-black/20 relative">
            <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-inner flex-1 flex flex-col min-h-[300px]">
              {!scannerActive && !isComplete ? (
                <div 
                  onClick={startScanner}
                  className="flex-1 flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <GridIcon className="text-white/30 mb-3" size={40} />
                  <p className="text-white font-medium">Camera Paused</p>
                  <p className="text-sm text-white/40 mt-1">Tap to resume scanning</p>
                </div>
              ) : isComplete ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-forest/10">
                   <div className="w-16 h-16 bg-forest/20 text-forest rounded-full flex items-center justify-center mb-4">
                     <CheckIcon size={32} />
                   </div>
                   <p className="text-white font-bold text-lg">Order Fully Packed</p>
                   <p className="text-forest text-sm mt-1">All items verified.</p>
                 </div>
              ) : (
                <div className="flex-1 w-full h-full relative">
                  <div id="customer-qr-reader" className="absolute inset-0 object-cover w-full h-full"></div>
                  <button 
                    onClick={stopScanner}
                    className="absolute top-4 right-4 bg-black/60 backdrop-blur text-white/80 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-black/80 hover:text-white"
                  >
                    Pause Camera
                  </button>
                </div>
              )}
            </div>

            {/* Feedback Toast */}
            <div className="absolute bottom-10 left-0 w-full flex justify-center px-6">
              <AnimatePresence>
                {lastScan && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className={`rounded-xl px-6 py-3 text-sm font-bold flex items-center gap-3 shadow-2xl ${
                      lastScan.type === 'success' 
                        ? 'bg-forest text-navy border border-forest/30' 
                        : 'bg-crimson text-white border border-crimson/50'
                    }`}
                  >
                    {lastScan.type === 'success' ? <CheckIcon size={20} /> : <AlertIcon size={20} />}
                    {lastScan.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Side: Order Manifest */}
          <div className="w-full md:w-96 flex flex-col bg-[#05080f]">
            <div className="p-6 flex-1 overflow-y-auto">
              <h3 className="font-semibold text-white/80 uppercase tracking-widest text-xs mb-4">Packing Checklist</h3>
              
              <div className={`rounded-xl border ${isComplete ? 'border-forest bg-forest/10' : 'border-white/10 bg-white/5'} p-4 flex gap-4 items-center transition-colors`}>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white leading-tight mb-1">{order.products?.title || order.sku}</p>
                  <p className="text-xs font-mono text-white/50">{order.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-1">Status</p>
                  <div className="text-2xl font-black tabular">
                    <span className={scanned >= order.quantity ? 'text-forest' : 'text-white'}>{scanned}</span>
                    <span className="text-white/30"> / {order.quantity}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-black/40 shrink-0">
              <button 
                onClick={onConfirmPacked}
                disabled={!isComplete}
                className="w-full bg-blue text-white font-bold py-4 rounded-xl transition-all hover:bg-blue/90 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                <BoxIcon size={22} />
                Confirm Parcel is Packed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
