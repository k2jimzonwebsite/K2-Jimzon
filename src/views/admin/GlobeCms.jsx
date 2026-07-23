import { useState } from 'react'
import { useGlobeCms } from '../../data/globeCms'
import { products } from '../../data/products'
import { StarIcon } from '../../components/ui/icons'

export default function GlobeCms() {
  const [tab, setTab] = useState('products')
  const { isRemote, isLoading, cmsError, authSession, signOutAdmin } = useGlobeCms()

  // Live mode requires an admin session before the CMS tools unlock
  if (isRemote && !authSession) {
    return <AdminSignIn />
  }

  return (
    <div>
      {/* Storage mode banner */}
      <div
        className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5 text-base ${
          isRemote ? 'border-forest/30 bg-forest-wash/40 text-navy' : 'border-gold/40 bg-gold/10 text-navy'
        }`}
      >
        <span>
          {isRemote
            ? 'Live — changes save to Supabase and publish to every visitor.'
            : 'Demo mode — changes save to this browser only. Connect Supabase to publish for everyone.'}
        </span>
        {isRemote && (
          <button
            onClick={signOutAdmin}
            className="rounded-md border border-line bg-white px-3 py-1 text-sm font-medium text-navy-soft hover:bg-shell transition-colors"
          >
            Sign out
          </button>
        )}
      </div>

      {cmsError && (
        <div className="mb-4 rounded-lg border border-crimson/30 bg-crimson-wash px-4 py-2.5 text-base text-crimson">
          {cmsError}
        </div>
      )}

      {isLoading && (
        <div className="mb-4 rounded-lg border border-line bg-shell px-4 py-2.5 text-base text-navy-faint">
          Loading CMS data…
        </div>
      )}

      {/* Sub-tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-shell p-1">
        <button
          onClick={() => setTab('products')}
          className={`flex-1 rounded-md px-4 py-2.5 text-base font-semibold transition-colors ${
            tab === 'products' ? 'bg-white text-navy shadow-card' : 'text-navy-soft hover:text-navy'
          }`}
        >
          Globe Products
        </button>
        <button
          onClick={() => setTab('reviews')}
          className={`flex-1 rounded-md px-4 py-2.5 text-base font-semibold transition-colors ${
            tab === 'reviews' ? 'bg-white text-navy shadow-card' : 'text-navy-soft hover:text-navy'
          }`}
        >
          Reviews Manager
        </button>
      </div>

      {tab === 'products' ? <GlobeProductsPanel /> : <ReviewsPanel />}
    </div>
  )
}

/* ---------- Admin Sign In (Supabase live mode) ---------- */

function AdminSignIn() {
  const { signInAdmin } = useGlobeCms()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signInAdmin(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-line bg-white p-6">
      <h3 className="font-serif text-xl font-semibold">Admin sign in</h3>
      <p className="mt-1 text-base text-navy-faint">
        The globe CMS is live on Supabase. Sign in with your admin account to manage products and reviews.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-semibold uppercase tracking-[0.1em] text-navy-soft">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-crimson focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold uppercase tracking-[0.1em] text-navy-soft">Password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-crimson focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-crimson/30 bg-crimson-wash px-3 py-2 text-base text-crimson">{error}</p>
        )}

        <button
          type="submit" disabled={isSubmitting}
          className="w-full rounded-lg bg-crimson px-5 py-2.5 text-base font-semibold text-white hover:bg-crimson-deep transition-colors disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

/* ---------- Globe Products Panel ---------- */

function GlobeProductsPanel() {
  const { globeProducts, toggleGlobeProduct } = useGlobeCms()

  const enabledCount = globeProducts.filter((gp) => gp.enabled).length

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl font-semibold">Products on Globe</h3>
          <p className="text-base text-navy-faint">
            {enabledCount} of {globeProducts.length} products enabled · These will be distributed across the globe
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {globeProducts.map((gp) => {
          const product = products.find((p) => p.id === gp.productId)
          if (!product) return null
          return (
            <div
              key={gp.productId}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                gp.enabled ? 'border-forest/30 bg-forest-wash/30' : 'border-line bg-white opacity-60'
              }`}
            >
              {/* Product image thumbnail */}
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-shell">
                {product.img ? (
                  <img src={product.img} alt={product.name} className="h-full w-full object-contain p-1" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-sm font-bold text-navy-faint"
                    style={{ backgroundColor: `hsl(${product.hue}, 12%, 92%)` }}
                  >
                    {product.short?.substring(0, 3)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg font-semibold leading-snug truncate">{product.short || product.name}</p>
                <p className="text-sm text-navy-faint">{product.category} · {product.origin}</p>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => toggleGlobeProduct(gp.productId)}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  gp.enabled ? 'bg-forest' : 'bg-navy/15'
                }`}
                aria-label={gp.enabled ? 'Disable on globe' : 'Enable on globe'}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-card transition-all ${
                    gp.enabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Reviews Panel ---------- */

function ReviewsPanel() {
  const { reviews, addReview, editReview, deleteReview } = useGlobeCms()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl font-semibold">Customer Reviews</h3>
          <p className="text-base text-navy-faint">{reviews.length} reviews · Shown on product globe cards</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="rounded-lg bg-crimson px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-crimson-deep"
        >
          + Add Review
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <ReviewForm
          onSave={(data) => { addReview(data); setIsAdding(false) }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id}>
            {editingId === r.id ? (
              <ReviewForm
                initial={r}
                onSave={(data) => { editReview(r.id, data); setEditingId(null) }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start gap-4 rounded-xl border border-line bg-white p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 text-gold">
                      {Array.from({ length: r.stars }).map((_, i) => (
                        <StarIcon key={i} size={11} />
                      ))}
                    </div>
                    <span className="text-sm text-navy-faint">{r.date}</span>
                  </div>
                  <p className="mt-1.5 text-base leading-relaxed text-navy-soft">"{r.text}"</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-base font-semibold text-navy">{r.name}</span>
                    <span className="text-sm text-navy-faint">· {r.channel}</span>
                    {r.item && (
                      <span className="rounded-full bg-shell px-2 py-0.5 text-sm font-medium text-navy-faint">{r.item}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditingId(r.id)}
                    className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-navy-soft hover:bg-shell transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteReview(r.id)}
                    className="rounded-md border border-crimson/20 px-3 py-1.5 text-sm font-medium text-crimson hover:bg-crimson-wash transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Review Form ---------- */

function ReviewForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [channel, setChannel] = useState(initial?.channel ?? 'Shopee · verified')
  const [stars, setStars] = useState(initial?.stars ?? 5)
  const [text, setText] = useState(initial?.text ?? '')
  const [item, setItem] = useState(initial?.item ?? '')
  const [productId, setProductId] = useState(initial?.productId ?? '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !text.trim()) return
    onSave({ name: name.trim(), channel: channel.trim(), stars, text: text.trim(), item: item.trim(), productId: productId || null })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-xl border border-crimson/20 bg-crimson-wash/30 p-5 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold uppercase tracking-[0.1em] text-navy-soft">Reviewer Name</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-crimson focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold uppercase tracking-[0.1em] text-navy-soft">Channel</label>
          <input
            type="text" value={channel} onChange={(e) => setChannel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-crimson focus:outline-none"
            placeholder="Shopee · verified"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold uppercase tracking-[0.1em] text-navy-soft">Product</label>
          <select
            value={productId} onChange={(e) => setProductId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-crimson focus:outline-none"
          >
            <option value="">— General review —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.short || p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold uppercase tracking-[0.1em] text-navy-soft">Item label</label>
          <input
            type="text" value={item} onChange={(e) => setItem(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-crimson focus:outline-none"
            placeholder="e.g. Nutella Biscuits"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold uppercase tracking-[0.1em] text-navy-soft">Rating</label>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s} type="button" onClick={() => setStars(s)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                s <= stars ? 'border-gold bg-gold/10 text-gold' : 'border-line bg-white text-navy-faint'
              }`}
            >
              <StarIcon size={16} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold uppercase tracking-[0.1em] text-navy-soft">Review text</label>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} required rows={3}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base leading-relaxed focus:border-crimson focus:outline-none resize-none"
          placeholder="What did the customer say?"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="rounded-lg bg-crimson px-5 py-2.5 text-base font-semibold text-white hover:bg-crimson-deep transition-colors"
        >
          {initial ? 'Save Changes' : 'Add Review'}
        </button>
        <button
          type="button" onClick={onCancel}
          className="rounded-lg border border-line px-5 py-2.5 text-base font-medium text-navy-soft hover:bg-shell transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
