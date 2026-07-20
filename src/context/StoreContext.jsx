import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { products as localProducts } from '../data/products'

const StoreContext = createContext(null)

const INITIAL_REQUESTS = [
  { id: 'PB-1042', item: 'Mulino Bianco Pan di Stelle, 2 boxes', status: 'Buying in Italy', eta: 'Flies 22 Jul' },
  { id: 'PB-1039', item: 'Acqua di Parma shower gel', status: 'Quoted — ₱1,850', eta: 'Awaiting your go' },
]

const INITIAL_CONVERSATIONS = [
  {
    id: 'c1',
    customer: 'Maria Santos',
    channel: 'WhatsApp',
    time: '10:42 AM',
    unread: true,
    messages: [
      { sender: 'customer', text: 'Hi! Do you have the KIKO Milano 3D Hydra Lipgloss in shade 05?' },
    ],
    intent: 'stock_check'
  },
  {
    id: 'PB-1042',
    customer: 'Cafe Roma (Wholesale)',
    channel: 'Viber',
    time: '9:15 AM',
    unread: false,
    messages: [
      { sender: 'customer', text: 'Buongiorno, need 10 cases of Lavazza Oro beans by Friday.' },
      { sender: 'agent', text: 'Hi Marco, yes we have 14 cases in the Manila warehouse. Sending the invoice now.' },
      { sender: 'customer', text: 'Grazie! Can I also pasabuy some truffle oil next month?' }
    ],
    intent: 'pasabuy_request',
    metadata: {
      item: 'Lavazza Oro beans, 10 cases',
      qty: 10,
      budget: 'Open',
      url: 'https://lavazza.it',
      shipping: 'sea'
    }
  }
]

