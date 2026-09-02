import { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/lazySupabaseClient'
import { products as localProducts } from '../data/products'
import { guestBffEnabled, postGuestCommerce } from '../services/guestCommerceService'
import { customerAccountEnabled } from '../services/customerAccountService'
import { loadProductKnowledge } from '../lib/productKnowledgeSource'
import { addCartItems, productStock, validateCartForSubmission } from '../lib/cartInventory'
import { STOREFRONT_PATH_TO_VIEW, STOREFRONT_VIEW_TO_PATH } from '../lib/storefrontRoutes'

const StoreContext = createContext(null)
const CATALOG_REFRESH_INTERVAL_MS = 60_000
const LEGACY_QUERY_VIEWS = new Set([
  'home', 'catalog', 'store', 'pasabuy', 'wholesale', 'contact', 'account',
  'messages', 'checkout', 'confirmation',
])

const NO_ADMIN_RUNTIME = {
  user: null,
  isAdmin: false,
  authReady: true,
  adminOAuthAvailable: false,
  loginAdmin: async () => ({ ok: false, error: 'Admin access is available only on the separate admin site.' }),
  loginWithGoogle: async () => ({ ok: false, error: 'Admin access is available only on the separate admin site.' }),
  logoutAdmin: async () => {},
  challengeMfa: async () => ({ ok: false, error: 'Admin access is available only on the separate admin site.' }),
  enrollMfa: async () => ({ ok: false, error: 'Admin access is available only on the separate admin site.' }),
  verifyMfaEnroll: async () => ({ ok: false, error: 'Admin access is available only on the separate admin site.' }),
  startMfaReplacement: async () => ({ ok: false, error: 'Admin access is available only on the separate admin site.' }),
  completeMfaReplacement: async () => ({ ok: false, error: 'Admin access is available only on the separate admin site.' }),
  inviteStaff: async () => ({ ok: false, error: 'Admin access is available only on the separate admin site.' }),
}

const NO_ADMIN_INBOX = {
  conversations: [],
  inboxState: { loading: false, error: '', phase2Ready: true },
  sendMessage: async () => ({ ok: false, error: 'Staff messaging is available only on the separate admin site.' }),
  markConversationRead: async () => ({ ok: false, error: 'Staff messaging is available only on the separate admin site.' }),
  updateConversationWorkflow: async () => ({ ok: false, error: 'Staff messaging is available only on the separate admin site.' }),
}

// Shown when a product has no photo of its own. Never borrow another
// product's image just to fill the frame.
const PLACEHOLDER_IMG = '/images/placeholder.svg'

function parseLocationState() {
  if (typeof window === 'undefined') return { view: 'home', productId: null }
  try {
    const params = new URLSearchParams(window.location.search)
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '')
    
    if (pathname.startsWith('product/')) {
      const sku = pathname.slice(8)
      if (sku) return { view: 'master_product', productId: decodeURIComponent(sku) }
    }
    const routedView = pathname ? STOREFRONT_PATH_TO_VIEW[`/${pathname}`] : null
    if (routedView) return { view: routedView, productId: null }

    if (pathname) return { view: 'not_found', productId: null }
    if (params.get('product')) return { view: 'master_product', productId: params.get('product') }
    if (LEGACY_QUERY_VIEWS.has(params.get('view'))) return { view: params.get('view'), productId: null }
    if (customerAccountEnabled() && params.get('account') === 'continue') return { view: 'account', productId: null }

    return { view: 'home', productId: null }
  } catch {
    return { view: 'not_found', productId: null }
  }
}

