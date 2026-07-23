import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BoxIcon, CheckIcon, AlertIcon, GridIcon } from '../../components/ui/icons'
import { Html5Qrcode } from 'html5-qrcode'

export default function CustomerPackModal({ order, onClose, onConfirmPacked }) {
  const [scannedItems, setScannedItems] = useState({})
  const [lastScan, setLastScan] = useState(null)
  
  const [triggerActive, setTriggerActive] = useState(false)
  const scannerRef = useRef(null)
  const [scannerActive, setScannerActive] = useState(false)

  // Calculate if all items are fully scanned
  const isComplete = order.items.every(item => (scannedItems[item.sku] || 0) >= item.quantity)

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
    if (isComplete || !triggerActive) return
    setTriggerActive(false) // Consume trigger

    if (navigator.vibrate) navigator.vibrate(50)

    const targetItem = order.items.find(i => i.sku === sku)

    if (targetItem) {
      // Match!
      setScannedItems(prev => {
        const currentCount = prev[sku] || 0
        if (currentCount >= targetItem.quantity) {
          setLastScan({ type: 'error', message: `Already fully scanned: ${targetItem.product?.title || sku}` })
          if (navigator.vibrate) navigator.vibrate([100, 50, 100])
          return prev
        }
        const next = { ...prev, [sku]: currentCount + 1 }
        
        // Check if this was the last item needed overall
        const willBeComplete = order.items.every(item => (next[item.sku] || 0) >= item.quantity)
        if (willBeComplete) {
          stopScanner()
        }
        
        setLastScan({ type: 'success', message: `Matched! ${targetItem.product?.title || sku}` })
        return next
      })
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#09090b]/95 backdrop-blur-sm animate-in fade-in p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col bg-[#0A101D] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 shrink-0">
          <div>
            <h2 className="font-serif text-xl font-semibold text-white">Pack Shipment #{order.id.split('_')[0].slice(-5)}</h2>
            <p className="text-base text-white/50 mt-1">Scan items to verify parcel contents.</p>
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
                  <p className="text-base text-white/40 mt-1">Tap to resume scanning</p>
                </div>
              ) : isComplete ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-forest/10">
                   <div className="w-16 h-16 bg-forest/20 text-forest rounded-full flex items-center justify-center mb-4">
                     <CheckIcon size={32} />
                   </div>
                   <p className="text-white font-bold text-xl">Order Fully Packed</p>
                   <p className="text-forest text-base mt-1">All items verified.</p>
                 </div>
              ) : (
                <div className="flex-1 w-full h-full relative flex flex-col">
                  <div className="flex-1 relative">
                    <div id="customer-qr-reader" className="absolute inset-0 object-cover w-full h-full"></div>
                    <button 
                      onClick={stopScanner}
                      className="absolute top-4 right-4 bg-black/60 backdrop-blur text-neutral-300 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-black/80 hover:text-white z-10"
                    >
                      Stop Scanning
                    </button>
                    {triggerActive && (
                      <div className="absolute inset-0 border-4 border-blue/50 animate-pulse pointer-events-none z-10" />
                    )}
                  </div>
                  
                  {/* Manual Trigger Button */}
                  <div className="bg-black p-4 shrink-0 border-t border-white/10 relative z-20">
                    <button
                      onClick={() => setTriggerActive(true)}
                      className={`w-full py-4 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-2 ${
                        triggerActive 
                          ? 'bg-blue text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' 
                          : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                      }`}
                    >
                      <GridIcon size={24} />
                      {triggerActive ? 'Hold barcode in frame...' : 'Tap to Trigger Scanner'}
                    </button>
                    <p className="text-center mt-2 text-sm text-white/30">Required for accuracy verification</p>
                  </div>
                </div>
              )}
            </div>
            
            <AnimatePresence>
              {lastScan && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute top-10 left-10 right-10 p-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md ${
                    lastScan.type === 'success' ? 'bg-forest/90 text-white border border-forest-light/50' : 'bg-crimson/90 text-white border border-crimson-light/50'
                  }`}
                >
                  {lastScan.type === 'success' ? <CheckIcon size={24} /> : <AlertIcon size={24} />}
                  <span className="font-medium">{lastScan.message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Side: Order Info */}
          <div className="w-full md:w-80 bg-[#09090b] flex flex-col shrink-0">
            <div className="p-6 flex-1 overflow-y-auto">
              <h3 className="text-base font-bold text-white/50 uppercase tracking-widest mb-4">Items to Pack</h3>
              <div className="space-y-4">
                {order.items.map(item => {
                  const qtyScanned = scannedItems[item.sku] || 0
                  const isItemComplete = qtyScanned >= item.quantity
                  return (
                    <div key={item.sku} className={`p-3 rounded-lg border ${isItemComplete ? 'border-forest/30 bg-forest/10' : 'border-white/10 bg-white/5'} flex items-start gap-3 transition-colors`}>
                      <div className={`shrink-0 mt-0.5 ${isItemComplete ? 'text-forest' : 'text-neutral-500'}`}>
                        {isItemComplete ? <CheckIcon size={18} /> : <BoxIcon size={18} />}
                      </div>
                      <div>
                        <p className={`font-medium text-base line-clamp-2 ${isItemComplete ? 'text-forest-light' : 'text-neutral-200'}`}>
                          {item.product?.title || item.sku}
                        </p>
                        <p className="text-sm font-mono text-white/40 mt-1">
                          Scanned: {qtyScanned} / {item.quantity}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 bg-black/20">
              <button
                onClick={() => onConfirmPacked(order.id, order.order_status, order.items)}
                disabled={!isComplete}
                className={`w-full py-4 rounded-xl font-bold text-xl transition-all shadow-lg ${
                  isComplete 
                    ? 'bg-blue hover:bg-blue-light text-white shadow-blue/20' 
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                Mark as Packed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
