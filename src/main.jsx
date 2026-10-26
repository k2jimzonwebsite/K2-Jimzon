import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
// Vite resolves this alias to a target-specific application entry. Production
// builds contain either the storefront or the admin UI, never both.
import App from '@k2-app-entry'
import { installErrorReporting } from './lib/reportError'

// Capture uncaught errors + promise rejections app-wide without raw diagnostics.
installErrorReporting()

// Let failed lazy imports reject into the existing ErrorBoundary. Automatic
// reloads discard checkout drafts and unresolved staff-command identities;
// recovery must remain an explicit user action, even after a deployment.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
