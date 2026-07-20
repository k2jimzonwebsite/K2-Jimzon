import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BoxIcon, CheckIcon, AlertIcon, GridIcon } from '../../components/ui/icons'
import { supabase } from '../../lib/supabaseClient'
import { Html5Qrcode } from 'html5-qrcode'
import ScanToAiModal from './ScanToAiModal'
import SmartPasteModal from './SmartPasteModal'

export default function OutboundSourcing() {
  const [packing, setPacking] = useState(false)
  const [manifest, setManifest] = useState([]) // Array of {sku, title, quantity}
  const [supplierName, setSupplierName] = useState("Italy Warehouse")
  
  const [triggerActive, setTriggerActive] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const scannerRef = useRef(null)
  const [scannerActive, setScannerActive] = useState(false)
  
  const [showAiScanner, setShowAiScanner] = useState(false)
  const [showSmartPaste, setShowSmartPaste] = useState(false)
  const [missingSku, setMissingSku] = useState(null)
  const [saving, setSaving] = useState(false)

  const startScanner = () => {
    if (scannerActive) return
    setScannerActive(true)
    setTimeout(() => {
      if (!document.getElementById("outbound-qr-reader")) return;
      const html5QrCode = new Html5Qrcode("outbound-qr-reader")
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
    }, 100)
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

  const handleScan = async (sku) => {
    // Only process scan if the manual trigger was pressed
    if (!triggerActive) return
    setTriggerActive(false) // consume the trigger
    
    // Check if it exists in DB
    const { data: product, error } = await supabase.from('products').select('sku, title').eq('sku', sku).single()
    
    if (product) {
      if (navigator.vibrate) navigator.vibrate(50)
      // Exists! Add to manifest
      addToManifest(product.sku, product.name)
      setLastScan({ type: 'success', message: `Added: ${product.name}` })
      setTimeout(() => setLastScan(null), 3000)
    } else {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      stopScanner() // Pause scanner to process AI flow
      // Does not exist! Launch AI flow
      setLastScan({ type: 'error', message: `Unknown SKU: ${sku}. Creating new product...` })
      setMissingSku(sku)
      setShowAiScanner(true)
    }
  }

  const addToManifest = (sku, title) => {
    setManifest(prev => {
      const existing = prev.find(item => item.sku === sku)
      if (existing) {
        return prev.map(item => item.sku === sku ? { ...item, quantity: item.quantity + 1 } : item)
      } else {
        return [{ sku, title, quantity: 1 }, ...prev]
      }
    })
  }

  const handleProductAdded = async (newSku) => {
    // A new product was created via AI
    setShowSmartPaste(false)
    setMissingSku(null)
    
    // Fetch it to get the title
    if (!newSku) {
       startScanner() // Resume scanning if they cancelled
       return
    }

    const { data: product } = await supabase.from('products').select('sku, title').eq('sku', newSku).single()
    if (product) {
      addToManifest(product.sku, product.name)
      setLastScan({ type: 'success', message: `Created & Added: ${product.name}` })
    }
    setTimeout(() => setLastScan(null), 3000)
    startScanner() // Resume scanning
  }

  const handleSealBox = async () => {
    if (manifest.length === 0) return
    setSaving(true)
    
    // 1. Get or Create "Italy Warehouse" Supplier
    let suppId = null
    const { data: supps } = await supabase.from('suppliers').select('id').eq('name', supplierName).limit(1)
    if (supps && supps.length > 0) {
      suppId = supps[0].id
    } else {
      const { data: newSupp } = await supabase.from('suppliers').insert([{ name: supplierName }]).select('id').single()
      if (newSupp) suppId = newSupp.id
    }
    
    if (!suppId) {
      alert("Failed to resolve supplier.")
      setSaving(false)
      return
    }

    // 2. Create Purchase Order (Status = Sent)
    const poNumber = `PO-ITA-${Math.floor(Math.random()*100000)}`
    const { data: po, error: poErr } = await supabase.from('purchase_orders').insert([{
      supplier_id: suppId,
      po_number: poNumber,
      status: 'Sent',
      expected_delivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +14 days
    }]).select('id').single()

    if (poErr || !po) {
      alert("Failed to create shipment.")
      setSaving(false)
      return
    }

    // 3. Create PO Lines
    const lines = manifest.map(item => ({
      po_id: po.id,
      sku: item.sku,
      quantity: item.quantity,
      unit_cost: 0 // Default to 0 for now
    }))

    const { error: linesErr } = await supabase.from('po_lines').insert(lines)
    
    if (linesErr) {
      alert("Failed to save box contents.")
    } else {
      alert(`Box Sealed & Shipped! (PO Number: ${poNumber}). The Philippines team can now see it incoming.`)
      setManifest([])
      setPacking(false)
    }
    
    setSaving(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopScanner()
  }, [])

  const totalItems = manifest.reduce((sum, item) => sum + item.quantity, 0)

  if (!packing) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 relative flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mx-auto w-20 h-20 bg-forest/20 rounded-full flex items-center justify-center mb-6">
            <BoxIcon className="text-forest" size={40} />
          </div>
          <h2 className="text-2xl font-serif text-white mb-2">Outbound Sourcing (Italy)</h2>
          <p className="text-white/60 mb-8 leading-relaxed">
            Scan items as you pack them into the box. Unknown items will be automatically cataloged by the AI. When finished, seal the box to notify the Philippines warehouse.
          </p>
          <button 
            onClick={() => { setPacking(true); startScanner(); }}
            className="w-full rounded-xl bg-forest py-4 text-navy font-bold text-lg shadow-[0_0_30px_rgba(205,250,119,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            Start Packing a Box
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-100px)]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
        <div>
          <h2 className="text-lg font-serif text-white flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-forest pulse-dot"></span>
            Live Packing Session
          </h2>
          <p className="text-sm text-white/50 mt-1">Scanning items into the outbound box.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/50">Box Total</p>
          <p className="text-xl font-bold text-forest">{totalItems} Units</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* Left Side: Camera Scanner */}
        <div className="flex-1 flex flex-col min-h-[300px]">
          <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-inner flex-1 flex flex-col">
            {!scannerActive ? (
              <div 
                onClick={startScanner}
                className="flex-1 flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <GridIcon className="text-white/30 mb-3" size={40} />
                <p className="text-white font-medium">Camera Paused</p>
                <p className="text-sm text-white/40 mt-1">Tap to resume scanning</p>
              </div>
            ) : (
              <div className="flex-1 w-full bg-black relative flex flex-col">
                <div className="flex-1 relative">
                  <div id="outbound-qr-reader" className="absolute inset-0 object-cover"></div>
                  <button 
                    onClick={stopScanner}
                    className="absolute top-4 right-4 bg-black/60 backdrop-blur text-white/80 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-black/80 hover:text-white z-10"
                  >
                    Stop Scanning
                  </button>
                  
                  {triggerActive && (
                    <div className="absolute inset-0 border-4 border-forest/50 animate-pulse pointer-events-none z-10" />
                  )}
                </div>
                
                {/* Manual Trigger Button */}
                <div className="bg-black p-4 shrink-0 border-t border-white/10 relative z-20">
                  <button
                    onClick={() => setTriggerActive(true)}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                      triggerActive 
                        ? 'bg-amber text-black animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.4)]' 
                        : 'bg-forest text-navy shadow-[0_0_20px_rgba(205,250,119,0.3)] hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    <GridIcon size={24} />
                    {triggerActive ? 'Aim at Barcode...' : 'Trigger Scan'}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Feedback Toast */}
          <div className="mt-4 h-14 shrink-0">
            <AnimatePresence>
              {lastScan && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg ${
                    lastScan.type === 'success' 
                      ? 'bg-forest/20 text-forest border border-forest/30' 
                      : 'bg-amber/20 text-amber border border-amber/30'
                  }`}
                >
                  {lastScan.type === 'success' ? <CheckIcon size={18} /> : <AlertIcon size={18} />}
                  {lastScan.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Manifest Checklist */}
        <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-white/90">Current Box Manifest</h3>
            <span className="bg-forest/20 text-forest text-xs font-bold px-2 py-0.5 rounded-full">{manifest.length} Unique SKUs</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {manifest.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <BoxIcon size={32} className="mb-2" />
                <p className="text-sm">Box is empty.</p>
                <p className="text-xs mt-1">Scan an item to add it.</p>
              </div>
            ) : (
              manifest.map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white line-clamp-1">{item.name}</p>
                    <p className="text-xs text-white/50 font-mono mt-0.5">{item.sku}</p>
                  </div>
                  <div className="bg-forest/20 text-forest px-3 py-1 rounded font-bold tabular">
                    x{item.quantity}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-white/10 bg-black/40 shrink-0">
            <button 
              onClick={handleSealBox}
              disabled={manifest.length === 0 || saving}
              className="w-full bg-blue text-white font-bold py-3.5 rounded-xl transition-all hover:bg-blue/90 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              <BoxIcon size={20} />
              {saving ? 'Sealing Box...' : 'Seal & Ship Box'}
            </button>
          </div>
        </div>
        
      </div>

      {/* AI Product Creation Overlays */}
      {showAiScanner && (
        <ScanToAiModal 
          onClose={() => {
            setShowAiScanner(false)
            startScanner() // Resume if they cancel
          }} 
          onOpenSmartPaste={() => {
            setShowAiScanner(false)
            setShowSmartPaste(true)
          }}
        />
      )}

      {showSmartPaste && (
        <SmartPasteModal 
          onClose={() => {
            setShowSmartPaste(false)
            startScanner()
          }} 
          onProductAdded={handleProductAdded} 
        />
      )}
    </div>
  )
}
