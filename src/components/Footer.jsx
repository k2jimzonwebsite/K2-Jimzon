import { useStore } from '../context/StoreContext'
import { CATEGORIES } from '../data/products'
import { Wordmark } from './ui/bits'

const PAYMENTS = ['QR Ph', 'GCash', 'Maya', 'BPI', 'UnionBank', 'Visa · MC']

export default function Footer() {
  const { go, setCategory, setQuery } = useStore()

  const jumpToCategory = (c) => {
    setQuery('')
    setCategory(c)
    go('home')
  }

  return (
    <footer className="border-t border-line bg-shell/60 backdrop-blur-sm pb-28 pt-12 md:pb-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-soft">
              We discover, import, and deliver authentic Italian products for the
              Philippine market — sourced by our own buyers in Italy, flown monthly,
              stocked in Manila.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {PAYMENTS.map((p) => (
                <span key={p} className="rounded border border-line bg-cream/80 px-2 py-1 text-xs font-semibold text-navy-soft">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <FooterCol title="Shop">
            {CATEGORIES.filter((c) => c !== 'All').map((c) => (
              <FooterLink key={c} onClick={() => jumpToCategory(c)}>{c}</FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Services">
            <FooterLink onClick={() => go('pasabuy')}>Pasabuy requests</FooterLink>
            <FooterLink onClick={() => go('wholesale')}>Wholesale accounts</FooterLink>
            <FooterLink onClick={() => go('checkout')}>Cart & checkout</FooterLink>
            <FooterLink onClick={() => go('home')}>This month's shipment</FooterLink>
          </FooterCol>

          <FooterCol title="Get in touch">
            <FooterLink>Viber · 9am–9pm daily</FooterLink>
            <FooterLink>Messenger · @k2jimzon</FooterLink>
            <FooterLink>Shopee · k2jimzononlineshop</FooterLink>
            <FooterLink>Lazada · K2 Jimzon</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-10 border-t border-line pt-5 text-center text-xs leading-relaxed text-navy-faint">
          <p>
            Concept prototype — products, prices, and reviews are illustrative mock data.
            Product photography via Open Food Facts (CC-BY-SA) · lifestyle photography via Unsplash.
          </p>
          <p className="mt-1">© 2026 K2 Jimzon · Direct Italian imports · Manila, Philippines</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-navy">{title}</h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  )
}

function FooterLink({ children, onClick }) {
  return (
    <li>
      <button
        onClick={onClick}
        className={'text-left text-sm text-navy-soft ' + (onClick ? 'hover:text-crimson hover:underline underline-offset-2' : 'cursor-default')}
      >
        {children}
      </button>
    </li>
  )
}
