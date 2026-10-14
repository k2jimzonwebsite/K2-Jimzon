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
    a: 'K2 staff manage products and stock in one master inventory. Only products assigned to Website and eligible for sale appear in our catalog. Marketplace connectors are not yet live, so staff reconcile those sales manually. Wait for K2 staff to confirm your stock and final total before paying.',
  },
  {
    cat: 'Ordering & Stock',
    q: 'Why is there no instant online payment at checkout?',
    a: 'Checkout submits an order request without charging you. Staff check stock, package details and the final total before providing the approved GCash or MariBank QR for your selected payment method. Pay only after staff confirm your order and payment instructions.',
  },
  {
    cat: 'Freshness & Dates',
    q: 'Are your Italian grocery items really authentic and fresh?',
    a: 'We source products in Italy and record batch and best-before details as stock is received. Eligible lots follow FEFO (First-Expired, First-Out) rules. Check the reviewed product information and ask staff for the current package dates before confirming your purchase.',
  },
  {
    cat: 'Freshness & Dates',
    q: 'Why do your Milano fragrances say "inspired scent"?',
    a: 'Inspired scents are sold under their own product names. They are not presented as designer-brand originals. Check each listing and package for the reviewed maker, origin and fragrance details.',
  },
  {
    cat: 'Delivery & Pickup',
    q: 'What are your delivery options and can I pick up in Manila?',
    a: 'You can request Metro Manila express delivery, provincial shipping, or pickup at our Manila hub. Staff confirm the courier, fee, packing and handover arrangements for your order. Submitting a request does not confirm a delivery date. For pickup, wait until staff tell you the order is ready.',
  },
  {
    cat: 'Delivery & Pickup',
    q: 'How are delivery rates calculated?',
    a: 'Standard delivery uses K2’s published regional and package-weight rates. Express delivery requires a staff quote for your actual route and parcel. Staff confirm any pending fee and your final total before payment; a courier estimate is not a confirmed delivery booking.',
  },
  {
    cat: 'Pasabuy & Flights',
    q: 'What is Pasabuy and how do scheduled flights work?',
    a: 'Pasabuy lets you request an item from Italy that is not in our regular catalog. Send a photo, product name, or link. Staff check sourcing, price, freight and the available flight schedule before confirming a quote. The request itself does not reserve stock or guarantee an arrival date.',
  },
  {
    cat: 'Wholesale & B2B',
    q: 'Can restaurants, cafés, or bakeries order at wholesale prices?',
    a: 'Restaurants, cafés and bakeries can submit an inquiry through our Wholesale portal or contact us directly. Staff confirm available products, quantities and applicable case or carton pricing. An inquiry does not reserve stock or confirm a wholesale order.',
  },
]

