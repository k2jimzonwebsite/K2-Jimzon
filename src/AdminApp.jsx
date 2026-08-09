import { lazy, Suspense } from 'react'
import { StoreProvider } from './context/StoreContext'
import { GlobeCmsProvider } from './data/globeCms'
import ErrorBoundary from './components/ui/ErrorBoundary'

const Admin = lazy(() => import('./views/admin/Admin'))

export default function AdminApp() {
  return (
    <ErrorBoundary>
      <GlobeCmsProvider>
      <StoreProvider enableAdminData>
          <Suspense fallback={<div className="admin-ui flex min-h-[100dvh] items-center justify-center bg-[#080b11] text-sm font-semibold text-white/70">Loading K2 Jimzon operations&hellip;</div>}>
            <Admin />
          </Suspense>
        </StoreProvider>
      </GlobeCmsProvider>
    </ErrorBoundary>
  )
}
