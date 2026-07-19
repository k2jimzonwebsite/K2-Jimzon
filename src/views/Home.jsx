import { useMemo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../context/StoreContext'
import { useGlobeCms } from '../data/globeCms'
import { byCollection, CATEGORIES, COLLECTIONS, peso, products } from '../data/products'
import { FAQS, LIFESTYLE, REVIEWS } from '../data/site'
import ProductGlobe from '../components/globe/ProductGlobe'
import GlobeOverlay from '../components/globe/GlobeOverlay'
import ProductVisual from '../components/ProductVisual'
import InteractiveReveal from '../components/InteractiveReveal'
import { BizBadge, RedButton, StockPill, TrustBadge, Tricolor, GhostButton, Kicker } from '../components/ui/bits'
import ProductCard from '../components/ProductCard'
import { ArrowIcon, CheckIcon, PlaneIcon, PlusIcon, StarIcon, MinusIcon } from '../components/ui/icons'

export default function Home() {
  const { query, category } = useStore()
  const searching = query.trim().length > 0 || category !== 'All'

  return (
    <main className="pb-24 md:pb-12">
      <Hero />
      <TrustRow />
      <CategoryTiles />
      
      {/* Minimalist New Arrivals Section */}
      <div className="w-full h-px bg-line max-w-7xl mx-auto mt-6" />
      <NewArrivals />
      
      <div className="w-full flex justify-center py-10"><Tricolor className="w-16" /></div>
      
      {/* Brought back the remaining sections */}
      <StorySection />
      <PasabuyBanner />
      <WholesaleStrip />
      <FaqSection />
      <Newsletter />
    </main>
  )
}

/* ---------- Hero: Marketplace split layout ---------- */

function Hero() {
  const { enabledGlobeProducts } = useGlobeCms()
  const { go } = useStore()
  const [selected, setSelected] = useState(null)

  return (
    <section className="bg-transparent">
      <div className="flex flex-col lg:flex-row min-h-[400px] md:min-h-[550px] lg:min-h-[650px]">
        {/* Left: Promotions / Deals Carousel */}
        <div className="grain relative flex flex-col justify-center overflow-hidden bg-cream/80 backdrop-blur-xl p-8 lg:w-[40%] xl:w-[35%] lg:p-10 xl:p-14 border-r border-line">
          <Tricolor className="absolute inset-x-0 top-0 z-10" />
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
              hidden: {}
            }}
            className="relative z-20 max-w-md mx-auto w-full"
          >
            <motion.span 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="inline-block rounded-full bg-crimson px-3 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-white shadow-card ring-1 ring-crimson/20"
            >
              Flash Sale
            </motion.span>
            <motion.h1 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="mt-6 font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium leading-[0.95] tracking-tight text-navy"
            >
              The Milano <br/> Consignment.
            </motion.h1>
            <motion.p 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="mt-6 max-w-sm text-base leading-relaxed text-navy-soft font-light"
            >
              Fresh stock just landed. Get up to 30% off retail prices on authentic Italian goods flown directly to Manila.
            </motion.p>
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
              }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <RedButton onClick={() => go('pasabuy')} className="px-8 py-4 text-sm">
                Shop the Drop
              </RedButton>
              <GhostButton onClick={() => go('wholesale')}>
                Wholesale Portal
              </GhostButton>
            </motion.div>
          </motion.div>
        </div>

        {/* Right: Featured 3D Product (Globe) */}
        <div className="relative flex flex-col overflow-hidden bg-shell/70 backdrop-blur-xl lg:flex-1 min-h-[300px] md:min-h-[450px]">
          
          {/* Abstract Wood & Terracotta Depth */}
          <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-[#9A6A45] rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
          <div className="absolute top-[40%] -left-[20%] w-[50%] h-[80%] bg-[#B84E3A] rounded-[100%] mix-blend-overlay filter blur-[120px] opacity-[0.15] -rotate-45"></div>
          <div className="absolute -bottom-[20%] right-[10%] w-[70%] h-[40%] bg-[#C89B4B] rounded-full mix-blend-multiply filter blur-[140px] opacity-15"></div>

          {/* Light gradient for organic feel */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.6)_0%,transparent_100%)]"></div>
          
          {/* Warm organic ground shadow for the globe */}
          <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-[500px] h-[60px] bg-[#9A6A45]/20 blur-2xl rounded-full pointer-events-none z-0"></div>
          
          {/* Textures */}
          <div className="absolute inset-0 pointer-events-none grain opacity-40 mix-blend-multiply z-0"></div>

          <div className="absolute top-6 left-6 z-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/90 backdrop-blur-md px-3.5 py-2 text-xs font-bold uppercase tracking-[0.15em] text-navy shadow-card">
              <StarIcon size={12} className="text-gold" /> Customer Review
            </span>
          </div>
          {enabledGlobeProducts.length > 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="h-full w-full">
                <ProductGlobe products={enabledGlobeProducts} onSelect={setSelected} />
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-shell/80 via-shell/40 to-transparent p-6 pt-32">
             <p className="text-center text-xs font-bold tracking-[0.2em] uppercase text-navy-faint">Interactive • Drag to view</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && <GlobeOverlay product={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  )
}

function TrustRow() {
  return (
    <div className="border-b border-line bg-cream/80 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex max-w-7xl overflow-x-auto whitespace-nowrap items-center gap-4 px-4 py-3 text-sm font-medium md:justify-center md:gap-8">
        <span className="flex items-center gap-2 text-forest"><CheckIcon size={14}/> Sourced in Italy</span>
        <span className="flex items-center gap-2 text-blue"><PlaneIcon size={14}/> Flown to Manila Monthly</span>
        <span className="flex items-center gap-2 text-crimson"><StarIcon size={14}/> 4.9★ Preferred Seller</span>
        <span className="flex items-center gap-2 text-gold"><CheckIcon size={14}/> 100% Authentic Guarantee</span>
      </div>
    </div>
  )
}

/* ---------- Category navigation (Marketplace style) ---------- */

const CATEGORY_TILES = [
  { cat: 'Coffee & beverages', icon: '☕', note: 'Beans & pods' },
  { cat: 'Sweets & spreads', icon: '🍫', note: 'Jars & creams' },
  { cat: 'Biscuits & snacks', icon: '🍪', note: 'Italian biscuits' },
  { cat: 'Pantry', icon: '🍝', note: 'Pasta & pesto' },
  { cat: 'Pasabuy', icon: '✈️', note: 'Request anything' },
]

function CategoryTiles() {
  const { setCategory, setQuery, go } = useStore()
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-4">
        {CATEGORY_TILES.map(({ cat, icon, note }, i) => {
          return (
            <button
              key={cat}
              onClick={() => { 
                if (cat === 'Pasabuy') {
                  go('pasabuy')
                } else {
                  setQuery(''); setCategory(cat) 
                  go('product')
                }
              }}
              className="rise group flex flex-col items-center gap-2 rounded-xl bg-cream/90 backdrop-blur-md p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-float hover:bg-cream"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-shell text-2xl transition-colors group-hover:bg-crimson group-hover:text-white shadow-sm">
                {icon}
              </div>
              <div>
                <p className="font-serif text-xs sm:text-sm font-semibold leading-tight text-navy transition-colors group-hover:text-crimson">{cat}</p>
                <p className="hidden text-xs text-navy-faint md:block">{note}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- Minimalist New Arrivals Showcase ---------- */

function NewArrivals() {
  const arrivals = products.slice(0, 5)
  const [activeIndex, setActiveIndex] = useState(0)

  const next = () => setActiveIndex((prev) => (prev + 1) % arrivals.length)
  const prev = () => setActiveIndex((prev) => (prev - 1 + arrivals.length) % arrivals.length)

  const activeProduct = arrivals[activeIndex]

  return (
    <section className="bg-shell/60 backdrop-blur-sm px-4 py-16 md:py-24 relative overflow-hidden">
      
      {/* Abstract Wood/Amber Background Sweeps */}
      <div className="absolute top-0 left-[10%] w-[40%] h-[100%] bg-[#9A6A45] rounded-[100%] mix-blend-multiply filter blur-[140px] opacity-[0.08] -rotate-12 pointer-events-none"></div>
      <div className="absolute bottom-0 right-[5%] w-[50%] h-[120%] bg-[#B84E3A] rounded-full mix-blend-overlay filter blur-[160px] opacity-[0.05] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Kicker className="mb-3">
            The Drop
          </Kicker>
          <h2 className="font-serif text-3xl font-semibold tracking-[-0.025em] text-navy md:text-4xl">
            New Arrivals
          </h2>
          <p className="mt-3 text-base text-navy-soft max-w-md leading-relaxed font-light">
            Our newest Italian imports. Hover to explore.
          </p>
        </motion.div>

        {/* Carousel Controls */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="flex items-center gap-4"
        >
          <span className="text-sm font-bold tabular text-navy-faint">
            <span className="text-navy">0{activeIndex + 1}</span> / 0{arrivals.length}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream/90 backdrop-blur-sm text-navy transition hover:bg-cream hover:border-line active:scale-95 shadow-sm"
            >
              <ArrowIcon size={16} className="rotate-180" />
            </button>
            <button 
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream/90 backdrop-blur-sm text-navy transition hover:bg-cream hover:border-line active:scale-95 shadow-sm"
            >
              <ArrowIcon size={16} />
            </button>
          </div>
        </motion.div>
      </div>

      <div className="relative h-[500px] md:h-[500px] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProduct.id}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 h-full w-full"
          >
            <ProductCard product={activeProduct} index={0} featured={true} />
          </motion.div>
        </AnimatePresence>
      </div>
      </div>
    </section>
  )
}



/* ---------- The sourcing story, with photography ---------- */

const STORY_STEPS = [
  {
    img: 'market',
    title: 'Bought off real Italian shelves',
    body: 'Our buyers shop the same supermarkets, pharmacies, and wholesalers Italians use — no gray-market middlemen, no repacked goods.',
  },
  {
    img: 'plane',
    title: 'Flown on our monthly consignment',
    body: 'Everything consolidates into one air shipment from Milan — including your pasabuy requests — with batch dates logged before takeoff.',
  },
  {
    img: 'warehouse',
    title: 'Counted into live Manila stock',
    body: 'The moment a box clears customs, it’s scanned into one inventory shared by Shopee, Lazada, this store, and the wholesale portal.',
  },
]

function StorySection() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 md:py-24 glow-terracotta">
      <Kicker className="text-crimson">How it gets to you</Kicker>
      <h2 className="mt-2 w-full font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tight text-navy">
        From an Italian shelf to your door, with nothing lost in between.
      </h2>
      <div className="mt-12 grid gap-5 md:grid-cols-3 md:gap-8">
        {STORY_STEPS.map((step, i) => (
          <figure key={step.title} className="group overflow-hidden rounded-2xl bg-cream/90 backdrop-blur-md shadow-float transition-all hover:shadow-card scroll-reveal">
            <div className="relative h-56 overflow-hidden">
              <img
                src={LIFESTYLE[step.img]}
                alt={step.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05] scroll-parallax origin-center"
              />
              <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-cream font-serif text-lg font-semibold text-crimson shadow-card">
                {i + 1}
              </span>
            </div>
            <figcaption className="p-6 md:p-8">
              <h3 className="font-serif text-lg font-semibold md:text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-soft">{step.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/* ---------- Pasabuy + Wholesale bands ---------- */

function PasabuyBanner() {
  const { go } = useStore()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 scroll-reveal">
      <div className="relative overflow-hidden rounded-3xl bg-cream/80 backdrop-blur-md text-navy shadow-card border border-line">
        
        {/* Soft terracotta gradient in background */}
        <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-gradient-to-l from-crimson-wash to-transparent opacity-80"></div>
        <div className="absolute inset-0 grain opacity-40 mix-blend-multiply pointer-events-none z-0"></div>

        <Tricolor className="relative z-10" />
        <div className="relative z-10 grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <Kicker className="text-crimson">Pasabuy service</Kicker>
            <h2 className="mt-2 max-w-lg font-serif text-2xl font-semibold tracking-tight md:text-3xl">
              If it's on a shelf in Italy, we can put it on yours.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-navy-soft font-light">
              Request any product we don't stock. We buy it in Italy ourselves,
              consolidate it with our monthly shipment, and deliver it to your door —
              quoted upfront, no surprises.
            </p>
          </div>
          <RedButton onClick={() => go('pasabuy')} className="md:px-8">
            Make a request
          </RedButton>
        </div>
      </div>
    </section>
  )
}

function WholesaleStrip() {
  const { go } = useStore()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-blue-wash p-6 md:flex-row md:items-center md:p-8">
        <div>
          <BizBadge solid>For business</BizBadge>
          <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            Coffee shops, restos, resellers — buy at wholesale.
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-navy-soft">
            Live stock, your tier pricing, self-serve ordering. No more waiting for
            a Viber reply to close an order.
          </p>
        </div>
        <button
          onClick={() => go('wholesale')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue/90"
        >
          Wholesale portal <ArrowIcon size={15} />
        </button>
      </div>
    </section>
  )
}

/* ---------- FAQ accordion ---------- */

function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section className="relative mx-auto max-w-3xl px-4 py-16 glow-olive scroll-reveal">
      <h2 className="text-center font-serif text-2xl font-semibold tracking-tight md:text-3xl">
        Questions, answered honestly
      </h2>
      <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-cream/90 backdrop-blur-md shadow-card">
        {FAQS.map((faq, i) => {
          const isOpen = open === i
          return (
            <div key={faq.q}>
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-serif text-base font-semibold">{faq.q}</span>
                <span className={'shrink-0 text-navy-faint transition-transform ' + (isOpen ? 'rotate-45' : '')}>
                  <PlusIcon size={16} />
                </span>
              </button>
              {isOpen && (
                <p className="px-5 pb-5 text-sm leading-relaxed text-navy-soft">{faq.a}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- Newsletter ---------- */

function Newsletter() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (email.trim()) setDone(true)
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-14">
      <div className="relative overflow-hidden rounded-3xl bg-shell px-6 py-12 text-center text-navy md:py-16 shadow-card border border-line">
        
        {/* Abstract Ambient Glows */}
        <div className="absolute -top-[50%] left-[20%] w-[60%] h-[200%] bg-cream rounded-full mix-blend-screen filter blur-[120px] opacity-60"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[40%] h-[100%] bg-crimson-wash rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>

        <div className="absolute inset-0 grain opacity-40 mix-blend-multiply pointer-events-none z-0"></div>

        <Tricolor className="absolute inset-x-0 top-0 z-10" />
        <div className="relative z-20">
          <Kicker className="text-crimson">The manifest</Kicker>
          <h2 className="mx-auto mt-2 max-w-md font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            Know what's on the next flight before it lands.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-navy-soft font-light">
            One email per shipment — the new arrivals, restocks, and what's trending in Italy.
          </p>
          {done ? (
            <p className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-forest-wash text-forest px-5 py-2.5 text-sm font-semibold border border-forest/10">
              <CheckIcon size={15} /> You're on the manifest — see you on the 22nd.
            </p>
          ) : (
            <form onSubmit={submit} className="mx-auto mt-8 flex max-w-sm gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              className="min-w-0 flex-1 rounded-xl border border-line bg-cream/50 backdrop-blur-sm px-4 py-3 text-sm text-navy placeholder:text-navy-faint focus:border-navy focus:outline-none shadow-sm"
            />
            <RedButton type="submit">Subscribe</RedButton>
          </form>
          )}
        </div>
      </div>
    </section>
  )
}
