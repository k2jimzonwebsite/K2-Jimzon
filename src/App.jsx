import { lazy, Suspense } from 'react'
import { StoreProvider, useStore } from './context/StoreContext'
import { GlobeCmsProvider } from './data/globeCms'
import DemoRail from './components/nav/DemoRail'
import StoreHeader from './components/StoreHeader'
import CartDrawer from './components/CartDrawer'
import ChatFab from './components/ChatFab'
import Footer from './components/Footer'
import ErrorBoundary from './components/ui/ErrorBoundary'

const Home = lazy(() => import('./views/Home'))
const ProductDetail = lazy(() => import('./views/ProductDetail'))
const Pasabuy = lazy(() => import('./views/Pasabuy'))
const Checkout = lazy(() => import('./views/Checkout'))
const Confirmation = lazy(() => import('./views/Confirmation'))
const Wholesale = lazy(() => import('./views/Wholesale'))
const Admin = lazy(() => import('./views/admin/Admin'))
const MasterProduct = lazy(() => import('./views/MasterProduct'))
const Catalog = lazy(() => import('./views/Catalog'))

const VIEWS = {
  home: Home,
  product: ProductDetail,
  master_product: MasterProduct,
  pasabuy: Pasabuy,
  checkout: Checkout,
  confirmation: Confirmation,
  wholesale: Wholesale,
  admin: Admin,
  catalog: Catalog,
}

// Storefront chrome (header, cart, chat) wraps shopper-facing views only.
const STOREFRONT = new Set(['home', 'product', 'master_product', 'catalog', 'pasabuy', 'checkout', 'confirmation'])

function Shell() {
  const { view, setView } = useStore()
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  
  // Environment & Subdomain Detection
  const isAdminDeployment = import.meta.env.VITE_IS_ADMIN_DEPLOYMENT === 'true' || hostname.startsWith('admin.')
  
  // If this is an Admin Deployment, boot directly into Admin view.
  // If this is a Storefront Deployment, block public route access to admin.
  const isDedicatedAdminRoute = isAdminDeployment || (path.includes('/admin-portal-k2-secure') && !import.meta.env.PROD)
  
  const activeViewKey = isAdminDeployment ? 'admin' : (isDedicatedAdminRoute ? 'admin' : (view === 'admin' ? 'home' : view))
  const View = VIEWS[activeViewKey] ?? Home
  const isStorefront = !isAdminDeployment && !isDedicatedAdminRoute && STOREFRONT.has(activeViewKey)
  const isDevOrDemoHash = import.meta.env.DEV || (typeof window !== 'undefined' && window.location.hash === '#demo')

  return (
    <div className="min-h-screen overflow-x-hidden snap-y snap-proximity md:snap-none">
      {isDevOrDemoHash && activeViewKey !== 'admin' && <DemoRail />}
      {isStorefront && <StoreHeader />}
      <ErrorBoundary key={activeViewKey}>
        <Suspense fallback={<div className="min-h-screen bg-cream animate-pulse flex items-center justify-center text-navy/40 font-mono text-xs">Loading K2 Jimzon...</div>}>
          <View />
        </Suspense>
      </ErrorBoundary>
      {isStorefront && (
        <>
          <CartDrawer />
          <ChatFab />
        </>
      )}
      {isStorefront && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <GlobeCmsProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </GlobeCmsProvider>
  )
}
