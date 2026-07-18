import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { products } from './products'
import { REVIEWS as SEED_REVIEWS } from './site'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const CMS_PRODUCTS_KEY = 'k2_globe_products'
const CMS_REVIEWS_KEY = 'k2_globe_reviews'

const GlobeCmsContext = createContext(null)

// Seed globe product entries from existing catalog
function buildDefaultGlobeProducts() {
  return products.map((p) => ({
    productId: p.id,
    enabled: true,
    heroImage: p.img, // use the product catalog image by default
    displayOrder: 0,
  }))
}

// Seed reviews from existing site.js REVIEWS
function buildDefaultReviews() {
  return SEED_REVIEWS.map((r, i) => ({
    id: `review-${i}`,
    productId: matchReviewToProduct(r),
    name: r.name,
    channel: r.channel,
    stars: r.stars,
    text: r.text,
    item: r.item,
    date: new Date().toISOString().split('T')[0],
  }))
}

// Best-effort map existing reviews to product IDs
function matchReviewToProduct(review) {
  const map = {
    'Nutella Biscuits': 'nutella-biscuits',
    'Lavazza Qualità Oro': 'lavazza-oro',
    'Pasabuy request': null,
    'Pistì pistachio cream': 'pistachio-cream',
  }
  return map[review.item] ?? null
}

// Computed: enabled products enriched with catalog data
function buildEnabledGlobeProducts(globeProducts) {
  return globeProducts
    .filter((gp) => gp.enabled)
    .map((gp) => {
      const product = products.find((p) => p.id === gp.productId)
      return product ? { ...product, heroImage: gp.heroImage || product.img } : null
    })
    .filter(Boolean)
}

/* ---------- Supabase row mapping ---------- */

function mapGlobeProductRow(row) {
  return {
    productId: row.product_id,
    enabled: row.enabled,
    heroImage: row.hero_image,
    displayOrder: row.display_order,
  }
}

function mapReviewRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    channel: row.channel,
    stars: row.stars,
    text: row.text,
    item: row.item,
    date: row.review_date,
  }
}

function toReviewRow(review) {
  return {
    product_id: review.productId || null,
    name: review.name,
    channel: review.channel ?? '',
    stars: review.stars,
    text: review.text,
    item: review.item ?? '',
  }
}

/* ---------- Remote provider (Supabase) ---------- */

