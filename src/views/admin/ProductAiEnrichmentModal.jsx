import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ProductAiEnrichmentModal({ product, isOpen, onClose, onEnriched }) {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichedData, setEnrichedData] = useState(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [enrichError, setEnrichError] = useState('')

  if (!isOpen || !product) return null

  // Analyze missing fields
  const missingSpecs = []
  if (!product.origin || product.origin === 'Manual' || product.origin.includes('Shopee')) missingSpecs.push('Verified origin and source evidence')
  if (!product.description || product.description.length < 30) missingSpecs.push('Factual product description')
  if (!product.usage_instructions) missingSpecs.push('Usage & Application Instructions')
  if (!product.storage_instructions) missingSpecs.push('Storage & FEFO Guidelines')
  if (!product.ingredients) missingSpecs.push('Ingredients & Allergens List')
  if (!product.wholesale_price || product.wholesale_price === 0) missingSpecs.push('Reviewed wholesale price')

  // Generate Tailored AI Prompt for ChatGPT / Gemini
  const promptText = `You are assisting K2 Jimzon with a product-record research draft.

This basic marketplace record needs evidence-backed product details before a human can approve it:

Product Details:
• Title: "${product.name || product.title}"
• SKU: "${product.sku || product.id}"
• Current Price: ₱${product.srp || product.retail || 0}
• Category: ${product.category || 'Italian Goods'}

Instructions:
1. Research using the manufacturer, official distributor, packaging, or another primary source.
2. Never assume authenticity, country of origin, ingredients, allergens, expiry, or a boutique source. Write "Unknown — verify manually" when evidence is absent.
3. Return the source URL and the exact field it supports. Do not invent citations.
4. Draft concise e-commerce specifications including:
   - Verified country of origin and source evidence
   - Factual product description without unsupported superlatives
   - Step-by-Step Usage & Application Instructions
   - Storage guidance only when supported by packaging or a primary source
   - Ingredients & Allergens
   - A clearly labeled wholesale-price suggestion with the cost and margin assumptions

Return EXACTLY THIS JSON OBJECT format for 1-click K2 Jimzon Smart Paste:

\`\`\`json
{
  "sku": "${product.sku || product.id}",
  "name": "${product.name || product.title}",
  "origin": "Unknown — verify manually",
  "description": "Evidence-backed description or Unknown — verify manually",
  "usage_instructions": "Evidence-backed instructions or Unknown — verify manually",
  "storage_instructions": "Evidence-backed storage guidance or Unknown — verify manually",
  "ingredients": "Evidence-backed ingredients and allergens or Unknown — verify manually",
  "wholesale_price": 0,
  "source_urls": [],
  "evidence_notes": []
}
\`\`\``

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleAutoEnrich = () => {
    setEnrichError('Automatic enrichment is not connected. Copy the research prompt, verify every source, and use Smart Paste to review the result before saving.')
  }

  const handleSaveEnriched = async () => {
    if (!enrichedData) return
    setEnrichError('')
    setEnriching(true)

    if (!supabase) {
      setEnriching(false)
      setEnrichError('Could not save because Supabase is not configured.')
      return
    }

    const { error } = await supabase.from('products').update({
      origin: enrichedData.origin,
      description: enrichedData.description,
      usage_instructions: enrichedData.usage_instructions,
      storage_instructions: enrichedData.storage_instructions,
      ingredients: enrichedData.ingredients,
      wholesale_price: enrichedData.wholesale_price,
      is_ai_generated: true
    }).eq('sku', product.sku || product.id)

    if (error) {
      setEnriching(false)
      setEnrichError(`Could not save the reviewed product details: ${error.message}`)
      return
    }

    if (onEnriched) onEnriched(enrichedData)
    setEnriching(false)
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans text-white">
      <div className="w-full max-w-xl bg-adm-surface border border-adm-line rounded-adm p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-adm-line pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">✨</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-xl text-white">AI product details helper</h2>
                <span className="text-xs font-mono font-bold bg-amber/20 text-amber px-1.5 py-0.5 rounded border border-amber/30 uppercase">
                  Shopee / Channel Connector
                </span>
              </div>
              <p className="text-sm text-white/50 font-mono">Prepare evidence-backed fields for human review</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-adm-sm bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all min-h-[40px] min-w-[40px]"
          >
            ✕
          </button>
        </div>

        {/* Selected Product Banner */}
        <div className="p-3.5 rounded-adm-sm bg-white/5 border border-adm-line flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-amber uppercase font-bold">Target SKU: {product.sku || product.id}</span>
            <h3 className="font-serif font-bold text-lg text-white">{product.name || product.title}</h3>
            <p className="text-sm text-white/50">Current Price: ₱{(product.srp || product.retail || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Missing Fields Audit */}
        <div className="space-y-2">
          <label className="block text-xs font-mono uppercase text-white/60 font-bold">
            Spec Audit ({missingSpecs.length} Incomplete Fields):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {missingSpecs.length === 0 ? (
              <span className="text-sm font-mono text-forest bg-forest/15 border border-forest/30 px-3 py-1 rounded-adm-sm">
                ✓ All Product Specifications Complete!
              </span>
            ) : (
              missingSpecs.map((m, idx) => (
                <span key={idx} className="text-xs font-mono text-amber bg-amber/15 border border-amber/30 px-2.5 py-1 rounded-adm-sm">
                  ⚠️ {m}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Action Grid: Option A (Copy Prompt) & Option B (In-App Auto-Enrich) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Option A: Copy Prompt */}
          <div className="bg-adm-sunken border border-blue/30 p-4 rounded-adm-sm space-y-3 font-mono text-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-blue font-bold mb-1">
                <span>📋</span> Option A: Copy AI Prompt
              </div>
              <p className="text-white/60 text-xs font-sans">
                Generates a structured prompt that requires primary sources and preserves unknown fields.
              </p>
            </div>

            <button
              onClick={handleCopyPrompt}
              className="w-full mt-3 bg-blue hover:bg-blue/90 text-white font-bold py-2.5 rounded-adm-sm transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              {copiedPrompt ? '✓ Copied to Clipboard!' : '📋 Copy ChatGPT Prompt'}
            </button>
          </div>

          {/* Option B: In-App Auto Enrich */}
          <div className="bg-adm-sunken border border-forest/30 p-4 rounded-adm-sm space-y-3 font-mono text-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-forest font-bold mb-1">
                <span>⚡</span> Option B: 1-Click Auto-Enrich
              </div>
              <p className="text-white/60 text-xs font-sans">
                Automatic research is disabled until a real, source-citing server connector is configured.
              </p>
            </div>

            <button
              onClick={handleAutoEnrich}
              disabled
              className="w-full mt-3 bg-forest hover:bg-forest/90 text-white font-bold py-2.5 rounded-adm-sm transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              Connector required
            </button>
          </div>

        </div>

        {enrichError && <p role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm text-amber">{enrichError}</p>}

        {/* Enriched Result Preview & Save */}
        {enrichedData && (
          <div className="p-4 rounded-adm-sm bg-white/5 border border-forest/40 space-y-3 font-mono text-sm animate-in fade-in">
            <div className="flex items-center justify-between border-b border-adm-line pb-2">
              <span className="text-forest font-bold text-base font-sans">✓ Enriched Product Master Preview:</span>
              <span className="text-xs text-white/60">Ready to Save</span>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong className="text-amber">Origin:</strong> {enrichedData.origin}</p>
              <p><strong className="text-neutral-300">Description:</strong> {enrichedData.description}</p>
              <p><strong className="text-neutral-300">Usage Instructions:</strong> {enrichedData.usage_instructions}</p>
              <p><strong className="text-neutral-300">Storage & FEFO:</strong> {enrichedData.storage_instructions}</p>
              <p><strong className="text-neutral-300">Wholesale Price:</strong> ₱{enrichedData.wholesale_price.toLocaleString()}</p>
            </div>

            <button
              onClick={handleSaveEnriched}
              disabled={enriching}
              className="w-full bg-forest hover:bg-forest/90 text-white font-bold py-3 rounded-adm-sm transition-all shadow-lg min-h-[44px]"
            >
              {savedSuccess ? '✓ Saved to Product Master!' : '💾 Save Enriched Specs to Product Master'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
