import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ImageUploadDropzone from '../../components/ui/ImageUploadDropzone'

// ─── Field mapping: Project 1 AI output → Supabase columns ────────────────────
function mapAiToDb(p) {
  return {
    sku:                    p.id || p.sku || null,        // AI generates kebab-case id; staff can also supply a numeric SKU
    barcode:                p.barcode || null,
    name:                   p.name || p.product_name || '', // accept both old and new schema
    short:                  p.short || null,
    brand_id:               p.brand_id || p.brand || null,
    category_id:            p.category || null,
    origin:                 p.origin || null,
    net_weight:             p.net_weight || null,
    package_type:           p.package_type || null,
    description:            p.inside || p.description || '',   // "inside" is the new premium description field
    why_buy:                p.whyBuy || p.why_buy || '',
    why_rare:               p.whyRare || null,
    usage_instructions:     p.usage_instructions || p.usage || '',
    storage_instructions:   p.storage_instructions || p.storage || '',
    ingredients:            p.ingredients || '',
    allergens:              p.allergens || '',
    finished_product_details: p.finished_product_details || p.finished_product || '',
    pairings:               Array.isArray(p.pairings) ? p.pairings : [],
    size:                   p.size || null,
    primary_image_url:      p.primary_image_url || null,
    lifestyle_images:       p.lifestyle_images ? [p.lifestyle_images] : [],
    is_ai_generated:        true,
    status:                 'Draft',
  }
}