export function StoreProvider({ children, enableAdminData = false, adminAuth = NO_ADMIN_RUNTIME, adminInbox = NO_ADMIN_INBOX }) {
  const initialLoc = useMemo(() => parseLocationState(), [])
  const [view, setView] = useState(initialLoc.view)
  const [productId, setProductId] = useState(initialLoc.productId)
  const [pasabuyPrefill, setPasabuyPrefill] = useState(null)
  const [productQuestionPrefill, setProductQuestionPrefill] = useState(null)
  
  const [cart, setCart] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('k2_cart_v1')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('k2_cart_v1', JSON.stringify(cart))
    } catch {}
  }, [cart])

  // Listen to browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const { view: nextView, productId: nextProductId } = parseLocationState()
      setView(nextView)
      setProductId(nextProductId)
      setCartOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const [isWholesale, setIsWholesale] = useState(false)
  const {
    user, isAdmin, authReady, loginAdmin, loginWithGoogle, logoutAdmin,
    challengeMfa, enrollMfa, verifyMfaEnroll, startMfaReplacement, completeMfaReplacement, inviteStaff, adminOAuthAvailable,
  } = adminAuth
  
  const [cartOpen, setCartOpen] = useState(false)
  const [order, setOrder] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [requests, setRequests] = useState([])
  const {
    conversations, inboxState, sendMessage, markConversationRead, updateConversationWorkflow,
  } = adminInbox
  const [dbProducts, setDbProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const catalogRefreshInFlightRef = useRef(false)

  // Coupon rules remain private in Supabase; the storefront validates one
  // submitted code at a time and cannot enumerate promotion records.
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [claimedVouchers, setClaimedVouchers] = useState(() => {
    try {
      const saved = localStorage.getItem('k2_claimed_vouchers')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('k2_claimed_vouchers', JSON.stringify(claimedVouchers))
    } catch (e) {}
  }, [claimedVouchers])

  const applyCoupon = async (codeStr) => {
    const cleanCode = codeStr.toUpperCase().trim()
    if (!cleanCode) return { success: false, message: 'Enter a coupon code.' }
    const currentSubtotal = cart.reduce((sum, line) => {
      const product = getProduct(line.id)
      if (!product) return sum
      return sum + product.retail * line.qty
    }, 0)
    if (guestBffEnabled()) {
      const result = await postGuestCommerce('coupon', { code: cleanCode, subtotal: currentSubtotal })
      if (!result.ok || !result.data?.valid) {
        return { success: false, message: result.error || 'That coupon is invalid or not eligible for this cart.' }
      }
      const coupon = {
        code: result.data.normalized_code,
        discountAmount: Number(result.data.discount_amount || 0),
      }
      setAppliedCoupon(coupon)
      if (!claimedVouchers.includes(cleanCode)) setClaimedVouchers(previous => [...previous, cleanCode])
      return { success: true, message: `${coupon.code} applied. It will be rechecked when you submit.`, coupon }
    }
    const supabase = await getSupabaseClient().catch(() => null)
    if (!supabase) return { success: false, message: 'Coupon validation is unavailable.' }
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: cleanCode,
      p_subtotal: currentSubtotal,
    })
    if (error) return { success: false, message: 'Coupon could not be validated. Please try again.' }
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.coupon_id) return { success: false, message: 'Coupon could not be validated.' }
    const coupon = {
      id: row.coupon_id,
      code: row.normalized_code,
      type: row.discount_type,
      value: Number(row.discount_value),
      discountAmount: Number(row.discount_amount),
    }
    setAppliedCoupon(coupon)
    if (!claimedVouchers.includes(cleanCode)) setClaimedVouchers(previous => [...previous, cleanCode])
    return { success: true, message: `${coupon.code} applied. It will be rechecked when you submit.`, coupon }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
  }

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('theme')
        return savedTheme
          ? savedTheme === 'dark'
          : window.matchMedia('(prefers-color-scheme: dark)').matches
      } catch (e) {
        return false
      }
    }
    return false
  })

  useEffect(() => {
    try {
      const theme = isDark ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.style.colorScheme = theme
      document.querySelector('#theme-color')?.setAttribute('content', isDark ? '#090C15' : '#FAF7F2')
      localStorage.setItem('theme', theme)
    } catch (e) {
      // Ignore localStorage errors in restricted browsers
    }
  }, [isDark])

  const toggleDarkMode = () => setIsDark(current => !current)

  useEffect(() => {
    if (isAdmin) setIsWholesale(true)
  }, [isAdmin])

  useEffect(() => {
    let disposed = false
    let productsChannel = null
    let refreshInterval = null
    fetchProducts()

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchProducts()
    }

    if (isSupabaseConfigured) {
      getSupabaseClient().then((supabase) => {
        if (disposed || !supabase) return
        productsChannel = supabase
          .channel('public:products:store')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
          .subscribe()
        refreshInterval = window.setInterval(refreshWhenVisible, CATALOG_REFRESH_INTERVAL_MS)
        document.addEventListener('visibilitychange', refreshWhenVisible)
      }).catch(() => setLoading(false))
    }

    return () => {
      disposed = true
      if (refreshInterval) window.clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      if (productsChannel) getSupabaseClient().then(client => client?.removeChannel(productsChannel)).catch(() => {})
    }
  }, [])

  const fetchProducts = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    if (catalogRefreshInFlightRef.current) return
    catalogRefreshInFlightRef.current = true
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) return
      const [productsResult, stockResult] = await Promise.all([
        // `published` is the staff-controlled publication flag, set from the
        // Published toggle in Sheet.jsx and guarded by PhotoManagerModal's
        // primary-photo requirement. Honouring it here is what keeps unpublished
        // and mock catalog rows off the public storefront; status alone is not a
        // publication decision.
        supabase.from('products').select('*').in('status', ['Live', 'Active', 'Unlisted']).eq('published', true),
        supabase.from('v_product_stock_from_batches').select('sku, stock_from_batches'),
      ])

      // The catalog renders whenever the product read succeeds. These two reads
      // were previously coupled all-or-nothing, so a permission error on the
      // stock view discarded a perfectly good product list and blanked the
      // entire storefront — which is exactly what a revoked anon grant on
      // v_product_stock_from_batches did in production.
      if (!productsResult.error && productsResult.data) {
        const stockAvailable = !stockResult.error && stockResult.data
          ? Object.fromEntries(stockResult.data.map(r => [r.sku, r.stock_from_batches]))
          : null

        // When the FEFO projection is unavailable, fall back to the product
        // row's own stock figure rather than inventing one. Stock is never
        // fabricated upward, so the catalogue cannot assert stock it cannot
        // honour.
        const merged = productsResult.data.map(p => ({
          ...p,
          stock_available: stockAvailable
            ? (Object.hasOwn(stockAvailable, p.sku) ? Number(stockAvailable[p.sku]) : null)
            : (p.stock_available === null || p.stock_available === undefined
                ? null
                : Number(p.stock_available)),
        }))
        setDbProducts(merged)
      }

      // Approved product knowledge, loaded alongside the catalog it describes.
      // Deliberately not awaited with the catalog: a product must render as
      // soon as its price and stock are known, and its description arriving a
      // moment later is not a reason to hold the shelf back.
      loadProductKnowledge(supabase).catch(() => {})
    } catch {
      // Preserve last known-good snapshot
    } finally {
      catalogRefreshInFlightRef.current = false
      setLoading(false)
    }
  }

  // Merge the rich local data with the live pricing and stock from Supabase
  const products = useMemo(() => {
    if (dbProducts.length === 0) {
      if (!import.meta.env.DEV) return []
      return localProducts.map(lp => ({
        ...lp,
        sku: lp.id,
        srp: lp.retail,
        retail: lp.retail,
        wholesale_price: lp.wholesale,
        wholesale: lp.wholesale,
        stock_available: lp.stock,
        stock: lp.stock,
      }))
    }
    return dbProducts.map((dbP) => {
      const localP = localProducts.find(lp =>
        lp.id.toLowerCase() === dbP.sku.toLowerCase()
      ) || null

      return {
        ...(localP || {}),
        category: dbP.subcategory || (dbP.origin?.startsWith('Shopee|') ? dbP.origin.split('|')[1] : (dbP.origin === 'Shopee' ? 'Shopee Imports' : (localP?.category ?? 'Uncategorised'))),
        sku: dbP.sku,
        id: dbP.sku,
        name: dbP.name,
        img: dbP.primary_image_url || dbP.secondary_images?.[0] || localP?.img || PLACEHOLDER_IMG,
        afterImage: dbP.lifestyle_images?.[0] || dbP.secondary_images?.[1] || localP?.afterImage || null,
        gallery: (dbP.secondary_images?.length ? dbP.secondary_images : null) || localP?.gallery || [],
        srp: Number(dbP.srp),
        retail: Number(dbP.srp),
        wholesale_price: Number(dbP.wholesale_price),
        wholesale: Number(dbP.wholesale_price),
        stock_available: dbP.stock_available,
        stock: dbP.stock_available,
        why_buy: dbP.why_buy || localP?.whyBuy || null,
        usage_instructions: dbP.usage_instructions,
        ingredients: dbP.ingredients || localP?.ingredients || null,
        allergens: dbP.allergens || localP?.allergens || null,
        net_weight: dbP.net_weight || localP?.net_weight || null,
        // Measured packed parcel, not the display net weight. Null means the SKU
        // is unweighed, which keeps its orders on the quoted-after-review path.
        shipping_weight_g: Number.isInteger(dbP.shipping_weight_g) ? dbP.shipping_weight_g : null,
        package_type: dbP.package_type || localP?.package_type || null,
        storage_instructions: dbP.storage_instructions || localP?.storage_instructions || null,
        finished_product_details: dbP.finished_product_details || localP?.finished_product_details || null,
        brand_id: dbP.brand_id || localP?.brand_id || null,
        country_of_origin: dbP.country_of_origin || localP?.country_of_origin || null,
        barcode: dbP.barcode || localP?.barcode || null,
        product_video_url: dbP.product_video_url || localP?.product_video_url || null,
        guide: localP?.guide ?? null,
        pairings: (dbP.pairings?.length ? dbP.pairings : localP?.pairings) || [],
        description: dbP.description || dbP.short_description || localP?.description || null,
        short_description: dbP.short_description,
        subcategory: dbP.subcategory,
        seo_keywords: dbP.seo_keywords || [],
        why_rare: dbP.why_rare || localP?.whyRare || null,
        hue: localP?.hue ?? 40,
        tag: localP?.tag ?? null,
        status: dbP.status,
      }
    })
  }, [dbProducts])

  const listedProducts = useMemo(
    () => products.filter(p => p.status !== 'Unlisted'),
    [products]
  )

  const getProduct = (id) => products.find(p => p.id === id || p.sku === id)

  const syncLocation = (nextView, nextProductId = null) => {
    if (typeof window === 'undefined') return
    let path = STOREFRONT_VIEW_TO_PATH[nextView] || '/'
    if (nextView === 'master_product' && nextProductId) {
      path = `/product/${encodeURIComponent(nextProductId)}`
    }
    try {
      if (window.location.pathname !== path && !window.location.search.includes('account=continue')) {
        window.history.pushState({ view: nextView, productId: nextProductId }, '', path)
      }
    } catch {}
  }

  const openProduct = (id) => {
    syncLocation('master_product', id)
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

  const go = (v, { focusSelector = '' } = {}) => {
    syncLocation(v, null)
    const updateView = () => {
      setView(v)
      setCartOpen(false)
      window.scrollTo(0, 0)
    }
    const focusDestination = () => {
      if (focusSelector) {
        document.querySelector(focusSelector)?.focus({ preventScroll: true })
      }
    }
    if (!document.startViewTransition) {
      if (focusSelector) {
        flushSync(updateView)
        focusDestination()
      } else {
        updateView()
      }
      return
    }
    document.startViewTransition(() => {
      flushSync(updateView)
      focusDestination()
    })
  }

  const requestPasabuyItem = ({ item = '', url = '', notes = '', qty = 1 } = {}) => {
    setPasabuyPrefill({ item, url, notes, qty })
    go('pasabuy')
  }

  const clearPasabuyPrefill = () => {
    setPasabuyPrefill(null)
  }

  // MAP-027: hand a product question to the canonical guest conversation
  // boundary. Bounded context only — SKU, public product name, originating
  // surface, and the customer's own question. No conversation history, no
  // identity, no private evidence, and no response-time promise.
  const askStaffAboutProduct = ({ sku = '', productName = '', question = '', origin = 'product-page' } = {}) => {
    const trimmed = String(question || '').trim()
    if (!trimmed) return
    const reference = sku ? `${productName || 'Product'} (SKU: ${sku})` : productName || 'Product'
    setProductQuestionPrefill({
      sku,
      productName,
      origin,
      message: `About ${reference}\n\n${trimmed}`,
    })
    go('messages')
  }

  const clearProductQuestionPrefill = () => {
    setProductQuestionPrefill(null)
  }

  const addToCart = (id, qty = 1) => {
    const result = addCartItems(cart, products, [{ id, qty }])
    if (result.ok) setCart(result.cart)
    return result
  }

  const addBundleToCart = (ids, qty = 1) => {
    const result = addCartItems(cart, products, ids.map((id) => ({ id, qty })))
    if (result.ok) setCart(result.cart)
    return result
  }

  const setQty = (id, qty) =>
    setCart((prev) =>
      qty <= 0
        ? prev.filter((line) => line.id !== id)
        : prev.map((line) => {
            if (line.id !== id) return line
            const product = getProduct(id)
            if (!product) return line
            const stock = productStock(product)
            if (stock === null) return line
            if (stock <= 0) return null
            return { ...line, qty: Math.min(qty, stock) }
          }).filter(Boolean),
    )

  const addRequest = async (payload) => {
    if (guestBffEnabled()) {
      const fingerprint = JSON.stringify(payload)
      if (pasabuyRequestKeyRef.current.fingerprint !== fingerprint) {
        pasabuyRequestKeyRef.current = { fingerprint, key: crypto.randomUUID() }
      }
      const result = await postGuestCommerce('pasabuy', {
        customerName: payload.customerName,
        email: payload.email,
        phone: payload.phone,
        item: payload.item,
        url: payload.url,
        quantity: Number(payload.qty) || 1,
        budget: payload.budget || '',
        shipping: payload.shipping || 'sea',
        alternativesAllowed: Boolean(payload.alternatives),
        notes: payload.notes,
        idempotencyKey: pasabuyRequestKeyRef.current.key,
        botToken: payload.botToken,
      })
      if (!result.ok) return result
      const saved = result.data
      pasabuyRequestKeyRef.current = { fingerprint: '', key: '' }
      setRequests(prev => [{
        id: saved.public_reference,
        item: payload.item.trim(),
        status: 'Request received',
        eta: 'Staff review required',
      }, ...prev])
      return { ok: true, request: saved }
    }
    const supabase = await getSupabaseClient().catch(() => null)
    if (!supabase) {
      return { ok: false, error: 'Request service is not configured yet. Please contact K2 Jimzon directly.' }
    }

    const { data, error } = await supabase.rpc('submit_pasabuy_request', {
      p_customer_name: payload.customerName?.trim(),
      p_customer_email: payload.email?.trim() || null,
      p_customer_phone: payload.phone?.trim() || null,
      p_item_title: payload.item?.trim(),
      p_reference_url: payload.url?.trim() || null,
      p_quantity: Number(payload.qty) || 1,
      p_target_budget_php: payload.budget ? Number(payload.budget) : null,
      p_shipping_preference: payload.shipping || 'sea',
      p_alternatives_allowed: Boolean(payload.alternatives),
      p_customer_notes: payload.notes?.trim() || null,
    })

    if (error) return { ok: false, error: 'The request could not be saved. Please try again.' }
    const saved = Array.isArray(data) ? data[0] : data
    if (!saved?.public_reference) return { ok: false, error: 'The request was not confirmed by the server.' }

    setRequests(prev => [{
      id: saved.public_reference,
      item: payload.item.trim(),
      status: 'Request received',
      eta: 'Staff review required',
    }, ...prev])
    return { ok: true, request: saved }
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

    let couponDiscount = 0
    if (appliedCoupon && subtotal >= (appliedCoupon.minSpend || 0)) {
      if (Number.isFinite(appliedCoupon.discountAmount)) {
        couponDiscount = Math.min(appliedCoupon.discountAmount, subtotal)
      } else if (appliedCoupon.type === 'percentage') {
        couponDiscount = Math.round((subtotal * appliedCoupon.value) / 100)
      } else {
        couponDiscount = Math.min(appliedCoupon.value, subtotal)
      }
    }

    const finalTotal = Math.max(0, subtotal - couponDiscount)

    return { lines, subtotal, count, wholesaleSavings: retailTotal - subtotal, couponDiscount, finalTotal }
  }, [cart, isWholesale, products, appliedCoupon])

  const placingOrderRef = useRef(false)
  const checkoutRequestKeyRef = useRef('')
  const pasabuyRequestKeyRef = useRef({ fingerprint: '', key: '' })

  const placeOrder = async (customerDetails = {}) => {
    if (placingOrderRef.current) return
    placingOrderRef.current = true
    try {
      return await runPlaceOrderRequest(customerDetails)
    } finally {
      placingOrderRef.current = false
    }
  }

  const runPlaceOrderRequest = async (customerDetails) => {
    if (!guestBffEnabled() && !isSupabaseConfigured) {
      return { ok: false, error: 'Order requests are not configured yet. Please contact K2 Jimzon directly.' }
    }

    const availability = validateCartForSubmission(cart, products)
    if (!availability.ok) {
      const messages = {
        EMPTY_CART: 'Your cart is empty.',
        PRODUCT_UNAVAILABLE: 'A product in your cart is no longer available. Return to the catalog and review your cart.',
        STOCK_UNKNOWN: 'Stock for a product in your cart cannot be confirmed right now. Please wait for the catalog to refresh or contact K2 staff.',
        OUT_OF_STOCK: 'A product in your cart is now out of stock. Return to the catalog and review your cart.',
        INSUFFICIENT_STOCK: 'The requested quantity is no longer available. Return to your cart and lower the quantity.',
      }
      return { ok: false, code: availability.code, error: messages[availability.code] || 'Cart availability could not be confirmed.' }
    }

    const items = totals.lines.map(line => ({ sku: line.id, quantity: line.qty }))
    if (!checkoutRequestKeyRef.current) checkoutRequestKeyRef.current = crypto.randomUUID()
    const requestKey = checkoutRequestKeyRef.current

    if (guestBffEnabled()) {
      const result = await postGuestCommerce('order', {
        customerName: customerDetails.name,
        email: customerDetails.email,
        phone: customerDetails.phone,
        address: customerDetails.address,
        fulfillmentMethod: customerDetails.fulfillmentMethod || 'Metro Manila delivery',
        note: customerDetails.note,
        items,
        idempotencyKey: requestKey,
        couponCode: appliedCoupon?.code || '',
        botToken: customerDetails.botToken,
      })
      if (!result.ok) return result
      return finishOrder(result.data)
    }

    const supabase = await getSupabaseClient().catch(() => null)
    if (!supabase) return { ok: false, error: 'Order requests are not configured yet. Please contact K2 Jimzon directly.' }
    const { data, error } = await supabase.rpc('submit_order_request_v2', {
      p_customer_name: customerDetails.name?.trim(),
      p_customer_email: customerDetails.email?.trim() || null,
      p_customer_phone: customerDetails.phone?.trim() || null,
      p_delivery_address: customerDetails.address?.trim(),
      p_fulfillment_method: customerDetails.fulfillmentMethod || 'Metro Manila delivery',
      p_customer_note: customerDetails.note?.trim() || null,
      p_items: items,
      p_idempotency_key: requestKey,
      p_coupon_code: appliedCoupon?.code || null,
    })

    if (error) return { ok: false, error: 'The order request could not be saved. Please try again.' }
    const saved = Array.isArray(data) ? data[0] : data
    if (!saved?.public_reference) return { ok: false, error: 'The server did not confirm the request.' }

    return finishOrder(saved)
  }

  const finishOrder = (saved) => {
    syncLocation('confirmation')
    const finish = () => {
      setOrder({
        id: saved.public_reference,
        total: Number(saved.total_amount || totals.finalTotal || totals.subtotal),
        count: totals.count,
        wholesale: false,
        status: saved.status,
        paymentStatus: saved.payment_status,
      })
      setCart([])
      setAppliedCoupon(null)
      checkoutRequestKeyRef.current = ''
      setView('confirmation')
      window.scrollTo(0, 0)
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => flushSync(finish))
    } else {
      finish()
    }
    return { ok: true, order: saved }
  }

  const value = useMemo(() => ({
    view,
    go,
    productId,
    openProduct,
    cart,
    addToCart,
    addBundleToCart,
    setQty,
    cartOpen,
    setCartOpen,
    isWholesale,
    setIsWholesale,
    isAdmin,
    authReady,
    loginAdmin,
    loginWithGoogle,
    adminOAuthAvailable,
    logoutAdmin,
    challengeMfa,
    enrollMfa,
    verifyMfaEnroll,
    startMfaReplacement,
    completeMfaReplacement,
    inviteStaff,
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
    inboxState,
    sendMessage,
    markConversationRead,
    updateConversationWorkflow,
    products,
    listedProducts,
    loading,
    getProduct,
    isDark,
    toggleDarkMode,
    appliedCoupon,
    claimedVouchers,
    applyCoupon,
    removeCoupon,
    pasabuyPrefill,
    requestPasabuyItem,
    clearPasabuyPrefill,
    productQuestionPrefill,
    askStaffAboutProduct,
    clearProductQuestionPrefill,
    ...totals,
  }), [view, productId, cart, cartOpen, isWholesale, isAdmin, authReady, user, order, query, category, requests, conversations, inboxState, products, listedProducts, loading, totals, isDark, appliedCoupon, claimedVouchers, pasabuyPrefill, productQuestionPrefill])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
