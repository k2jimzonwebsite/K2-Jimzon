import { LIFESTYLE } from '../../data/site'
import { Kicker } from '../ui/bits'

const STEPS = [
  ['market', 'Bought from established Italian shelves', 'Our buyers source through Italian supermarkets, pharmacies, and wholesalers, with the exact item details recorded for review.'],
  ['plane', 'Consolidated for the Manila route', 'Catalog goods and approved Pasabuy purchases are organized into the appropriate shipment with their request trail intact.'],
  ['warehouse', 'Checked into shared Manila stock', 'Arrival counts become the operating record used across the website, Shopee, Lazada, TikTok Shop, and wholesale fulfillment.'],
]

export default function StorySection() {
  return (
    <section className="store-section py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:h-fit">
          <Kicker>How K2 operates</Kicker>
          <h2 className="mt-3 max-w-lg font-serif text-4xl font-semibold leading-[1.02] tracking-tight text-navy md:text-5xl">From an Italian shelf to a Manila order.</h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-navy-soft">The storefront is connected to a real multi-channel operation. Product records and customer requests stay useful after the page visit ends.</p>
        </div>

        <ol className="border-t border-line">
          {STEPS.map(([image, title, body], index) => (
            <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line py-7 sm:grid-cols-[4rem_10rem_1fr] sm:items-center sm:gap-5 md:py-9">
              <span className="font-serif text-3xl font-semibold text-crimson/80">0{index + 1}</span>
              <img src={LIFESTYLE[image]} alt="" aria-hidden="true" loading="lazy" className="hidden aspect-square w-full rounded-lg object-cover sm:block" />
              <div>
                <h3 className="font-serif text-xl font-semibold text-navy md:text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-navy-soft">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
