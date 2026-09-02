import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { products } from './products'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/lazySupabaseClient'
import { safeUiError } from '../lib/safeUiError'

const CMS_PRODUCTS_KEY = 'k2_globe_products'
const CMS_REVIEWS_KEY = 'k2_globe_reviews'
const CMS_VERSION_KEY = 'k2_globe_version'
const CMS_VERSION = '4' // bump to clear stale localStorage on deploy

const GlobeCmsContext = createContext(null)

function SecureAdminGlobeCmsProvider({ children }) {
  const unavailable = async () => {}
  return <GlobeCmsContext.Provider value={{
    globeProducts: [], reviews: [], enabledGlobeProducts: [],
    toggleGlobeProduct: unavailable, setGlobeProductImage: unavailable,
    addReview: unavailable, editReview: unavailable, deleteReview: unavailable,
    getProductReviews: () => [], resetCms: unavailable,
    isRemote: false, isLoading: false, cmsError: null, authSession: null,
    signInAdmin: unavailable, signOutAdmin: unavailable,
  }}>{children}</GlobeCmsContext.Provider>
}

// Only these product IDs have real customer reviews and should appear on the globe
const GLOBE_PRODUCT_IDS = [
  'rio-mare',
  'lavazza-dek',
  'lindt-bianco',
  'suddenly-fragrance',
  'lotus-biscoff',
  'pringles-paprika',
]

// Seed globe product entries — only enable products that have real reviews
function buildDefaultGlobeProducts() {
  return products.map((p) => ({
    productId: p.id,
    enabled: GLOBE_PRODUCT_IDS.includes(p.id),
    heroImage: p.img, // use the product catalog image by default
    displayOrder: GLOBE_PRODUCT_IDS.indexOf(p.id),
  }))
}

/**
 * Sample reviews, loaded only if the table is empty.
 *
 * Imported dynamically from its own module so the copy lands in the globe's
 * deferred chunk rather than the landing bundle, which sits inside 1 kB of its
 * 150 kB gzip budget. A static import here, or adding these to `site.js`, puts
 * them on every first paint of the home page.
 */
async function buildDefaultReviews() {
  const { GLOBE_SEED_REVIEWS } = await import('./globeSeedReviews')
  return GLOBE_SEED_REVIEWS.map((r, i) => ({ ...r, id: `seed-review-${i}` }))
}


// Computed: enabled products enriched with catalog data
/**
 * The products the globe shows.
 *
 * `enabled` on the database row is the owner's own choice, made in the Admin
 * Globe CMS. That is the curation, and it is what this honours.
 *
 * It used to intersect that with GLOBE_PRODUCT_IDS as well — a hardcoded list of
 * six written when those were the only items with reviews. The database now
 * holds seventeen enabled rows, only two of which appear in that list, so
 * fifteen products the owner had switched on were silently vetoed by a constant.
 * The list stays, but only where it belongs: seeding defaults when there is no
 * database to ask.
 *
 * Ordering comes from `display_order`, which is the field the CMS actually
 * writes when the owner reorders the globe. Sorting by position in a hardcoded
 * array ignored that entirely.
 */
