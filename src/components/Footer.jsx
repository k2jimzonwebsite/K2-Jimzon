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
            <p className="mt-5 max-w-sm text-sm leading-7 text-navy-soft">A multi-channel Italy-sourced catalog and Pasabuy operation serving Philippine customers and businesses.</p>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-crimson">Website · Shopee · TikTok Shop · Lazada · Pasabuy</p>
          </div>

          <FooterColumn title="Shop">
            {CATEGORY_LINKS.map(([category, label]) => <FooterButton key={category} onClick={() => jump(category)}>{label}</FooterButton>)}
          </FooterColumn>

          <FooterColumn title="Services">
            <FooterButton onClick={() => go('pasabuy')}>Pasabuy sourcing</FooterButton>
            <FooterButton onClick={() => go('wholesale')}>Business supply</FooterButton>
            <FooterButton onClick={() => go('catalog')}>Current catalog</FooterButton>
            <FooterButton onClick={() => go('checkout')}>Order request</FooterButton>
          </FooterColumn>

          <FooterColumn title="Contact">
            <li><a className="footer-link" href="mailto:k2jimzonwebsite@gmail.com">Email K2 Jimzon <ArrowIcon size={13} /></a></li>
            <li><span className="footer-copy">Messenger · @k2jimzon</span></li>
            <li><span className="footer-copy">Shopee · k2jimzononlineshop</span></li>
            <li><span className="footer-copy">Manila, Philippines</span></li>
          </FooterColumn>
        </div>

        <div className="mt-12 grid gap-3 border-t border-[var(--store-surface-border)] pt-6 text-xs leading-relaxed text-navy-faint md:grid-cols-[1fr_auto] md:items-end">
          <p>Submitting a Website or Pasabuy request does not collect payment. K2 staff confirms availability, delivery, and payment instructions directly.</p>
          <p className="md:text-right">© 2026 K2 Jimzon · Direct Italian imports</p>
          {import.meta.env.DEV && <p className="md:col-span-2">Development preview: fallback products and reviews are illustrative. Production displays database-backed published records.</p>}
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }) {
  return <div><h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-crimson">{title}</h3><ul className="mt-4 space-y-1">{children}</ul></div>
}

function FooterButton({ children, onClick }) {
  return <li><button onClick={onClick} className="footer-link">{children}</button></li>
}
