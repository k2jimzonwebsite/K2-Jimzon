export const PRODUCT_IMAGE_FALLBACK = '/images/placeholder.svg'

export function applyImageFallback(event) {
  const image = event?.currentTarget
  if (!image || image.dataset.k2FallbackApplied === 'true') return
  image.dataset.k2FallbackApplied = 'true'
  image.removeAttribute('srcset')
  image.src = PRODUCT_IMAGE_FALLBACK
}
