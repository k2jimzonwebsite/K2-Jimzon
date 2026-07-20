import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ImageUploadDropzone from '../../components/ui/ImageUploadDropzone'

// ─── Field mapping: Project 1 AI output → Supabase columns ───────────────────
function mapAiToDb(p, images) {
  // Combine after-use + gallery into lifestyle_images array
  // after image goes first so the product page can use index 0 as the "after" slot
  const lifestyleArr = [
    images.after || null,
    ...images.gallery.filter(Boolean)
  ].filter(Boolean)

  return {
    sku:                      p.id || p.sku || null,
    barcode:                  p.barcode || null,
    name:                     p.name || p.product_name || '',
    short:                    p.short || null,
    brand_id:                 p.brand_id || p.brand || null,
    category_id:              p.category || null,
    origin:                   p.origin || null,
    net_weight:               p.net_weight || null,
    package_type:             p.package_type || null,
    size:                     p.size || null,
    description:              p.inside || p.description || '',
    why_buy:                  p.whyBuy || p.why_buy || '',
    usage_instructions:       p.usage_instructions || p.usage || '',
    storage_instructions:     p.storage_instructions || p.storage || '',
    ingredients:              p.ingredients || '',
    allergens:                p.allergens || '',
    finished_product_details: p.finished_product_details || p.finished_product || '',
    primary_image_url:        images.primary || null,
    lifestyle_images:         lifestyleArr,
    is_ai_generated:          true,
    status:                   'Draft',
  }
}

