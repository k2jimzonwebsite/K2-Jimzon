import { createContext, useContext, useMemo, useState } from 'react'
import { getProduct } from '../data/products'

const StoreContext = createContext(null)

// Seeded so the checkout demo works immediately without clicking around first.
const INITIAL_CART = [
  { id: 'nutella-biscuits', qty: 1 },
  { id: 'barilla-pesto', qty: 2 },
]

const INITIAL_REQUESTS = [
  { id: 'PB-1042', item: 'Mulino Bianco Pan di Stelle, 2 boxes', status: 'Buying in Italy', eta: 'Flies 22 Jul' },
  { id: 'PB-1039', item: 'Acqua di Parma shower gel', status: 'Quoted — ₱1,850', eta: 'Awaiting your go' },
  { id: 'PB-1031', item: 'Caffè Borbone Miscela Blu pods ×100', status: 'In Manila warehouse', eta: 'Delivers tomorrow' },
]

export function StoreProvider({ children }) {
  const [view, setView] = useState('home')
  const [productId, setProductId] = useState('pistachio-cream')
  const [cart, setCart] = useState(INITIAL_CART)
  const [isWholesale, setIsWholesale] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [order, setOrder] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [requests, setRequests] = useState(INITIAL_REQUESTS)

  const openProduct = (id) => {
    setProductId(id)
    setView('product')
    window.scrollTo(0, 0)
  }

  const go = (v) => {
    setView(v)
    setCartOpen(false)
    window.scrollTo(0, 0)
  }

  const addToCart = (id, qty = 1) =>
    setCart((prev) => {
      const product = getProduct(id)
      const safeQty = Math.max(1, Math.min(qty, product.stock))
      const existing = prev.find((line) => line.id === id)
      if (existing) {
        return prev.map((line) =>
          line.id === id
            ? { ...line, qty: Math.min(product.stock, line.qty + safeQty) }
            : line,
        )
      }
      return [...prev, { id, qty: safeQty }]
    })

  const setQty = (id, qty) =>
    setCart((prev) =>
      qty <= 0
        ? prev.filter((line) => line.id !== id)
        : prev.map((line) => {
            if (line.id !== id) return line
            const product = getProduct(id)
            return { ...line, qty: Math.min(qty, product.stock) }
          }),
    )

  const addRequest = (item) =>
    setRequests((prev) => [
      {
        id: 'PB-' + String(1043 + prev.length),
        item,
        status: 'Request received',
        eta: 'Quote within 24h',
      },
      ...prev,
    ])

  const totals = useMemo(() => {
    const lines = cart.map((line) => {
      const product = getProduct(line.id)
      const unit = isWholesale ? product.wholesale : product.retail
      return { ...line, product, unit, amount: unit * line.qty }
    })
    const retailTotal = lines.reduce(
      (sum, l) => sum + l.product.retail * l.qty,
      0,
    )
    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)
    const count = lines.reduce((sum, l) => sum + l.qty, 0)
    return { lines, subtotal, count, wholesaleSavings: retailTotal - subtotal }
  }, [cart, isWholesale])

  const placeOrder = () => {
    const id = 'K2-' + String(Math.floor(20000 + Math.random() * 70000))
    setOrder({ id, total: totals.subtotal, count: totals.count, wholesale: isWholesale })
    setCart([])
    setView('confirmation')
    window.scrollTo(0, 0)
  }

  const value = {
    view,
    go,
    productId,
    openProduct,
    cart,
    addToCart,
    setQty,
    cartOpen,
    setCartOpen,
    isWholesale,
    setIsWholesale,
    order,
    placeOrder,
    query,
    setQuery,
    category,
    setCategory,
    requests,
    addRequest,
    ...totals,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
