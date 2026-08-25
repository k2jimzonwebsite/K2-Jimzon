import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { safeUiError } from '../../lib/safeUiError'
import { adminBffEnabled } from '../../services/adminBffService'
import ImageUploadDropzone from '../../components/ui/ImageUploadDropzone'
import { parseProductResearchPaste } from './productResearchContract.js'
import {
  buildAfterImagePrompt,
  buildPrimaryImagePrompt,
  K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS,
} from './productResearchPrompt.js'

// Field mapping: reviewed Product Content output to current Supabase columns.
function mapAiToDb(p, images, contractInfo) {
  // Combine after-use + gallery into lifestyle_images array
  // after image goes first so the product page can use index 0 as the "after" slot
  const lifestyleArr = [
    images.after || null,
    ...images.gallery.filter(Boolean)
  ].filter(Boolean)

  const researchNotes = contractInfo && !contractInfo.legacy
    ? [
        `ChatGPT content contract: ${contractInfo.schemaVersion}`,
        p.card_description ? `Card description: ${p.card_description}` : null,
        p.key_highlights?.length ? `Key highlights: ${p.key_highlights.join(' | ')}` : null,
        p.seo_title ? `SEO title: ${p.seo_title}` : null,
        p.meta_description ? `Meta description: ${p.meta_description}` : null,
        p.page_heading ? `Page heading: ${p.page_heading}` : null,
        p.supporting_heading ? `Supporting heading: ${p.supporting_heading}` : null,
        contractInfo.media?.primary_alt_text ? `Primary alt text: ${contractInfo.media.primary_alt_text}` : null,
        contractInfo.media?.after_alt_text ? `After alt text: ${contractInfo.media.after_alt_text}` : null,
        contractInfo.unknownFields?.length ? `Unknown fields: ${contractInfo.unknownFields.join(', ')}` : null,
        contractInfo.reviewNotes?.length ? `Review notes: ${contractInfo.reviewNotes.join(' | ')}` : null,
        p.source_urls?.length ? `Evidence URLs: ${p.source_urls.join(' | ')}` : null,
      ].filter(Boolean).join('\n')
    : null

  return {
    sku:                      p.id || p.sku || null,
    barcode:                  p.barcode || null,
    name:                     p.name || p.product_name || '',
    short:                    p.short || null,
    // brand_id and category_id are UUID FK columns — set manually in PIM Sheet after saving
    origin:                   p.origin || null,
    net_weight:               p.net_weight || null,
    package_type:             p.package_type || null,
    size:                     p.size || null,
    subcategory:              p.subcategory || p.category || null,
    description:              p.inside || p.description || '',
    why_buy:                  p.whyBuy || p.why_buy || '',
    why_rare:                 p.whyRare || p.why_rare || null,
    usage_instructions:       p.usage_instructions || p.usage || '',
    storage_instructions:     p.storage_instructions || p.storage || '',
    ingredients:              p.ingredients || '',
    allergens:                p.allergens || '',
    finished_product_details: p.finished_product_details || p.finished_product || '',
    pairings:                 Array.isArray(p.pairings) ? p.pairings : [],
    seo_keywords:             Array.isArray(p.seo_keywords) ? p.seo_keywords : [],
    primary_image_url:        images.primary || null,
    lifestyle_images:         lifestyleArr,
    internal_notes:           researchNotes,
    is_ai_generated:          true,
    status:                   'Draft',
  }
}