export default function SmartPasteModal({ onClose, onProductAdded }) {
  const [stage, setStage]               = useState('json')    // 'json' | 'review'
  const [pasteJson, setPasteJson]       = useState('')
  const [parsedProduct, setParsedProduct] = useState(null)
  const [error, setError]               = useState('')
  const [saving, setSaving]             = useState(false)

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
    if (!value.trim()) return
    try {
      let clean = value.trim()
      if (clean.startsWith('```')) {
        const firstNewline = clean.indexOf('\n')
        const lastBacktick = clean.lastIndexOf('```')
        clean = clean.substring(firstNewline, lastBacktick).trim()
      }
      const parsed = JSON.parse(clean)
      if (!parsed.name && !parsed.product_name) {
        setError('Missing required "name" field. Make sure you pasted the JSON block from Section 1 of your AI output.')
        return
      }
      setParsedProduct(parsed)
    } catch {
      setError('Invalid JSON. Paste only the JSON block from Section 1 of your AI output.')
    }
  }

  const handleNext = () => {
    if (parsedProduct) setStage('review')
  }

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!parsedProduct) return
    const dbRow = mapAiToDb(parsedProduct, { primary: primaryUrl, after: afterUrl, gallery: galleryUrls })
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
      alert('Error saving: ' + insertError.message)
      setSaving(false)
      return
    }
    if (onProductAdded) onProductAdded(dbRow.sku)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#05080f]/95 backdrop-blur-sm animate-in fade-in text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col bg-[#0A101D] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold">✨ Smart Paste AI Import</h2>
              <p className="text-sm text-white/50 mt-0.5">Paste JSON from K2 Jimzon Product Intelligence AI · Upload 7 product photos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step Pills */}
            <div className="flex items-center gap-1 bg-black/30 rounded-full p-1">
              <button
                onClick={() => setStage('json')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${stage === 'json' ? 'bg-blue text-navy' : 'text-white/40 hover:text-white'}`}
              >
                1 · Paste JSON
              </button>
              <button
                disabled={!parsedProduct}
                onClick={() => setStage('review')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${stage === 'review' ? 'bg-blue text-navy' : 'text-white/40 hover:text-white'}`}
              >
                2 · Review + Photos
              </button>
            </div>
            <button onClick={onClose} className="rounded-full bg-white/5 p-2 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
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
            <div className="flex-1 p-8 flex flex-col gap-4 bg-[#05080f]">
              <div className="mb-1">
                <p className="font-semibold text-white text-sm">Paste Section 1 — Product Object JSON</p>
                <p className="text-xs text-white/40 mt-0.5">Copy the full JSON block from your K2 Jimzon Product Intelligence AI output</p>
              </div>
              <textarea
                autoFocus
                className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-5 font-mono text-xs text-blue-300 placeholder-white/20 focus:outline-none focus:border-blue resize-none transition-colors"
                placeholder={'{\n  "id": "mutti-polpa-400g",\n  "name": "Mutti Polpa Finely Chopped Tomatoes",\n  "short": "Mutti Polpa",\n  "brand_id": "Mutti",\n  "origin": "Parma, Italy",\n  "inside": "...",\n  "whyBuy": "...",\n  "whyRare": "...",\n  "pairings": ["...", "...", "..."],\n  ...\n}'}
                value={pasteJson}
                onChange={handleJsonChange}
                spellCheck={false}
              />
              {error && (
                <div className="p-3 rounded-lg bg-crimson/20 border border-crimson/50 text-crimson text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Instruction sidebar */}
            <div className="lg:w-72 p-8 border-t lg:border-t-0 lg:border-l border-white/10 bg-black/10 flex flex-col gap-5">
              <div className="space-y-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">How to use</p>
                <ol className="space-y-4">
                  {[
                    ['Open ChatGPT', 'Go to your K2 Jimzon Product Intelligence project and scan your product.'],
                    ['Copy Section 1', 'Copy only the JSON block (Section 1 — Product Object) from the output.'],
                    ['Paste here', 'Paste it in the box on the left. It parses automatically.'],
                    ['Review + Photos', 'Confirm the product details and upload your 7 product photos.'],
                  ].map(([title, body], i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue/20 text-blue text-xs font-bold">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {parsedProduct && (
                <div className="mt-auto">
                  <div className="p-4 bg-forest/10 border border-forest/30 rounded-xl mb-4">
                    <p className="text-xs font-bold text-forest mb-1">✓ Valid JSON detected</p>
                    <p className="text-sm font-semibold text-white">{parsedProduct.name || parsedProduct.product_name}</p>
                    <p className="text-xs text-white/40">{parsedProduct.brand_id || parsedProduct.brand} · {parsedProduct.origin}</p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-blue text-navy text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Next → Review + Photos
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STAGE 2: Review + Photos ─────────────────────────────────────── */}
        {stage === 'review' && parsedProduct && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in">

              {/* ID & Barcode */}
              <div className="flex flex-wrap gap-4 pb-6 border-b border-white/10">
                <div className="flex-1 min-w-48">
                  <label className="text-xs text-white/40 block mb-1.5">Product ID (kebab-case)</label>
                  <input
                    type="text"
                    className="w-full text-sm font-mono text-purple-400 bg-purple-400/10 border border-purple-400/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                    value={parsedProduct.id || parsedProduct.sku || ''}
                    onChange={(e) => setParsedProduct({...parsedProduct, id: e.target.value, sku: e.target.value})}
                    placeholder="e.g. mutti-polpa-400g"
                  />
                </div>
                <div className="w-44">
                  <label className="text-xs text-white/40 block mb-1.5">Barcode</label>
                  <input
                    type="text"
                    className="w-full text-sm font-mono text-white/80 bg-white/5 border border-white/10 px-3 py-2 rounded-lg focus:outline-none focus:border-blue"
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
                    <h4 className="text-xs font-bold text-blue tracking-widest uppercase mb-4">Identity</h4>
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
                          <label className="text-xs text-white/40 block mb-1">{label}</label>
                          <input
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue outline-none"
                            value={parsedProduct[key] || ''}
                            onChange={(e) => setParsedProduct({...parsedProduct, [key]: e.target.value})}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-amber tracking-widest uppercase mb-4">Copywriting</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'inside',  label: 'Inside — 3 sentence description', rows: 4 },
                        { key: 'whyBuy',  label: 'Why Buy (max 18 words)',           rows: 2 },
                        { key: 'whyRare', label: 'Why Rare in PH',                   rows: 2 },
                      ].map(({ key, label, rows }) => (
                        <div key={key}>
                          <label className="text-xs text-white/40 block mb-1">{label}</label>
                          <textarea
                            rows={rows}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber outline-none resize-none"
                            value={parsedProduct[key] || ''}
                            onChange={(e) => setParsedProduct({...parsedProduct, [key]: e.target.value})}
                          />
                        </div>
                      ))}

                      {/* Pairings */}
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Pairings (3 serving suggestions)</label>
                        {[0, 1, 2].map((i) => (
                          <input
                            key={i}
                            type="text"
                            placeholder={`Pairing ${i + 1}…`}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber outline-none mb-1.5"
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
                    <h4 className="text-xs font-bold text-white/40 tracking-widest uppercase mb-4">Specs</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'usage_instructions',       label: 'Usage Instructions',       rows: 2 },
                        { key: 'storage_instructions',     label: 'Storage Instructions',     rows: 2 },
                        { key: 'ingredients',              label: 'Ingredients',              rows: 3 },
                        { key: 'allergens',                label: 'Allergens',                rows: 1 },
                        { key: 'finished_product_details', label: 'Finished Product Details', rows: 2 },
                      ].map(({ key, label, rows }) => (
                        <div key={key}>
                          <label className="text-xs text-white/40 block mb-1">{label}</label>
                          <textarea
                            rows={rows}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none focus:border-white/30"
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
                  <h4 className="text-xs font-bold text-purple-400 tracking-widest uppercase">Product Photos</h4>

                  {/* Primary */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs font-bold text-white/70 mb-1">Primary Photo</p>
                    <p className="text-[11px] text-white/30 mb-3">Clean studio white background — generated by AI (Image 1)</p>
                    <ImageUploadDropzone
                      label=""
                      multiple={false}
                      onUploadComplete={(url) => setPrimaryUrl(url)}
                    />
                  </div>

                  {/* After Use */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs font-bold text-white/70 mb-1">After-Use Photo</p>
                    <p className="text-[11px] text-white/30 mb-3">Prepared / plated food — generated by AI (Image 2)</p>
                    <ImageUploadDropzone
                      label=""
                      multiple={false}
                      onUploadComplete={(url) => setAfterUrl(url)}
                    />
                  </div>

                  {/* Gallery — 5 sample shots */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs font-bold text-white/70 mb-1">Product Gallery <span className="text-white/30 font-normal">(up to 5 photos)</span></p>
                    <p className="text-[11px] text-white/30 mb-3">Detail shots, packaging angles, in-context lifestyle photos</p>
                    <ImageUploadDropzone
                      label=""
                      multiple={true}
                      maxFiles={5}
                      onUploadComplete={(urls) => setGalleryUrls(Array.isArray(urls) ? urls : [urls])}
                    />
                  </div>

                  {/* Upload status summary */}
                  <div className="bg-black/20 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Upload Status</p>
                    {[
                      { label: 'Primary Photo',   filled: !!primaryUrl },
                      { label: 'After-Use Photo', filled: !!afterUrl },
                      { label: `Gallery Photos`,  filled: galleryUrls.length > 0, extra: galleryUrls.length > 0 ? `(${galleryUrls.length}/5)` : '' },
                    ].map(({ label, filled, extra }) => (
                      <div key={label} className="flex items-center gap-2 text-sm">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${filled ? 'bg-forest/30 text-forest' : 'bg-white/5 text-white/20'}`}>
                          {filled ? '✓' : '○'}
                        </span>
                        <span className={filled ? 'text-white/70' : 'text-white/30'}>{label} {extra}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="pt-8 pb-4 flex flex-col items-center border-t border-white/10">
                <p className="text-sm text-white/40 mb-4 italic">Pricing and stock levels are set in the PIM Sheet after saving.</p>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full max-w-sm bg-forest text-navy font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(205,250,119,0.2)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
                >
                  {saving ? 'Saving to Inventory…' : '✓ Save Product to Inventory'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
