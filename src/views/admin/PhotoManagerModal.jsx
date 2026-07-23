import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import ImageUploadDropzone from '../../components/ui/ImageUploadDropzone'

export default function PhotoManagerModal({ product, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  
  // Local state for edits
  const [primary, setPrimary] = useState(product.primary_image_url || null)
  const [afterUse, setAfterUse] = useState(product.after_use_image_url || null)
  const [samples, setSamples] = useState(product.sample_image_urls || [])

  const handleSave = async () => {
    setSaving(true)
    
    const { error } = await supabase
      .from('products')
      .update({
        primary_image_url: primary,
        after_use_image_url: afterUse,
        sample_image_urls: samples
      })
      .eq('sku', product.sku)

    setSaving(false)
    
    if (error) {
      console.error('Failed to update photos', error)
      alert('Failed to save photos')
    } else {
      if (onSave) onSave()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-[#10141d] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div>
            <h3 className="font-serif text-xl font-semibold text-white">Manage Photos</h3>
            <p className="text-sm text-purple-400 font-mono">SKU: {product.sku}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <ImageUploadDropzone 
            label="Primary Luxury Photo" 
            multiple={false}
            existingUrls={primary ? [primary] : []}
            onUploadComplete={(url) => setPrimary(url)}
          />

          <ImageUploadDropzone 
            label="After-Use Photo" 
            multiple={false}
            existingUrls={afterUse ? [afterUse] : []}
            onUploadComplete={(url) => setAfterUse(url)}
          />

          <ImageUploadDropzone 
            label="Sample Photos (Up to 5)" 
            multiple={true}
            maxFiles={5}
            existingUrls={samples}
            onUploadComplete={(urls) => setSamples(urls)}
          />
        </div>

        <div className="p-4 border-t border-white/10 bg-black/40">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-forest text-navy font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(205,250,119,0.2)] transition-all hover:scale-[1.02] disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Photos'}
          </button>
        </div>
      </div>
    </div>
  )
}
