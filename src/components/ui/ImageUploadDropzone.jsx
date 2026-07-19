import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ImageUploadDropzone({ 
  label, 
  multiple = false, 
  maxFiles = 1,
  onUploadComplete,
  existingUrls = []
}) {
  const [uploading, setUploading] = useState(false)
  const [urls, setUrls] = useState(Array.isArray(existingUrls) ? existingUrls : (existingUrls ? [existingUrls] : []))
  const [error, setError] = useState(null)

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    if (multiple && urls.length + files.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} photos here.`)
      return
    }

    setUploading(true)
    setError(null)

    const newUrls = []

    try {
      for (const file of files) {
        // Create a unique file name
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        // Upload to supabase storage
        const { error: uploadError, data } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)
          
        newUrls.push(publicUrl)
      }

      const updatedUrls = multiple ? [...urls, ...newUrls] : [newUrls[0]]
      setUrls(updatedUrls)
      
      if (onUploadComplete) {
        onUploadComplete(multiple ? updatedUrls : updatedUrls[0])
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (indexToRemove) => {
    const updatedUrls = urls.filter((_, idx) => idx !== indexToRemove)
    setUrls(updatedUrls)
    if (onUploadComplete) {
      onUploadComplete(multiple ? updatedUrls : (updatedUrls[0] || ''))
    }
  }

  return (
    <div className="w-full">
      <label className="text-xs text-white/40 block mb-2 uppercase tracking-widest font-semibold">{label}</label>
      
      <div className="grid grid-cols-3 gap-2 mb-2">
        {urls.map((url, idx) => (
          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/50 group">
            <img src={url} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={(e) => { e.preventDefault(); removeImage(idx); }}
              className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {(!urls.length || (multiple && urls.length < maxFiles)) && (
          <label className={`relative aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-purple-500/50 hover:bg-purple-500/10 transition-colors flex flex-col items-center justify-center cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? (
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-6 h-6 text-white/30 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider text-center">
                  {multiple ? 'Add Photo' : 'Upload'}
                </span>
              </>
            )}
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              multiple={multiple} 
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
    </div>
  )
}
