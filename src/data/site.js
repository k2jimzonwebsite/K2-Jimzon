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
    text: 'I usually buy this brand of espresso ground coffee, Lavazza. It is really strong robust flavor and smell, definitely an authentic Italian cup of coffee. Thanks seller.',
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
    cat: 'Ordering & Stock',
    q: 'How does your Single Master Inventory work?',
    a: 'Every product listed on our website is physically in our Manila warehouse and tied to a single master inventory count. When a product sells on Shopee, TikTok, or our website, the count reconciles across all channels in real time. You will never purchase ghost stock or arrive at checkout only to find out an item was already sold.',
  },
  {
    cat: 'Ordering & Stock',
    q: 'Why is there no instant online payment at checkout?',
    a: 'We operate on a physical verification model: when you submit an order, our staff first visually inspect your exact items, check lot batches and expiration dates, and calculate accurate courier fees. Once confirmed, we send your official GCash or MariBank receiving QR code and order total. You only pay after a human confirms your order is 100% ready.',
  },
  {
    cat: 'Freshness & Dates',
    q: 'Are your Italian grocery items really authentic and fresh?',
    a: 'Yes, 100%. We buy directly from Italian supermarket chains (such as Esselunga, Conad, and Coop) and licensed regional distributors in Milan. We use strict FEFO (First-Expired, First-Out) lot tracking, and every product listing displays genuine batch numbers and Best-Before dates—no mystery dates or near-expiry surprises.',
  },
  {
    cat: 'Freshness & Dates',
    q: 'Why do your Milano fragrances say "inspired scent"?',
    a: 'Because honesty comes first. Our Milano line features European-crafted alternative perfumes formulated with premium French and Italian fragrance oils. We sell them transparently under their own name as high-quality inspired scents, never passing them off as counterfeit designer bottles.',
  },
  {
    cat: 'Delivery & Pickup',
    q: 'What are your delivery options and can I pick up in Manila?',
    a: 'We offer three flexible options: (1) Same-day or next-day express courier (Grab, Lalamove, or Borzo) within Metro Manila; (2) Nationwide provincial shipping via J&T Express with protective 3-layer corrugated and bubble packaging; and (3) Direct warehouse pickup at our Manila hub once staff notify you that your order is packed.',
  },
  {
    cat: 'Delivery & Pickup',
    q: 'How are delivery rates calculated?',
    a: 'Metro Manila express rates match live courier rates based on your pin location and parcel volume. Provincial rates follow standard J&T weight brackets. Staff quote your exact delivery fee before you pay, so there are never unexpected add-on charges.',
  },
  {
    cat: 'Pasabuy & Flights',
    q: 'What is Pasabuy and how do scheduled flights work?',
    a: 'Pasabuy is our personal shopping service for items not listed in our regular catalog. Send us a photo, product name, or link. Our buyers in Milan check Italian stores and provide an all-inclusive quote in Philippine Pesos covering the item cost and air freight. Items fly on our regular monthly cargo flights from Milan Malpensa to Manila.',
  },
  {
    cat: 'Wholesale & B2B',
    q: 'Can restaurants, cafés, or bakeries order at wholesale prices?',
    a: 'Yes. We supply coffee beans (Lavazza, Kimbo), bronze-cut pasta, canned San Marzano tomatoes, and bakery ingredients in case and carton quantities to specialty cafés and restaurants across the Philippines. Submit an inquiry through our Wholesale portal or contact us directly for B2B price tiers.',
  },
]

