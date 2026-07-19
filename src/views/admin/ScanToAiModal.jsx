import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function ScanToAiModal({ onClose, onProductAdded }) {
  const [step, setStep] = useState('scan') // 'scan', 'input', 'generating', 'review'
  const [sku, setSku] = useState('')
  const [basicName, setBasicName] = useState('')
  const [generatedProduct, setGeneratedProduct] = useState(null)
  const [loadingText, setLoadingText] = useState('')
  const scannerRef = useRef(null)

  useEffect(() => {
    if (step === 'scan') {
      const timer = setTimeout(() => {
        if (!document.getElementById("ai-qr-reader")) return;
        
        const scanner = new Html5QrcodeScanner("ai-qr-reader", { 
          qrbox: { width: 250, height: 150 }, 
          fps: 5,
          aspectRatio: 1.0
        }, false)
  
        scanner.render(async (decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error)
            scannerRef.current = null
          }
          
          if (navigator.vibrate) navigator.vibrate(50)
          
          // Check if SKU exists
          const { data } = await supabase.from('products').select('sku').eq('sku', decodedText).single()
          
          if (data) {
            alert(`Product with barcode ${decodedText} already exists in inventory!`)
            onClose()
            return
          }

          setSku(decodedText)
          setStep('input')
        }, undefined)
  
        scannerRef.current = scanner
      }, 100)
  
      return () => {
        clearTimeout(timer)
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error)
          scannerRef.current = null
        }
      }
    }
  }, [step, onClose])

  const handleGenerate = () => {
    if (!basicName.trim()) return
    setStep('generating')
    setLoadingText('Connecting to AI Copilot...')

    // Simulate AI Generation Process
    setTimeout(() => setLoadingText('Analyzing product name...'), 1000)
    setTimeout(() => setLoadingText('Drafting SEO description...'), 2500)
    setTimeout(() => setLoadingText('Calculating optimal margins...'), 4000)
    setTimeout(() => {
      // Create rich mock product
      const mockPrice = Math.floor(Math.random() * 500) + 150
      setGeneratedProduct({
        sku: sku,
        title: basicName.trim(),
        description: `Premium quality ${basicName.toLowerCase()} sourced directly from our top suppliers. Perfect for everyday use or special occasions. This item guarantees exceptional value and high demand in the current market.`,
        price: mockPrice,
        wholesale_price: Math.floor(mockPrice * 0.75),
        why_buy: `High margin potential\nTop rated by customers\nFast moving goods`,
        master_stock: 0, // newly scanned, stock will be added later when received
        image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
        status: 'draft'
      })
      setStep('review')
    }, 5500)
  }

  const handleSave = async () => {
    const { error } = await supabase.from('products').insert([
      {
        sku: generatedProduct.sku,
        title: generatedProduct.title,
        description: generatedProduct.description,
        price: generatedProduct.price,
        wholesale_price: generatedProduct.wholesale_price,
        why_buy: generatedProduct.why_buy,
        image_url: generatedProduct.image_url,
        total_stock: 0,
      }
    ])

    if (error) {
      alert("Error saving product: " + error.message)
      return
    }

    if (onProductAdded) onProductAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#05080f] animate-in slide-in-from-bottom-4 text-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-black/20">
        <div>
          <p className="font-serif text-lg font-semibold">
            {step === 'scan' ? 'Scan New Product' : step === 'input' ? 'Product Name' : step === 'generating' ? 'AI Copilot' : 'Review Draft'}
          </p>
          <p className="text-xs text-white/50">
            {step === 'scan' && 'Scan a barcode to create a new SKU'}
            {step === 'input' && `Barcode: ${sku}`}
          </p>
        </div>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {step === 'scan' && (
          <div className="w-full max-w-sm mx-auto">
            <div id="ai-qr-reader" className="w-full rounded-lg overflow-hidden bg-white/5" />
            <p className="text-center text-sm text-white/40 mt-4">Point your camera at the barcode. The AI will handle the rest.</p>
          </div>
        )}

        {step === 'input' && (
          <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
            <h3 className="text-xl font-serif mb-2">What did you scan?</h3>
            <p className="text-sm text-white/50 mb-6">Enter a basic name for SKU <strong>{sku}</strong>. The AI will flesh out the rest.</p>
            
            <input 
              type="text" 
              autoFocus
              placeholder="e.g., Urbani Truffle Oil 250ml" 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 mb-6 focus:outline-none focus:border-blue"
              value={basicName}
              onChange={(e) => setBasicName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            
            <button 
              onClick={handleGenerate}
              disabled={!basicName.trim()}
              className="w-full bg-blue text-white font-bold py-3.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Generate Product Profile
            </button>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-blue animate-spin mb-6" />
            <p className="text-lg font-serif text-white mb-2">AI is working...</p>
            <p className="text-sm text-blue animate-pulse">{loadingText}</p>
          </div>
        )}

        {step === 'review' && generatedProduct && (
          <div className="max-w-md mx-auto w-full space-y-6 pb-20">
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <img src={generatedProduct.image_url} alt="Product" className="w-full h-48 object-cover" />
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-serif text-lg">{generatedProduct.title}</h3>
                  <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/60">{generatedProduct.sku}</span>
                </div>
                <p className="text-sm text-white/60 mb-4">{generatedProduct.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-white/40 mb-1">Retail Price</p>
                    <p className="font-mono text-forest font-bold">₱{generatedProduct.price.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-white/40 mb-1">Wholesale</p>
                    <p className="font-mono text-blue font-bold">₱{generatedProduct.wholesale_price.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Why Buy</p>
                  <ul className="text-sm text-white/70 space-y-1">
                    {generatedProduct.why_buy.split('\n').map((line, i) => (
                      <li key={i} className="flex gap-2"><span className="text-blue">•</span> {line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleSave}
              className="w-full bg-forest text-white font-bold py-3.5 rounded-lg transition-colors shadow-lg shadow-forest/20"
            >
              Publish to Inventory
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
