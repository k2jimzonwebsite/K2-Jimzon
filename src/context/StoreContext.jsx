import { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import {
  ADMIN_ROUTE,
  buildAdminOAuthRedirectUrl,
  clearAdminOAuthReturn,
  consumeAdminOAuthReturn,
  rememberAdminOAuthReturn,
} from '../lib/adminAuthRedirect'
import { products as localProducts } from '../data/products'

const StoreContext = createContext(null)

const INITIAL_COUPONS = []

// Shown when a product has no photo of its own. Never borrow another
// product's image just to fill the frame.
const PLACEHOLDER_IMG = '/images/placeholder.svg'

export function StoreProvider({ children }) {
  const [view, setView] = useState('home')
  const [productId, setProductId] = useState(null)
  const [cart, setCart] = useState([])
  const [isWholesale, setIsWholesale] = useState(false)
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  
  const [cartOpen, setCartOpen] = useState(false)
  const [order, setOrder] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [requests, setRequests] = useState([])
  const [conversations, setConversations] = useState([])
  const [inboxState, setInboxState] = useState({ loading: true, error: '', phase2Ready: true })
  const [dbProducts, setDbProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Coupons & Voucher Hunt state
  const [coupons, setCoupons] = useState(() => {
    try {
      const saved = localStorage.getItem('k2_coupons')
      return saved ? JSON.parse(saved) : INITIAL_COUPONS
    } catch (e) {
      return INITIAL_COUPONS
    }
  })

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
      localStorage.setItem('k2_coupons', JSON.stringify(coupons))
    } catch (e) {}
  }, [coupons])

  useEffect(() => {
    try {
      localStorage.setItem('k2_claimed_vouchers', JSON.stringify(claimedVouchers))
    } catch (e) {}
  }, [claimedVouchers])

  const createCoupon = (newCouponData) => {
    const coupon = {
      id: 'c_' + Date.now(),
      code: newCouponData.code.toUpperCase().trim(),
      description: newCouponData.description || 'Exclusive Promotional Voucher',
      type: newCouponData.type || 'percentage',
      value: Number(newCouponData.value) || 10,
      minSpend: Number(newCouponData.minSpend) || 0,
      maxUses: Number(newCouponData.maxUses) || 100,
      usedCount: 0,
      expiryDate: newCouponData.expiryDate || '2026-12-31',
      isHunt: Boolean(newCouponData.isHunt),
      clue: newCouponData.clue || '',
      isActive: true,
    }
    setCoupons(prev => [coupon, ...prev])
    return coupon
  }

  const toggleCouponStatus = (couponId) => {
    setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, isActive: !c.isActive } : c))
  }

  const deleteCoupon = (couponId) => {
    setCoupons(prev => prev.filter(c => c.id !== couponId))
    if (appliedCoupon && appliedCoupon.id === couponId) {
      setAppliedCoupon(null)
    }
  }

  const claimCoupon = (codeStr) => {
    const cleanCode = codeStr.toUpperCase().trim()
    const found = coupons.find(c => c.code === cleanCode && c.isActive)
    if (!found) {
      return { success: false, message: 'Invalid or expired coupon code!' }
    }
    if (!claimedVouchers.includes(cleanCode)) {
      setClaimedVouchers(prev => [...prev, cleanCode])
    }
    return { success: true, message: `🎉 Voucher ${cleanCode} claimed into your wallet!`, coupon: found }
  }

  const applyCoupon = (codeStr) => {
    const cleanCode = codeStr.toUpperCase().trim()
    const found = coupons.find(c => c.code === cleanCode && c.isActive)
    if (!found) {
      return { success: false, message: 'Invalid or expired promo code!' }
    }
    const currentSubtotal = cart.reduce((sum, line) => {
      const product = getProduct(line.id)
      if (!product) return sum
      const price = isWholesale ? product.wholesale : product.retail
      return sum + price * line.qty
    }, 0)

    if (currentSubtotal < found.minSpend) {
      return { success: false, message: `Minimum spend of ₱${found.minSpend.toLocaleString()} required for ${cleanCode}!` }
    }
    setAppliedCoupon(found)
    return { success: true, message: `✓ Applied ${found.code} (${found.type === 'percentage' ? found.value + '%' : '₱' + found.value} OFF)!`, coupon: found }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
  }

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

  const loginWithGoogle = async () => {
    if (!supabase) {
      return { ok: false, error: 'Backend not configured.' }
    }

    rememberAdminOAuthReturn()
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildAdminOAuthRedirectUrl()
        }
      })
      if (error) throw error
      return { ok: true }
    } catch (err) {
      clearAdminOAuthReturn()
      return { ok: false, error: err.message || 'Failed to initialize Google sign-in.' }
    }
  }

  // ── Real, role-based auth. Admin access = a live Supabase session whose
  //    user_profiles.role is Admin or Staff. No passcodes, no localStorage
  //    "admin=true" flag, no password fallbacks — those were security holes.
  const STAFF_ROLES = ['Admin', 'Staff', 'SuperAdmin']
  const isStaffRole = (r) => STAFF_ROLES.includes(r)

  const resolveRole = async (u) => {
    if (!supabase || !u) return null
    const { data } = await supabase.from('user_profiles').select('role').eq('id', u.id).single()
    return data?.role || null
  }

  const applyAdminSession = (u, role) => {
    setIsAdmin(true)
    setIsWholesale(true)
    setUser({ ...u, role })
  }

  const loginAdmin = async ({ email, password }) => {
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    if (!email || !password) return { ok: false, error: 'Enter your email and password.' }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data?.user) return { ok: false, error: error?.message || 'Invalid email or password.' }

    // Does this account require a 2FA step-up (aal1 -> aal2)?
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        return { ok: false, mfaRequired: true }
      }
    } catch (e) { /* MFA not available — continue */ }

    const role = await resolveRole(data.user)
    if (!isStaffRole(role)) {
      await supabase.auth.signOut()
      return { ok: false, error: 'This account has no admin access.' }
    }
    applyAdminSession(data.user, role)
    return { ok: true }
  }

  // Second factor: verify the 6-digit code from the authenticator app.
  const challengeMfa = async (code) => {
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totp = factors?.totp?.find((f) => f.status === 'verified') || factors?.totp?.[0]
    if (!totp) return { ok: false, error: 'No authenticator enrolled on this account.' }
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
    if (cErr) return { ok: false, error: cErr.message }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code })
    if (vErr) return { ok: false, error: vErr.message }

    const { data: u } = await supabase.auth.getUser()
    const role = await resolveRole(u?.user)
    if (!isStaffRole(role)) { await supabase.auth.signOut(); return { ok: false, error: 'No admin access.' } }
    applyAdminSession(u.user, role)
    return { ok: true }
  }

  // Enroll THIS admin's authenticator (returns a QR to scan).
  const enrollMfa = async () => {
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) return { ok: false, error: error.message }
    return { ok: true, factorId: data.id, qr: data.totp?.qr_code, secret: data.totp?.secret }
  }

  const verifyMfaEnroll = async (factorId, code) => {
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    const { data: ch, error } = await supabase.auth.mfa.challenge({ factorId })
    if (error) return { ok: false, error: error.message }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code })
    if (vErr) return { ok: false, error: vErr.message }
    return { ok: true }
  }

  // Admin invites a staff member; the backend function re-checks the caller role.
  const inviteStaff = async (email, role = 'Staff') => {
    if (!supabase) return { ok: false, error: 'Backend not configured.' }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { ok: false, error: 'You must be signed in.' }

    const cleanEmail = email.trim().toLowerCase()
    
    // Check if the target user profile already exists in user_profiles
    const { data: existingProf } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (existingProf) {
      const { error: updateErr } = await supabase.rpc('set_user_role', {
        p_user_id: existingProf.id,
        p_role: role,
      })

      if (updateErr) return { ok: false, error: updateErr.message }
      return { ok: true, note: `Updated role for ${cleanEmail} to ${role}.` }
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-staff`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email: cleanEmail, role, redirectTo: window.location.origin }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = out.error || 'Invite failed.'
        if (/rate limit/i.test(errMsg)) {
          return { 
            ok: false, 
            error: `Supabase email sending limit was reached. Wait for the limit to reset, or have ${cleanEmail} sign in once and then assign the intended role from Staff & roles.`
          }
        }
        return { ok: false, error: errMsg }
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message || 'Invite failed.' }
    }
  }

  const logoutAdmin = async () => {
    setIsAdmin(false)
    setUser(null)
    if (supabase) await supabase.auth.signOut()
  }

  useEffect(() => {
    fetchProducts()
    fetchConversations()
    checkUser()

    if (!supabase) return;

    const productsChannel = supabase
      .channel('public:products:store')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe()

    const convosChannel = supabase
      .channel('public:conversations:store')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchConversations)
      .subscribe()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user)
      if (session?.user) fetchConversations()
      else setConversations([])
    })

    return () => {
      supabase.removeChannel(productsChannel)
      supabase.removeChannel(convosChannel)
      subscription?.unsubscribe()
    }
  }, [])

  const checkUser = async (authUser = null) => {
    if (!supabase) {
      setIsAdmin(false)
      setUser(null)
      setAuthReady(true)
      return
    }
    try {
      const u = authUser || (await supabase.auth.getUser()).data?.user
      if (!u) { setIsAdmin(false); setUser(null); return }

      // If the account has 2FA, admin access requires the aal2 step-up to be done.
      let mfaSatisfied = true
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) mfaSatisfied = false
      } catch (e) { /* ignore */ }

      const role = await resolveRole(u)
      setUser({ ...u, role })
      if (isStaffRole(role)) {
        // Supabase falls back to SITE_URL when redirectTo is not allowlisted.
        // Recover only OAuth attempts that started from this admin login.
        const returnTo = consumeAdminOAuthReturn()
        if (returnTo === ADMIN_ROUTE && window.location.pathname !== ADMIN_ROUTE) {
          window.location.replace(returnTo)
        }
      }

      if (isStaffRole(role) && mfaSatisfied) {
        setIsAdmin(true)
        setIsWholesale(true)
      } else {
        setIsAdmin(false)
        if (!isStaffRole(role)) clearAdminOAuthReturn()
        if (role === 'VIP') setIsWholesale(true)
      }
    } catch (err) {
      console.warn('checkUser auth error:', err)
      setIsAdmin(false)
    } finally {
      setAuthReady(true)
    }
  }

  const fetchProducts = async () => {
    if (!supabase) { setLoading(false); return }
    // Unlisted is fetched too: it must resolve by direct link even though it
    // never appears in browse surfaces. `listedProducts` below is what the
    // catalogue, search and category grids read.
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('status', ['Live', 'Active', 'Unlisted'])

    if (!error && data) {
      setDbProducts(data)
    }
    setLoading(false)
  }

  const fetchConversations = async () => {
    if (!supabase) {
      setConversations([])
      setInboxState({ loading: false, error: 'Database connection is unavailable.', phase2Ready: false })
      return
    }
    setInboxState(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const phase2Result = await supabase
        .from('conversations')
        .select(`
          id,
          customer_name,
          platform,
          status,
          priority,
          unread_count,
          assigned_to,
          response_due_at,
          last_inbound_at,
          last_read_at,
          resolved_at,
          last_message_at,
          assigned_profile:user_profiles!conversations_assigned_to_fkey (
            id,
            full_name,
            email
          ),
          messages (
            id,
            sender_type,
            content,
            is_draft,
            delivery_status,
            sent_at,
            failure_reason,
            created_at
          )
        `)
        .order('last_message_at', { ascending: false })

      let data = phase2Result.data
      let phase2Ready = !phase2Result.error
      let warning = ''

      if (phase2Result.error) {
        const legacyResult = await supabase
          .from('conversations')
          .select(`
            id,
            customer_name,
            platform,
            status,
            last_message_at,
            messages (id, sender_type, content, is_draft, created_at)
          `)
          .order('last_message_at', { ascending: false })

        if (legacyResult.error) throw legacyResult.error
        data = legacyResult.data
        warning = 'Phase 2 inbox controls are not active in the database yet. Read-only legacy view is shown.'
      }

      const formatted = (data || []).map(c => ({
          id: c.id,
          customer: c.customer_name,
          channel: c.platform,
          status: c.status || 'Open',
          priority: c.priority || 'normal',
          unreadCount: Number(c.unread_count || 0),
          unread: Number(c.unread_count || 0) > 0,
          assignedTo: c.assigned_to || null,
          assignedName: c.assigned_profile?.full_name || c.assigned_profile?.email || '',
          responseDueAt: c.response_due_at || null,
          lastInboundAt: c.last_inbound_at || null,
          lastReadAt: c.last_read_at || null,
          resolvedAt: c.resolved_at || null,
          lastMessageAt: c.last_message_at || null,
          time: c.last_message_at ? new Date(c.last_message_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No activity',
          messages: (c.messages || [])
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map(m => ({
              id: m.id,
              sender: m.sender_type === 'Customer' ? 'customer' : m.sender_type === 'AI' ? 'ai' : 'agent',
              senderType: m.sender_type,
              text: m.content,
              isDraft: Boolean(m.is_draft),
              deliveryStatus: m.delivery_status || (m.sender_type === 'Customer' ? 'received' : 'internal_only'),
              sentAt: m.sent_at || null,
              failureReason: m.failure_reason || '',
              createdAt: m.created_at,
            })),
          intent: 'general'
        }))

      setConversations(formatted)
      setInboxState({ loading: false, error: warning, phase2Ready })
    } catch (e) {
      console.warn("Failed to fetch conversations from Supabase:", e)
      setConversations([])
      setInboxState({ loading: false, error: e?.message || 'Inbox records could not be loaded.', phase2Ready: false })
    }
  }

  // Merge the rich local data (images, hue, guide) with the live pricing and stock from Supabase
  const products = useMemo(() => {
    // No live data yet: serve local mockups, but normalize them to the same
    // field shape DB products use so every consumer works either way.
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
      // Match a local mockup ONLY when it genuinely corresponds to this SKU.
      // This used to fall back to localProducts[i % length], which handed a real
      // product another product's photo, brand, description and usage guide —
      // e.g. "Nutella Biscuits 304g" rendered as a Caffè Milano espresso bag.
      // A wrong photo on a live listing is worse than a missing one.
      const localP = localProducts.find(lp =>
        lp.id.toLowerCase() === dbP.sku.toLowerCase()
      ) || null

      return {
        ...(localP || {}), // rich UI data, only when it's really this product
        category: dbP.origin?.startsWith('Shopee|') ? dbP.origin.split('|')[1] : (dbP.origin === 'Shopee' ? 'Shopee Imports' : (localP?.category ?? 'Uncategorised')),
        sku: dbP.sku,
        id: dbP.sku, // alias for legacy components
        name: dbP.name,
        img: dbP.primary_image_url || dbP.secondary_images?.[0] || localP?.img || PLACEHOLDER_IMG,
        afterImage: dbP.lifestyle_images?.[0] || dbP.secondary_images?.[1] || localP?.afterImage || null,
        gallery: (dbP.secondary_images?.length ? dbP.secondary_images : null) || localP?.gallery || [],
        srp: Number(dbP.srp),
        retail: Number(dbP.srp), // alias
        wholesale_price: Number(dbP.wholesale_price),
        wholesale: Number(dbP.wholesale_price), // alias
        stock_available: dbP.stock_available,
        stock: dbP.stock_available, // alias
        why_buy: dbP.why_buy || localP?.whyBuy || null,
        usage_instructions: dbP.usage_instructions,
        ingredients: dbP.ingredients || localP?.ingredients || null,
        allergens: dbP.allergens || localP?.allergens || null,
        net_weight: dbP.net_weight || localP?.net_weight || null,
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

  // Browse set — everything a customer can stumble across by clicking around.
  // Unlisted products are deliberately absent: reachable only if you already
  // have the link. `products` stays the full set so getProduct() still resolves
  // them and existing cart lines keep working.
  const listedProducts = useMemo(
    () => products.filter(p => p.status !== 'Unlisted'),
    [products]
  )

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

  const sendMessage = async (convoId, text, sender) => {
    if (!supabase) return { ok: false, error: 'Database connection is unavailable.' }
    const isUuid = typeof convoId === 'string' && convoId.includes('-') && convoId.length > 10
    if (!isUuid) return { ok: false, error: 'This conversation is not a persisted database record.' }

    if (sender === 'customer') return { ok: false, error: 'Customer messaging is not connected.' }
    const { error: messageError } = await supabase.rpc('append_internal_message', {
      p_conversation_id: convoId,
      p_content: text,
    })
    if (messageError) return { ok: false, error: messageError.message }
    await fetchConversations()
    return { ok: true }
  }

  const markConversationRead = async (convoId) => {
    if (!supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (!inboxState.phase2Ready) return { ok: false, error: 'Phase 2 inbox controls are not active yet.' }

    const { error } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: convoId,
    })
    if (error) return { ok: false, error: error.message }

    setConversations(prev => prev.map(c => c.id === convoId
      ? { ...c, unread: false, unreadCount: 0, lastReadAt: new Date().toISOString() }
      : c))
    return { ok: true }
  }

  const updateConversationWorkflow = async (convoId, workflow) => {
    if (!supabase) return { ok: false, error: 'Database connection is unavailable.' }
    if (!inboxState.phase2Ready) return { ok: false, error: 'Phase 2 inbox controls are not active yet.' }

    const { error } = await supabase.rpc('update_conversation_workflow', {
      p_conversation_id: convoId,
      p_status: workflow.status,
      p_priority: workflow.priority,
      p_assigned_to: workflow.assignedTo || null,
      p_response_due_at: workflow.responseDueAt || null,
      p_reason: workflow.reason?.trim() || null,
    })
    if (error) return { ok: false, error: error.message }

    await fetchConversations()
    return { ok: true }
  }

  const addRequest = async (payload) => {
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

    if (error) return { ok: false, error: error.message || 'The request could not be saved.' }
    const saved = Array.isArray(data) ? data[0] : data
    if (!saved?.public_reference) return { ok: false, error: 'The request was not confirmed by the server.' }

    setRequests(prev => [{
      id: saved.public_reference,
      item: payload.item.trim(),
      status: 'Request received',
      eta: 'Quote review within 24 hours',
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
      if (appliedCoupon.type === 'percentage') {
        couponDiscount = Math.round((subtotal * appliedCoupon.value) / 100)
      } else {
        couponDiscount = Math.min(appliedCoupon.value, subtotal)
      }
    }

    const finalTotal = Math.max(0, subtotal - couponDiscount)

    return { lines, subtotal, count, wholesaleSavings: retailTotal - subtotal, couponDiscount, finalTotal }
  }, [cart, isWholesale, products, appliedCoupon])

  const placingOrderRef = useRef(false)

  const placeOrder = async (customerDetails = {}) => {
    // Idempotency guard: block double-submit (double-click / slow network) so a
    // single checkout can't create duplicate orders or double-decrement stock.
    if (placingOrderRef.current) return
    placingOrderRef.current = true
    try {
      return await runPlaceOrderRequest(customerDetails)
    } finally {
      placingOrderRef.current = false
    }
  }

  const runPlaceOrderRequest = async (customerDetails) => {
    if (!supabase) {
      return { ok: false, error: 'Order requests are not configured yet. Please contact K2 Jimzon directly.' }
    }

    const items = totals.lines.map(line => ({ sku: line.id, quantity: line.qty }))
    const requestKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `web-${Date.now()}-${Math.random().toString(16).slice(2)}`

    const { data, error } = await supabase.rpc('submit_order_request', {
      p_customer_name: customerDetails.name?.trim(),
      p_customer_email: customerDetails.email?.trim() || null,
      p_customer_phone: customerDetails.phone?.trim() || null,
      p_delivery_address: customerDetails.address?.trim(),
      p_fulfillment_method: customerDetails.fulfillmentMethod || 'Metro Manila delivery',
      p_customer_note: customerDetails.note?.trim() || null,
      p_items: items,
      p_idempotency_key: requestKey,
    })

    if (error) return { ok: false, error: error.message || 'The order request could not be saved.' }
    const saved = Array.isArray(data) ? data[0] : data
    if (!saved?.public_reference) return { ok: false, error: 'The server did not confirm the request.' }

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
    setQty,
    cartOpen,
    setCartOpen,
    isWholesale,
    setIsWholesale,
    isAdmin,
    authReady,
    loginAdmin,
    loginWithGoogle,
    logoutAdmin,
    challengeMfa,
    enrollMfa,
    verifyMfaEnroll,
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
    products, // Full set incl. Unlisted — for lookups by id, cart, admin
    listedProducts, // Browse set — Unlisted removed. Use this for any grid.
    loading,
    getProduct,
    isDark,
    toggleDarkMode,
    coupons,
    appliedCoupon,
    claimedVouchers,
    createCoupon,
    toggleCouponStatus,
    deleteCoupon,
    claimCoupon,
    applyCoupon,
    removeCoupon,
    ...totals,
  }), [view, productId, cart, cartOpen, isWholesale, isAdmin, authReady, user, order, query, category, requests, conversations, inboxState, products, listedProducts, loading, totals, isDark, coupons, appliedCoupon, claimedVouchers])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
