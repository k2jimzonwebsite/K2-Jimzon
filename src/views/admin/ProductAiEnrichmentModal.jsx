import { useState, useMemo } from 'react'
import {
  buildProductJsonPrompt,
  K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
} from './productResearchPrompt.js'
import { AdminDialog } from '../../components/ui/AdminDialog'

export default function ProductAiEnrichmentModal({ product, isOpen, onClose, onOpenEditor }) {
  const [copiedItem, setCopiedItem] = useState('')
  const [copyError, setCopyError] = useState('')
  const [activeTab, setActiveTab] = useState('audit') // 'audit' | 'prompts'

  if (!isOpen || !product) return null

  const srp = Number(product.srp) || 0
  const cost = Number(product.cost_price) || 0
  const wholesale = Number(product.wholesale_price) || 0
  const margin = srp > 0 && cost > 0 ? (((srp - cost) / srp) * 100).toFixed(1) : null
  const profit = srp > 0 && cost > 0 ? (srp - cost).toFixed(2) : null

  const cleanSlug = useMemo(() => {
    if (!product.name) return ''
    return product.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }, [product.name])

  const missingSpecs = []
  if (!product.origin || product.origin === 'Manual' || product.origin.includes('Shopee')) {
    missingSpecs.push({ field: 'origin', label: 'Origin / Town', desc: 'Specify Italian region or town (e.g. Parma, Milano)' })
  }
  if (!product.description || product.description.length < 30) {
    missingSpecs.push({ field: 'description', label: 'Description', desc: 'Needs at least 2-3 factual descriptive sentences' })
  }
  if (!product.usage_instructions) {
    missingSpecs.push({ field: 'usage_instructions', label: 'How to use / serve', desc: 'Preparation directions or serving suggestions' })
  }
  if (!product.storage_instructions) {
    missingSpecs.push({ field: 'storage_instructions', label: 'Storage instructions', desc: 'Pantry, cool-dry, or refrigeration guidance' })
  }
  if (!product.ingredients) {
    missingSpecs.push({ field: 'ingredients', label: 'Ingredients & allergens', desc: 'European ingredients list and bold allergen notice' })
  }
  if (!product.net_weight) {
    missingSpecs.push({ field: 'net_weight', label: 'Net weight', desc: 'Required for courier parcel weight calculations' })
  }
  if (!product.barcode) {
    missingSpecs.push({ field: 'barcode', label: 'Barcode / EAN', desc: 'Physical package barcode for fast scanning' })
  }
  if (srp <= 0) {
    missingSpecs.push({ field: 'srp', label: 'Retail SRP', desc: 'Selling price in Philippine Pesos' })
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 font-sans text-white backdrop-blur-md">
      <AdminDialog onClose={onClose} labelledBy="product-content-helper-title">
        <div className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-adm border border-adm-line bg-adm-surface p-4 sm:p-6 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-adm-line pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="product-content-helper-title" className="text-xl font-bold text-white">Listing Optimizer & Specs</h2>
                <span className={`rounded border px-2 py-0.5 text-xs font-bold uppercase ${
                  missingSpecs.length === 0
                    ? 'border-forest/40 bg-forest/20 text-forest'
                    : missingSpecs.length <= 2
                    ? 'border-gold/40 bg-gold/20 text-gold'
                    : 'border-amber/40 bg-amber/20 text-amber'
                }`}>
                  {missingSpecs.length === 0 ? '100% Complete' : `${missingSpecs.length} Specs to Complete`}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/60">
                Audit product quality, check pricing margins, and complete missing details. No AI required for manual listing.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close product content helper"
              className="min-h-11 min-w-11 rounded-adm-sm bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Product snapshot card */}
          <div className="rounded-adm-sm border border-adm-line bg-white/5 p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-mono font-bold uppercase text-amber tracking-wider">SKU: {product.sku || product.id || 'Draft'}</span>
                <h3 className="mt-0.5 text-base sm:text-lg font-bold text-white truncate">{product.name || product.title}</h3>
                {product.origin && <p className="text-xs text-white/50">Origin: {product.origin}</p>}
              </div>
              {onOpenEditor && (
                <button
                  type="button"
                  onClick={() => onOpenEditor(product)}
                  className="shrink-0 min-h-11 px-4 py-2 rounded-adm-sm bg-blue font-bold text-xs sm:text-sm text-white shadow-md hover:bg-blue/90 active:scale-[0.98] transition-transform"
                >
                  Edit in Master
                </button>
              )}
            </div>

            {/* Pricing margin bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-adm-line/60 text-xs">
              <div>
                <span className="text-white/45 block">Retail SRP:</span>
                <span className="font-mono font-bold text-white text-sm">₱{srp.toLocaleString('en-PH')}</span>
              </div>
              <div>
                <span className="text-white/45 block">Cost Price:</span>
                <span className="font-mono font-bold text-white/80 text-sm">₱{cost.toLocaleString('en-PH')}</span>
              </div>
              <div>
                <span className="text-white/45 block">Gross Margin:</span>
                <span className={`font-mono font-bold text-sm ${
                  margin !== null && Number(margin) >= 35 ? 'text-forest' :
                  margin !== null && Number(margin) >= 20 ? 'text-gold' : 'text-crimson'
                }`}>
                  {margin !== null ? `${margin}%` : 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-white/45 block">Wholesale B2B:</span>
                <span className="font-mono font-bold text-white/80 text-sm">₱{wholesale.toLocaleString('en-PH')}</span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex gap-1 border-b border-adm-line pb-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`min-h-11 px-3 py-2 rounded-adm-sm transition-colors ${
                activeTab === 'audit' ? 'bg-white/10 text-white font-bold border border-adm-line' : 'text-white/50 hover:text-white'
              }`}
            >
              Listing Audit & Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('prompts')}
              className={`min-h-11 px-3 py-2 rounded-adm-sm transition-colors ${
                activeTab === 'prompts' ? 'bg-white/10 text-white font-bold border border-adm-line' : 'text-white/50 hover:text-white'
              }`}
            >
              Optional AI Prompts
            </button>
          </div>

          {/* TAB 1: AUDIT & TEMPLATES */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Missing specs checklist */}
              <section aria-labelledby="content-audit-title" className="space-y-2">
                <h3 id="content-audit-title" className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Specification Health Checklist
                </h3>
                {missingSpecs.length === 0 ? (
                  <div className="rounded-adm-sm border border-forest/40 bg-forest/15 p-3 text-sm text-forest flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-forest" />
                    <span>All critical product attributes are recorded and ready for live storefront display.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {missingSpecs.map(item => (
                      <div key={item.field} className="rounded-adm-sm border border-amber/30 bg-amber/10 p-2.5 text-xs">
                        <span className="font-bold text-amber block">{item.label}</span>
                        <span className="text-white/60 leading-tight block mt-0.5">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Ready-to-use quick templates */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">Quick Italian Grocery Copy Templates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-3 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-white block">Standard Italian Storage Advice</span>
                      <p className="mt-1 text-white/60 text-[11px] leading-relaxed italic">
                        "Store in a cool, dry place away from heat and direct sunlight. Once opened, keep refrigerated and consume within 3-4 days."
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText('Store in a cool, dry place away from heat and direct sunlight. Once opened, keep refrigerated and consume within 3-4 days.', 'storage_tpl')}
                      className="mt-2 min-h-11 rounded-adm-sm border border-white/20 bg-white/5 px-3 py-1 font-semibold text-white hover:bg-white/10"
                    >
                      {copiedItem === 'storage_tpl' ? 'Copied Storage Text' : 'Copy Storage Text'}
                    </button>
                  </div>

                  <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-3 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-white block">Serving & Espresso Pairings</span>
                      <p className="mt-1 text-white/60 text-[11px] leading-relaxed italic">
                        "Serve at room temperature. Perfect pairing with Italian espresso, artisan cheeses, cured meats, or crusty bread."
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText('Serve at room temperature. Perfect pairing with Italian espresso, artisan cheeses, cured meats, or crusty bread.', 'usage_tpl')}
                      className="mt-2 min-h-11 rounded-adm-sm border border-white/20 bg-white/5 px-3 py-1 font-semibold text-white hover:bg-white/10"
                    >
                      {copiedItem === 'usage_tpl' ? 'Copied Pairing Text' : 'Copy Pairing Text'}
                    </button>
                  </div>
                </div>

                {cleanSlug && (
                  <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="text-white/45 block text-[11px]">Recommended URL Slug:</span>
                      <span className="font-mono text-white font-bold truncate block">{cleanSlug}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(cleanSlug, 'slug_tpl')}
                      className="shrink-0 min-h-11 px-3 py-1 rounded-adm-sm border border-white/20 bg-white/5 font-semibold text-white hover:bg-white/10"
                    >
                      {copiedItem === 'slug_tpl' ? 'Copied' : 'Copy Slug'}
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: OPTIONAL AI PROMPTS */}
          {activeTab === 'prompts' && (
            <div className="space-y-4">
              <p className="text-xs text-white/60 leading-relaxed">
                Optional for advanced research: copy the versioned {PRODUCT_RESEARCH_SCHEMA_VERSION} prompt to ChatGPT if you have packaging photos and want multi-lingual ingredient analysis.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <section className="flex flex-col justify-between rounded-adm-sm border border-adm-line bg-adm-sunken p-3.5">
                  <div>
                    <h3 className="font-bold text-white text-sm">1. Project Instructions</h3>
                    <p className="mt-1 text-xs text-white/60">
                      Copy into the private ChatGPT Project instructions once.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS, 'instructions')}
                    className="mt-3 min-h-11 w-full rounded-adm-sm border border-adm-line bg-white/5 px-3 py-2 font-bold text-xs text-white transition-colors hover:bg-white/10"
                  >
                    {copiedItem === 'instructions' ? 'Instructions Copied' : 'Copy Instructions'}
                  </button>
                </section>

                <section className="flex flex-col justify-between rounded-adm-sm border border-blue/30 bg-adm-sunken p-3.5">
                  <div>
                    <h3 className="font-bold text-blue text-sm">2. Product Prompt</h3>
                    <p className="mt-1 text-xs text-white/60">
                      Paste into ChatGPT with package photos for JSON generation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(promptText, 'prompt')}
                    className="mt-3 min-h-11 w-full rounded-adm-sm bg-blue px-3 py-2 font-bold text-xs text-white transition-colors hover:bg-blue/90"
                  >
                    {copiedItem === 'prompt' ? 'PRODUCT_JSON Copied' : 'Copy Prompt'}
                  </button>
                </section>
              </div>
            </div>
          )}

          {copyError && (
            <p role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-xs text-amber">
              {copyError}
            </p>
          )}

          {/* Footer note with tooltip */}
          <div className="pt-2 border-t border-adm-line text-xs text-white/45 flex items-center justify-between">
            <span title="Operational truth resides in Supabase Product Master and batch lots">
              K2 Single Master Inventory · Staff verification governs publication
            </span>
            {onOpenEditor && (
              <button
                type="button"
                onClick={() => onOpenEditor(product)}
                className="text-blue hover:underline font-bold"
              >
                Open Full Editor →
              </button>
            )}
          </div>
        </div>
      </AdminDialog>
    </div>
  )
}