export default function SmartPasteModal({ onClose, onProductAdded }) {
  const secure = adminBffEnabled()
  const [stage, setStage]               = useState('json')    // 'json' | 'review'
  const [pasteJson, setPasteJson]       = useState('')
  const [parsedProduct, setParsedProduct] = useState(null)
  const [contractInfo, setContractInfo]   = useState(null)
  const [parseWarnings, setParseWarnings] = useState([])
  const [error, setError]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [copiedImageItem, setCopiedImageItem] = useState('')
  const [copyError, setCopyError]       = useState('')

  // Image state
  const [primaryUrl, setPrimaryUrl]     = useState('')
  const [afterUrl, setAfterUrl]         = useState('')
  const [galleryUrls, setGalleryUrls]   = useState([])

  // ── Parse JSON ──────────────────────────────────────────────────────────────
  const handleJsonChange = (e) => {
    const value = e.target.value
    setPasteJson(value)
    setError('')
    setParsedProduct(null)
    setContractInfo(null)
    setParseWarnings([])
    if (!value.trim()) return
    try {
      const parsed = parseProductResearchPaste(value)
      setParsedProduct(parsed.product)
      setContractInfo(parsed.meta)
      setParseWarnings(parsed.warnings)
    } catch {
      setError(safeUiError('PRODUCT_JSON_INVALID'))
    }
  }

  const handleNext = () => {
    if (parsedProduct) setStage('review')
  }

  const copyImageItem = async (text, key) => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedImageItem(key)
      setTimeout(() => setCopiedImageItem(''), 2500)
    } catch {
      setCopyError('Copy failed. Allow clipboard access or select the prompt manually, then try again.')
    }
  }

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!parsedProduct) return
    if (secure) {
      setError('Secure mode keeps this as a review-only handoff. Close it and use phone-first intake to create the attributable Draft.')
      return
    }
    const dbRow = mapAiToDb(parsedProduct, { primary: primaryUrl, after: afterUrl, gallery: galleryUrls }, contractInfo)
    if (!dbRow.sku) {
      alert('Please fill in the Product ID field before saving.')
      return
    }
    setSaving(true)
    const { data: existing } = await supabase.from('products').select('sku').eq('sku', dbRow.sku).single()
    if (existing) {
      alert(`ID "${dbRow.sku}" already exists. Please change it.`)
      setSaving(false)
      return
    }
    const { error: insertError } = await supabase.from('products').insert([dbRow])
    if (insertError) {
      setError(safeUiError('PRODUCT_SAVE_FAILED'))
      setSaving(false)
      return
    }
    if (onProductAdded) onProductAdded(dbRow.sku)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-adm-sunken/95 text-white sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col bg-adm-surface border border-adm-line rounded-adm overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-adm-line bg-black/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-sans text-xl font-semibold">Product JSON review</h2>
              <p className="text-base text-white/50 mt-0.5">Validate one final Product Content JSON object, review it, then prepare the separate Image Studio handoff.</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
            {/* Step Pills */}
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-black/30 p-1 scrollbar-none">
              <button
                onClick={() => setStage('json')}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${stage === 'json' ? 'bg-blue text-navy' : 'text-white/60 hover:text-white'}`}
              >
                1 · Validate JSON
              </button>
              <button
                disabled={!parsedProduct}
                onClick={() => setStage('review')}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${stage === 'review' ? 'bg-blue text-navy' : 'text-white/60 hover:text-white'}`}
              >
                2 · Review + images
              </button>
            </div>
            <button onClick={onClose} aria-label="Close modal" className="rounded-full bg-white/5 p-2 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── STAGE 1: Paste JSON ─────────────────────────────────────────── */}
        {stage === 'json' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Paste box */}
            <div className="flex flex-1 flex-col gap-4 bg-adm-sunken p-4 sm:p-8">
              <div className="mb-1">
                <p className="font-semibold text-white text-base">Paste the complete PRODUCT_JSON response</p>
                <p className="text-sm text-white/60 mt-0.5">The current contract returns only product data, copy, SEO, usage, instructions, media handoff text, and verification details.</p>
              </div>
              <textarea
                autoFocus
                className="flex-1 w-full bg-black/40 border border-adm-line rounded-adm-sm p-5 font-mono text-sm text-blue-300 placeholder-white/20 focus:outline-none focus:border-blue resize-none transition-colors"
                placeholder={'{\n  "schema_version": "k2.product-content.v3",\n  "product": { ... },\n  "copy": { ... },\n  "seo": { ... },\n  "usage": { ... },\n  "media": { ... },\n  "verification": { ... }\n}'}
                value={pasteJson}
                onChange={handleJsonChange}
                spellCheck={false}
              />
              {error && (
                <div className="p-3 rounded-adm-sm bg-crimson/20 border border-crimson/50 text-crimson text-base flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Instruction sidebar */}
            <div className="flex flex-col gap-5 border-t border-adm-line bg-black/10 p-4 sm:p-8 lg:w-72 lg:border-l lg:border-t-0">
              <div className="space-y-4">
                <p className="text-sm font-bold text-white/60 uppercase tracking-widest">How to use</p>
                <ol className="space-y-4">
                  {[
                    ['Use the Content Project', 'Attach readable packaging evidence and request one final PRODUCT_JSON object.'],
                    ['Validate here', 'The parser rejects operational fields, extra keys, weak SEO structure, and malformed usage or instructions.'],
                    ['Review every field', 'Check facts, copy, headings, sources, unknowns, and warnings before using the image prompts.'],
                    ['Use the Image Studio', 'Copy the product-specific PRIMARY and AFTER prompts generated in the next step.'],
                  ].map(([title, body], i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue/20 text-blue text-sm font-bold">{i + 1}</span>
                      <div>
                        <p className="text-base font-semibold text-white">{title}</p>
                        <p className="text-sm text-white/60 mt-0.5 leading-relaxed">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {parsedProduct && (
                <div className="mt-auto">
                  <div className="p-4 bg-forest/10 border border-forest/30 rounded-adm-sm mb-4">
                    <p className="text-sm font-bold text-forest mb-1">Valid JSON detected</p>
                    <p className="text-base font-semibold text-white">{parsedProduct.name || parsedProduct.product_name}</p>
                    <p className="text-sm text-white/60">{parsedProduct.brand_id || parsedProduct.brand} · {parsedProduct.origin}</p>
                    <p className="mt-2 text-xs text-white/55">{contractInfo?.schemaVersion} · {contractInfo?.evidenceCount || 0} verification source(s)</p>
                    {parseWarnings.map(warning => <p key={warning} className="mt-2 text-xs leading-relaxed text-amber">{warning}</p>)}
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-blue text-navy text-base font-bold rounded-adm-sm hover:opacity-90 transition-opacity"
                  >
                    Next: review content and image handoff
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STAGE 2: Review + Photos ─────────────────────────────────────── */}
        {stage === 'review' && parsedProduct && (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-8">

              {/* ID & Barcode */}
              <div className="flex flex-wrap gap-4 pb-6 border-b border-adm-line">
                <div className="flex-1 min-w-48">
                  <label className="text-sm text-white/60 block mb-1.5">Operational SKU</label>
                  <input
                    type="text"
                    className="w-full rounded-adm-sm border border-blue/30 bg-blue/10 px-3 py-2 font-mono text-base text-blue focus:outline-none focus:ring-1 focus:ring-blue"
                    value={parsedProduct.id || parsedProduct.sku || ''}
                    onChange={(e) => setParsedProduct({...parsedProduct, id: e.target.value, sku: e.target.value})}
                    placeholder="e.g. mutti-polpa-400g"
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-white/45">ChatGPT never supplies this value. Until the server-generated SKU command in MAP-001 is complete, assign it through the controlled Product Master process.</p>
                </div>
                <div className="w-44">
                  <label className="text-sm text-white/60 block mb-1.5">Barcode</label>
                  <input
                    type="text"
                    className="w-full text-base font-mono text-neutral-300 bg-white/5 border border-adm-line px-3 py-2 rounded-adm-sm focus:outline-none focus:border-blue"
                    value={parsedProduct.barcode || ''}
                    onChange={(e) => setParsedProduct({...parsedProduct, barcode: e.target.value})}
                    placeholder="8000400289000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* LEFT: Identity + Copy */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-blue tracking-widest uppercase mb-4">Identity</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'name',         label: 'Full Product Name' },
                        { key: 'short',        label: 'Short Name (for UI cards)' },
                        { key: 'brand_id',     label: 'Brand' },
                        { key: 'origin',       label: 'Origin (e.g. Sicilia, Italy)' },
                        { key: 'category',     label: 'Category' },
                        { key: 'size',         label: 'Size (e.g. 400g jar)' },
                        { key: 'net_weight',   label: 'Net Weight' },
                        { key: 'package_type', label: 'Package Type' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-sm text-white/60 block mb-1">{label}</label>
                          <input
                            type="text"
                            className="w-full bg-white/5 border border-adm-line rounded-adm-sm px-3 py-2 text-white text-base focus:border-blue outline-none"
                            value={parsedProduct[key] || ''}
                            onChange={(e) => setParsedProduct({...parsedProduct, [key]: e.target.value})}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-amber tracking-widest uppercase mb-4">Copywriting</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'card_description', label: 'Product card description', rows: 2 },
                        { key: 'inside',          label: 'Full product description', rows: 4 },
                        { key: 'whyBuy',          label: 'Why buy (max 18 words)',    rows: 2 },
                        { key: 'whyRare',         label: 'Why rare in PH',            rows: 2 },
                      ].map(({ key, label, rows }) => (
                        <div key={key}>
                          <label className="text-sm text-white/60 block mb-1">{label}</label>
                          <textarea
                            rows={rows}
                            className="w-full bg-white/5 border border-adm-line rounded-adm-sm px-3 py-2 text-white text-base focus:border-amber outline-none resize-none"
                            value={parsedProduct[key] || ''}
                            onChange={(e) => setParsedProduct({...parsedProduct, [key]: e.target.value})}
                          />
                        </div>
                      ))}

                      <div>
                        <label className="text-sm text-white/60 block mb-1">Key highlights (2–5 factual points)</label>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <input
                            key={i}
                            type="text"
                            placeholder={`Highlight ${i + 1}`}
                            className="mb-1.5 w-full rounded-adm-sm border border-adm-line bg-white/5 px-3 py-2 text-base text-white outline-none focus:border-amber"
                            value={(Array.isArray(parsedProduct.key_highlights) ? parsedProduct.key_highlights[i] : '') || ''}
                            onChange={(e) => {
                              const arr = Array.isArray(parsedProduct.key_highlights) ? [...parsedProduct.key_highlights] : []
                              arr[i] = e.target.value
                              setParsedProduct({...parsedProduct, key_highlights: arr.filter((item, index) => index <= i || item)})
                            }}
                          />
                        ))}
                      </div>

                      {/* Pairings */}
                      <div>
                        <label className="text-sm text-white/60 block mb-1">Pairings (3 serving suggestions)</label>
                        {[0, 1, 2].map((i) => (
                          <input
                            key={i}
                            type="text"
                            placeholder={`Pairing ${i + 1}…`}
                            className="w-full bg-white/5 border border-adm-line rounded-adm-sm px-3 py-2 text-white text-base focus:border-amber outline-none mb-1.5"
                            value={(Array.isArray(parsedProduct.pairings) ? parsedProduct.pairings[i] : '') || ''}
                            onChange={(e) => {
                              const arr = Array.isArray(parsedProduct.pairings) ? [...parsedProduct.pairings] : ['', '', '']
                              arr[i] = e.target.value
                              setParsedProduct({...parsedProduct, pairings: arr})
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-forest">SEO and page headings</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'seo_title',          label: 'SEO title (max 60 characters)', rows: 2 },
                        { key: 'meta_description',    label: 'Meta description (max 160 characters)', rows: 3 },
                        { key: 'page_heading',        label: 'Page heading (H1)', rows: 2 },
                        { key: 'supporting_heading',  label: 'Supporting heading', rows: 2 },
                      ].map(({ key, label, rows }) => (
                        <div key={key}>
                          <label className="mb-1 block text-sm text-white/60">{label}</label>
                          <textarea
                            rows={rows}
                            className="w-full resize-none rounded-adm-sm border border-adm-line bg-white/5 px-3 py-2 text-base text-white outline-none focus:border-forest"
                            value={parsedProduct[key] || ''}
                            onChange={(e) => setParsedProduct({...parsedProduct, [key]: e.target.value})}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="mb-1 block text-sm text-white/60">Search keywords (comma-separated)</label>
                        <textarea
                          rows={2}
                          className="w-full resize-none rounded-adm-sm border border-adm-line bg-white/5 px-3 py-2 text-base text-white outline-none focus:border-forest"
                          value={Array.isArray(parsedProduct.seo_keywords) ? parsedProduct.seo_keywords.join(', ') : ''}
                          onChange={(e) => setParsedProduct({...parsedProduct, seo_keywords: e.target.value.split(',').map(item => item.trim()).filter(Boolean)})}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white/60 tracking-widest uppercase mb-4">Usage, instructions and label facts</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'usage_instructions',       label: 'Usage Instructions',       rows: 2 },
                        { key: 'storage_instructions',     label: 'Storage Instructions',     rows: 2 },
                        { key: 'ingredients',              label: 'Ingredients',              rows: 3 },
                        { key: 'allergens',                label: 'Allergens',                rows: 1 },
                        { key: 'finished_product_details', label: 'Finished Product Details', rows: 2 },
                      ].map(({ key, label, rows }) => (
                        <div key={key}>
                          <label className="text-sm text-white/60 block mb-1">{label}</label>
                          <textarea
                            rows={rows}
                            className="w-full bg-white/5 border border-adm-line rounded-adm-sm px-3 py-2 text-white text-base outline-none resize-none focus:border-white/30"
                            value={parsedProduct[key] || ''}
                            onChange={(e) => setParsedProduct({...parsedProduct, [key]: e.target.value})}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Photos */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-blue tracking-widest uppercase">Reviewed product images</h4>

                  <div className="rounded-adm-sm border border-blue/25 bg-blue/10 p-4">
                    <p className="text-sm font-bold text-white">Separate K2 Product Image Studio</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">Install the Image Studio instructions once. For this product, attach the real front-package photo and copy the PRIMARY or AFTER request below. Image generation never changes the approved JSON.</p>
                    <button
                      type="button"
                      onClick={() => copyImageItem(K2_PRODUCT_IMAGE_PROJECT_INSTRUCTIONS, 'instructions')}
                      className="mt-3 min-h-11 w-full rounded-adm-sm border border-blue/30 bg-blue/10 px-3 py-2 text-sm font-semibold text-blue transition-[transform,background-color] duration-150 hover:bg-blue/15 active:scale-[0.99]"
                    >
                      {copiedImageItem === 'instructions' ? 'Image Studio instructions copied' : 'Copy one-time Image Studio instructions'}
                    </button>
                    {copyError && <p role="alert" className="mt-2 text-xs leading-relaxed text-crimson">{copyError}</p>}
                  </div>

                  {/* Primary */}
                  <div className="bg-white/5 border border-adm-line rounded-adm-sm p-4">
                    <p className="text-sm font-bold text-neutral-300 mb-1">PRIMARY · package as sold</p>
                    <p className="text-xs leading-relaxed text-white/55 mb-3">The Image Studio edits the real front photo into K2's consistent 4:5 warm-ivory or transparent presentation. Reject the result if any package detail changes.</p>
                    {contractInfo?.media?.primary_alt_text && <p className="mb-3 text-xs leading-relaxed text-white/45">Alt text: {contractInfo.media.primary_alt_text}</p>}
                    <button
                      type="button"
                      onClick={() => copyImageItem(buildPrimaryImagePrompt(parsedProduct, contractInfo?.media), 'primary')}
                      className="mb-3 min-h-11 w-full rounded-adm-sm border border-adm-line bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.99]"
                    >
                      {copiedImageItem === 'primary' ? 'PRIMARY request copied' : 'Copy product-specific PRIMARY request'}
                    </button>
                    <ImageUploadDropzone
                      label=""
                      multiple={false}
                      onUploadComplete={(url) => setPrimaryUrl(url)}
                    />
                  </div>

                  {/* After Use */}
                  <div className="bg-white/5 border border-adm-line rounded-adm-sm p-4">
                    <p className="text-sm font-bold text-neutral-300 mb-1">AFTER · prepared, applied, or in use</p>
                    <p className="text-xs leading-relaxed text-white/55 mb-3">Generate one believable 4:5 use result from the approved scene without inventing texture, quantity, color, performance, or medical or cosmetic claims.</p>
                    {contractInfo?.media?.after_scene && <p className="mb-3 text-xs leading-relaxed text-white/45">Scene: {contractInfo.media.after_scene}</p>}
                    <button
                      type="button"
                      onClick={() => copyImageItem(buildAfterImagePrompt(parsedProduct, contractInfo?.media), 'after')}
                      className="mb-3 min-h-11 w-full rounded-adm-sm border border-adm-line bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.99]"
                    >
                      {copiedImageItem === 'after' ? 'AFTER request copied' : 'Copy product-specific AFTER request'}
                    </button>
                    <ImageUploadDropzone
                      label=""
                      multiple={false}
                      onUploadComplete={(url) => setAfterUrl(url)}
                    />
                  </div>

                  {/* Gallery — 5 sample shots */}
                  <div className="bg-white/5 border border-adm-line rounded-adm-sm p-4">
                    <p className="text-sm font-bold text-neutral-300 mb-1">Optional gallery <span className="text-white/55 font-normal">(up to 5 real or reviewed photos)</span></p>
                    <p className="text-xs text-white/55 mb-3">Use package details, alternate angles, label evidence, or separately reviewed lifestyle images. Gallery files are not required for a Draft.</p>
                    <ImageUploadDropzone
                      label=""
                      multiple={true}
                      maxFiles={5}
                      onUploadComplete={(urls) => setGalleryUrls(Array.isArray(urls) ? urls : [urls])}
                    />
                  </div>

                  {/* Upload status summary */}
                  <div className="bg-black/20 rounded-adm-sm p-4 space-y-2">
                    <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-2">Upload Status</p>
                    {[
                      { label: 'PRIMARY package image', filled: !!primaryUrl },
                      { label: 'AFTER in-use image', filled: !!afterUrl },
                      { label: `Optional gallery`, filled: galleryUrls.length > 0, extra: galleryUrls.length > 0 ? `(${galleryUrls.length}/5)` : '' },
                    ].map(({ label, filled, extra }) => (
                      <div key={label} className="flex items-center gap-2 text-base">
                        <span className={`h-2.5 w-2.5 rounded-full ${filled ? 'bg-forest' : 'border border-white/30 bg-transparent'}`} aria-hidden="true" />
                        <span className={filled ? 'text-neutral-300' : 'text-white/55'}>{label} {extra}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="pt-8 pb-4 flex flex-col items-center border-t border-adm-line">
                <p className="mb-4 text-base text-white/60">{secure ? 'Review and copy the approved content here, then use phone-first intake for the server-created, attributable Draft.' : 'This saves a product Draft. Pricing review, publication, and physical inventory remain separate controlled steps.'}</p>
                {error && <p role="alert" className="mb-4 w-full max-w-2xl rounded-adm-sm border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full max-w-sm bg-forest text-navy font-bold py-4 rounded-adm-sm transition-[transform,opacity] duration-150 active:scale-[0.99] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {saving ? 'Saving Draft…' : secure ? 'Use phone-first intake to save' : 'Save product Draft'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
