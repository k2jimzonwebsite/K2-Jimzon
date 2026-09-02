import { useState } from 'react'
import {
  buildProductJsonPrompt,
  K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
} from './productResearchPrompt.js'
import { AdminDialog } from '../../components/ui/AdminDialog'

export default function ProductAiEnrichmentModal({ product, isOpen, onClose }) {
  const [copiedItem, setCopiedItem] = useState('')
  const [copyError, setCopyError] = useState('')

  if (!isOpen || !product) return null

  const missingSpecs = []
  if (!product.origin || product.origin === 'Manual' || product.origin.includes('Shopee')) missingSpecs.push('Verified origin and source evidence')
  if (!product.description || product.description.length < 30) missingSpecs.push('Factual product description')
  if (!product.usage_instructions) missingSpecs.push('Uses and ordered instructions')
  if (!product.storage_instructions) missingSpecs.push('Storage guidance')
  if (!product.ingredients) missingSpecs.push('Ingredients and allergens')

  const promptText = buildProductJsonPrompt({
    barcode: product.barcode,
    productName: product.name || product.title,
    researchMode: 'complete',
  })

  const copyText = async (text, key) => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(key)
      setTimeout(() => setCopiedItem(''), 2500)
    } catch {
      setCopyError('Copy failed. Allow clipboard access, then try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-sans text-white backdrop-blur-md">
      <AdminDialog onClose={onClose} labelledBy="product-content-helper-title">
      <div className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-adm-line pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="product-content-helper-title" className="text-xl font-bold text-white">Product Content helper</h2>
              <span className="rounded border border-amber/30 bg-amber/15 px-2 py-1 text-xs font-bold uppercase text-amber">
                Manual Project
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-white/60">
              Prepare one reviewable {PRODUCT_RESEARCH_SCHEMA_VERSION} content object. This helper never changes the product automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close product content helper"
            className="min-h-[44px] min-w-[44px] rounded-adm-sm bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="rounded-adm-sm border border-adm-line bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber">Current product</p>
          <h3 className="mt-1 text-lg font-bold text-white">{product.name || product.title}</h3>
          <p className="mt-1 text-sm text-white/60">SKU: {product.sku || product.id || 'Not assigned'}</p>
        </div>

        <section aria-labelledby="content-audit-title" className="space-y-2">
          <h3 id="content-audit-title" className="text-sm font-bold text-white">
            Content audit · {missingSpecs.length} item{missingSpecs.length === 1 ? '' : 's'} to review
          </h3>
          <div className="flex flex-wrap gap-2">
            {missingSpecs.length === 0 ? (
              <span className="rounded-adm-sm border border-forest/30 bg-forest/15 px-3 py-2 text-sm text-forest">
                No obvious content gaps detected
              </span>
            ) : missingSpecs.map(item => (
              <span key={item} className="rounded-adm-sm border border-amber/30 bg-amber/15 px-3 py-2 text-sm text-amber">
                {item}
              </span>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="flex flex-col justify-between rounded-adm-sm border border-adm-line bg-adm-sunken p-4">
            <div>
              <h3 className="font-bold text-white">1. Set up K2 Product Content</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                Copy these instructions once into the private ChatGPT Project. Keep it separate from Image Studio.
              </p>
            </div>
            <button
              onClick={() => copyText(K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS, 'instructions')}
              className="mt-4 min-h-[44px] w-full rounded-adm-sm border border-adm-line bg-white/5 px-4 py-2.5 font-bold text-white transition-colors hover:bg-white/10"
            >
              {copiedItem === 'instructions' ? 'Project instructions copied' : 'Copy Project instructions'}
            </button>
          </section>

          <section className="flex flex-col justify-between rounded-adm-sm border border-blue/30 bg-adm-sunken p-4">
            <div>
              <h3 className="font-bold text-blue">2. Prepare this product</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                Attach the exact package photos, paste this request, then review the single JSON response before any save.
              </p>
            </div>
            <button
              onClick={() => copyText(promptText, 'prompt')}
              className="mt-4 min-h-[44px] w-full rounded-adm-sm bg-blue px-4 py-2.5 font-bold text-navy transition-colors hover:bg-blue/90"
            >
              {copiedItem === 'prompt' ? 'PRODUCT_JSON request copied' : 'Copy PRODUCT_JSON request'}
            </button>
          </section>
        </div>

        {copyError && (
          <p role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-sm text-amber">
            {copyError}
          </p>
        )}

        <p className="text-sm leading-relaxed text-white/50">
          Manual handoff only: ChatGPT cannot set the SKU, inventory, price, expiry, review state, or publication state.
        </p>
      </div>
      </AdminDialog>
    </div>
  )
}
