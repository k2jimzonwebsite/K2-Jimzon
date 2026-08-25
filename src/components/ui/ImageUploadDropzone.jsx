import { useId, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { reportError } from '../../lib/reportError'
import {
  PRODUCT_EVIDENCE_MAX_BYTES, PRODUCT_EVIDENCE_MIMES, validateUploadFile,
} from '../../lib/uploadValidation'
import { adminBffEnabled, uploadProductMediaBff } from '../../services/adminBffService'

const ACCEPTED_MEDIA = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const EXTENSION = Object.freeze({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })

function fileFingerprint(file) {
  return [file.name, file.type, file.size, file.lastModified].join(':')
}

async function uploadLegacyProductMedia(file) {
  const path = `product-media/${crypto.randomUUID()}.${EXTENSION[file.type]}`
  const upload = await supabase.storage.from('product-images').upload(path, file, {
    cacheControl: '3600', upsert: false,
  })
  if (upload.error) throw new Error('PRODUCT_MEDIA_UPLOAD_UNAVAILABLE')
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('PRODUCT_MEDIA_UPLOAD_UNAVAILABLE')
  return data.publicUrl
}

export default function ImageUploadDropzone({
  label,
  multiple = false,
  maxFiles = 1,
  onUploadComplete,
  onMediaChange,
  existingUrls = [],
}) {
  const inputId = useId()
  const operationKeys = useRef(new Map())
  const [uploading, setUploading] = useState(false)
  const [media, setMedia] = useState(() => (
    Array.isArray(existingUrls) ? existingUrls : (existingUrls ? [existingUrls] : [])
  ).filter(Boolean).map((url) => ({ url, objectPath: null })))
  const [error, setError] = useState('')
  const [retryFiles, setRetryFiles] = useState([])
  const [progress, setProgress] = useState({ complete: 0, total: 0 })

  const urls = media.map((item) => item.url)

  const publishMedia = (nextMedia) => {
    const nextUrls = nextMedia.map((item) => item.url)
    setMedia(nextMedia)
    onUploadComplete?.(multiple ? nextUrls : (nextUrls[0] || ''))
    onMediaChange?.(multiple ? nextMedia : (nextMedia[0] || null))
  }

  const uploadFiles = async (selectedFiles) => {
    if (uploading || !selectedFiles.length) return
    if ((!multiple && selectedFiles.length > 1) || urls.length + selectedFiles.length > maxFiles) {
      setError(`Choose no more than ${maxFiles} photo${maxFiles === 1 ? '' : 's'} for this field.`)
      setRetryFiles([])
      return
    }
    for (const file of selectedFiles) {
      const validation = validateUploadFile(file, {
        maxBytes: PRODUCT_EVIDENCE_MAX_BYTES,
        allowedMimes: PRODUCT_EVIDENCE_MIMES,
      })
      if (!validation.ok) {
        setError(validation.error)
        setRetryFiles([])
        return
      }
    }

    setUploading(true)
    setError('')
    setRetryFiles([])
    setProgress({ complete: 0, total: selectedFiles.length })
    const uploadedMedia = []
    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index]
        const fingerprint = fileFingerprint(file)
        const key = operationKeys.current.get(fingerprint) || crypto.randomUUID()
        operationKeys.current.set(fingerprint, key)
        if (adminBffEnabled()) {
          const result = await uploadProductMediaBff(file, key)
          if (!result.ok) throw Object.assign(new Error(result.error), { safeMessage: result.error, failedAt: index })
          uploadedMedia.push({ url: result.media.publicUrl, objectPath: result.media.objectPath })
        } else {
          uploadedMedia.push({ url: await uploadLegacyProductMedia(file), objectPath: null })
        }
        operationKeys.current.delete(fingerprint)
        setProgress({ complete: index + 1, total: selectedFiles.length })
      }
    } catch (uploadError) {
      const failedAt = Number.isInteger(uploadError?.failedAt) ? uploadError.failedAt : uploadedMedia.length
      reportError(uploadError, { kind: 'browser-error' })
      setError(uploadError?.safeMessage || 'The photo could not be uploaded safely. Check the file and try again.')
      setRetryFiles(selectedFiles.slice(failedAt))
    } finally {
      if (uploadedMedia.length) publishMedia(multiple ? [...media, ...uploadedMedia] : [uploadedMedia[0]])
      setUploading(false)
    }
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    void uploadFiles(files)
  }

  const removeImage = (indexToRemove) => {
    publishMedia(media.filter((_, index) => index !== indexToRemove))
  }

  const canAdd = !urls.length || (multiple && urls.length < maxFiles)
  const status = uploading
    ? `Checking and uploading ${progress.complete + 1} of ${progress.total} photo${progress.total === 1 ? '' : 's'}…`
    : ''

  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60">{label}</label>}
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {media.map((item, index) => (
          <div key={item.url} className="group relative aspect-square overflow-hidden rounded-adm-sm border border-adm-line bg-adm-sunken">
            <img src={item.url} alt={`${label || 'Product photo'} ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(index)}
              aria-label={`Remove ${label || 'product photo'} ${index + 1}`}
              className="absolute right-1 top-1 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-crimson text-white opacity-100 transition-[opacity,transform] duration-150 active:scale-[0.97] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {canAdd && (
          <label className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-adm-sm border-2 border-dashed border-adm-line bg-adm-sunken text-center transition-[border-color,background-color,transform] duration-150 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/30 active:scale-[0.98] ${uploading ? 'pointer-events-none opacity-55' : 'hover:border-blue/60 hover:bg-blue/5'}`}>
            {uploading ? (
              <>
                <span aria-hidden="true" className="mb-2 h-5 w-5 animate-spin rounded-full border-2 border-blue border-t-transparent" />
                <span className="px-2 text-sm font-semibold text-white/75">Checking photo…</span>
              </>
            ) : (
              <>
                <svg aria-hidden="true" className="mb-2 h-6 w-6 text-white/55" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 5v14m7-7H5" />
                </svg>
                <span className="px-2 text-sm font-semibold text-white/75">{multiple ? 'Add photo' : 'Choose photo'}</span>
                <span className="mt-1 px-2 text-xs leading-4 text-white/55">JPEG, PNG or WebP · 4 MB max</span>
              </>
            )}
            <input
              id={inputId}
              type="file"
              className="sr-only"
              aria-label={label || 'Choose product photo'}
              accept={ACCEPTED_MEDIA}
              multiple={multiple}
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-white/60">{status}</p>
      {error && (
        <div role="alert" className="mt-2 rounded-adm-sm border border-crimson/35 bg-crimson/10 p-3 text-sm text-red-200">
          <p>{error}</p>
          {retryFiles.length > 0 && (
            <button type="button" disabled={uploading} onClick={() => void uploadFiles(retryFiles)} className="mt-2 min-h-11 rounded-adm-sm border border-crimson/50 px-3 font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-crimson/15 active:scale-[0.98] disabled:opacity-50">
              Retry remaining {retryFiles.length === 1 ? 'photo' : `${retryFiles.length} photos`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