function buildEnabledGlobeProducts(globeProducts) {
  return globeProducts
    .filter((gp) => gp.enabled)
    .slice()
    .sort((a, b) => {
      const left = Number.isFinite(a.displayOrder) ? a.displayOrder : Number.MAX_SAFE_INTEGER
      const right = Number.isFinite(b.displayOrder) ? b.displayOrder : Number.MAX_SAFE_INTEGER
      return left - right
    })
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
  const [supabase, setSupabase] = useState(null)
  const [globeProducts, setGlobeProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [cmsError, setCmsError] = useState(null)
  const [authSession, setAuthSession] = useState(null)

  useEffect(() => {
    let active = true
    getSupabaseClient()
      .then(client => { if (active) setSupabase(client) })
      .catch(() => {
        if (!active) return
        setCmsError(safeUiError('GLOBE_LOAD_FAILED'))
        setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  const loadAll = useCallback(async () => {
    if (!supabase) return
    setIsLoading(true)
    const [gpRes, rvRes] = await Promise.all([
      supabase.from('globe_products').select('*').order('display_order'),
      supabase.from('reviews').select('id,product_id,name,channel,stars,text,item,review_date,created_at').order('created_at', { ascending: false }),
    ])
    const errors = []

    // The 3D product sphere is part of the storefront experience, so a review
    // query failure must not remove the entire section. The fallback below is
    // display configuration only; review copy always remains database-backed.
    if (gpRes.error) {
      errors.push(safeUiError('GLOBE_LOAD_FAILED'))
      setGlobeProducts(buildDefaultGlobeProducts())
    } else {
      setGlobeProducts(
        gpRes.data.length ? gpRes.data.map(mapGlobeProductRow) : buildDefaultGlobeProducts()
      )
    }

    // Reviews fall back the same way the globe products above already do.
    // An empty table is not the same as a broken one, but it produces the same
    // screen: a review globe with nothing to read. The seed set in site.js is
    // eight real published marketplace reviews already mapped to products, so
    // the experience can be exercised end to end before the table is populated.
    if (rvRes.error) {
      errors.push(safeUiError('GLOBE_LOAD_FAILED'))
      setReviews(await buildDefaultReviews())
    } else {
      setReviews(rvRes.data.length ? rvRes.data.map(mapReviewRow) : await buildDefaultReviews())
    }

    setCmsError(errors.length ? `Could not load all review data (${errors.join('; ')})` : null)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Track admin auth session for CMS write access
  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data }) => setAuthSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  const signInAdmin = useCallback(async (email, password) => {
    if (!supabase) throw new Error(safeUiError('ADMIN_SIGN_IN_FAILED'))
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(safeUiError('ADMIN_SIGN_IN_FAILED'))
  }, [supabase])

  const signOutAdmin = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [supabase])

  const toggleGlobeProduct = useCallback(async (productId) => {
    if (!supabase) { setCmsError(safeUiError('GLOBE_SAVE_FAILED')); return }
    const current = globeProducts.find((gp) => gp.productId === productId)
    if (!current) return
    // RLS silently updates 0 rows when unauthenticated — .select() lets us detect it
    const { data, error } = await supabase
      .from('globe_products')
      .update({ enabled: !current.enabled, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .select('product_id')
    if (error || !data?.length) {
      setCmsError(error ? safeUiError('GLOBE_SAVE_FAILED') : 'Save failed — sign in as admin to make changes.')
      return
    }
    setCmsError(null)
    setGlobeProducts((prev) =>
      prev.map((gp) => (gp.productId === productId ? { ...gp, enabled: !gp.enabled } : gp))
    )
  }, [globeProducts, supabase])

  const setGlobeProductImage = useCallback(async (productId, imageUrl) => {
    if (!supabase) { setCmsError(safeUiError('GLOBE_SAVE_FAILED')); return }
    const { data, error } = await supabase
      .from('globe_products')
      .update({ hero_image: imageUrl, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .select('product_id')
    if (error || !data?.length) {
      setCmsError(error ? safeUiError('GLOBE_SAVE_FAILED') : 'Save failed — sign in as admin to make changes.')
      return
    }
    setCmsError(null)
    setGlobeProducts((prev) =>
      prev.map((gp) => (gp.productId === productId ? { ...gp, heroImage: imageUrl } : gp))
    )
  }, [supabase])

  const addReview = useCallback(async (review) => {
    if (!supabase) { setCmsError(safeUiError('GLOBE_SAVE_FAILED')); return }
    const { data, error } = await supabase
      .from('reviews')
      .insert(toReviewRow(review))
      .select()
      .single()
    if (error) {
      setCmsError(safeUiError('GLOBE_SAVE_FAILED'))
      return
    }
    setCmsError(null)
    setReviews((prev) => [mapReviewRow(data), ...prev])
  }, [supabase])

  const editReview = useCallback(async (id, updates) => {
    if (!supabase) { setCmsError(safeUiError('GLOBE_SAVE_FAILED')); return }
    const { data, error } = await supabase
      .from('reviews')
      .update(toReviewRow(updates))
      .eq('id', id)
      .select()
      .single()
    if (error || !data) {
      setCmsError(error ? safeUiError('GLOBE_SAVE_FAILED') : 'Save failed — sign in as admin to make changes.')
      return
    }
    setCmsError(null)
    setReviews((prev) => prev.map((r) => (r.id === id ? mapReviewRow(data) : r)))
  }, [supabase])

  const deleteReview = useCallback(async (id) => {
    if (!supabase) { setCmsError(safeUiError('GLOBE_SAVE_FAILED')); return }
    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .select('id')
    if (error || !data?.length) {
      setCmsError(error ? safeUiError('GLOBE_SAVE_FAILED') : 'Delete failed — sign in as admin to make changes.')
      return
    }
    setCmsError(null)
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }, [supabase])

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

function clearStaleLocalStorage() {
  try {
    if (localStorage.getItem(CMS_VERSION_KEY) !== CMS_VERSION) {
      localStorage.removeItem(CMS_PRODUCTS_KEY)
      localStorage.removeItem(CMS_REVIEWS_KEY)
      localStorage.setItem(CMS_VERSION_KEY, CMS_VERSION)
    }
  } catch { /* ignore */ }
}

function LocalGlobeCmsProvider({ children }) {
  // Clear stale cache whenever CMS_VERSION bumps
  clearStaleLocalStorage()

  const [globeProducts, setGlobeProducts] = useState(() =>
    loadFromStorage(CMS_PRODUCTS_KEY, buildDefaultGlobeProducts)
  )
  // The seed is loaded lazily to keep it out of the landing bundle, so it
  // cannot be read during the initial render. Stored reviews still appear
  // immediately; a first run fills in once the seed resolves.
  const [reviews, setReviews] = useState(() => loadFromStorage(CMS_REVIEWS_KEY, () => []))
  useEffect(() => {
    let active = true
    if (reviews.length) return undefined
    buildDefaultReviews().then((seed) => { if (active) setReviews(seed) })
    return () => { active = false }
    // Seeding runs once, on a first visit with nothing stored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    buildDefaultReviews().then(setReviews)
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

export function GlobeCmsProvider({ children, secureAdmin = false }) {
  if (__K2_ADMIN_BUILD__ || secureAdmin) return <SecureAdminGlobeCmsProvider>{children}</SecureAdminGlobeCmsProvider>
  if (isSupabaseConfigured) return <RemoteGlobeCmsProvider>{children}</RemoteGlobeCmsProvider>
  if (import.meta.env.DEV) return <LocalGlobeCmsProvider>{children}</LocalGlobeCmsProvider>
  return <GlobeCmsContext.Provider value={{
    globeProducts: [], reviews: [], enabledGlobeProducts: [], isLoading: false,
    cmsError: 'Supabase is not configured.', toggleGlobeProduct: async () => {},
    setGlobeProductImage: async () => {}, addReview: async () => {},
    editReview: async () => {}, deleteReview: async () => {},
    getProductReviews: () => [], signInAdmin: async () => {}, signOutAdmin: async () => {},
  }}>{children}</GlobeCmsContext.Provider>
}

export const useGlobeCms = () => useContext(GlobeCmsContext)
