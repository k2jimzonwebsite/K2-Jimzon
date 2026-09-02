/**
 * Mock reviews for the product globe.
 *
 * ============================================================================
 * SAMPLE DATA. These are not live customer reviews.
 * ============================================================================
 *
 * The `reviews` table is readable and currently returns zero rows, which leaves
 * the review globe with nothing to open. This set exists so the interaction can
 * be exercised end to end — spin, pick a product, read its feedback — before the
 * table is populated from the real marketplace screenshots.
 *
 * It lives in its own module rather than in `site.js` on purpose. `site.js` is
 * statically imported by the landing page for FAQs and lifestyle imagery, so
 * anything added to it ships in the landing bundle, which is inside 1 kB of its
 * 150 kB gzip budget. This module is only ever reached by a dynamic import on
 * the empty-table path, so it becomes its own chunk and the landing page never
 * pays for it.
 *
 * HOW TO REMOVE: once `reviews` holds real rows, the fallback in
 * `globeCms.jsx` stops firing on its own and nothing imports this. Delete the
 * file and the `import('./globeSeedReviews')` call together.
 *
 * `productId` values must match `src/data/products.js` ids, which is what the
 * globe keys its overlay on.
 */

export const GLOBE_SEED_REVIEWS = Object.freeze([
  {
    productId: 'rio-mare',
    name: 'cokeynuts',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'Authentic Italian product. Packed in corrugated board and then bubble wrap, so nothing arrived dented. Shipped immediately. Will order again.',
    item: 'Rio Mare tuna',
    date: '2024-11-04',
  },
  {
    productId: 'rio-mare',
    name: 'ladyluck.eve',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'Exactly the one I buy in Italy, not the local version. Best before date was clearly printed and far out.',
    item: 'Rio Mare tuna',
    date: '2025-01-18',
  },
  {
    productId: 'lavazza-oro',
    name: 'martin.dlc',
    channel: 'Lazada · verified',
    stars: 5,
    text: 'Ground fresh and sealed properly. Rich crema on the first pull. Cheaper than the supermarket here for the same tin.',
    item: 'Lavazza Qualità Oro',
    date: '2025-02-02',
  },
  {
    productId: 'lavazza-dek',
    name: 'jenny_reyes',
    channel: 'Shopee · verified',
    stars: 4,
    text: 'Good decaf, still tastes like coffee. Box was a little dented in transit but the seal was intact.',
    item: 'Lavazza Dek',
    date: '2025-02-20',
  },
  {
    productId: 'nutella-jar',
    name: 'the.baking.tita',
    channel: 'Viber · direct',
    stars: 5,
    text: 'Ordered three jars for the bakery. Real Italian label, and the expiry was over a year out. Delivery to Quezon City took two days.',
    item: 'Nutella jar',
    date: '2025-03-11',
  },
  {
    productId: 'pistachio-cream',
    name: 'chef_aldrin',
    channel: 'Direct · verified',
    stars: 5,
    text: 'The pistachio cream is the real Sicilian one. Used it for a cornetto filling and customers asked where it came from.',
    item: 'Pistì pistachio cream',
    date: '2025-04-06',
  },
  {
    productId: 'barilla-pesto',
    name: 'mrs.tan',
    channel: 'Shopee · verified',
    stars: 4,
    text: 'Tastes like the one from our trip. Arrived well wrapped. Only note is I wish the bigger jar was available.',
    item: 'Barilla pesto',
    date: '2025-04-29',
  },
  {
    productId: 'lotus-biscoff',
    name: 'kuya.marc',
    channel: 'Lazada · verified',
    stars: 5,
    text: 'Sealed box, none broken. Cheaper per pack than buying singles locally and the stock count on the site was accurate.',
    item: 'Biscoff crunchy',
    date: '2025-05-14',
  },
  {
    productId: 'mutti-passata',
    name: 'anna.k',
    channel: 'Direct · verified',
    stars: 5,
    text: 'Proper passata, not watery. Bought a case for the restaurant and the invoice matched the quoted price exactly.',
    item: 'Mutti passata',
    date: '2025-06-01',
  },
  {
    productId: 'nutella-biscuits',
    name: 'popoy.santos',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'Kids finished the pack in a day. Fresh, not the near-expiry stock I keep getting from other sellers.',
    item: 'Nutella Biscuits',
    date: '2025-06-23',
  },
])
