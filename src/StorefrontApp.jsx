import { lazy, Suspense } from 'react'
import { StoreProvider, useStore } from './context/StoreContext'
import { GlobeCmsProvider } from './data/globeCms'
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
  catalog: Catalog,
  messages: GuestMessages,
  contact: Contact,
  account: CustomerAccount,
}

function StorefrontShell() {
  const { view } = useStore()
  const activeViewKey = VIEWS[view] ? view : 'home'
  const View = VIEWS[activeViewKey]

  return (
    <div className="storefront-ui min-h-[100dvh] overflow-x-hidden">
      <StoreHeader />
      <ErrorBoundary key={activeViewKey}>
        <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center bg-cream text-sm font-semibold text-navy-soft"><span className="store-loading-mark" aria-hidden />Loading K2 Jimzon&hellip;</div>}>
          <View />
        </Suspense>
      </ErrorBoundary>
      <CartDrawer />
      <Footer />
      <div className="h-16 md:hidden" aria-hidden />
      <MobileNavBar />
    </div>
  )
}

export default function StorefrontApp() {
  return (
    <ErrorBoundary>
      <GlobeCmsProvider>
        <StoreProvider>
          <StorefrontShell />
        </StoreProvider>
      </GlobeCmsProvider>
    </ErrorBoundary>
  )
}
