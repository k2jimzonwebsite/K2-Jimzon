// Let Vite resolve these imports exactly as it resolves application components.
// Raw /@id imports can create a second React runtime with Vite 8.
import * as ReactRuntime from 'react'
import * as ReactDomRuntime from 'react-dom/client'
export { ReactRuntime, ReactDomRuntime }
