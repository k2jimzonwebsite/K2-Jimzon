import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../interactive-store.css'
import { useStore } from '../context/StoreContext'
import { buildShelves, stockState } from '../components/shop/shelfModel'
import StoreKeeper from '../components/shop/StoreKeeper'
import StoreSidePanel from '../components/shop/StoreSidePanel'
import StoreSheet from '../components/shop/StoreSheet'
import StoreChatPanel from '../components/shop/StoreChatPanel'
import StoreFaqPanel from '../components/shop/StoreFaqPanel'
import StoreSeoPanel from '../components/shop/StoreSeoPanel'
import StoreBasketDock from '../components/shop/StoreBasketDock'
import { deriveStoreMoment } from '../components/shop/storeGuideState'
import { buildStaffHandoffContext } from '../lib/productKnowledge'

/**
 * MAP-027 — the virtual store, as its own full-frame room.
 *
 * The catalog remains the default and primary shopping surface. This is a
 * separate place a customer chooses to enter: it takes the whole viewport, drops
 * the site chrome, and has one way out. It is a presentation layer only — same
 * catalog projection, same basket, same product page, same Pasabuy flow, same
 * approved knowledge. It owns no inventory and no second cart.
 *
 * The 3D scene is loaded lazily inside this already-lazy route, so a visitor who
 * never enters the store never downloads three.js. When WebGL is unavailable or
 * the visitor prefers reduced motion, the scene is skipped entirely and the
 * shelf reads as a list — which is rendered either way, and is the real
 * interface for keyboard and screen-reader use.
 */

const ShelfScene3D = lazy(() => import('../components/shop/ShelfScene3D'))

/** A failed WebGL context must not blank the store. */
class SceneBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onFailure?.()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function detectWebgl() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}

