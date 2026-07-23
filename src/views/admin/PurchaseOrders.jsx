import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CheckIcon } from '../../components/ui/icons'
import { peso } from '../../data/products'
import { Html5Qrcode } from 'html5-qrcode'

function ScannerModal({ po, onClose, onComplete }) {
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const scannerRef = useRef(null)

  useEffect(() => {
    const fetchLines = async () => {
      if (!po || !po.id.startsWith('po-')) {
        // mock data fallback
        setLines([
          { id: '1', sku: 'TRUFFLE-001', quantity: 12, scanned: 0, products: { name: 'Urbani Truffle Oil' } },
          { id: '2', sku: 'PASTA-002', quantity: 24, scanned: 0, products: { name: 'De Cecco Linguine' } }
        ])
        setLoading(false)
        return
      }
      
      const { data } = await supabase.from('po_lines').select('*, products(title)').eq('po_id', po.id)
      if (data) {
        setLines(data.map(l => ({ ...l, scanned: 0 })))
      }
      setLoading(false)
    }
    fetchLines()
  }, [po])

  useEffect(() => {
    if (loading) return;
    
    const timer = setTimeout(() => {
      if (!document.getElementById("qr-reader")) return;
      
      const html5QrCode = new Html5Qrcode("qr-reader")
      scannerRef.current = html5QrCode

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Debounce or just update state functionally
          setLines(prev => {
            const matchIndex = prev.findIndex(l => l.sku === decodedText)
            if (matchIndex === -1) return prev // SKU not in this PO
            
            const match = prev[matchIndex]
            if (match.scanned >= match.quantity) return prev // Already fully scanned
            
            const newLines = [...prev]
            newLines[matchIndex] = { ...match, scanned: match.scanned + 1 }
            
            // Optional: vibrate phone on success
            if (navigator.vibrate) navigator.vibrate(50)
            
            return newLines
          })
        },
        (errorMessage) => {
          // Ignore frequent parse errors
        }
      ).catch((err) => {
        console.error("Failed to start scanner:", err)
        alert("Camera access denied. Please allow camera permissions.")
      })
    }, 300)

    return () => {
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear()
        }).catch(console.error)
      }
    }
  }, [loading])

  const handleComplete = async () => {
    setProcessing(true)
    
    const scannedItems = lines.filter(l => l.scanned > 0).map(l => ({
      sku: l.sku,
      scanned_qty: l.scanned
    }))
    
    if (po.id.startsWith('po-')) { // Actual DB
      const { error } = await supabase.rpc('receive_po_scanned', { 
        p_po_id: po.id, 
        p_scanned: scannedItems 
      })
      
      if (error) {
        alert("Error updating inventory: " + error.message)
        setProcessing(false)
        return
      }
    }

    onComplete(po.id)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#09090b] animate-in slide-in-from-bottom-4 text-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-black/20">
        <div>
          <p className="font-serif text-xl font-semibold">Receive {po.po_number}</p>
          <p className="text-sm text-white/50">Point camera at product barcodes</p>
        </div>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Scanner Window */}
        <div className="bg-black border-b border-white/10 p-4">
          <div id="qr-reader" className="mx-auto max-w-sm rounded-lg overflow-hidden bg-white/5" />
        </div>

        {/* List of Expected Items */}
        <div className="p-4 space-y-3">
          <h3 className="text-base font-bold uppercase tracking-widest text-white/55 mb-2">Checklist</h3>
          {loading ? (
            <p className="text-sm text-white/50">Loading expected items...</p>
          ) : (
            lines.map(line => {
              const isComplete = line.scanned >= line.quantity
              return (
                <div key={line.id} className={`flex items-center justify-between p-3 rounded-lg border ${isComplete ? 'border-forest/50 bg-forest/10' : 'border-white/10 bg-white/5'}`}>
                  <div>
                    <p className="text-base font-medium">{line.products?.name || line.sku}</p>
                    <p className="text-sm font-mono text-white/50">{line.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold tabular ${isComplete ? 'text-forest' : 'text-blue'}`}>
                      {line.scanned} <span className="text-base font-normal text-white/60">/ {line.quantity}</span>
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="p-4 border-t border-white/10 bg-black/40 pb-safe">
        <button 
          onClick={handleComplete}
          disabled={processing || lines.filter(l => l.scanned > 0).length === 0}
          className="w-full rounded-lg bg-forest py-3.5 text-base font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-forest/20"
        >
          {processing ? 'Saving...' : 'Finalize Restock'}
        </button>
      </div>
    </div>
  )
}

export default function PurchaseOrders() {
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanningPo, setScanningPo] = useState(null)

  useEffect(() => {
    fetchPOs()
  }, [])

  const fetchPOs = async () => {
    if (!supabase) return;
    setLoading(true)
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false })
    
    if (error || !data) {
      setPos([
        { id: 'po-1', po_number: 'PO-2026-001', suppliers: { name: 'Milano Distributors' }, status: 'Sent', total_amount: 45000, expected_delivery: '2026-07-25' },
        { id: 'po-2', po_number: 'PO-2026-002', suppliers: { name: 'Roma Coffee Roasters' }, status: 'Received', total_amount: 12000, expected_delivery: '2026-07-15' },
      ])
    } else {
      setPos(data || [])
    }
    setLoading(false)
  }

  const handleScanComplete = (poId) => {
    setPos(prev => prev.map(p => p.id === poId ? { ...p, status: 'Received' } : p))
    setScanningPo(null)
    alert(`Success! Inventory levels have been restocked from scan.`)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {scanningPo && (
        <ScannerModal 
          po={scanningPo} 
          onClose={() => setScanningPo(null)} 
          onComplete={handleScanComplete} 
        />
      )}

      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-serif text-white">Incoming Deliveries</h2>
          <p className="text-base text-white/50 mt-1">Scan barcodes to accurately restock inventory.</p>
        </div>
        <button className="rounded bg-forest px-4 py-2 text-base font-semibold text-white hover:bg-forest/90 transition-colors shadow-lg shadow-forest/20">
          + New Delivery
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#09090b] overflow-x-auto w-full">
        <table className="w-full text-left text-base text-neutral-300 min-w-[800px]">
          <thead className="bg-white/5 text-sm uppercase tracking-widest text-white/60">
            <tr>
              <th className="px-6 py-4 font-medium">PO Number</th>
              <th className="px-6 py-4 font-medium">Supplier</th>
              <th className="px-6 py-4 font-medium">Expected Date</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-white/60">Loading deliveries...</td></tr>
            ) : pos.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-white/60">No incoming deliveries found.</td></tr>
            ) : pos.map((po) => (
              <tr key={po.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-mono text-white">{po.po_number}</td>
                <td className="px-6 py-4">{po.suppliers?.name || 'Unknown'}</td>
                <td className="px-6 py-4">{po.expected_delivery || '-'}</td>
                <td className="px-6 py-4 font-mono text-forest">{peso(po.total_amount)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${
                    po.status === 'Received' ? 'bg-forest/20 text-forest' : 
                    po.status === 'Sent' ? 'bg-blue/20 text-blue' : 'bg-white/10 text-white/60'
                  }`}>
                    {po.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {po.status === 'Sent' ? (
                    <button 
                      onClick={() => setScanningPo(po)}
                      className="rounded border border-blue bg-blue/10 px-3 py-1.5 text-sm font-medium text-blue hover:bg-blue/20 transition-colors"
                    >
                      Receive Shipment (Scan)
                    </button>
                  ) : po.status === 'Received' ? (
                    <span className="flex items-center justify-end gap-1 text-sm text-forest">
                      <CheckIcon size={14} /> Restocked
                    </span>
                  ) : (
                    <button className="text-sm text-blue hover:underline">Edit Draft</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
