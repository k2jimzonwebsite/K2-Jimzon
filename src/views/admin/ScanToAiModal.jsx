import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Html5Qrcode } from 'html5-qrcode'

export default function ScanToAiModal({ onClose, onOpenSmartPaste }) {
  const [step, setStep] = useState('scan') // 'scan', 'result'
  const [sku, setSku] = useState('')
  const [copied, setCopied] = useState(false)
  const scannerRef = useRef(null)

  useEffect(() => {
    if (step === 'scan') {
      const timer = setTimeout(() => {
        if (!document.getElementById("ai-qr-reader")) return;
        
        const html5QrCode = new Html5Qrcode("ai-qr-reader")
        scannerRef.current = html5QrCode
        
        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0
          },
          async (decodedText) => {
            // Prevent double-stop by grabbing reference and nullifying it
            const scanner = scannerRef.current
            scannerRef.current = null
            
            try {
              if (scanner) {
                await scanner.stop()
                scanner.clear()
              }
            } catch (e) {
              console.error("Error stopping scanner", e)
            }
            
            if (navigator.vibrate) navigator.vibrate(50)
            
            try {
              if (supabase) {
                // Check if SKU already exists
                const { data } = await supabase.from('products').select('sku').eq('sku', decodedText).single()
                
                if (data) {
                  alert(`Product with barcode ${decodedText} already exists in inventory!`)
                  onClose()
                  return
                }
              }
            } catch (e) {
              console.error("Supabase check error", e)
            }

            setSku(decodedText)
            setStep('result')
          },
          (errorMessage) => {
            // parse errors are frequent, ignore them
          }
        ).catch((err) => {
          console.error("Failed to start camera", err)
          alert("Camera access denied or unavailable. Please ensure permissions are granted.")
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
    }
  }, [step, onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(sku)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenSmartPaste = () => {
    onClose() // Close this modal
    if (onOpenSmartPaste) onOpenSmartPaste()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#05080f] animate-in slide-in-from-bottom-4 text-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-black/20">
        <div>
          <p className="font-serif text-lg font-semibold">
            {step === 'scan' ? 'Scan New Box' : 'SKU Captured!'}
          </p>
          <p className="text-xs text-white/50">
            {step === 'scan' ? 'Scan a barcode to extract the SKU' : 'Ready for AI generation'}
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
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center h-full pb-20">
            <div id="ai-qr-reader" className="w-full rounded-lg overflow-hidden bg-white/5" />
            <p className="text-center text-sm text-white/40 mt-6">Point your camera at the barcode.</p>
          </div>
        )}

        {step === 'result' && (
          <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pb-20">
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center mb-8">
              <p className="text-sm text-white/50 mb-2 uppercase tracking-widest font-bold">Scanned SKU</p>
              <p className="text-4xl font-mono font-bold text-white mb-6 tracking-wider">{sku}</p>
              
              <button 
                onClick={handleCopy}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {copied ? 'Copied to Clipboard!' : 'Copy SKU'}
              </button>
            </div>

            <div className="text-center space-y-6">
              <div className="space-y-2 text-sm text-white/60">
                <p>1. Open your ChatGPT / Gemini app.</p>
                <p>2. Paste the SKU and ask it to generate the product.</p>
                <p>3. Copy the code it gives you, then open Smart Paste.</p>
              </div>

              <button 
                onClick={handleOpenSmartPaste}
                className="w-full bg-purple-500 text-white font-bold py-4 rounded-xl transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:bg-purple-400 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Open Smart Paste AI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
