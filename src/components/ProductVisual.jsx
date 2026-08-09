import { useEffect, useState } from 'react'
import ProductArt from './ProductArt'

// Real packaging photo when we have one; the house "export label" art otherwise
// (our own inspired-scent and bath lines are house products — the label IS the brand).
export default function ProductVisual({ product, className = '', pad = 'p-4' }) {
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
        src={product.img}
        alt={product.name}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className={'h-full w-full object-contain mix-blend-multiply ' + pad}
      />
    </div>
  )
}
