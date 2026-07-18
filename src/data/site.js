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
    name: 'cokeynuts',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'Authentic Italian product. Seller packed well in corrugated board and then bubble wrap to protect from dents. Seller shipped immediately. Will order again as needed. Thank you.',
    item: 'Rio Mare tuna',
    date: 'Nov 04, 2024',
  },
  {
    name: 'ladyluck.eve',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'I usually buy these brand of espresso ground coffee — Lavazza. It is really strong robust flavor and smell, it\'s definitely Italian cup of coffee. Thanks seller.',
    item: 'Lavazza Suerte',
    date: 'Oct 13, 2024',
  },
  {
    name: 'maxdalla1966',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'I received the products I purchased well packaged and on time. Therefore, I would like to thank the seller, whom I can absolutely recommend to everyone for their purchases. Thanks also to the courier SPX Express for the speed of delivery.',
    item: 'Lavazza Dek',
    date: 'Oct 31, 2025',
  },
  {
    name: 's*****s',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'I love Lindt and so I expected it to melt during transit since the milk chocolates easily do. I suspect the seller also suspected that might happen, so they bubble wrapped my order. Thank you seller! Looks legit!',
    item: 'Lindt Bianco',
    date: 'Oct 10, 2024',
  },
  {
    name: 'mscastillones',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'Smoothest transaction ever!! Thank you thank you!! GRABE WALANG BASAG, WALANG LEAK, AUTHENTIC PRODUCTS!! super safe ng packaging. Same quality as the ones I bought sa London, long lasting, fave scentttt.',
    item: 'Suddenly Fragrance',
    date: 'Feb 04, 2025',
  },
  {
    name: 'jrcnb',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'So happy of this scent I randomly came across the seller while hunting for a scent na hindi mahal pero kakaiba ang scent. Solid na secure sa packaging, 3 layers kaya naman hindi nag spill at hindi nabasag. Na deliver pa in less than 5 days. Will surely order again from this shop as a repeat buyer.',
    item: 'Suddenly Fragrance',
    date: 'Oct 24, 2025',
  },
  {
    name: 'k*****i',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'Been missing this flavor! Very rare find, glad this shop sells this! Well packed by seller. First tasted this in turkey and I really love the flavor! A bit pricey but still worth my money. Will order again if they still have stocks.',
    item: 'Pringles Paprika',
    date: 'Nov 27, 2022',
  },
  {
    name: 'm*****s',
    channel: 'Shopee · verified',
    stars: 5,
    text: 'Very happy that this was delivered very fast and I appreciate the effort in packaging in a box to maintain quality. I love Lindt chocolates, they are creamy.',
    item: 'Lindt Bianco',
    date: 'May 10, 2024',
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
