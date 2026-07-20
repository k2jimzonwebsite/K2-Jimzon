import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ImageUploadDropzone from '../../components/ui/ImageUploadDropzone'

export default function SmartPasteModal({ onClose, onProductAdded }) {
  const [pasteData, setPasteData] = useState('')
  const [parsedProduct, setParsedProduct] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handlePasteChange = (e) => {
    const value = e.target.value
    setPasteData(value)
    setError('')
    setParsedProduct(null)

    if (!value.trim()) return

    try {
      // Sometimes AI includes markdown block ```json ... ```
      let cleanValue = value.trim()
      if (cleanValue.startsWith('```')) {
        const firstNewline = cleanValue.indexOf('\n')
        const lastBacktick = cleanValue.lastIndexOf('```')
        cleanValue = cleanValue.substring(firstNewline, lastBacktick).trim()
      }

      const parsed = JSON.parse(cleanValue)
      
      // Basic validation
      if (!parsed.product_name) {
        setError('Missing required field (product_name) in JSON.')
        return
      }
      
      setParsedProduct(parsed)
    } catch (err) {
      setError('Invalid JSON format. Make sure you pasted exactly what the AI output.')
    }
  }

  const handleSave = async () => {
    if (!parsedProduct) return
    if (!parsedProduct.sku) {
      alert("SKU is required! Please type it into the SKU box if the AI forgot it, or generate one.")
      return
    }
    setSaving(true)

    // Check if SKU exists
    const { data: existing } = await supabase.from('products').select('sku').eq('sku', parsedProduct.sku).single()
    if (existing) {
      alert(`SKU ${parsedProduct.sku} already exists!`)
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('products').insert([
      {
        sku: parsedProduct.sku,
        barcode: parsedProduct.barcode || null,
        name: parsedProduct.product_name,
        brand_id: parsedProduct.brand || null,
        category_id: parsedProduct.category || null,
        subcategory: parsedProduct.subcategory || null,
        country_of_origin: parsedProduct.origin || null,
        net_weight: parsedProduct.net_weight || null,
        package_type: parsedProduct.package_type || null,
        description: parsedProduct.description || '',
        why_buy: parsedProduct.why_buy || '',
        usage_instructions: parsedProduct.usage || '',
        storage_instructions: parsedProduct.storage || '',
        ingredients: parsedProduct.ingredients || '',
        allergens: parsedProduct.allergens || '',
        finished_product_details: parsedProduct.finished_product || '',
        seo_keywords: Array.isArray(parsedProduct.seo_keywords) ? parsedProduct.seo_keywords : [],
        primary_image_url: parsedProduct.primary_image_url || null, // from Dropzone
        lifestyle_images: parsedProduct.lifestyle_images ? [parsedProduct.lifestyle_images] : [], // from Dropzone
        is_ai_generated: true,
        status: 'Draft'
      }
    ])

    if (insertError) {
      alert("Error saving product: " + insertError.message)
      setSaving(false)
      return
    }

    if (onProductAdded) onProductAdded(parsedProduct.sku)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#05080f]/95 backdrop-blur-sm animate-in fade-in text-white p-4 md:p-8">
      
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col bg-[#0A101D] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 shrink-0">
          <div>
            <h2 className="font-serif text-xl font-semibold">Smart Paste AI Import</h2>
            <p className="text-sm text-white/50 mt-1">Paste your AI generated product profile directly here.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="rounded-full bg-white/5 p-2 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Left Panel: Paste Area */}
          <div className="w-full lg:w-1/3 border-r border-white/10 p-6 flex flex-col bg-[#05080f]">
            <label className="text-sm font-medium text-white/70 mb-2 block">Paste AI Code Here</label>
            <textarea
              autoFocus
              className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-blue-300 placeholder-white/20 focus:outline-none focus:border-blue resize-none transition-colors"
              placeholder={'{\n  "sku": "FER-001",\n  "product_name": "Ferrero Rocher",\n  ...\n}'}
              value={pasteData}
              onChange={handlePasteChange}
              spellCheck={false}
            />
            {error && (
              <div className="mt-4 p-3 rounded bg-crimson/20 border border-crimson/50 text-crimson text-sm flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* Right Panel: Preview Area */}
          <div className="flex-1 flex flex-col bg-[#10141d] overflow-y-auto relative">
            {!parsedProduct ? (
              <div className="h-full flex items-center justify-center p-6 text-white/30 text-sm border-2 border-dashed border-white/5 m-6 rounded-xl">
                Paste valid JSON to see AI preview
              </div>
            ) : (
              <div className="p-8 max-w-4xl mx-auto w-full animate-in zoom-in-95 space-y-8">
                {/* Header & SKU */}
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <h3 className="text-lg font-serif font-semibold text-white">Review AI Content</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white/40">Assign SKU:</span>
                    <input 
                      type="text"
                      className="text-sm font-mono text-purple-400 bg-purple-400/10 border border-purple-400/30 px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
                      value={parsedProduct.sku || ''}
                      onChange={(e) => setParsedProduct({...parsedProduct, sku: e.target.value})}
                      placeholder="e.g. FER-001"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Taxonomy Column */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-blue tracking-widest uppercase mb-4">Identity</h4>
                    <div>
                      <label className="text-xs text-white/40 block mb-1">Product Name</label>
                      <input 
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-blue outline-none"
                        value={parsedProduct.product_name || ''}
                        onChange={(e) => setParsedProduct({...parsedProduct, product_name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Brand</label>
                        <input 
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-blue outline-none"
                          value={parsedProduct.brand || ''}
                          onChange={(e) => setParsedProduct({...parsedProduct, brand: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Origin</label>
                        <input 
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-blue outline-none"
                          value={parsedProduct.origin || ''}
                          onChange={(e) => setParsedProduct({...parsedProduct, origin: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Category</label>
                        <input 
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-blue outline-none"
                          value={parsedProduct.category || ''}
                          onChange={(e) => setParsedProduct({...parsedProduct, category: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Subcategory</label>
                        <input 
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-blue outline-none"
                          value={parsedProduct.subcategory || ''}
                          onChange={(e) => setParsedProduct({...parsedProduct, subcategory: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Content Column */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-amber tracking-widest uppercase mb-4">Content & Copy</h4>
                    <div>
                      <label className="text-xs text-white/40 block mb-1">Description</label>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-amber outline-none h-20 resize-none"
                        value={parsedProduct.description || ''}
                        onChange={(e) => setParsedProduct({...parsedProduct, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 block mb-1">Why Buy</label>
                      <textarea 
                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-amber outline-none h-20 resize-none"
                        value={parsedProduct.why_buy || ''}
                        onChange={(e) => setParsedProduct({...parsedProduct, why_buy: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Usage</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-white/30 outline-none h-16 resize-none"
                      value={parsedProduct.usage || ''}
                      onChange={(e) => setParsedProduct({...parsedProduct, usage: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Storage</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-white/30 outline-none h-16 resize-none"
                      value={parsedProduct.storage || ''}
                      onChange={(e) => setParsedProduct({...parsedProduct, storage: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Ingredients</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm focus:border-white/30 outline-none h-16 resize-none"
                      value={parsedProduct.ingredients || ''}
                      onChange={(e) => setParsedProduct({...parsedProduct, ingredients: e.target.value})}
                    />
                  </div>
                </div>

                {/* AI Prompts & Photos */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h4 className="text-xs font-bold text-purple-400 tracking-widest uppercase mb-4">Photos & Prompts</h4>
                  
                  {parsedProduct.primary_photo_prompt && (
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mb-2">
                      <h5 className="text-xs font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Primary Photo Prompt
                      </h5>
                      <p className="text-xs text-purple-300/80 leading-relaxed font-mono">
                        {parsedProduct.primary_photo_prompt}
                      </p>
                    </div>
                  )}

                  {parsedProduct.after_use_photo_prompt && (
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                      <h5 className="text-xs font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        After-Use Photo Prompt
                      </h5>
                      <p className="text-xs text-purple-300/80 leading-relaxed font-mono">
                        {parsedProduct.after_use_photo_prompt}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <ImageUploadDropzone 
                      label="Upload Primary Photo" 
                      multiple={false}
                      onUploadComplete={(url) => setParsedProduct({...parsedProduct, primary_image_url: url})}
                    />
                    <ImageUploadDropzone 
                      label="Upload Lifestyle Photo" 
                      multiple={false}
                      onUploadComplete={(url) => setParsedProduct({...parsedProduct, lifestyle_images: url})}
                    />
                  </div>
                </div>

                <div className="pt-8 flex flex-col items-center border-t border-white/10 mt-8">
                  <p className="text-sm text-white/50 mb-4 italic">Pricing and Inventory are managed manually in the PIM Sheet after saving.</p>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full max-w-sm bg-forest text-navy font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(205,250,119,0.2)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2"
                  >
                    {saving ? 'Saving...' : 'Save AI Content to Inventory'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
