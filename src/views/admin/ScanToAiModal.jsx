import { useState, useEffect, useRef } from 'react'
import { safeUiError } from '../../lib/safeUiError'
import { searchIdentityDuplicates } from '../../services/productIntakeService'
import { Html5Qrcode } from 'html5-qrcode'
import {
  buildProductJsonPrompt,
  K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS,
  K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS,
  PRODUCT_RESEARCH_COMMANDS,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
  RESEARCH_MODES,
} from './productResearchPrompt'

export default function ScanToAiModal({ onClose, onOpenSmartPaste }) {
  const [step, setStep]               = useState('scan')   // 'scan' | 'manual' | 'result'
  const [barcode, setBarcode]         = useState('')
  const [manualBarcode, setManualBarcode] = useState('')
  const [productName, setProductName] = useState('')
  const [researchMode, setResearchMode] = useState('complete')
  const [promptText, setPromptText]   = useState('')
  const [copied, setCopied]           = useState(false)
  const [copiedInstructions, setCopiedInstructions] = useState('')
  const [copyError, setCopyError]     = useState('')
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

  // ── Check canonical product identity + build prompt ──────────────────────
  const handleBarcodeDetected = async (code) => {
    setCheckError('')
    setChecking(true)
    if (code) {
      try {
        const result = await searchIdentityDuplicates(code)
        const existing = result?.matchType === 'exact' ? result.product : null
        if (existing) {
          setCheckError(`Barcode ${code} already belongs to SKU ${existing.sku}. Open that product instead of creating a duplicate.`)
          setChecking(false)
          return
        }
      } catch {
        setCheckError(safeUiError('INVENTORY_VERIFY_FAILED'))
        setChecking(false)
        return
      }
    }
    setBarcode(code)
    setPromptText(buildProductJsonPrompt({ barcode: code, productName, researchMode }))
    setStep('result')
    setChecking(false)
  }

  // ── Manual entry submit ──────────────────────────────────────────────────
  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!manualBarcode.trim() && !productName.trim()) return
    await handleBarcodeDetected(manualBarcode.trim())
  }

  const copyToClipboard = async (text, key) => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(text)
      if (key === 'request') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } else {
        setCopiedInstructions(key)
        setTimeout(() => setCopiedInstructions(''), 2500)
      }
    } catch {
      setCopyError('Copy failed. Select the text manually or allow clipboard access, then try again.')
    }
  }

  const handleCopy = () => copyToClipboard(promptText, 'request')

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
            {step === 'result' && 'Use the Content Project first, then move the approved JSON to the separate Image Studio'}
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
                <p className="text-sm text-white/60 mt-0.5">Duplicate check passed when available · Content contract: {PRODUCT_RESEARCH_SCHEMA_VERSION} · Focus: {RESEARCH_MODES.find(mode => mode.id === researchMode)?.label}</p>
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
                ['Set up two Projects once', 'Install the Product Content instructions in one ChatGPT Project and the Product Image Studio instructions in another.'],
                ['Generate the final JSON', 'Attach readable front, back or label, barcode, and variant photos to the Content Project, then paste the request below.'],
                ['Review in Smart Paste', 'Paste the single JSON object into K2 and verify every fact, source, unknown, heading, use case, and instruction.'],
                ['Generate the two image requests', `Smart Paste prepares a product-specific ${PRODUCT_RESEARCH_COMMANDS.primary} request and ${PRODUCT_RESEARCH_COMMANDS.after} request for the separate Image Studio.`],
              ].map(([title, body], i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-blue/20 text-blue text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-white/50"><span className="text-neutral-300 font-semibold">{title}</span> — {body}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={() => copyToClipboard(K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS, 'content')}
                  className="min-h-11 rounded-adm-sm border border-adm-line bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.99]"
                >
                  {copiedInstructions === 'content' ? 'Content instructions copied' : 'Copy Content Project instructions'}
                </button>
                <button
                  onClick={() => copyToClipboard(K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS, 'images')}
                  className="min-h-11 rounded-adm-sm border border-adm-line bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.99]"
                >
                  {copiedInstructions === 'images' ? 'Image instructions copied' : 'Copy Image Studio instructions'}
                </button>
              </div>

              {copyError && <p role="alert" className="rounded-adm-sm border border-crimson/40 bg-crimson/10 px-3 py-2 text-sm leading-relaxed text-crimson">{copyError}</p>}

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
                    Copy PRODUCT_JSON request
                  </>
                )}
              </button>

              <button
                onClick={handleOpenSmartPaste}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-adm-sm bg-blue px-4 py-3 font-bold text-navy transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.99]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Open JSON review and image handoff
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
