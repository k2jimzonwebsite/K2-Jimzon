import { useEffect, useState } from 'react'
import ProductArt from './ProductArt'
import { recoverOriginalImage, storefrontImage } from '../lib/storefrontMedia'

// Real packaging photo when we have one; the house "export label" art otherwise
// (our own inspired-scent and bath lines are house products — the label IS the brand).
export default function ProductVisual({ product, className = '', pad = 'p-4', delivery = null }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [product.img])

  if (!product.img || imageFailed) {
    return <ProductArt product={product} className={className} />
  }
  return (
    <div className={'relative flex items-center justify-center overflow-hidden bg-transparent ' + className}>
      <img
        src={delivery ? storefrontImage(product.img, delivery) : product.img}
        alt={product.name}
        loading="lazy"
        onError={event => { if (!recoverOriginalImage(event, product.img)) setImageFailed(true) }}
        className={'h-full w-full object-contain ' + pad}
      />
    </div>
  )
}
