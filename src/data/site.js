// Lifestyle photography (Unsplash) + editorial content for the storefront.

const U = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?w=${w}&q=75&auto=format&fit=crop`

export const LIFESTYLE = {
  italyCoast: U('photo-1516483638261-f4dbaf036963', 900), // Manarola, Cinque Terre
  venice: U('photo-1498307833015-e7b400441eb8', 1200), // Venice canal at dusk
  market: U('photo-1542838132-92c53300491e', 900), // grocery shelves
  warehouse: U('photo-1553413077-190dd305871c', 900), // warehouse aisle
  plane: U('photo-1436491865332-7a61a109cc05', 900), // wing above clouds
  kitchen: U('photo-1466637574441-749b8f19452f', 900), // cooking board
}

export const REVIEWS = [
  {
    name: 'Camille D.',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'Legit EU stock. The Nutella Biscuits pouch had 8 months left on the date — the ones from other sellers were nearly expired. Packed like it was going to war.',
    item: 'Nutella Biscuits',
  },
  {
    name: 'Bella Vita Trading',
    channel: 'Wholesale client · 2 yrs',
    stars: 5,
    text: 'We reorder Lavazza and pesto monthly for the café. Same counts online as in their warehouse — I stopped texting to double-check stock a year ago.',
    item: 'Lavazza Qualità Oro',
  },
  {
    name: 'Miguel R.',
    channel: 'Lazada · verified',
    stars: 5,
    text: 'Requested Pan di Stelle through pasabuy after honeymooning in Rome. Quoted in a day, landed in three weeks, cheaper than my cousin’s balikbayan markup.',
    item: 'Pasabuy request',
  },
  {
    name: 'Anna L.',
    channel: 'Shopee · verified',
    stars: 4,
    text: 'The pistachio cream is dangerous. Jar lasted four days. Only complaint is they keep selling out.',
    item: 'Pistì pistachio cream',
  },
]

export const FAQS = [
  {
    q: 'Are your products really authentic?',
    a: 'Yes — we buy them ourselves from Italian retail and wholesale suppliers, fly them on our own monthly consignment, and print the batch and best-before date on every listing. Five years, 4.9★ across 3,000+ marketplace ratings.',
  },
  {
    q: 'How fast is delivery?',
    a: 'In-stock items ship from our Manila warehouse within 24 hours: 1–2 days Metro Manila, 3–5 days provincial via courier. Pasabuy requests ride the next monthly flight from Milan.',
  },
  {
    q: 'What is Pasabuy and how does it work?',
    a: 'Ask us for any product we don’t stock. We quote the landed price within 24 hours, buy it in Italy ourselves, and it flies home with our regular shipment — tracked like any order, no group-chat chaos.',
  },
  {
    q: 'How do I pay?',
    a: 'QR Ph (GCash, Maya, UnionBank, BPI and any participating bank app) at checkout. Payment confirms automatically — no screenshot-sending, no "sent na po".',
  },
  {
    q: 'I run a café / resto / reselling business. Can I get wholesale prices?',
    a: 'Yes — apply for a wholesale account. Approved businesses see their tier pricing across the whole store, with live stock and self-serve ordering. No more waiting for a Viber reply.',
  },
  {
    q: 'Why do your fragrances say "inspired scent"?',
    a: 'Because that’s what they are, and we won’t pretend otherwise. Our Milano line is EU-made "smells-like" perfume sold honestly — never counterfeit designer bottles.',
  },
]
