import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const SYSTEM_PROMPT = `Act as an expert e-commerce copywriter and pricing analyst.
I will give you a basic product name and SKU. You will generate a rich product profile and output it strictly as a raw JSON object (do not wrap in markdown or backticks).

Required JSON structure:
{
  "sku": "string",
  "title": "string",
  "description": "string (SEO optimized, 3-4 sentences)",
  "retail_price": number,
  "wholesale_price": number,
  "why_buy": "string (bullet points separated by \\n)",
  "image_url": "string (placeholder url or stock photo)"
}`

export default function SmartPasteModal({ onClose, onProductAdded }) {
  const [pasteData, setPasteData] = useState('')
  const [parsedProduct, setParsedProduct] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      if (!parsed.sku || !parsed.title) {
        setError('Missing required fields (sku, title) in JSON.')
        return
      }
      
      setParsedProduct(parsed)
    } catch (err) {
      setError('Invalid JSON format. Make sure you pasted exactly what the AI output.')
    }
  }

  const handleSave = async () => {
    if (!parsedProduct) return
    setSaving(true)

    // Check if SKU exists
    const { data: existing } = await supabase.from('products').select('sku').eq('sku', parsedProduct.sku).single()
    if (existing) {
      alert(`SKU ${parsedProduct.sku} already exists!`)
      setSaving(false)
      return
    }

    let finalImageUrl = parsedProduct.image_url || ''
    // Clean up if AI hallucinates a markdown link like [url](url)
    if (finalImageUrl.includes('](')) {
      const match = finalImageUrl.match(/\((.*?)\)/)
      if (match) finalImageUrl = match[1]
    }

    const { error: insertError } = await supabase.from('products').insert([
      {
        sku: parsedProduct.sku,
        title: parsedProduct.title,
        description: parsedProduct.description || '',
        retail_price: Number(parsedProduct.retail_price) || 0,
        vip_price: Number(parsedProduct.wholesale_price) || 0,
        why_buy: parsedProduct.why_buy || '',
        image_url: finalImageUrl,
        status: 'Draft'
      }
    ])

    if (insertError) {
      alert("Error saving product: " + insertError.message)
      setSaving(false)
      return
    }

    if (onProductAdded) onProductAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#05080f]/95 backdrop-blur-sm animate-in fade-in text-white p-4 md:p-8">
      
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col bg-[#0A101D] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 shrink-0">
          <div>
            <h2 className="font-serif text-xl font-semibold">Smart Paste AI Import</h2>
            <p className="text-sm text-white/50 mt-1">Paste your Gemini/Claude JSON output directly here.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCopyPrompt}
              className="flex items-center gap-2 rounded-lg bg-blue/10 border border-blue/20 px-4 py-2 text-sm font-medium text-blue hover:bg-blue/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {copied ? 'Copied Prompt!' : 'Copy AI Prompt'}
            </button>
            <button onClick={onClose} className="rounded-full bg-white/5 p-2 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Panel: Paste Area */}
          <div className="flex-1 border-r border-white/10 p-6 flex flex-col bg-[#05080f]">
            <label className="text-sm font-medium text-white/70 mb-2 block">Paste AI Code Here</label>
            <textarea
              autoFocus
              className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-sm text-blue-300 placeholder-white/20 focus:outline-none focus:border-blue resize-none transition-colors"
              placeholder={'{\n  "sku": "123",\n  "title": "Example Product",\n  ...\n}'}
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
          <div className="flex-1 p-6 flex flex-col bg-black/20 overflow-y-auto relative">
            <h3 className="text-sm font-medium text-white/70 mb-4">Live Preview</h3>
            
            {!parsedProduct ? (
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/30 text-sm">
                Paste valid JSON to see preview
              </div>
            ) : (
              <div className="flex-1 bg-[#10141d] p-6 flex flex-col items-center justify-center overflow-y-auto">
              <div className="max-w-sm w-full space-y-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">Preview & Edit</h3>
                  <span className="text-xs font-mono text-purple-400 bg-purple-400/10 px-2 py-1 rounded">SKU: {parsedProduct.sku}</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Title</label>
                    <input 
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                      value={parsedProduct.title}
                      onChange={(e) => setParsedProduct({...parsedProduct, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/40 block mb-1">Retail Price (₱)</label>
                      <input 
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                        value={parsedProduct.retail_price}
                        onChange={(e) => setParsedProduct({...parsedProduct, retail_price: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 block mb-1">Wholesale Price (₱)</label>
                      <input 
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                        value={parsedProduct.wholesale_price}
                        onChange={(e) => setParsedProduct({...parsedProduct, wholesale_price: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/40 block mb-1">Description</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-purple-500 h-24 resize-none"
                      value={parsedProduct.description}
                      onChange={(e) => setParsedProduct({...parsedProduct, description: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/40 block mb-1">Image URL</label>
                    <input 
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                      value={parsedProduct.image_url}
                      onChange={(e) => setParsedProduct({...parsedProduct, image_url: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-forest text-navy font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(205,250,119,0.2)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2 mt-6"
                >
                  {saving ? 'Saving...' : 'Save to Inventory'}
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
