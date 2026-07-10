import { StoreProvider, useStore } from './context/StoreContext'
import DemoRail from './components/nav/DemoRail'
import StoreHeader from './components/StoreHeader'
import CartDrawer from './components/CartDrawer'
import ChatFab from './components/ChatFab'
import Footer from './components/Footer'
import Home from './views/Home'
import ProductDetail from './views/ProductDetail'
import Pasabuy from './views/Pasabuy'
import Checkout from './views/Checkout'
import Confirmation from './views/Confirmation'
import Wholesale from './views/Wholesale'
import Admin from './views/admin/Admin'

const VIEWS = {
  home: Home,
  product: ProductDetail,
  pasabuy: Pasabuy,
  checkout: Checkout,
  confirmation: Confirmation,
  wholesale: Wholesale,
  admin: Admin,
}

// Storefront chrome (header, cart, chat) wraps shopper-facing views only.
const STOREFRONT = new Set(['home', 'product', 'pasabuy', 'checkout', 'confirmation'])

function Shell() {
  const { view } = useStore()
  const View = VIEWS[view] ?? Home
  const isStorefront = STOREFRONT.has(view)

  return (
    <div className="min-h-screen">
      <DemoRail />
      {isStorefront && <StoreHeader />}
      <View key={view} />
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
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