export function StoreProvider({ children }) {
  const [view, setView] = useState('home')
  const [productId, setProductId] = useState(null)
  const [cart, setCart] = useState([])
  const [isWholesale, setIsWholesale] = useState(false)
  const [user, setUser] = useState(null)
  
  const [cartOpen, setCartOpen] = useState(false)
  const [order, setOrder] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [requests, setRequests] = useState(INITIAL_REQUESTS)
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS)
  const [dbProducts, setDbProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('theme') === 'dark'
      } catch (e) {
        return false
      }
    }
    return false
  })

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    } catch (e) {
      // Ignore localStorage errors in restricted browsers
    }
  }, [isDark])

  const toggleDarkMode = () => setIsDark(!isDark)

  useEffect(() => {
    fetchProducts()
    checkUser()

    if (!supabase) return;

    const channel = supabase
      .channel('public:products:store')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user)
    })

    return () => {
      supabase.removeChannel(channel)
      subscription?.unsubscribe()
    }
  }, [])

  const checkUser = async (authUser = null) => {
    if (!supabase) {
      setUser(null)
      setIsWholesale(false)
      return
    }
    const u = authUser || (await supabase.auth.getUser()).data?.user
    setUser(u)
    if (u) {
      const { data } = await supabase.from('user_profiles').select('role').eq('id', u.id).single()
      if (data && (data.role === 'VIP' || data.role === 'Admin')) {
        setIsWholesale(true)
      } else {
        setIsWholesale(false)
      }
    } else {
      setIsWholesale(false)
    }
  }

  const fetchProducts = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'Live')
    
    if (!error && data) {
      setDbProducts(data)
    }
    setLoading(false)
  }

  // Merge the rich local data (images, hue, guide) with the live pricing and stock from Supabase
  const products = useMemo(() => {
    if (dbProducts.length === 0) return []
    return dbProducts.map((dbP, i) => {
      // Find matching local product for rich UI assets (if any)
      // First try by sku, then try matching the names if sku doesn't match perfectly
      let localPMatch = localProducts.find(lp => lp.id.toLowerCase() === dbP.sku.toLowerCase() || lp.name.includes(dbP.title))
      
      // If we don't have a specific local match, dynamically cycle through our beautiful mockups!
      let localP = localPMatch || localProducts[i % localProducts.length]

      return {
        ...localP, // spread the rich UI data
        category: dbP.origin?.startsWith('Shopee|') ? dbP.origin.split('|')[1] : (dbP.origin === 'Shopee' ? 'Shopee Imports' : localP.category),
        sku: dbP.sku,
        id: dbP.sku, // alias for legacy components
        name: dbP.name,
        img: dbP.primary_image_url || dbP.image_url || localP.img,
        afterImage: dbP.after_use_image_url || localP.afterImage,
        srp: Number(dbP.srp),
        retail: Number(dbP.srp), // alias
        wholesale_price: Number(dbP.wholesale_price),
        wholesale: Number(dbP.wholesale_price), // alias
        stock_available: dbP.stock_available,
        stock: dbP.stock_available, // alias
        why_buy: dbP.why_buy || localP.whyBuy,
        usage_instructions: dbP.usage_instructions,
        ingredients: dbP.ingredients || localP.ingredients,
        allergens: dbP.allergens || localP.allergens,
        net_weight: dbP.net_weight || localP.net_weight,
        package_type: dbP.package_type || localP.package_type,
        storage_instructions: dbP.storage_instructions || localP.storage_instructions,
        finished_product_details: dbP.finished_product_details || localP.finished_product_details,
        brand_id: dbP.brand_id || localP.brand_id,
        country_of_origin: dbP.country_of_origin || localP.country_of_origin,
        barcode: dbP.barcode || localP.barcode,
        product_video_url: dbP.product_video_url || localP.product_video_url,
        guide: localP.guide,
        pairings: localP.pairings || [],
      }
    })
  }, [dbProducts])

  const getProduct = (id) => products.find(p => p.id === id || p.sku === id)

  const openProduct = (id) => {
    if (!document.startViewTransition) {
      setProductId(id)
      setView('master_product')
      window.scrollTo(0, 0)
      return
    }
    document.startViewTransition(() => {
      flushSync(() => {
        setProductId(id)
        setView('master_product')
        window.scrollTo(0, 0)
      })
    })
  }

  const go = (v) => {
    if (!document.startViewTransition) {
      setView(v)
      setCartOpen(false)
      window.scrollTo(0, 0)
      return
    }
    document.startViewTransition(() => {
      flushSync(() => {
        setView(v)
        setCartOpen(false)
        window.scrollTo(0, 0)
      })
    })
  }

  const addToCart = (id, qty = 1) =>
    setCart((prev) => {
      const product = getProduct(id)
      if (!product) return prev
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
            if (!product) return line
            return { ...line, qty: Math.min(qty, product.stock) }
          }),
    )

  const sendMessage = (convoId, text, sender) => {
    setConversations(prev => prev.map(c => {
      if (c.id === convoId) {
        return {
          ...c,
          unread: sender === 'customer',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          messages: [...c.messages, { sender, text }]
        }
      }
      return c
    }))
  }

  const createConversation = (customer, channel, text, intent = 'general', metadata = null, providedId = null) => {
    const id = providedId || ('c' + Date.now())
    setConversations(prev => [
      {
        id,
        customer,
        channel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: true,
        messages: [{ sender: 'customer', text }],
        intent,
        metadata
      },
      ...prev
    ])
    return id
  }

  const addRequest = (payload) => {
    // legacy support if string is passed
    const data = typeof payload === 'string' ? { item: payload, qty: 1 } : payload;
    const reqId = 'PB-' + String(1043 + requests.length)
    
    setRequests((prev) => [
      {
        id: reqId,
        item: data.item,
        status: 'Request received',
        eta: data.shipping === 'air' ? 'Quote within 12h' : 'Quote within 24h',
      },
      ...prev,
    ])

    const text = `New Pasabuy Sourcing Request:
• Item: ${data.item}
• Quantity: ${data.qty || 1}
• Target Budget: ${data.budget ? '₱' + data.budget : 'None specified'}
• Reference URL: ${data.url || 'None'}
• Shipping: ${data.shipping === 'air' ? 'Air Freight (~14 days)' : 'Sea Cargo (~45 days)'}
• Alternatives OK: ${data.alternatives ? 'Yes' : 'No'}
• Attachments: ${data.image ? data.image.name : 'None'}`

    createConversation('Pasabuy Client', 'Pasabuy', text, 'pasabuy_request', data, reqId)
  }

  const totals = useMemo(() => {
    const lines = cart.map((line) => {
      const product = getProduct(line.id)
      if (!product) return null
      const unit = isWholesale ? product.wholesale : product.retail
      return { ...line, product, unit, amount: unit * line.qty }
    }).filter(Boolean)

    const retailTotal = lines.reduce(
      (sum, l) => sum + l.product.retail * l.qty,
      0,
    )
    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)
    const count = lines.reduce((sum, l) => sum + l.qty, 0)
    return { lines, subtotal, count, wholesaleSavings: retailTotal - subtotal }
  }, [cart, isWholesale, products])

  const placeOrder = async () => {
    const orderLines = totals.lines.map(l => ({
      sku: l.id,
      quantity: l.qty,
      channel_source: isWholesale ? 'website_vip' : 'website_retail',
      fulfillment_method: isWholesale ? 'Lalamove / Freight' : 'Standard Courier',
      order_status: 'Pending',
      payment_status: 'Unpaid'
    }))

    if (!supabase) {
      alert("Checkout failed: Supabase is not configured.");
      return;
    }
    
    // Simulate complex transaction by updating stock & inserting orders
    let success = true
    for (const line of orderLines) {
      const { error: lockError } = await supabase.rpc('decrement_stock', { p_sku: line.sku, p_quantity: line.quantity })
      if (lockError) {
        alert("Sorry, " + line.sku + " ran out of stock while you were checking out!")
        return 
      }
    }

    const { data: insertedOrders, error: insertError } = await supabase.from('orders').insert(orderLines).select()
    
    if (insertError) {
      alert("Something went wrong saving your order.")
      return
    }

    const firstOrderId = insertedOrders?.[0]?.id?.split('-')[0] || String(Math.floor(20000 + Math.random() * 70000))

    if (!document.startViewTransition) {
      setOrder({ id: 'K2-' + firstOrderId, total: totals.subtotal, count: totals.count, wholesale: isWholesale })
      setCart([])
      setView('confirmation')
      window.scrollTo(0, 0)
      return
    }
    document.startViewTransition(() => {
      flushSync(() => {
        setOrder({ id: 'K2-' + firstOrderId, total: totals.subtotal, count: totals.count, wholesale: isWholesale })
        setCart([])
        setView('confirmation')
        window.scrollTo(0, 0)
      })
    })
  }

  const value = useMemo(() => ({
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
    user,
    order,
    placeOrder,
    query,
    setQuery,
    category,
    setCategory,
    requests,
    addRequest,
    conversations,
    sendMessage,
    createConversation,
    products, // Now serving the merged rich + live data
    loading,
    getProduct,
    isDark,
    toggleDarkMode,
    ...totals,
  }), [view, productId, cart, cartOpen, isWholesale, user, order, query, category, requests, conversations, products, loading, totals, isDark])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