export default function SmartPasteModal({ onClose, onProductAdded }) {
  const [stage, setStage]               = useState('json')   // 'json' | 'preview' | 'photo'
  const [pasteJson, setPasteJson]       = useState('')
  const [pastePrompt, setPastePrompt]   = useState('')
  const [parsedProduct, setParsedProduct] = useState(null)
  const [error, setError]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [copied, setCopied]             = useState(false)

  // ─── Parse JSON from Project 1 Section 1 ──────────────────────────────────
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
        setError('Missing required field: "name". Make sure you pasted the Product Object from Section 1.')
        return
      }
      setParsedProduct(parsed)
      setStage('preview')
    } catch {
      setError('Invalid JSON. Paste only the JSON block from Section 1 of your AI output.')
    }
  }

  // ─── Copy Section 2 prompt to clipboard ───────────────────────────────────
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(pastePrompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─── Save mapped product to Supabase ──────────────────────────────────────
  const handleSave = async () => {
    if (!parsedProduct) return
    const dbRow = mapAiToDb(parsedProduct)
    if (!dbRow.sku) {
      alert('The AI did not generate an ID / SKU. Please type one in the ID field before saving.')
      return
    }
    setSaving(true)
    const { data: existing } = await supabase.from('products').select('sku').eq('sku', dbRow.sku).single()
    if (existing) {
      alert(`ID/SKU "${dbRow.sku}" already exists! Change it before saving.`)
      setSaving(false)
      return
    }
    const { error: insertError } = await supabase.from('products').insert([dbRow])
    if (insertError) {
      alert('Error saving product: ' + insertError.message)
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
          <div>
            <h2 className="font-serif text-xl font-semibold">✨ Smart Paste AI Import</h2>
            <p className="text-sm text-white/50 mt-0.5">Paste the output from K2 Jimzon Product Intelligence AI (Project 1)</p>
          </div>
          {/* Stage tabs */}
          <div className="flex items-center gap-2">
            {['json', 'preview', 'photo'].map((s, i) => (
              <button
                key={s}
                disabled={s !== 'json' && !parsedProduct}
                onClick={() => setStage(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${stage === s ? 'bg-blue text-navy' : 'bg-white/5 text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'}`}
              >
                {i + 1}. {s === 'json' ? 'Paste JSON' : s === 'preview' ? 'Review & Edit' : 'Photo Prompt'}
              </button>
            ))}
            <button onClick={onClose} className="ml-4 rounded-full bg-white/5 p-2 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ── STAGE 1: Paste JSON ── */}
          {stage === 'json' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 p-8 flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-7 h-7 rounded-full bg-blue/20 border border-blue/40 text-blue text-xs font-bold flex items-center justify-center">1</span>
                  <div>
                    <p className="font-semibold text-white">Paste Section 1 — Product Object JSON</p>
                    <p className="text-xs text-white/40">Copy the entire JSON block from Project 1's output</p>
                  </div>
                </div>
                <textarea
                  autoFocus
                  className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-blue-300 placeholder-white/20 focus:outline-none focus:border-blue resize-none transition-colors"
                  placeholder={'{\n  "id": "mutti-polpa-400g",\n  "name": "Mutti Polpa Finely Chopped Tomatoes",\n  "short": "Mutti Polpa",\n  "brand_id": "Mutti",\n  "inside": "...",\n  "whyBuy": "...",\n  "whyRare": "...",\n  ...\n}'}
                  value={pasteJson}
                  onChange={handleJsonChange}
                  spellCheck={false}
                />
                {error && (
                  <div className="p-3 rounded bg-crimson/20 border border-crimson/50 text-crimson text-sm flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                  </div>
                )}
              </div>
              <div className="w-px bg-white/10 hidden lg:block" />
              <div className="lg:w-80 p-8 flex flex-col gap-6 bg-black/10">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-purple-400/20 border border-purple-400/40 text-purple-400 text-xs font-bold flex items-center justify-center">2</span>
                  <div>
                    <p className="font-semibold text-white">Paste Section 2 — Image Prompt</p>
                    <p className="text-xs text-white/40">Optional: paste the photo prompt so you can copy it to Project 2 later</p>
                  </div>
                </div>
                <textarea
                  className="flex-1 min-h-[200px] w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-purple-300 placeholder-white/20 focus:outline-none focus:border-purple-400 resize-none transition-colors"
                  placeholder={"Use the attached product packaging image as the visual reference...\n\nGenerate exactly TWO images.\nImage 1 = Primary Product Photo.\nImage 2 = After-Use Product Photo."}
                  value={pastePrompt}
                  onChange={(e) => setPastePrompt(e.target.value)}
                  spellCheck={false}
                />
                <p className="text-xs text-white/30 italic">You can copy this prompt and paste it into ChatGPT Image (Project 2) along with the product photo.</p>
              </div>
            </div>
          )}

          {/* ── STAGE 2: Review & Edit ── */}
          {stage === 'preview' && parsedProduct && (
            <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in">
              {/* ID & Barcode */}
              <div className="flex justify-between items-start pb-4 border-b border-white/10 gap-6">
                <div className="flex-1">
                  <label className="text-xs text-white/40 block mb-1">Product ID (kebab-case)</label>
                  <input
                    type="text"
                    className="w-full text-sm font-mono text-purple-400 bg-purple-400/10 border border-purple-400/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                    value={parsedProduct.id || parsedProduct.sku || ''}
                    onChange={(e) => setParsedProduct({...parsedProduct, id: e.target.value, sku: e.target.value})}
                    placeholder="e.g. mutti-polpa-400g"
                  />
                </div>
                <div className="w-48">
                  <label className="text-xs text-white/40 block mb-1">Barcode</label>
                  <input
                    type="text"
                    className="w-full text-sm font-mono text-white/80 bg-white/5 border border-white/10 px-3 py-2 rounded-lg focus:outline-none focus:border-blue"
                    value={parsedProduct.barcode || ''}
                    onChange={(e) => setParsedProduct({...parsedProduct, barcode: e.target.value})}
                    placeholder="8000400289000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Identity Column */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-blue tracking-widest uppercase">Identity</h4>
                  {[
                    { key: 'name', label: 'Full Product Name' },
                    { key: 'short', label: 'Short Name (UI Cards)' },
                    { key: 'brand_id', label: 'Brand' },
                    { key: 'origin', label: 'Origin (e.g., Sicilia, Italy)' },
                    { key: 'category', label: 'Category' },
                    { key: 'size', label: 'Size (e.g., 400g jar)' },
                    { key: 'net_weight', label: 'Net Weight' },
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

                {/* Copy Column */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-amber tracking-widest uppercase">Copywriting</h4>
                  {[
                    { key: 'inside', label: 'Inside (3-sentence description)', rows: 4 },
                    { key: 'whyBuy', label: 'Why Buy (max 18 words)', rows: 2 },
                    { key: 'whyRare', label: 'Why Rare in PH', rows: 2 },
                  ].map(({ key, label, rows }) => (
                    <div key={key}>
                      <label className="text-xs text-white/40 block mb-1">{label}</label>
                      <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber outline-none resize-none"
                        rows={rows}
                        value={parsedProduct[key] || ''}
                        onChange={(e) => setParsedProduct({...parsedProduct, [key]: e.target.value})}
                      />
                    </div>
                  ))}
                  {/* Pairings */}
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Pairings (3 suggestions)</label>
                    {[0, 1, 2].map((i) => (
                      <input
                        key={i}
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber outline-none mb-1.5"
                        placeholder={`Pairing ${i + 1}…`}
                        value={(Array.isArray(parsedProduct.pairings) ? parsedProduct.pairings[i] : '') || ''}
                        onChange={(e) => {
                          const updated = Array.isArray(parsedProduct.pairings) ? [...parsedProduct.pairings] : ['', '', '']
                          updated[i] = e.target.value
                          setParsedProduct({...parsedProduct, pairings: updated})
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Specs Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                {[
                  { key: 'usage_instructions', label: 'Usage Instructions' },
                  { key: 'storage_instructions', label: 'Storage Instructions' },
                  { key: 'allergens', label: 'Allergens' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-white/40 block mb-1">{label}</label>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-white/30 outline-none h-20 resize-none"
                      value={parsedProduct[key] || ''}
                      onChange={(e) => setParsedProduct({...parsedProduct, [key]: e.target.value})}
                    />
                  </div>
                ))}
                <div className="sm:col-span-3">
                  <label className="text-xs text-white/40 block mb-1">Ingredients</label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-white/30 outline-none h-16 resize-none"
                    value={parsedProduct.ingredients || ''}
                    onChange={(e) => setParsedProduct({...parsedProduct, ingredients: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-xs text-white/40 block mb-1">Finished Product Details</label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-white/30 outline-none h-16 resize-none"
                    value={parsedProduct.finished_product_details || parsedProduct.finished_product || ''}
                    onChange={(e) => setParsedProduct({...parsedProduct, finished_product_details: e.target.value})}
                  />
                </div>
              </div>

              {/* Photo Uploads */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold text-purple-400 tracking-widest uppercase">Product Photos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ImageUploadDropzone
                    label="Upload Primary Photo (Studio White)"
                    multiple={false}
                    onUploadComplete={(url) => setParsedProduct({...parsedProduct, primary_image_url: url})}
                  />
                  <ImageUploadDropzone
                    label="Upload After-Use / Lifestyle Photo"
                    multiple={false}
                    onUploadComplete={(url) => setParsedProduct({...parsedProduct, lifestyle_images: url})}
                  />
                </div>
              </div>

              {/* Save */}
              <div className="pt-8 flex flex-col items-center border-t border-white/10">
                <p className="text-sm text-white/40 mb-4 italic">Pricing and stock levels are set in the PIM Sheet after saving.</p>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full max-w-sm bg-forest text-navy font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(205,250,119,0.2)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
                >
                  {saving ? 'Saving...' : '✓ Save AI Product to Inventory'}
                </button>
              </div>
            </div>
          )}

          {/* ── STAGE 3: Photo Prompt for Project 2 ── */}
          {stage === 'photo' && (
            <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full space-y-6 animate-in fade-in">
              <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <span className="text-purple-400">🎨</span> Section 2 — ChatGPT Image Prompt
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5">Copy this and paste it into ChatGPT Image (Project 2) together with your product photo.</p>
                  </div>
                  <button
                    onClick={handleCopyPrompt}
                    disabled={!pastePrompt.trim()}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all disabled:opacity-30 ${copied ? 'bg-forest text-navy' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/40'}`}
                  >
                    {copied ? '✓ Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                {pastePrompt ? (
                  <pre className="text-xs text-purple-300/80 font-mono leading-relaxed whitespace-pre-wrap">{pastePrompt}</pre>
                ) : (
                  <div className="text-center py-8 text-white/30 text-sm border-2 border-dashed border-white/10 rounded-lg">
                    Go back to Step 1 and paste the Section 2 image prompt to see it here.
                  </div>
                )}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-white/60 space-y-2">
                <p className="font-semibold text-white/80">How to use this in ChatGPT:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs">
                  <li>Open your <strong className="text-white">K2 Jimzon Product Photography</strong> project (Project 2) in ChatGPT.</li>
                  <li>Attach the product packaging photo to the message.</li>
                  <li>Paste this prompt and send. ChatGPT Image will generate the two photos automatically.</li>
                  <li>Download both images and upload them here using the photo dropzones in Step 2.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
