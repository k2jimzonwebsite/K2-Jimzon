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

const noAdmin = async () => ({ ok: false, error: 'Admin only' })
const NO_ADMIN_RUNTIME = {
  user: null, isAdmin: false, authReady: true, adminOAuthAvailable: false,
  loginAdmin: noAdmin, loginWithGoogle: noAdmin, logoutAdmin: async () => {},
  challengeMfa: noAdmin, enrollMfa: noAdmin, verifyMfaEnroll: noAdmin,
  startMfaReplacement: noAdmin, completeMfaReplacement: noAdmin, inviteStaff: noAdmin,
}
const NO_ADMIN_INBOX = {
  conversations: [],
  inboxState: { loading: false, error: '', phase2Ready: true },
  sendMessage: noAdmin, markConversationRead: noAdmin, updateConversationWorkflow: noAdmin,
}

// Shown when a product has no photo of its own. Never borrow another
// product's image just to fill the frame.
const PLACEHOLDER_IMG = '/images/placeholder.svg'
const DEF_CATALOG_LOC = { query: '', category: 'All', sort: 'popular' }

function parseLocationState() {
  if (typeof window === 'undefined') return { view: 'home', productId: null, ...DEF_CATALOG_LOC }
  try {
    const params = new URLSearchParams(window.location.search)
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '')
    const q = params.get('q') || ''
    const category = params.get('category') || 'All'
    const sort = params.get('sort') || 'popular'
    
    if (pathname.startsWith('product/')) {
      const sku = pathname.slice(8)
      if (sku) return { view: 'master_product', productId: decodeURIComponent(sku), ...DEF_CATALOG_LOC }
    }
    const routedView = pathname ? STOREFRONT_PATH_TO_VIEW[`/${pathname}`] : null
    if (routedView) return { view: routedView, productId: null, query: q, category, sort }

    if (pathname) return { view: 'not_found', productId: null, ...DEF_CATALOG_LOC }
    if (params.get('product')) return { view: 'master_product', productId: params.get('product'), ...DEF_CATALOG_LOC }
    if (LEGACY_QUERY_VIEWS.has(params.get('view'))) return { view: params.get('view'), productId: null, query: q, category, sort }
    if (customerAccountEnabled() && params.get('account') === 'continue') return { view: 'account', productId: null, ...DEF_CATALOG_LOC }

    return { view: 'home', productId: null, ...DEF_CATALOG_LOC }
  } catch {
    return { view: 'not_found', productId: null, ...DEF_CATALOG_LOC }
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
      const loc = parseLocationState()
      setView(loc.view)
      setProductId(loc.productId)
      if (loc.view === 'catalog') {
        setQuery(loc.query || '')
        setCategory(loc.category || 'All')
        setSortBy(loc.sort || 'popular')
      }
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
  const [query, setQuery] = useState(initialLoc.query || '')
  const [category, setCategory] = useState(initialLoc.category || 'All')
  const [sortBy, setSortBy] = useState(initialLoc.sort || 'popular')

  // Synchronize catalog query, category, and sort to shareable URL params
  useEffect(() => {
    if (view !== 'catalog' || typeof window === 'undefined') return
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category && category !== 'All') params.set('category', category)
    if (sortBy && sortBy !== 'popular') params.set('sort', sortBy)
    const qs = params.toString()
    const newPath = qs ? `/catalog?${qs}` : '/catalog'
    const currentPath = window.location.pathname + window.location.search
    if (currentPath !== newPath && !window.location.search.includes('account=continue')) {
      window.history.replaceState({ view: 'catalog', productId: null, query, category, sort: sortBy }, '', newPath)
    }
  }, [view, query, category, sortBy])
  const [requests, setRequests] = useState([])
  const {
    conversations, inboxState, sendMessage, markConversationRead, updateConversationWorkflow,
  } = adminInbox
  const [dbProducts, setDbProducts] = useState([])
  const [loading, setLoading] = useState(true)
  // A failed refresh must never read as an empty store, and a retained
  // snapshot must never read as current. `catalogFailed` means no usable
  // list exists; `catalogStale` means the visible list may be outdated.
  const [catalogStale, setCatalogStale] = useState(false)
  const [catalogFailed, setCatalogFailed] = useState(false)
  const hadCatalogRef = useRef(false)
  const catalogRefreshInFlightRef = useRef(false)

  const placingOrderRef = useRef(false)
  const checkoutRequestKeyRef = useRef('')
  const checkoutPayloadRef = useRef(null)
  const [pendingCheckout, setPendingCheckout] = useState(null)
  const [checkoutLines, setCheckoutLines] = useState(null)
  const resetPendingCheckout = () => {
    checkoutPayloadRef.current = null
    checkoutRequestKeyRef.current = ''
    setPendingCheckout(null)
    setCheckoutLines(null)
  }
  useEffect(() => {
    if (!pendingCheckout) return undefined
    const guard = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [pendingCheckout])

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
    if (checkoutPayloadRef.current) resetPendingCheckout()
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
    if (checkoutPayloadRef.current) resetPendingCheckout()
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
        supabase.from('products').select('*').in('status', ['Live', 'Active', 'Unlisted']).eq('published', true).order('created_at', { ascending: false }),
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
        hadCatalogRef.current = true
        setCatalogFailed(false)
        setCatalogStale(stockAvailable === null)

        // When the FEFO projection is unavailable, fall back to the product
        // row's own stock figure rather than inventing one. Stock is never
        // fabricated upward, so the catalogue cannot assert stock it cannot
        // honour.
        const merged = productsResult.data.map(p => ({
          ...p,
          stock_available: stockAvailable
            ? (Object.hasOwn(stockAvailable, p.sku) ? (stockAvailable[p.sku] == null ? null : Number(stockAvailable[p.sku])) : null)
            : (p.stock_available === null || p.stock_available === undefined
                ? null
                : Number(p.stock_available)),
        }))
        setDbProducts(merged)
      } else {
        // The product read itself failed: keep any retained list, but mark
        // it stale — or failed when there is nothing to show.
        const failed = !hadCatalogRef.current
        setCatalogFailed(failed)
        setCatalogStale(!failed)
      }

      // Approved product knowledge, loaded alongside the catalog it describes.
      // Deliberately not awaited with the catalog: a product must render as
      // soon as its price and stock are known, and its description arriving a
      // moment later is not a reason to hold the shelf back.
      loadProductKnowledge(supabase).catch(() => {})
    } catch {
      // A failed refresh is not an empty store, and a retained list is not
      // a current one.
      const failed = !hadCatalogRef.current
      setCatalogFailed(failed)
      setCatalogStale(!failed)
    } finally {
      catalogRefreshInFlightRef.current = false
      setLoading(false)
    }
  }

  // Database-backed products never inherit facts or media from demo SKUs.
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
      return {
        ...dbP,
        created_at: dbP.created_at || null,
        category: dbP.subcategory || (dbP.origin?.startsWith('Shopee|') ? dbP.origin.split('|')[1] : (dbP.origin === 'Shopee' ? 'Shopee Imports' : 'Uncategorised')),
        sku: dbP.sku,
        id: dbP.sku,
        name: dbP.name,
        img: dbP.primary_image_url || dbP.secondary_images?.[0] || PLACEHOLDER_IMG,
        afterImage: dbP.lifestyle_images?.[0] || dbP.secondary_images?.[1] || null,
        gallery: (dbP.secondary_images?.length ? dbP.secondary_images : null) || [],
        srp: Number(dbP.srp),
        retail: Number(dbP.srp),
        wholesale_price: Number(dbP.wholesale_price),
        wholesale: Number(dbP.wholesale_price),
        stock_available: dbP.stock_available,
        stock: dbP.stock_available,
        why_buy: dbP.why_buy || null,
        usage_instructions: dbP.usage_instructions,
        ingredients: dbP.ingredients || null,
        allergens: dbP.allergens || null,
        net_weight: dbP.net_weight || null,
        // Measured packed parcel, not the display net weight. Null means the SKU
        // is unweighed, which keeps its orders on the quoted-after-review path.
        shipping_weight_g: Number.isInteger(dbP.shipping_weight_g) ? dbP.shipping_weight_g : null,
        package_type: dbP.package_type || null,
        storage_instructions: dbP.storage_instructions || null,
        finished_product_details: dbP.finished_product_details || null,
        brand_id: dbP.brand_id || null,
        country_of_origin: dbP.country_of_origin || null,
        barcode: dbP.barcode || null,
        product_video_url: dbP.product_video_url || null,
        guide: null,
        pairings: (dbP.pairings?.length ? dbP.pairings : []) || [],
        description: dbP.description || dbP.short_description || null,
        short_description: dbP.short_description,
        subcategory: dbP.subcategory,
        seo_keywords: dbP.seo_keywords || [],
        why_rare: dbP.why_rare || null,
        hue: 40,
        tag: null,
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

  const focusRouteDestination = (focusSelector = '') => {
    // Screen-reader and keyboard users land where sighted users look.
    const target = (focusSelector && document.querySelector(focusSelector))
      || document.querySelector('main h1,main')
    if (!target) return
    if (target.tabIndex < 0) target.tabIndex = -1
    target.focus({ preventScroll: true })
  }

  const openProduct = (id) => {
    syncLocation('master_product', id)
    if (!document.startViewTransition) {
      setProductId(id)
      setView('master_product')
      window.scrollTo(0, 0)
      focusRouteDestination()
      return
    }
    document.startViewTransition(() => {
      flushSync(() => {
        setProductId(id)
        setView('master_product')
        window.scrollTo(0, 0)
      })
      focusRouteDestination()
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
      focusRouteDestination(focusSelector)
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
    if (checkoutPayloadRef.current) resetPendingCheckout()
    const result = addCartItems(cart, products, [{ id, qty }])
    if (result.ok) setCart(result.cart)
    return result
  }

  const addBundleToCart = (ids, qty = 1) => {
    if (checkoutPayloadRef.current) resetPendingCheckout()
    const result = addCartItems(cart, products, ids.map((id) => ({ id, qty })))
    if (result.ok) setCart(result.cart)
    return result
  }

  const setQty = (id, qty) => {
    if (checkoutPayloadRef.current) resetPendingCheckout()
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
  }

  const addRequest = async (payload) => {
    if (guestBffEnabled()) {
      // The challenge token refreshes after every failure, so it must not
      // participate in the idempotency fingerprint: retrying the same
      // request with a fresh token is the same logical request, not a new one.
      const { botToken: _challengeToken, ...stablePayload } = payload
      const fingerprint = JSON.stringify(stablePayload)
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

  const pasabuyRequestKeyRef = useRef({ fingerprint: '', key: '' })

  const placeOrder = async (customerDetails = {}) => {
    // A second submit while the first is in flight is not a failure: the
    // button already disables, but rapid Enter keys can still double-fire.
    // Returning a coded non-error keeps the UI in its submitting state
    // instead of alarming the customer with a bogus failure.
    if (placingOrderRef.current) return { ok: false, code: 'ALREADY_SUBMITTING' }
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

    const availability = checkoutPayloadRef.current ? { ok: true } : validateCartForSubmission(cart, products)
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
    const recovering = Boolean(checkoutPayloadRef.current)
    const payload = checkoutPayloadRef.current || {
      customerName: customerDetails.name, email: customerDetails.email,
      phone: customerDetails.phone, address: customerDetails.address,
      fulfillmentMethod: customerDetails.fulfillmentMethod || 'Metro Manila delivery',
      note: customerDetails.note, items, idempotencyKey: requestKey,
      couponCode: appliedCoupon?.code || '',
      ...(Number.isFinite(Number(customerDetails.shippingAmount)) && Number(customerDetails.shippingAmount) >= 0
        ? {
            shippingAmount: Number(customerDetails.shippingAmount),
            shippingQuoteStatus: customerDetails.shippingQuoteStatus || 'customer_confirmed',
          }
        : {}),
    }
    checkoutPayloadRef.current = payload
    setPendingCheckout(payload)
    if (!recovering) setCheckoutLines(totals.lines)

    if (guestBffEnabled()) {
      const result = await postGuestCommerce('order', {
        ...payload,
        botToken: customerDetails.botToken,
      })
      if (!result.ok) {
        // A server-confirmed rejection proves the request did not commit.
        // Clear the held state so the customer can correct their cart, coupon, or contact details.
        if (result.code?.endsWith('_INVALID') ||
          ['INSUFFICIENT_STOCK', 'CONTACT_REQUIRED', 'BOT_CHALLENGE_REQUIRED', 'INVALID_REQUEST', 'RATE_LIMITED', 'INVALID_OR_INELIGIBLE'].includes(result.code)) {
          resetPendingCheckout()
        }
        return result
      }
      if (!result.data?.public_reference) return { ok: false, error: 'The server did not confirm the request. Retry the same request.' }
      return finishOrder(result.data)
    }

    const supabase = await getSupabaseClient().catch(() => null)
    if (!supabase) return { ok: false, error: 'Order requests are not configured yet. Please contact K2 Jimzon directly.' }
    const { data, error } = await supabase.rpc('submit_order_request_v2', {
      p_customer_name: payload.customerName?.trim(),
      p_customer_email: payload.email?.trim() || null,
      p_customer_phone: payload.phone?.trim() || null,
      p_delivery_address: payload.address?.trim(),
      p_fulfillment_method: payload.fulfillmentMethod,
      p_customer_note: payload.note?.trim() || null,
      p_items: payload.items,
      p_idempotency_key: payload.idempotencyKey,
      p_coupon_code: payload.couponCode || null,
      p_shipping_amount: Number.isFinite(Number(payload.shippingAmount)) ? Number(payload.shippingAmount) : 0,
      p_shipping_quote_status: payload.shippingQuoteStatus || null,
    })

    if (error) {
      if (error.message?.includes('INSUFFICIENT_STOCK') || error.message?.includes('INVALID')) {
        resetPendingCheckout()
      }
      return { ok: false, error: 'The order request could not be saved. Please try again.' }
    }
    const saved = Array.isArray(data) ? data[0] : data
    if (!saved?.public_reference) return { ok: false, error: 'The server did not confirm the request.' }

    return finishOrder(saved)
  }

  const finishOrder = (saved) => {
    syncLocation('confirmation')
    const finish = () => {
      setOrder({
        id: saved.public_reference,
        total: Number(saved.total_amount ?? ((totals.finalTotal ?? totals.subtotal) + (Number(checkoutPayloadRef.current?.shippingAmount) || 0))),
        count: checkoutPayloadRef.current?.items.reduce((sum, item) => sum + item.quantity, 0) ?? totals.count,
        wholesale: false,
        status: saved.status,
        paymentStatus: saved.payment_status,
        shippingAmount: Number(saved.shipping_amount ?? checkoutPayloadRef.current?.shippingAmount ?? 0),
        fulfillmentMethod: saved.fulfillment_method ?? checkoutPayloadRef.current?.fulfillmentMethod,
      })
      setCart([])
      setAppliedCoupon(null)
      checkoutRequestKeyRef.current = ''
      checkoutPayloadRef.current = null
      setPendingCheckout(null)
      setCheckoutLines(null)
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
    pendingCheckout,
    resetPendingCheckout,
    query,
    setQuery,
    category,
    setCategory,
    sortBy,
    setSortBy,
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
    catalogStale,
    catalogFailed,
    refreshCatalog: fetchProducts,
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
    lines: checkoutLines || totals.lines,
  }), [view, productId, cart, cartOpen, isWholesale, isAdmin, authReady, user, order, query, category, sortBy, requests, conversations, inboxState, products, listedProducts, loading, catalogStale, catalogFailed, totals, isDark, appliedCoupon, claimedVouchers, pasabuyPrefill, productQuestionPrefill, pendingCheckout, checkoutLines])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
