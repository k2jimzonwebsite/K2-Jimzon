import { lazy, Suspense } from 'react'
import { StoreProvider, useStore } from './context/StoreContext'
import { AdminStoreProvider } from './context/AdminStoreContext'
import { GlobeCmsProvider } from './data/globeCms'
import DemoRail from './components/nav/DemoRail'
import MobileNavBar from './components/nav/MobileNavBar'
import StoreHeader from './components/StoreHeader'
import CartDrawer from './components/CartDrawer'
import Footer from './components/Footer'
import ErrorBoundary from './components/ui/ErrorBoundary'

const Home = lazy(() => import('./views/Home'))
const Pasabuy = lazy(() => import('./views/Pasabuy'))
const Checkout = lazy(() => import('./views/Checkout'))
const Confirmation = lazy(() => import('./views/Confirmation'))
const Wholesale = lazy(() => import('./views/Wholesale'))
const Admin = lazy(() => import('./views/admin/Admin'))
const MasterProduct = lazy(() => import('./views/MasterProduct'))
const Catalog = lazy(() => import('./views/Catalog'))
const GuestMessages = lazy(() => import('./views/GuestMessages'))
const Contact = lazy(() => import('./views/Contact'))
const CustomerAccount = lazy(() => import('./views/CustomerAccount'))

const VIEWS = {
  home: Home,
  master_product: MasterProduct,
  pasabuy: Pasabuy,
  checkout: Checkout,
  confirmation: Confirmation,
  wholesale: Wholesale,
  admin: Admin,
  catalog: Catalog,
  messages: GuestMessages,
  contact: Contact,
  account: CustomerAccount,
}

// Storefront chrome wraps shopper-facing views only.
const STOREFRONT = new Set(['home', 'master_product', 'catalog', 'pasabuy', 'wholesale', 'checkout', 'confirmation', 'messages', 'contact'])

function Shell() {
  const { view, setView } = useStore()
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  
  // Environment & Subdomain Detection
  const isAdminDeployment = import.meta.env.VITE_IS_ADMIN_DEPLOYMENT === 'true' || hostname.includes('admin') || (typeof window !== 'undefined' && window.location.port === '5174')
  
  // The guarded path also works before a dedicated admin domain exists. The
  // route itself is not the security boundary; Supabase Auth + database RLS is.
  const isDedicatedAdminRoute = isAdminDeployment || path.includes('/admin-portal-k2-secure')
  
  const activeViewKey = isAdminDeployment ? 'admin' : (isDedicatedAdminRoute ? 'admin' : (view === 'admin' ? 'home' : view))
  const View = VIEWS[activeViewKey] ?? Home
  const isStorefront = !isAdminDeployment && !isDedicatedAdminRoute && STOREFRONT.has(activeViewKey)
  // Combined mode is a workstation-only prototype surface. StorefrontApp does
  // not import this rail, so no production Storefront hash can expose its
  // direct-auth/VIP prototype behavior.
  const showDemoRail = typeof window !== 'undefined' && window.location.hash === '#demo'

  return (
    <div className={`${isStorefront ? 'storefront-ui' : ''} min-h-[100dvh] overflow-x-hidden`}>
      {showDemoRail && activeViewKey !== 'admin' && <DemoRail />}
      {isStorefront && <StoreHeader />}
      <ErrorBoundary key={activeViewKey}>
        <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center bg-cream text-sm font-semibold text-navy-soft"><span className="store-loading-mark" aria-hidden />Loading K2 Jimzon&hellip;</div>}>
          <View />
        </Suspense>
      </ErrorBoundary>
      {isStorefront && (
        <>
          <CartDrawer />
        </>
      )}
      {isStorefront && <Footer />}
      {/* Space so page content clears the fixed mobile tab bar */}
      {isStorefront && <div className="h-16 md:hidden" aria-hidden />}
      {isStorefront && <MobileNavBar />}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <GlobeCmsProvider>
        <AdminStoreProvider>
          <StoreProvider enableAdminData>
            <Shell />
          </StoreProvider>
        </AdminStoreProvider>
      </GlobeCmsProvider>
    </ErrorBoundary>
  )
}