function RemoteGlobeCmsProvider({ children }) {
  const [globeProducts, setGlobeProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [cmsError, setCmsError] = useState(null)
  const [authSession, setAuthSession] = useState(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    const [gpRes, rvRes] = await Promise.all([
      supabase.from('globe_products').select('*').order('display_order'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    ])
    if (gpRes.error || rvRes.error) {
      setCmsError(`Could not load CMS data: ${(gpRes.error || rvRes.error).message}`)
      // Fall back to catalog defaults so the globe still renders
      setGlobeProducts(buildDefaultGlobeProducts())
      setReviews(buildDefaultReviews())
    } else {
      setCmsError(null)
      setGlobeProducts(
        gpRes.data.length ? gpRes.data.map(mapGlobeProductRow) : buildDefaultGlobeProducts()
      )
      setReviews(rvRes.data.map(mapReviewRow))
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Track admin auth session for CMS write access
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signInAdmin = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }, [])

  const signOutAdmin = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const toggleGlobeProduct = useCallback(async (productId) => {
    const current = globeProducts.find((gp) => gp.productId === productId)
    if (!current) return
    // RLS silently updates 0 rows when unauthenticated — .select() lets us detect it
    const { data, error } = await supabase
      .from('globe_products')
      .update({ enabled: !current.enabled, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .select('product_id')
    if (error || !data?.length) {
      setCmsError(error ? `Save failed: ${error.message}` : 'Save failed — sign in as admin to make changes.')
      return
    }
    setCmsError(null)
    setGlobeProducts((prev) =>
      prev.map((gp) => (gp.productId === productId ? { ...gp, enabled: !gp.enabled } : gp))
    )
  }, [globeProducts])

  const setGlobeProductImage = useCallback(async (productId, imageUrl) => {
    const { data, error } = await supabase
      .from('globe_products')
      .update({ hero_image: imageUrl, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .select('product_id')
    if (error || !data?.length) {
      setCmsError(error ? `Save failed: ${error.message}` : 'Save failed — sign in as admin to make changes.')
      return
    }
    setCmsError(null)
    setGlobeProducts((prev) =>
      prev.map((gp) => (gp.productId === productId ? { ...gp, heroImage: imageUrl } : gp))
    )
  }, [])

  const addReview = useCallback(async (review) => {
    const { data, error } = await supabase
      .from('reviews')
      .insert(toReviewRow(review))
      .select()
      .single()
    if (error) {
      setCmsError(`Could not add review: ${error.message}`)
      return
    }
    setCmsError(null)
    setReviews((prev) => [mapReviewRow(data), ...prev])
  }, [])

  const editReview = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('reviews')
      .update(toReviewRow(updates))
      .eq('id', id)
      .select()
      .single()
    if (error || !data) {
      setCmsError(error ? `Save failed: ${error.message}` : 'Save failed — sign in as admin to make changes.')
      return
    }
    setCmsError(null)
    setReviews((prev) => prev.map((r) => (r.id === id ? mapReviewRow(data) : r)))
  }, [])

  const deleteReview = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .select('id')
    if (error || !data?.length) {
      setCmsError(error ? `Delete failed: ${error.message}` : 'Delete failed — sign in as admin to make changes.')
      return
    }
    setCmsError(null)
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const getProductReviews = useCallback(
    (productId) => reviews.filter((r) => r.productId === productId),
    [reviews]
  )

  const value = {
    globeProducts,
    reviews,
    enabledGlobeProducts: buildEnabledGlobeProducts(globeProducts),
    toggleGlobeProduct,
    setGlobeProductImage,
    addReview,
    editReview,
    deleteReview,
    getProductReviews,
    resetCms: loadAll,
    isRemote: true,
    isLoading,
    cmsError,
    authSession,
    signInAdmin,
    signOutAdmin,
  }

  return <GlobeCmsContext.Provider value={value}>{children}</GlobeCmsContext.Provider>
}

/* ---------- Local provider (localStorage demo mode) ---------- */

function loadFromStorage(key, defaultFn) {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return defaultFn()
}

function LocalGlobeCmsProvider({ children }) {
  const [globeProducts, setGlobeProducts] = useState(() =>
    loadFromStorage(CMS_PRODUCTS_KEY, buildDefaultGlobeProducts)
  )
  const [reviews, setReviews] = useState(() =>
    loadFromStorage(CMS_REVIEWS_KEY, buildDefaultReviews)
  )

  // Persist on change
  useEffect(() => {
    localStorage.setItem(CMS_PRODUCTS_KEY, JSON.stringify(globeProducts))
  }, [globeProducts])

  useEffect(() => {
    localStorage.setItem(CMS_REVIEWS_KEY, JSON.stringify(reviews))
  }, [reviews])

  const toggleGlobeProduct = useCallback((productId) => {
    setGlobeProducts((prev) =>
      prev.map((gp) =>
        gp.productId === productId ? { ...gp, enabled: !gp.enabled } : gp
      )
    )
  }, [])

  const setGlobeProductImage = useCallback((productId, imageUrl) => {
    setGlobeProducts((prev) =>
      prev.map((gp) =>
        gp.productId === productId ? { ...gp, heroImage: imageUrl } : gp
      )
    )
  }, [])

  const addReview = useCallback((review) => {
    const id = 'review-' + Date.now()
    setReviews((prev) => [{ ...review, id, date: new Date().toISOString().split('T')[0] }, ...prev])
  }, [])

  const editReview = useCallback((id, updates) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    )
  }, [])

  const deleteReview = useCallback((id) => {
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const resetCms = useCallback(() => {
    setGlobeProducts(buildDefaultGlobeProducts())
    setReviews(buildDefaultReviews())
  }, [])

  const getProductReviews = useCallback(
    (productId) => reviews.filter((r) => r.productId === productId),
    [reviews]
  )

  const value = {
    globeProducts,
    reviews,
    enabledGlobeProducts: buildEnabledGlobeProducts(globeProducts),
    toggleGlobeProduct,
    setGlobeProductImage,
    addReview,
    editReview,
    deleteReview,
    getProductReviews,
    resetCms,
    isRemote: false,
    isLoading: false,
    cmsError: null,
    authSession: null,
    signInAdmin: async () => {},
    signOutAdmin: async () => {},
  }

  return <GlobeCmsContext.Provider value={value}>{children}</GlobeCmsContext.Provider>
}

export function GlobeCmsProvider({ children }) {
  return isSupabaseConfigured ? (
    <RemoteGlobeCmsProvider>{children}</RemoteGlobeCmsProvider>
  ) : (
    <LocalGlobeCmsProvider>{children}</LocalGlobeCmsProvider>
  )
}

export const useGlobeCms = () => useContext(GlobeCmsContext)
