import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Html5Qrcode } from 'html5-qrcode'
import { buildProject1Prompt, RESEARCH_MODES } from './productResearchPrompt'

export default function ScanToAiModal({ onClose, onOpenSmartPaste }) {
  const [step, setStep]               = useState('scan')   // 'scan' | 'manual' | 'result'
  const [barcode, setBarcode]         = useState('')
  const [manualBarcode, setManualBarcode] = useState('')
  const [productName, setProductName] = useState('')
  const [researchMode, setResearchMode] = useState('complete')
  const [promptText, setPromptText]   = useState('')
  const [copied, setCopied]           = useState(false)
  const [checking, setChecking]       = useState(false)
  const [checkError, setCheckError]   = useState('')
  const scannerRef                    = useRef(null)

  // ── Start camera scanner ─────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'scan') return
    const timer = setTimeout(() => {
      if (!document.getElementById('ai-qr-reader')) return
      const html5QrCode = new Html5Qrcode('ai-qr-reader')
      scannerRef.current = html5QrCode
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 140 }, aspectRatio: 1.0 },
        async (decodedText) => {
          const scanner = scannerRef.current
          scannerRef.current = null
          try { if (scanner) { await scanner.stop(); scanner.clear() } } catch {}
          if (navigator.vibrate) navigator.vibrate(60)
          await handleBarcodeDetected(decodedText)
        },
        () => {}
      ).catch(() => setCheckError('Camera access was denied or is unavailable. Use manual entry instead.'))
    }, 300)
    return () => {
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [step])

  // ── Check Supabase + build prompt ────────────────────────────────────────
  const handleBarcodeDetected = async (code) => {
    setCheckError('')
    setChecking(true)
    if (code && supabase) {
      const { data, error } = await supabase.from('products').select('sku').eq('barcode', code).maybeSingle()
      if (error) {
        setCheckError(`Inventory verification failed: ${error.message}`)
        setChecking(false)
        return
      }
      if (data) {
        setCheckError(`Barcode ${code} already belongs to SKU ${data.sku}. Open that product instead of creating a duplicate.`)
        setChecking(false)
        return
      }
    } else if (code && !supabase) {
      setCheckError('The prompt is ready, but inventory duplicate checking is unavailable. Verify the barcode before creating a draft.')
    }
    setBarcode(code)
    setPromptText(buildProject1Prompt({ barcode: code, productName, researchMode }))
    setStep('result')
    setChecking(false)
  }

  // ── Manual entry submit ──────────────────────────────────────────────────
  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!manualBarcode.trim() && !productName.trim()) return
    await handleBarcodeDetected(manualBarcode.trim())
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleOpenSmartPaste = () => {
    onClose()
    if (onOpenSmartPaste) onOpenSmartPaste()
  }

  return (
    <div className="fixed inset-0 z-[115] flex flex-col bg-adm-sunken text-white" role="dialog" aria-modal="true" aria-labelledby="new-product-scan-title">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-adm-line bg-black/30 shrink-0">
        <div>
          <p id="new-product-scan-title" className="text-xl font-semibold">
            {step === 'result' ? 'Product research prompt ready' : 'Scan a new product'}
          </p>
          <p className="text-sm text-white/60 mt-0.5">
            {step === 'scan'   && 'Point camera at the product barcode'}
            {step === 'manual' && 'Type the barcode or product name manually'}
            {step === 'result' && 'Review, copy, attach packaging photos, then import only after human verification'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step === 'scan' && (
            <button
              onClick={() => setStep('manual')}
              className="text-sm font-semibold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
            >
              Type manually
            </button>
          )}
          {step === 'manual' && (
            <button
              onClick={() => setStep('scan')}
              className="text-sm font-semibold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
            >
              Use camera
            </button>
          )}
          <button onClick={onClose} aria-label="Close modal" className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {checkError && (
        <div role="alert" className="mx-5 mt-4 rounded-adm-sm border border-amber/35 bg-amber/10 px-4 py-3 text-sm text-amber">
          {checkError}
        </div>
      )}

      {step !== 'result' && (
        <div className="border-b border-adm-line bg-white/[0.02] px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/40">Research focus</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="radiogroup" aria-label="Product research focus">
            {RESEARCH_MODES.map(mode => (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={researchMode === mode.id}
                title={mode.hint}
                onClick={() => setResearchMode(mode.id)}
                className={`min-h-10 shrink-0 rounded-adm-sm border px-3 text-left text-xs transition-colors ${researchMode === mode.id ? 'border-blue/50 bg-blue/15 text-white' : 'border-adm-line bg-white/[0.025] text-white/55 hover:text-white'}`}
              >
                <span className="block font-semibold">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 flex flex-col">

        {/* ── SCAN: Camera ── */}
        {step === 'scan' && (
          <div className="w-full max-w-sm mx-auto flex flex-col gap-6 justify-center flex-1 pb-16">
            <div id="ai-qr-reader" className="w-full rounded-adm overflow-hidden bg-white/5 border border-adm-line" />
            <p className="text-center text-base text-white/60">Align the barcode inside the frame</p>
            {checking && (
              <div className="flex items-center justify-center gap-2 text-base text-white/50">
                <div className="w-4 h-4 border-2 border-blue border-t-transparent rounded-full animate-spin" />
                Checking inventory…
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL: Type barcode or name ── */}
        {step === 'manual' && (
          <div className="w-full max-w-sm mx-auto flex flex-col gap-6 justify-center flex-1 pb-16">
            <div className="text-center space-y-1 mb-2">
              <p className="font-semibold text-white">Enter Product Details</p>
              <p className="text-sm text-white/60">Barcode and/or product name will be included in the AI prompt</p>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-1.5 uppercase tracking-widest">Barcode / EAN</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="e.g. 8000400289000"
                  className="w-full bg-white/5 border border-adm-line rounded-adm-sm px-4 py-3 text-white font-mono text-base focus:border-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-1.5 uppercase tracking-widest">Product Name <span className="normal-case font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Mutti Polpa 400g"
                  className="w-full bg-white/5 border border-adm-line rounded-adm-sm px-4 py-3 text-white text-base focus:border-blue focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!manualBarcode.trim() && !productName.trim()}
                className="w-full bg-blue text-navy font-bold py-3.5 rounded-adm-sm hover:opacity-90 disabled:opacity-30 transition-all"
              >
                Generate AI Prompt →
              </button>
            </form>
          </div>
        )}

        {/* ── RESULT: Ready prompt ── */}
        {step === 'result' && (
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pb-6 gap-5">

            {/* Scanned info badge */}
            <div className="flex items-center gap-3 bg-forest/10 border border-forest/30 rounded-adm-sm px-4 py-3">
              <div>
                <p className="text-base font-semibold text-white">
                  {productName || 'Product'} {barcode && <span className="font-mono text-sm text-white/60 ml-1">· {barcode}</span>}
                </p>
                <p className="text-sm text-white/60 mt-0.5">Duplicate check passed when available · Focus: {RESEARCH_MODES.find(mode => mode.id === researchMode)?.label}</p>
              </div>
            </div>

            {/* Prompt Box */}
            <div className="bg-white/5 border border-adm-line rounded-adm-sm overflow-hidden flex flex-col flex-1 min-h-[280px]">
              <div className="bg-black/40 px-4 py-3 flex items-center justify-between border-b border-adm-line shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Evidence-first prompt</span>
                  <span className="text-xs font-bold bg-blue/20 text-blue px-2 py-0.5 rounded-full border border-blue/30">Human review required</span>
                </div>
                <span className="text-xs font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">EDITABLE</span>
              </div>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full flex-1 bg-transparent text-white p-4 text-sm font-mono resize-none focus:outline-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* How-to steps */}
            <div className="bg-black/20 border border-white/5 rounded-adm-sm p-4 space-y-2.5">
              <p className="text-xs font-bold text-white/55 uppercase tracking-widest mb-3">What to do next</p>
              {[
                ['Copy the prompt below', 'Hit the white button to copy it to your clipboard.'],
                ['Open your research tool', 'Use the K2 Jimzon Product Intelligence project or another tool that can inspect the attached packaging photos.'],
                ['Attach the packaging photo', 'Drag the product photo into the message box.'],
                ['Paste and run', 'The tool must return the draft JSON, image prompt, source URLs, and review notes.'],
                ['Verify, then Smart Paste', 'Check every factual claim and copy only Section 1 into Smart Paste.'],
              ].map(([title, body], i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-blue/20 text-blue text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-white/50"><span className="text-neutral-300 font-semibold">{title}</span> — {body}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCopy}
                className="w-full bg-white text-black font-bold py-3.5 rounded-adm-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <><span className="text-green-600">✓</span> Copied to Clipboard!</>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Copy product research prompt
                  </>
                )}
              </button>

              <button
                onClick={handleOpenSmartPaste}
                className="w-full bg-purple-600 text-white font-bold py-4 rounded-adm-sm shadow-[0_0_24px_rgba(168,85,247,0.25)] hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Open Smart Paste review
              </button>

              <button
                onClick={() => { setStep('scan'); setBarcode(''); setProductName(''); setManualBarcode('') }}
                className="w-full text-white/55 hover:text-white/60 text-base py-2 transition-colors"
              >
                Scan another product
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
