import { lazy, Suspense } from 'react'
import { GlobeCmsProvider } from './data/globeCms'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { AdminStoreProvider } from './context/AdminStoreContext'

const Admin = lazy(() => import('./views/admin/Admin'))

function AdminRuntime() {
  return (
    <GlobeCmsProvider>
      <AdminStoreProvider>
          <Suspense fallback={<div className="admin-ui flex min-h-[100dvh] items-center justify-center bg-[#080b11] text-sm font-semibold text-white/70">Loading K2 Jimzon operations&hellip;</div>}>
            <Admin />
          </Suspense>
      </AdminStoreProvider>
    </GlobeCmsProvider>
  )
}

export default function AdminApp() {
  return (
    <ErrorBoundary>
      <AdminRuntime />
    </ErrorBoundary>
  )
}
