import { useStore } from '../context/StoreContext'
import { Wordmark } from './ui/bits'
import { ArrowIcon } from './ui/icons'

const CATEGORY_LINKS = [
  ['Seasoning, Staple Foods & Baking Ingredients', 'Pantry & baking'],
  ['Snack & Sweets', 'Snacks & sweets'],
  ['Beverages', 'Coffee & beverages'],
  ['Bath & Body', 'Bath & body'],
  ['Skin Care', 'Skin care'],
]

const MARKETPLACE_SHOPS = [
  {
    name: 'Pasabuy Italy by K2',
    links: [
      ['Lazada', 'https://s.lazada.com.ph/s.Z777zD?c=x'],
      ['Shopee', 'https://s.shopee.ph/9V1fXWQ0gK'],
      ['TikTok', 'https://vt.tiktok.com/ZS9Afhgs231Wm-Zj3hN/'],
    ],
  },
  {
    name: 'Jworldbasket',
    links: [
      ['Lazada', 'https://s.lazada.com.ph/s.Z77ieU?c=x'],
      ['Shopee', 'https://s.shopee.ph/5fowyVvX1R'],
      ['TikTok', 'https://vt.tiktok.com/ZS9AfhVYjAJUb-HhBEF/'],
    ],
  },
]

export default function Footer() {
  const { go, setCategory, setQuery } = useStore()
  const jump = (category) => {
    setQuery('')
    setCategory(category)
    go('catalog')
  }

  return (
    <footer className="border-t border-[var(--store-surface-border)] bg-[var(--store-surface-bg)] pb-28 pt-14 text-navy md:pb-12 md:pt-16">
      <div className="store-section">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.45fr_0.8fr_0.8fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Wordmark />
            <p className="mt-5 max-w-sm text-sm leading-7 text-navy-soft">Italian goods for homes and businesses in the Philippines. Shop what is in stock or ask us to source something from Italy.</p>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-crimson">Website · Shopee · TikTok Shop · Lazada · Pasabuy</p>
          </div>

          <FooterColumn title="Shop">
            {CATEGORY_LINKS.map(([category, label]) => <FooterButton key={category} onClick={() => jump(category)}>{label}</FooterButton>)}
          </FooterColumn>

          <FooterColumn title="Services">
            <FooterButton onClick={() => go('pasabuy')}>Request from Italy</FooterButton>
            <FooterButton onClick={() => go('wholesale')}>Wholesale orders</FooterButton>
            <FooterButton onClick={() => go('catalog')}>Browse products</FooterButton>
            <FooterButton onClick={() => go('checkout')}>Review your basket</FooterButton>
          </FooterColumn>

          <FooterColumn title="Contact">
            <FooterButton onClick={() => go('contact')}>Contact us</FooterButton>
            <li><a className="footer-link" href="mailto:k2jimzonwebsite@gmail.com">Email K2 Jimzon <ArrowIcon size={13} /></a></li>
            <li><span className="footer-copy">Messenger · @k2jimzon</span></li>
            <li><span className="footer-copy">Shopee · k2jimzononlineshop</span></li>
            <li><span className="footer-copy">Manila, Philippines</span></li>
          </FooterColumn>
        </div>

        <section className="mt-10 border-t border-[var(--store-surface-border)] pt-8" aria-labelledby="footer-marketplaces-title">
          <h3 id="footer-marketplaces-title" className="text-base font-semibold text-navy">Find our shops</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-soft">These links open our marketplace shops. Stock and messages there stay in each marketplace until a connector is approved.</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {MARKETPLACE_SHOPS.map(shop => (
              <div key={shop.name}>
                <p className="text-base font-semibold text-navy">{shop.name}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {shop.links.map(([channel, href]) => (
                    <li key={channel}>
                      <a className="footer-link min-h-11 rounded-xl border border-[var(--store-surface-border)] px-3" href={href} target="_blank" rel="noreferrer">
                        {channel}<ArrowIcon size={13} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 border-t border-[var(--store-surface-border)] pt-2 text-sm font-semibold text-navy-soft">
          <button onClick={() => go('privacy')} className="min-h-11 inline-flex items-center hover:text-crimson transition-colors">Privacy &amp; Data</button>
          <button onClick={() => go('terms')} className="min-h-11 inline-flex items-center hover:text-crimson transition-colors">Terms of Service</button>
          <button onClick={() => go('returns')} className="min-h-11 inline-flex items-center hover:text-crimson transition-colors">Returns &amp; Replacements</button>
        </div>

        <div className="mt-4 grid gap-3 border-t border-[var(--store-surface-border)]/60 pt-4 text-xs leading-relaxed text-navy-faint md:grid-cols-[1fr_auto] md:items-end">
          <p>Submitting a Website or Pasabuy request does not collect payment. K2 staff confirms availability, delivery, and payment instructions directly.</p>
          <p className="md:text-right">© 2026 K2 Jimzon · Direct Italian imports</p>
          {import.meta.env.DEV && <p className="md:col-span-2">Development preview: fallback products and reviews are illustrative. Production displays database-backed published records.</p>}
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }) {
  return <div><h3 className="text-base font-semibold text-navy">{title}</h3><ul className="mt-4 space-y-1">{children}</ul></div>
}

function FooterButton({ children, onClick }) {
  return <li><button onClick={onClick} className="footer-link">{children}</button></li>
}
