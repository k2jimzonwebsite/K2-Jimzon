import { useMemo, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { byCollection, CATEGORIES, COLLECTIONS, peso, products } from '../data/products'
import { FAQS, LIFESTYLE, REVIEWS } from '../data/site'
import ProductVisual from '../components/ProductVisual'
import { BizBadge, RedButton, StockPill, TrustBadge, Tricolor } from '../components/ui/bits'
import { ArrowIcon, CheckIcon, PlaneIcon, PlusIcon, StarIcon } from '../components/ui/icons'

export default function Home() {
  const { query, category } = useStore()
  const searching = query.trim().length > 0 || category !== 'All'

  return (
    <main className="pb-24 md:pb-12">
      {!searching && <Hero />}
      {!searching && <TrustRow />}
      {!searching && <CategoryTiles />}
      <NeedSection searching={searching} />
      {!searching && (
        <>
          <DiscoveryShelves />
          <StorySection />
          <Testimonials />
          <PasabuyBanner />
          <WholesaleStrip />
          <FaqSection />
          <Newsletter />
        </>
      )}
    </main>
  )
}

/* ---------- Hero: white space + real product photography ---------- */

function Hero() {
  const { openProduct } = useStore()
  const tiles = ['pistachio-cream', 'nutella-jar'].map((id) =>
    products.find((p) => p.id === id),
  )
  return (
    <section className="px-4 pt-6 md:pt-8">
      <div className="grain mx-auto max-w-6xl overflow-hidden rounded-3xl bg-oxblood px-6 py-10 shadow-float md:px-14 md:py-16">
      <div className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="rise flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-champagne">
            <PlaneIcon size={14} className="text-champagne" /> Milano → Manila · monthly consignment
          </p>
          <h1 className="rise mt-4 font-serif text-[2.7rem] font-semibold leading-[1.02] tracking-tight text-balance text-white md:text-[4rem]" style={{ animationDelay: '80ms' }}>
            Bought in Italy.
            <br />
            <span className="text-champagne">Flown home monthly.</span>
          </h1>
          <p className="rise mt-5 max-w-md text-[15px] leading-relaxed text-white/85" style={{ animationDelay: '160ms' }}>
            We buy every product ourselves off Italian shelves and fly it in on
            our own monthly consignment — batch-dated, live-stocked, and priced
            under the marketplaces.
          </p>
          <div className="rise mt-8 flex flex-col gap-4 sm:flex-row sm:items-center" style={{ animationDelay: '240ms' }}>
            <button
              onClick={() => openProduct('pistachio-cream')}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3.5 text-[15px] font-semibold text-oxblood shadow-float transition-all duration-200 hover:-translate-y-px hover:bg-champagne"
            >
              Shop this month's shipment
            </button>
            <p className="flex items-center gap-2 text-[13px] text-white/80">
              <StarIcon className="text-champagne" />
              <span>
                <strong className="font-semibold text-white tabular">4.9★</strong> · 3,000+ ratings ·{' '}
                <strong className="font-semibold text-white">5 years</strong> importing
              </span>
            </p>
          </div>
        </div>

        {/* Photo composition: Italy backdrop + real product tiles */}
        <div className="rise relative mx-auto h-80 w-full max-w-sm md:h-[26rem]" style={{ animationDelay: '200ms' }}>
          <div className="grain absolute right-0 top-0 h-64 w-56 overflow-hidden rounded-2xl shadow-float md:h-80 md:w-72">
            <img src={LIFESTYLE.italyCoast} alt="Manarola, Cinque Terre — where the buying trips happen" className="h-full w-full object-cover" />
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-navy">
              Sourced on the ground
            </span>
          </div>
          <button
            onClick={() => openProduct(tiles[1].id)}
            className="absolute bottom-10 left-0 w-36 rotate-[-3deg] overflow-hidden rounded-xl border border-line bg-white shadow-float transition-transform hover:scale-[1.04] md:w-44"
          >
            <ProductVisual product={tiles[1]} className="aspect-square" />
          </button>
          <button
            onClick={() => openProduct(tiles[0].id)}
            className="absolute -bottom-2 left-24 z-10 w-40 rotate-[2.5deg] overflow-hidden rounded-xl border border-line bg-white shadow-float transition-transform hover:scale-[1.04] md:left-32 md:w-48"
          >
            <ProductVisual product={tiles[0]} className="aspect-square" />
            <span className="absolute left-2 top-2">
              <TrustBadge solid>Authentic</TrustBadge>
            </span>
          </button>
        </div>
      </div>
      </div>
    </section>
  )
}

function TrustRow() {
  return (
    <div className="border-y border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-3.5 md:justify-between">
        <TrustBadge>100% authentic</TrustBadge>
        <TrustBadge>Sourced by us in Italy</TrustBadge>
        <TrustBadge>Fresh EU-dated stock</TrustBadge>
        <TrustBadge>4.9★ · 5 yrs · Preferred seller</TrustBadge>
      </div>
    </div>
  )
}

/* ---------- Category tiles with real product photos ---------- */

const CATEGORY_TILES = [
  { cat: 'Coffee & beverages', pid: 'lavazza-oro', note: 'Beans, moka grinds, pods' },
  { cat: 'Sweets & spreads', pid: 'nutella-jar', note: 'Creams, jars, indulgence' },
  { cat: 'Biscuits & snacks', pid: 'pan-di-stelle', note: 'Italy’s biscuit aisle' },
  { cat: 'Pantry', pid: 'barilla-spaghetti', note: 'Pasta, passata, pesto' },
]

function CategoryTiles() {
  const { setCategory, setQuery } = useStore()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {CATEGORY_TILES.map(({ cat, pid, note }, i) => {
          const product = products.find((p) => p.id === pid)
          return (
            <button
              key={cat}
              onClick={() => { setQuery(''); setCategory(cat) }}
              className="rise group overflow-hidden rounded-xl border border-line bg-white text-left shadow-card transition-shadow hover:shadow-float"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="bg-shell">
                <ProductVisual product={product} className="aspect-[4/3] transition-transform duration-300 group-hover:scale-[1.04]" pad="p-5" />
              </div>
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="font-serif text-[14px] font-semibold leading-tight">{cat}</p>
                  <p className="mt-0.5 text-[11px] text-navy-faint">{note}</p>
                </div>
                <ArrowIcon size={14} className="shrink-0 text-navy-faint transition-transform group-hover:translate-x-1 group-hover:text-crimson" />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- Need: search, categories, filtered grid ---------- */

function NeedSection({ searching }) {
  const { query, category, setCategory, setQuery } = useStore()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const inCat = category === 'All' || p.category === category
      const inQuery =
        !q ||
        [p.name, p.short, p.category, p.origin].some((s) =>
          s.toLowerCase().includes(q),
        )
      return inCat && inQuery
    })
  }, [query, category])

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            {searching ? 'Find what you need' : 'Shop the catalog'}
          </h2>
          <p className="mt-1 text-[13px] text-navy-soft">
            {searching
              ? `${filtered.length} ${filtered.length === 1 ? 'match' : 'matches'}${query ? ` for “${query}”` : ''}`
              : 'Know what you want? Search above or jump by category.'}
          </p>
        </div>
        {searching && (
          <button
            onClick={() => { setQuery(''); setCategory('All') }}
            className="text-[13px] font-medium text-crimson underline-offset-4 hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={
              'whitespace-nowrap rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition-colors ' +
              (category === c
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-white text-navy-soft hover:border-navy/40 hover:text-navy')
            }
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyResults />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {(searching ? filtered : filtered.slice(0, 8)).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyResults() {
  const { query, go } = useStore()
  return (
    <div className="rounded-2xl border border-dashed border-line bg-shell px-6 py-12 text-center">
      <p className="font-serif text-xl font-semibold">Not in this shipment — yet.</p>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-navy-soft">
        We fly to Italy monthly. Request “{query}” as a pasabuy and we'll quote it
        within 24 hours and bring it on the next consignment.
      </p>
      <RedButton className="mt-5" onClick={() => go('pasabuy')}>
        Request it from Italy
      </RedButton>
    </div>
  )
}

/* ---------- Discovery shelves ---------- */

function DiscoveryShelves() {
  return (
    <section className="mt-14 border-t border-line bg-shell/60 pb-4 pt-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-crimson">Discovery</p>
        <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          Come for what you need. Stay for what you find.
        </h2>
      </div>
      {COLLECTIONS.map((col, i) => (
        <Shelf key={col.id} collection={col} index={i} />
      ))}
    </section>
  )
}

function Shelf({ collection, index }) {
  const items = byCollection(collection.id)
  if (items.length === 0) return null
  return (
    <div className="mx-auto mt-9 max-w-6xl">
      <div className="flex items-baseline justify-between px-4">
        <div>
          <h3 className="font-serif text-lg font-semibold tracking-tight md:text-xl">{collection.name}</h3>
          <p className="text-[12px] text-navy-faint">{collection.note}</p>
        </div>
        <span className="hidden items-center gap-1 text-[12px] font-medium text-navy-soft md:flex">
          Scroll <ArrowIcon size={13} />
        </span>
      </div>
      <div className="shelf mt-3 flex gap-3 overflow-x-auto px-4 pb-3 md:gap-4">
        {items.map((p, i) => (
          <div key={p.id} className="w-40 shrink-0 md:w-52">
            <ProductCard product={p} index={i} compact />
          </div>
        ))}
        {index === COLLECTIONS.length - 1 && <PasabuyCard />}
      </div>
    </div>
  )
}

function PasabuyCard() {
  const { go } = useStore()
  return (
    <button
      onClick={() => go('pasabuy')}
      className="flex w-40 shrink-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-crimson/40 bg-white p-5 text-center transition-colors hover:border-crimson md:w-52"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-crimson/10 text-crimson">
        <PlaneIcon size={18} />
      </span>
      <span className="font-serif text-[15px] font-semibold leading-snug">
        Can't find it?
      </span>
      <span className="text-[11.5px] leading-snug text-navy-soft">
        Request anything from Italy — we'll bring it on the next flight.
      </span>
    </button>
  )
}

/* ---------- Shared product card ---------- */

export function ProductCard({ product, index = 0, compact = false }) {
  const { openProduct, addToCart, setCartOpen, isWholesale } = useStore()
  const price = isWholesale ? product.wholesale : product.retail

  return (
    <article
      className="rise group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card transition-shadow hover:shadow-float"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button onClick={() => openProduct(product.id)} className="relative text-left">
        <ProductVisual product={product} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <span className="absolute left-2 top-2">
          <TrustBadge solid>Authentic</TrustBadge>
        </span>
        {product.tag && (
          <span className="absolute right-2 top-2 rounded-full bg-crimson px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
            {product.tag}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1 border-t border-line p-3">
        <button onClick={() => openProduct(product.id)} className="text-left">
          <h3 className="font-serif text-[14.5px] font-medium leading-snug">
            {compact ? product.short : product.name}
          </h3>
        </button>
        {!compact && (
          <p className="text-[11.5px] text-navy-faint">{product.size} · {product.origin}</p>
        )}
        <StockPill stock={product.stock} />
        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <p className="text-[15px] font-bold text-crimson tabular">{peso(price)}</p>
            {isWholesale && (
              <p className="text-[10.5px] text-navy-faint line-through tabular">{peso(product.retail)}</p>
            )}
          </div>
          <button
            onClick={() => { addToCart(product.id); setCartOpen(true) }}
            className="rounded-lg bg-crimson px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-crimson-deep"
          >
            Add
          </button>
        </div>
      </div>
    </article>
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
    <section className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-crimson">How it gets to you</p>
      <h2 className="mt-1.5 max-w-lg font-serif text-2xl font-semibold tracking-tight md:text-3xl">
        From an Italian shelf to your door, with nothing lost in between.
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {STORY_STEPS.map((step, i) => (
          <figure key={step.title} className="group overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="relative h-44 overflow-hidden">
              <img
                src={LIFESTYLE[step.img]}
                alt={step.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white font-serif text-[15px] font-semibold text-navy shadow-card">
                {i + 1}
              </span>
            </div>
            <figcaption className="p-5">
              <h3 className="font-serif text-[16px] font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-navy-soft">{step.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/* ---------- Testimonials ---------- */

function Testimonials() {
  return (
    <section className="border-y border-line bg-white py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-crimson">Word of mouth</p>
            <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
              4.9★ across 3,000+ ratings
            </h2>
          </div>
          <TrustBadge>Preferred seller · 5 years</TrustBadge>
        </div>
        <div className="shelf mt-7 flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4">
          {REVIEWS.map((r) => (
            <blockquote key={r.name} className="flex w-72 shrink-0 flex-col rounded-2xl border border-line bg-shell/60 p-5 md:w-auto">
              <div className="flex gap-0.5 text-gold" aria-label={`${r.stars} out of 5 stars`}>
                {Array.from({ length: r.stars }).map((_, i) => (
                  <StarIcon key={i} size={13} />
                ))}
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-navy-soft">“{r.text}”</p>
              <footer className="mt-4 border-t border-line pt-3">
                <p className="text-[13px] font-semibold">{r.name}</p>
                <p className="text-[11px] text-navy-faint">{r.channel} · {r.item}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Pasabuy + Wholesale bands ---------- */

function PasabuyBanner() {
  const { go } = useStore()
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <Tricolor />
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-crimson">Pasabuy service</p>
            <h2 className="mt-2 max-w-lg font-serif text-2xl font-semibold tracking-tight md:text-3xl">
              If it's on a shelf in Italy, we can put it on yours.
            </h2>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-navy-soft">
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
          <BizBadge>For business</BizBadge>
          <h2 className="mt-2.5 font-serif text-xl font-semibold tracking-tight md:text-2xl">
            Coffee shops, restos, resellers — buy at wholesale.
          </h2>
          <p className="mt-1.5 max-w-lg text-[13.5px] text-navy-soft">
            Live stock, your tier pricing, self-serve ordering. No more waiting for
            a Viber reply to close an order.
          </p>
        </div>
        <button
          onClick={() => go('wholesale')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-blue/90"
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
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h2 className="text-center font-serif text-2xl font-semibold tracking-tight md:text-3xl">
        Questions, answered honestly
      </h2>
      <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white shadow-card">
        {FAQS.map((faq, i) => {
          const isOpen = open === i
          return (
            <div key={faq.q}>
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-serif text-[15px] font-semibold">{faq.q}</span>
                <span className={'shrink-0 text-navy-faint transition-transform ' + (isOpen ? 'rotate-45' : '')}>
                  <PlusIcon size={16} />
                </span>
              </button>
              {isOpen && (
                <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-navy-soft">{faq.a}</p>
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
      <div className="grain relative overflow-hidden rounded-2xl bg-navy px-6 py-12 text-center text-white md:py-14">
        <Tricolor className="absolute inset-x-0 top-0" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">The manifest</p>
        <h2 className="mx-auto mt-2 max-w-md font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          Know what's on the next flight before it lands.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-white/70">
          One email per shipment — the new arrivals, restocks, and what's trending in Italy.
        </p>
        {done ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13.5px] font-semibold">
            <CheckIcon size={15} /> You're on the manifest — see you on the 22nd.
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-6 flex max-w-sm gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-[14px] text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none"
            />
            <RedButton type="submit">Subscribe</RedButton>
          </form>
        )}
      </div>
    </section>
  )
}
