/**
 * uploadValidation.js
 * Fail-closed upload validation utility for client and edge uploads.
 * Enforces strict MIME allowlists, file size limits (<= 10MB), and sanitized filenames.
 * Adheres to MAP-017 / MAP-020 Security Invariants.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10MB
export const PRODUCT_EVIDENCE_MAX_BYTES = 4 * 1024 * 1024
export const PRODUCT_EVIDENCE_MIMES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
]

/**
 * Sanitize filename to prevent path traversal and shell injection
 */
export function sanitizeFileName(name = '') {
  if (typeof name !== 'string') return 'upload.jpg'
  // Strip path traversal and weird chars
  const base = name.split(/[/\\]/).pop() || 'upload'
  return base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 100)
}

/**
 * Validate a File object or blob before storage upload
 * @param {File|Blob} file
 * @param {Object} options
 * @returns {{ ok: boolean, error?: string, sanitizedName?: string }}
 */
export function validateUploadFile(file, { maxBytes = MAX_UPLOAD_BYTES, allowedMimes = ALLOWED_IMAGE_MIMES } = {}) {
  if (!file) {
    return { ok: false, error: 'No file was provided for upload.' }
  }

  if (typeof file.size === 'number' && file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024))
    return {
      ok: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum permitted limit (${maxMb}MB).`,
    }
  }

  if (typeof file.size === 'number' && file.size <= 0) {
    return { ok: false, error: 'File is empty (0 bytes).' }
  }

  const mime = (file.type || '').toLowerCase()
  if (!allowedMimes.includes(mime)) {
    const labels = allowedMimes.map((type) => ({
      'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'image/avif': 'AVIF',
    }[type] || type)).join(', ')
    return {
      ok: false,
      error: `File type "${mime || 'unknown'}" is not supported. Allowed formats: ${labels}.`,
    }
  }

  const name = file.name || 'upload.jpg'
  const ext = '.' + (name.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return {
      ok: false,
      error: `File extension "${ext}" is not permitted for image uploads.`,
    }
  }

  return {
    ok: true,
    sanitizedName: sanitizeFileName(name),
  }
}