export default function InteractiveShop() {
  const {
    listedProducts, loading, addToCart, openProduct, go,
    requestPasabuyItem, lines, subtotal, isDark, toggleDarkMode,
  } = useStore()

  const [shelfIndex, setShelfIndex] = useState(0)
  const [selectedSku, setSelectedSku] = useState(null)
  const [sceneReady, setSceneReady] = useState(null)
  // Which overlay is open, if any. One at a time: two stacked dialogs over a
  // 3D scene is a focus trap fighting another focus trap.
  const [sheet, setSheet] = useState(null)
  const [chatSeed, setChatSeed] = useState(null)
  // Each press is a fresh object so the scene sees a new value even when the
  // customer zooms the same direction twice.
  const [zoomRequest, setZoomRequest] = useState(null)
  const zoomBy = useCallback(
    (direction) => setZoomRequest({ direction, at: Date.now() }),
    [],
  )
  const resetZoom = useCallback(() => setZoomRequest({ reset: true, at: Date.now() }), [])
  const storeHeadingRef = useRef(null)
  const handleSceneFailure = useCallback(() => setSceneReady(false), [])
  const closeSheet = useCallback(() => setSheet(null), [])
  const clearChatSeed = useCallback(() => setChatSeed(null), [])

  const leaveStore = useCallback(() => {
    go('catalog', {
      focusSelector: '[data-k2-store-entry]',
    })
  }, [go])

  const shelves = useMemo(() => buildShelves(listedProducts), [listedProducts])
  const activeIndex = shelves.length ? Math.min(shelfIndex, shelves.length - 1) : 0
  const activeShelf = shelves[activeIndex] || null

  // Every bay is rendered so the camera can travel the run, which means a
  // customer can click an item in a neighbouring bay. Selection therefore
  // searches the whole aisle, not just the shelf currently in view.
  const selectedProduct = useMemo(() => {
    if (!selectedSku) return null
    for (const shelf of shelves) {
      const found = shelf.products.find(p => (p.sku || p.id) === selectedSku)
      if (found) return found
    }
    return null
  }, [selectedSku, shelves])

  /** Select a product and bring its bay into view if it is not the active one. */
  const handleSelect = (product) => {
    const id = product?.sku || product?.id
    if (!id) return
    setSelectedSku(id)
    const owningIndex = shelves.findIndex(shelf =>
      shelf.products.some(p => (p.sku || p.id) === id),
    )
    if (owningIndex >= 0 && owningIndex !== activeIndex) setShelfIndex(owningIndex)
  }

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const decide = () => setSceneReady(!calm.matches && detectWebgl())
    decide()
    calm.addEventListener('change', decide)
    return () => calm.removeEventListener('change', decide)
  }, [])

  // The store owns the viewport while it is open. Restoring the previous value
  // rather than clearing it avoids stomping on whatever the page had set.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    storeHeadingRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKey = event => {
      if (event.key !== 'Escape') return
      // An open sheet handles its own Escape and stops it reaching here. This
      // guard covers the case where the event arrives anyway: closing a panel
      // must never be what walks the customer out of the store.
      if (sheet) return
      event.preventDefault()
      leaveStore()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leaveStore, sheet])

  // Concept §3: K2 reacts when something goes in the basket. A short
  // acknowledgement, not a persistent animation on a frequent action.
  const [basketPulse, setBasketPulse] = useState(0)
  const [basketCelebrating, setBasketCelebrating] = useState(false)

  useEffect(() => {
    if (!basketPulse) return undefined
    setBasketCelebrating(true)
    const timer = window.setTimeout(() => setBasketCelebrating(false), 1100)
    return () => window.clearTimeout(timer)
  }, [basketPulse])

  /**
   * The welcome.
   *
   * She waves once when the customer arrives at the counter, and says one line.
   * It clears itself after a few seconds: a greeting that stays on screen is
   * signage, and a character permanently waving is a mascot costume.
   */
  const [greeted, setGreeted] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setGreeted(true), 9000)
    return () => clearTimeout(timer)
  }, [])

  // Her mouth moves only while a line is actually being delivered. A character
  // whose mouth runs continuously is not talking, it is chewing.
  const [talking, setTalking] = useState(false)
  const say = useCallback((line) => {
    if (!line) return
    setTalking(true)
    // Roughly reading speed, so the mouth stops about when the line is read.
    const window = Math.min(7000, 1400 + line.length * 45)
    const timer = setTimeout(() => setTalking(false), window)
    return () => clearTimeout(timer)
  }, [])

  /**
   * What the shopkeeper in the scene is doing.
   *
   * Every field is derived from state the store already holds — nothing here
   * invents activity, and none of it claims a person is present.
   */
  const storeMoment = useMemo(() => deriveStoreMoment({
    shelf: activeShelf,
    product: selectedProduct,
    greeted,
    basketPulse: basketCelebrating ? basketPulse : 0,
  }), [activeShelf, selectedProduct, greeted, basketCelebrating, basketPulse])

  // Speak whenever the line changes, not on every render.
  useEffect(() => say(storeMoment.message), [storeMoment.message, say])

  const handleAddToCart = (product) => {
    const id = product?.sku || product?.id
    if (!id) return
    if (addToCart(id).ok) setBasketPulse(n => n + 1)
  }

  const basketCount = lines?.reduce((sum, line) => sum + (line.qty || 0), 0) ?? 0

  // Once the shopper has committed an item, warm the existing lazy checkout
  // route while they read the basket. Leaving the WebGL room should feel
  // immediate even on a phone, without loading checkout for casual browsers.
  useEffect(() => {
    if (basketCount > 0) void import('./Checkout')
  }, [basketCount])

  const handleAskPasabuy = (product) => {
    const sku = product?.sku || product?.id
    if (typeof requestPasabuyItem === 'function') {
      requestPasabuyItem({
        item: product?.name || '',
        notes: sku ? `Requested from the virtual store. SKU: ${sku}` : 'Requested from the virtual store.',
      })
      return
    }
    go('pasabuy')
  }

  const goToShelf = (index) => {
    setShelfIndex(index)
    setSelectedSku(null)
  }

  /**
   * A question asked at the shelf opens the conversation here.
   *
   * This used to call `askStaffAboutProduct`, which navigated to the messages
   * page — the customer was thrown out of the room to ask about the jar in
   * front of them, and had to walk back in afterwards. The context handed over
   * is the same bounded shape as before: product identity and the question, and
   * nothing else.
   */
  const openChat = (question = '') => {
    const context = buildStaffHandoffContext(selectedProduct || {}, question)
    const trimmed = String(question || '').trim()
    if (trimmed) {
      const reference = context.sku
        ? `${context.productName || 'Product'} (SKU: ${context.sku})`
        : context.productName || ''
      setChatSeed({ message: reference ? `About ${reference}\n\n${trimmed}` : trimmed })
    }
    setSheet('chat')
  }

  return (
    <main className="k2-store" aria-label="K2 virtual store">
      <header className="k2-store-bar">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-navy-faint">
            K2 Jimzon
          </p>
          <h1
            ref={storeHeadingRef}
            tabIndex={-1}
            className="font-serif text-xl font-semibold text-[#2B2B2B] focus:outline-none"
          >
            The store
          </h1>
        </div>
        <nav aria-label="Shelves" className="k2-store-shelfnav">
          {shelves.map((shelf, index) => (
            <button
              key={shelf.id}
              type="button"
              onClick={() => goToShelf(index)}
              aria-current={index === activeIndex ? 'true' : undefined}
              className={`min-h-[44px] whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson ${
                index === activeIndex
                  ? 'bg-[#2B2B2B] text-white shadow-xs'
                  : 'border border-[#E4DCD1] bg-white/70 text-[#5C5449] hover:border-[#C6A867]'
              }`}
            >
              {shelf.name}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-pressed={isDark}
          className="k2-store-theme min-h-[44px] shrink-0 rounded-full border border-[var(--k2-line)] bg-white/70 px-4 text-sm font-semibold text-[var(--k2-ink)] transition-colors hover:border-[#C6A867] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
        >
          {isDark ? 'Lights on' : 'Lights low'}
        </button>
        <button
          type="button"
          onClick={leaveStore}
          className="k2-store-leave min-h-[44px] shrink-0 rounded-full border border-[#E4DCD1] bg-white/70 px-5 text-sm font-semibold text-[#2B2B2B] transition-colors hover:border-[#C6A867] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
        >
          Leave the store
        </button>
      </header>

      {loading && (
        <p className="p-8 text-sm text-navy-faint" role="status">Opening the store…</p>
      )}

      {!loading && shelves.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl font-semibold text-[#2B2B2B]">
              The shelves are empty right now.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#5C5449]">
              No products are published yet. When this month's consignment is checked in and
              published, it appears here and in the catalog at the same time.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => go('pasabuy')}
                className="min-h-[44px] rounded-full bg-crimson px-5 text-sm font-semibold text-white"
              >
                Request something from Italy
              </button>
              <button
                type="button"
                onClick={() => go('catalog')}
                className="min-h-[44px] rounded-full border border-[#E4DCD1] px-5 text-sm font-semibold text-[#2B2B2B]"
              >
                Back to the catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && activeShelf && (
        <div className="k2-store-body">
          <div className="k2-store-scene" data-moment={storeMoment.id}>
            <div className="k2-store-ambient" aria-hidden="true">
              <span className="k2-store-ambient-orb k2-store-ambient-orb-a" />
              <span className="k2-store-ambient-orb k2-store-ambient-orb-b" />
              <span className="k2-store-ambient-grain" />
            </div>
            {sceneReady && (
              <SceneBoundary onFailure={handleSceneFailure}>
                <Suspense fallback={null}>
                  {/* The whole run is built at once so the camera can travel
                      between bays; the active index only says where it looks. */}
                  <ShelfScene3D
                    shelves={shelves}
                    activeIndex={activeIndex}
                    selectedSku={selectedSku}
                    onSelect={handleSelect}
                    onShelfChange={goToShelf}
                    onFailure={handleSceneFailure}
                    keeper={{ ...storeMoment, talking }}
                    zoomRequest={zoomRequest}
                    isDark={isDark}
                  />
                </Suspense>
              </SceneBoundary>
            )}

            {sceneReady === false && (
              <div className="k2-store-flat-scene" aria-hidden="true">
                <div className="k2-store-flat-scene-card">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-navy-faint">
                    You are at
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold text-[#2B2B2B]">
                    {activeShelf.name}
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-7 text-[#5C5449]">
                    {activeShelf.blurb}
                  </p>
                </div>
              </div>
            )}

            {/* She invites the customer through the aisle, so there has to be
                one obvious way to accept. The shelf tabs and the drag gesture
                both still work; this is the door she is pointing at. */}
            {activeShelf?.isCounter && shelves.length > 1 && (
              <button
                type="button"
                onClick={() => goToShelf(1)}
                className="k2-store-enter"
              >
                Browse the shelves
                <span aria-hidden="true"> →</span>
              </button>
            )}

            {/* Zoom. The wheel and pinch both work, but neither is discoverable
                and neither is reachable from a keyboard, so the buttons are the
                real control and the gestures are the shortcut. */}
            {sceneReady && (
              <div className="k2-store-zoom" role="group" aria-label="Zoom the store view">
                <button type="button" onClick={() => zoomBy('in')} className="k2-store-zoom-btn" aria-label="Zoom in">
                  <span aria-hidden="true">+</span>
                </button>
                <button type="button" onClick={resetZoom} className="k2-store-zoom-btn k2-store-zoom-reset">
                  Reset
                </button>
                <button type="button" onClick={() => zoomBy('out')} className="k2-store-zoom-btn" aria-label="Zoom out">
                  <span aria-hidden="true">−</span>
                </button>
              </div>
            )}

            {/* Previous / Next Shelf. Concept §18 requires obvious navigation
                alongside the direct category controls — dragging the scene is an
                affordance, not the only way through the store. */}
            <div className="k2-store-steps">
              <button
                type="button"
                onClick={() => goToShelf(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="k2-store-step"
              >
                ← {shelves[activeIndex - 1]?.name || 'Previous shelf'}
              </button>
              <button
                type="button"
                onClick={() => goToShelf(Math.min(shelves.length - 1, activeIndex + 1))}
                disabled={activeIndex === shelves.length - 1}
                className="k2-store-step"
              >
                {shelves[activeIndex + 1]?.name || 'Next shelf'} →
              </button>
            </div>

            {/* The real interface. Always present, over the scene on desktop and
                below it on phones, so every item is reachable by keyboard and
                screen reader whether or not WebGL drew anything. */}
            <ul className="k2-store-rail">
              {activeShelf.products.map(product => {
                const id = product?.sku || product?.id
                const stock = stockState(product)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSku(id)}
                      aria-pressed={selectedSku === id}
                      className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson ${
                        selectedSku === id
                          ? 'border-crimson bg-white text-crimson shadow-xs'
                          : 'border-[#E4DCD1] bg-white/85 text-[#2B2B2B] hover:border-[#C6A867]'
                      }`}
                    >
                      {product?.name}
                      <span className="ml-2 font-normal text-navy-faint">{stock.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <StoreKeeper
              moment={storeMoment}
              shelf={activeShelf}
              product={selectedProduct}
              onAskStaff={openChat}
            />

            <StoreBasketDock
              lines={lines}
              basketCount={basketCount}
              subtotal={subtotal}
              pulse={basketPulse}
              onCheckout={() => go('checkout')}
            />
          </div>

          {/* The rail is the store's one complementary landmark. The selected
              product inside it is a named region, not a second complementary:
              nesting the same landmark type twice makes it harder, not easier,
              for a screen reader to move around the shelf. */}
          <aside className="k2-store-side" aria-label="Shelf concierge">
            <StoreSidePanel
              shelves={shelves}
              activeShelf={activeShelf}
              activeIndex={activeIndex}
              product={selectedProduct}
              cartQuantity={selectedSku ? (lines.find(line => line.id === selectedSku)?.qty ?? 0) : 0}
              onShelfChange={goToShelf}
              onSelect={handleSelect}
              onFaq={() => setSheet('faq')}
              onAddToCart={handleAddToCart}
              onOpenProduct={openProduct}
              onAskPasabuy={handleAskPasabuy}
              onCloseProduct={() => setSelectedSku(null)}
            />

            <StoreSeoPanel product={selectedProduct} />
          </aside>
        </div>
      )}

      <StoreSheet
        open={sheet === 'faq'}
        onClose={closeSheet}
        title="Questions and answers"
        subtitle="How the shop works, plus what staff have approved for the items on these shelves."
      >
        <StoreFaqPanel products={listedProducts} focusSku={selectedSku || ''} />
      </StoreSheet>

      <StoreSheet
        open={sheet === 'chat'}
        onClose={closeSheet}
        title="Chat with K2"
        subtitle="You stay in the store. A real person replies here."
      >
        <StoreChatPanel seed={chatSeed} onSeedConsumed={clearChatSeed} />
      </StoreSheet>
    </main>
  )
}
