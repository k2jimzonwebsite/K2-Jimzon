import { useState, useMemo, useEffect } from 'react'
import {
  buildProductJsonPrompt,
  K2_PRODUCT_JSON_PROJECT_INSTRUCTIONS,
  PRODUCT_RESEARCH_SCHEMA_VERSION,
} from './productResearchPrompt.js'
import { AdminDialog } from '../../components/ui/AdminDialog'
import {
  optimizeProductListingBff,
  getCachedProductOptimization,
} from '../../services/adminBffService.js'

export default function ProductAiEnrichmentModal({ product, isOpen, onClose, onOpenEditor }) {
  const [copiedItem, setCopiedItem] = useState('')
  const [copyError, setCopyError] = useState('')
  const [activeTab, setActiveTab] = useState('optimize') // 'optimize' | 'audit' | 'prompts'

  // Optimization state
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationError, setOptimizationError] = useState('')
  const [generatedData, setGeneratedData] = useState(null)
  const [selectedFields, setSelectedFields] = useState(
    new Set(['description', 'seo_keywords', 'storage_instructions', 'usage_instructions', 'image_url'])
  )

  const cacheKey = useMemo(() => {
    if (!product) return ''
    return `${product.sku || product.id || product.barcode || ''}::${(product.name || product.title || '').trim().toLowerCase()}`
  }, [product])

  // Check cache on open
  useEffect(() => {
    if (!isOpen || !product) {
      setGeneratedData(null)
      setOptimizationError('')
      return
    }
    const cached = getCachedProductOptimization(cacheKey)
    if (cached) {
      setGeneratedData({ ok: true, data: cached, fromCache: true })
      const fields = new Set()
      if (cached.draft?.card_description) fields.add('description')
      if (cached.draft?.search_keywords?.length) fields.add('seo_keywords')
      if (cached.draft?.storage_instructions) fields.add('storage_instructions')
      if (cached.draft?.usage_instructions) fields.add('usage_instructions')
      if (cached.catalog?.imageUrl) fields.add('image_url')
      setSelectedFields(fields)
    }
  }, [isOpen, product, cacheKey])

  if (!isOpen || !product) return null

  const srp = Number(product.srp) || 0
  const cost = Number(product.cost_price) || 0
  const wholesale = Number(product.wholesale_price) || 0
  const margin = srp > 0 && cost > 0 ? (((srp - cost) / srp) * 100).toFixed(1) : null
  const profit = srp > 0 && cost > 0 ? (srp - cost).toFixed(2) : null

  const cleanSlug = useMemo(() => {
    const name = product.name || product.title || ''
    if (!name) return ''
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }, [product.name, product.title])

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

  const handleAutoFill = async () => {
    setIsOptimizing(true)
    setOptimizationError('')
    try {
      const result = await optimizeProductListingBff({
        barcode: product.barcode,
        product: {
          name: product.name || product.title,
          brand: product.brand_name || product.brand,
          category: product.category || product.subcategory,
          origin: product.origin || product.country_of_origin,
          quantity: product.size || product.quantity,
          net_weight: product.net_weight,
          description: product.description,
          barcode: product.barcode,
        },
      })
      if (!result.ok) {
        setOptimizationError(result.error || 'Optimization request could not be completed.')
      } else {
        setGeneratedData(result)
        const fields = new Set()
        if (result.data?.draft?.card_description) fields.add('description')
        if (result.data?.draft?.search_keywords?.length) fields.add('seo_keywords')
        if (result.data?.draft?.storage_instructions) fields.add('storage_instructions')
        if (result.data?.draft?.usage_instructions) fields.add('usage_instructions')
        if (result.data?.catalog?.imageUrl) fields.add('image_url')
        setSelectedFields(fields)
      }
    } catch {
      setOptimizationError('Network error connecting to optimization service.')
    } finally {
      setIsOptimizing(false)
    }
  }

  const toggleField = (field) => {
    setSelectedFields(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const selectAll = () => {
    const fields = new Set()
    if (generatedData?.data?.draft?.card_description) fields.add('description')
    if (generatedData?.data?.draft?.search_keywords?.length) fields.add('seo_keywords')
    if (generatedData?.data?.draft?.storage_instructions) fields.add('storage_instructions')
    if (generatedData?.data?.draft?.usage_instructions) fields.add('usage_instructions')
    if (generatedData?.data?.catalog?.imageUrl) fields.add('image_url')
    setSelectedFields(fields)
  }

  const deselectAll = () => {
    setSelectedFields(new Set())
  }

  const applyAcceptedChanges = () => {
    if (!generatedData?.data?.draft) return
    const draft = generatedData.data.draft
    const catalog = generatedData.data.catalog
    const overrides = {}
    if (selectedFields.has('description') && draft.card_description) {
      overrides.description = draft.card_description
    }
    if (selectedFields.has('seo_keywords') && draft.search_keywords) {
      overrides.seo_keywords = draft.search_keywords
    }
    if (selectedFields.has('storage_instructions') && draft.storage_instructions) {
      overrides.storage_instructions = draft.storage_instructions
    }
    if (selectedFields.has('usage_instructions') && draft.usage_instructions) {
      overrides.usage_instructions = draft.usage_instructions
    }
    if (selectedFields.has('image_url') && catalog?.imageUrl) {
      overrides.image_url = catalog.imageUrl
    }
    if (onOpenEditor) {
      onOpenEditor(product, overrides)
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
                1-click auto-fill missing cells and descriptions with Gemini, review diffs, or complete manually.
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
                  className="shrink-0 min-h-11 px-4 py-2 rounded-adm-sm bg-blue font-bold text-xs sm:text-sm text-white shadow-md hover:bg-blue/90 active:scale-[0.98] transition-transform flex items-center justify-center"
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
              onClick={() => setActiveTab('optimize')}
              className={`min-h-11 px-3 py-2 rounded-adm-sm transition-colors ${
                activeTab === 'optimize' ? 'bg-white/10 text-white font-bold border border-adm-line' : 'text-white/50 hover:text-white'
              }`}
            >
              1-Click Auto-Fill & Diff
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`min-h-11 px-3 py-2 rounded-adm-sm transition-colors ${
                activeTab === 'audit' ? 'bg-white/10 text-white font-bold border border-adm-line' : 'text-white/50 hover:text-white'
              }`}
            >
              Audit & Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('prompts')}
              className={`min-h-11 px-3 py-2 rounded-adm-sm transition-colors ${
                activeTab === 'prompts' ? 'bg-white/10 text-white font-bold border border-adm-line' : 'text-white/50 hover:text-white'
              }`}
            >
              External Prompts
            </button>
          </div>

          {/* TAB 1: 1-CLICK AUTO-FILL & DIFF */}
          {activeTab === 'optimize' && (
            <div className="space-y-4">
              {!generatedData ? (
                <div className="rounded-adm-sm border border-adm-line bg-adm-sunken p-4 sm:p-5 text-center space-y-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue/15 text-blue">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-white">1-Click AI Auto-Fill & Optimization</h3>
                  <p className="text-xs text-white/60 max-w-md mx-auto leading-relaxed">
                    Uses Gemini 3.5 Flash-lite to draft concise descriptions, search keywords, and storage guidelines.
                    If barcode exists, checks Open Food Facts for official packaging photos.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isOptimizing || !product.name}
                      onClick={handleAutoFill}
                      className="min-h-11 px-6 py-2.5 rounded-adm-sm bg-blue font-bold text-sm text-white shadow-lg hover:bg-blue/90 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      {isOptimizing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span>Querying Catalog & Generating Draft...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
                          </svg>
                          <span>Generate Suggestions with Gemini</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-white/40">
                    FinOps Shield: 600 max tokens · In-memory session cache · Rate-limited (max 5/min)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Diff Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-adm-line pb-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Review Suggestions vs Current:</span>
                      {generatedData.fromCache ? (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-white/70 font-mono text-[11px]">
                          Cached (0 tokens)
                        </span>
                      ) : (
                        <span className="rounded bg-forest/20 text-forest border border-forest/30 px-2 py-0.5 text-[11px] font-bold">
                          Fresh Gemini Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={selectAll} className="text-blue hover:underline font-semibold">
                        Select All
                      </button>
                      <span className="text-white/30">|</span>
                      <button type="button" onClick={deselectAll} className="text-white/50 hover:underline">
                        Deselect All
                      </button>
                      <span className="text-white/30">|</span>
                      <button
                        type="button"
                        onClick={handleAutoFill}
                        disabled={isOptimizing}
                        className="text-amber hover:underline font-semibold"
                      >
                        {isOptimizing ? 'Refreshing...' : 'Regenerate'}
                      </button>
                    </div>
                  </div>

                  {/* Diff Fields List */}
                  <div className="space-y-2.5 text-xs">
                    {/* 1. Description */}
                    {generatedData.data?.draft?.card_description && (
                      <div className={`rounded-adm-sm border p-3 transition-colors ${
                        selectedFields.has('description') ? 'border-blue/60 bg-blue/10' : 'border-adm-line bg-adm-sunken'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-white">
                            <input
                              type="checkbox"
                              checked={selectedFields.has('description')}
                              onChange={() => toggleField('description')}
                              className="w-4 h-4 rounded border-adm-line bg-adm-surface text-blue"
                            />
                            <span>Card Description</span>
                          </label>
                          <span className="text-white/40 text-[10px]">
                            {generatedData.data.draft.card_description.length} chars
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 pl-6">
                          <div className="text-white/50 text-[11px]">
                            <span className="font-semibold text-white/40">Current: </span>
                            {product.description ? product.description : <span className="italic text-amber">Empty</span>}
                          </div>
                          <div className="text-white text-xs bg-black/30 p-2 rounded border border-white/5 font-sans leading-relaxed">
                            <span className="font-semibold text-blue block mb-0.5">Suggested:</span>
                            {generatedData.data.draft.card_description}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Search Keywords */}
                    {generatedData.data?.draft?.search_keywords && (
                      <div className={`rounded-adm-sm border p-3 transition-colors ${
                        selectedFields.has('seo_keywords') ? 'border-blue/60 bg-blue/10' : 'border-adm-line bg-adm-sunken'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-white">
                            <input
                              type="checkbox"
                              checked={selectedFields.has('seo_keywords')}
                              onChange={() => toggleField('seo_keywords')}
                              className="w-4 h-4 rounded border-adm-line bg-adm-surface text-blue"
                            />
                            <span>Search Keywords</span>
                          </label>
                          <span className="text-white/40 text-[10px]">
                            {generatedData.data.draft.search_keywords.length} tags
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 pl-6">
                          <div className="text-white/50 text-[11px]">
                            <span className="font-semibold text-white/40">Current: </span>
                            {Array.isArray(product.seo_keywords) && product.seo_keywords.length > 0
                              ? product.seo_keywords.join(', ')
                              : typeof product.seo_keywords === 'string' && product.seo_keywords
                              ? product.seo_keywords
                              : <span className="italic text-amber">None set</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {generatedData.data.draft.search_keywords.map((kw, idx) => (
                              <span key={idx} className="rounded bg-blue/20 border border-blue/30 px-2 py-0.5 text-blue text-[11px]">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. Storage Instructions */}
                    {generatedData.data?.draft?.storage_instructions && (
                      <div className={`rounded-adm-sm border p-3 transition-colors ${
                        selectedFields.has('storage_instructions') ? 'border-blue/60 bg-blue/10' : 'border-adm-line bg-adm-sunken'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-white">
                            <input
                              type="checkbox"
                              checked={selectedFields.has('storage_instructions')}
                              onChange={() => toggleField('storage_instructions')}
                              className="w-4 h-4 rounded border-adm-line bg-adm-surface text-blue"
                            />
                            <span>Storage Instructions</span>
                          </label>
                          <span className="text-white/40 text-[10px]">Italian Grocery Standard</span>
                        </div>
                        <div className="mt-2 space-y-1 pl-6">
                          <div className="text-white/50 text-[11px]">
                            <span className="font-semibold text-white/40">Current: </span>
                            {product.storage_instructions ? product.storage_instructions : <span className="italic text-amber">Empty</span>}
                          </div>
                          <div className="text-white text-xs bg-black/30 p-2 rounded border border-white/5 font-sans leading-relaxed">
                            <span className="font-semibold text-blue block mb-0.5">Suggested:</span>
                            {generatedData.data.draft.storage_instructions}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. Usage / Serving Instructions */}
                    {generatedData.data?.draft?.usage_instructions && (
                      <div className={`rounded-adm-sm border p-3 transition-colors ${
                        selectedFields.has('usage_instructions') ? 'border-blue/60 bg-blue/10' : 'border-adm-line bg-adm-sunken'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-white">
                            <input
                              type="checkbox"
                              checked={selectedFields.has('usage_instructions')}
                              onChange={() => toggleField('usage_instructions')}
                              className="w-4 h-4 rounded border-adm-line bg-adm-surface text-blue"
                            />
                            <span>How to Use / Serve</span>
                          </label>
                          <span className="text-white/40 text-[10px]">Serving & Pairings</span>
                        </div>
                        <div className="mt-2 space-y-1 pl-6">
                          <div className="text-white/50 text-[11px]">
                            <span className="font-semibold text-white/40">Current: </span>
                            {product.usage_instructions ? product.usage_instructions : <span className="italic text-amber">Empty</span>}
                          </div>
                          <div className="text-white text-xs bg-black/30 p-2 rounded border border-white/5 font-sans leading-relaxed">
                            <span className="font-semibold text-blue block mb-0.5">Suggested:</span>
                            {generatedData.data.draft.usage_instructions}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. Public Packaging Photo (from Open Food Facts if found) */}
                    {generatedData.data?.catalog?.imageUrl && (
                      <div className={`rounded-adm-sm border p-3 transition-colors ${
                        selectedFields.has('image_url') ? 'border-blue/60 bg-blue/10' : 'border-adm-line bg-adm-sunken'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-white">
                            <input
                              type="checkbox"
                              checked={selectedFields.has('image_url')}
                              onChange={() => toggleField('image_url')}
                              className="w-4 h-4 rounded border-adm-line bg-adm-surface text-blue"
                            />
                            <span>Verified Public Packaging Photo (Open Food Facts)</span>
                          </label>
                          <span className="text-forest text-[10px] font-bold">ODbL License</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 pl-6">
                          <img
                            src={generatedData.data.catalog.imageUrl}
                            alt="Public packaging"
                            className="h-16 w-16 object-contain rounded border border-adm-line bg-black/40"
                          />
                          <div className="text-[11px] text-white/60 space-y-0.5">
                            <p className="font-semibold text-white">Public Packaging Front Image</p>
                            <p>Source: Open Food Facts ({generatedData.data.catalog.barcode})</p>
                            <p className="text-amber/80">Staff must verify against physical package in custody.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apply Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={selectedFields.size === 0}
                      onClick={applyAcceptedChanges}
                      className="min-h-11 w-full rounded-adm-sm bg-forest px-4 py-2.5 font-bold text-sm text-white shadow-lg hover:bg-forest/90 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span>Apply {selectedFields.size} Accepted Field{selectedFields.size === 1 ? '' : 's'} to Master Editor</span>
                      <span>→</span>
                    </button>
                    <p className="mt-1.5 text-center text-[11px] text-white/45">
                      Transfers accepted fields into Product Master. Staff must confirm and provide change reason before database save.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUDIT & TEMPLATES */}
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

          {/* TAB 3: OPTIONAL EXTERNAL AI PROMPTS */}
          {activeTab === 'prompts' && (
            <div className="space-y-4">
              <p className="text-xs text-white/60 leading-relaxed">
                Optional external research: copy the versioned {PRODUCT_RESEARCH_SCHEMA_VERSION} prompt to ChatGPT if you have packaging photos and want multi-lingual ingredient analysis.
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

          {optimizationError && (
            <p role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-xs text-amber">
              {optimizationError}
            </p>
          )}

          {copyError && (
            <p role="alert" className="rounded-adm-sm border border-amber/35 bg-amber/10 p-3 text-xs text-amber">
              {copyError}
            </p>
          )}

          {/* Footer note */}
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
