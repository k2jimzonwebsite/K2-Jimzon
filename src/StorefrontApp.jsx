import { lazy, Suspense } from 'react'
import { StoreProvider, useStore } from './context/StoreContext'
import { GlobeCmsProvider } from './data/globeCms'
import MobileNavBar from './components/nav/MobileNavBar'
import StoreHeader from './components/StoreHeader'
import Footer from './components/Footer'
import ErrorBoundary from './components/ui/ErrorBoundary'
import StorefrontMetadata from './components/StorefrontMetadata'

const Home = lazy(() => import('./views/Home'))
const Pasabuy = lazy(() => import('./views/Pasabuy'))
const Checkout = lazy(() => import('./views/Checkout'))
const Confirmation = lazy(() => import('./views/Confirmation'))
const Wholesale = lazy(() => import('./views/Wholesale'))
const MasterProduct = lazy(() => import('./views/MasterProduct'))
const Catalog = lazy(() => import('./views/Catalog'))
const GuestMessages = lazy(() => import('./views/GuestMessages'))
const Contact = lazy(() => import('./views/Contact'))
const CustomerAccount = lazy(() => import('./views/CustomerAccount'))
const NotFound = lazy(() => import('./views/NotFound'))
const CartDrawer = lazy(() => import('./components/CartDrawer'))
// MAP-027: the Interactive Shop is opt-in. Lazy so its scene never loads on
// landing, catalog, or product paths.
const InteractiveShop = lazy(() => import('./views/InteractiveShop'))

const VIEWS = {
  home: Home,
  master_product: MasterProduct,
  pasabuy: Pasabuy,
  checkout: Checkout,
  confirmation: Confirmation,
  wholesale: Wholesale,
  catalog: Catalog,
  store: InteractiveShop,
  messages: GuestMessages,
  contact: Contact,
  account: CustomerAccount,
  not_found: NotFound,
}

function StorefrontShell() {
  const { view, cartOpen } = useStore()
  const activeViewKey = VIEWS[view] ? view : 'home'
  const View = VIEWS[activeViewKey]
  const showStorefrontChrome = activeViewKey !== 'store'

  return (
    <div className="storefront-ui min-h-[100dvh] overflow-x-hidden">
      {showStorefrontChrome && <StoreHeader />}
      <ErrorBoundary key={activeViewKey}>
        <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center bg-cream text-sm font-semibold text-navy-soft"><span className="store-loading-mark" aria-hidden />Loading K2 Jimzon&hellip;</div>}>
          <View />
        </Suspense>
      </ErrorBoundary>
          {showStorefrontChrome && (
            <>
              {cartOpen && <Suspense fallback={null}>
                <CartDrawer />
              </Suspense>}
          <Footer />
          <div className="h-16 md:hidden" aria-hidden />
          <MobileNavBar />
        </>
      )}
    </div>
  )
}

export default function StorefrontApp() {
  return (
    <ErrorBoundary>
      <GlobeCmsProvider>
        <StoreProvider>
          <StorefrontMetadata />
          <StorefrontShell />
        </StoreProvider>
      </GlobeCmsProvider>
    </ErrorBoundary>
  )
}
