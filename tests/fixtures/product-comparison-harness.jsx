import React from 'react'
import { createRoot } from 'react-dom/client'
import BeforeAfterSlider from '../../src/components/BeforeAfterSlider'
import '../../src/index.css'

const params = new URLSearchParams(location.search)
document.documentElement.classList.toggle('dark', params.get('theme') === 'dark')
const shape = params.get('shape') || 'portrait'
const image = (width, height, fill) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${fill}"/><rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#ae2424" stroke-width="8"/><text x="50%" y="50%" text-anchor="middle" fill="#222">TEST PACKAGE</text></svg>`,
)
const product = {
  name: 'Comparison test package',
  img: shape === 'broken' ? '/comparison-missing-image.png' : image(500, shape === 'portrait' ? 640 : 500, '#fffaf0'),
  afterImage: image(640, 500, '#e4ca9d'),
}

createRoot(document.getElementById('root')).render(
  <main style={{ margin: '0 auto', width: '100%', maxWidth: 660, padding: 20 }}><BeforeAfterSlider product={product} /></main>,
)
