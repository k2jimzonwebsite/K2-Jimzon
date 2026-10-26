import hashes from '../data/storefrontMedia.json'

// These upload digests were checked against the original bytes by the existing
// reviewed-catalog delivery preparer. Unknown/new uploads keep their original.
const prepared = new Map(hashes.map(hash => [hash.slice(0, 16), hash]))
const prefix = 'https://pixplcjqivlfflickobf.supabase.co/storage/v1/object/public/product-images/'

export function storefrontImage(original, size = 'large') {
  if (!original?.startsWith(prefix)) return original
  const digest = original.match(/-([a-f0-9]{16})\.(?:png|jpe?g|webp)$/)?.[1]
  const hash = prepared.get(digest)
  return hash ? `/seo-media/${hash}-${size === 'small' ? 256 : 768}.webp` : original
}

export function recoverOriginalImage(event, original) {
  const image = event.currentTarget
  if (!original) return false
  const absolute = new URL(original, document.baseURI).href
  if (image.src === absolute || image.dataset.originalFallback === absolute) return false
  image.dataset.originalFallback = absolute
  image.src = original
  return true
}
