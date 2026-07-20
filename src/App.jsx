import { lazy, Suspense } from 'react'
import { StoreProvider, useStore } from './context/StoreContext'
import { GlobeCmsProvider } from './data/globeCms'
import DemoRail from './components/nav/DemoRail'
import StoreHeader from './components/StoreHeader'
import CartDrawer from './components/CartDrawer'
import ChatFab from './components/ChatFab'
import Footer from './components/Footer'

const Home = lazy(() => import('./views/Home'))
const ProductsLanding = lazy(() => import('./views/ProductsLanding'))
const ProductDetail = lazy(() => import('./views/ProductDetail'))
const Pasabuy = lazy(() => import('./views/Pasabuy'))
const Checkout = lazy(() => import('./views/Checkout'))
const Confirmation = lazy(() => import('./views/Confirmation'))
const Wholesale = lazy(() => import('./views/Wholesale'))
const Admin = lazy(() => import('./views/admin/Admin'))

const VIEWS = {
  home: Home,
  catalog: ProductsLanding,
  product: ProductDetail,
  pasabuy: Pasabuy,
  checkout: Checkout,
  confirmation: Confirmation,
  wholesale: Wholesale,
  admin: Admin,
}

// Storefront chrome (header, cart, chat) wraps shopper-facing views only.
const STOREFRONT = new Set(['home', 'catalog', 'product', 'pasabuy', 'checkout', 'confirmation'])

function Shell() {
  const { view } = useStore()
  const View = VIEWS[view] ?? Home
  const isStorefront = STOREFRONT.has(view)

  return (
    <div className="min-h-screen overflow-x-hidden">
      <DemoRail />
      {isStorefront && <StoreHeader />}
      <Suspense fallback={<div className="min-h-screen bg-cream animate-pulse" />}>
        <View key={view} />
      </Suspense>
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
