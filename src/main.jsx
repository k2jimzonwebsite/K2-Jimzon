import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

console.log(
  "%c☕ Ciao! Inspecting the code? You must appreciate the finer things in life, like authentic Italian espresso and beautifully crafted react. Welcome to the manifest.",
  "font-size: 13px; font-family: monospace; color: #8A433A; padding: 10px; border-radius: 4px; border: 1px solid #E5D5C5; background: #FAF7F2;"
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
