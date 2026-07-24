// Plain-English knowledge base for the admin Dashboard Guide + Start-here flow.
// Single source of truth for "what is this / how do I / where is it" answers.
// No external AI, no live queries — accurate, honest, instant.

export const TOPICS = [
  {
    id: 'overview', section: 'overview', icon: '🏠', title: 'Home dashboard',
    keywords: ['dashboard', 'home', 'overview', 'what is this', 'main page', 'summary', 'what for'],
    what: "The Home screen is your daily snapshot — today's sales, orders waiting to pack, low-stock alerts and cargo status, plus a live map of every screen.",
    how: ['Start your shift here.', 'Read the four number tiles at the top.', 'Use Quick Jump or the map to reach any task.'],
    where: 'Sidebar → Home (top item).',
  },
  {
    id: 'metric_sales', section: 'overview', icon: '💰', title: "Metric: Today's sales",
    keywords: ["today's sales", 'todays sales', 'sales metric', 'revenue', 'gross'],
    what: "Today's sales is the total peso value of orders placed today across every channel (website, Shopee, Lazada, TikTok, VIP).",
    how: ['It updates live as orders come in.', 'Open Home → P&L for the profit breakdown.'],
    where: 'Home screen, first tile.',
  },
  {
    id: 'metric_pending', section: 'omni_hub', icon: '📦', title: 'Metric: Pending fulfilment',
    keywords: ['pending', 'pending fulfilment', 'pending fulfillment', 'waiting to pack', 'unpacked'],
    what: 'Pending fulfilment is how many paid orders are waiting to be packed and shipped right now.',
    how: ['If this is above 0, go pack them.', 'Open the Fulfilment Hub to clear the queue.'],
    where: 'Home tile → opens Fulfilment Hub.',
  },
  {
    id: 'metric_lowstock', section: 'inventory', icon: '⚠️', title: 'Metric: Low-stock alerts',
    keywords: ['low stock', 'low-stock', 'lowstock', 'running out', 'reorder', 'stock alert'],
    what: 'Low-stock alerts count products with 5 or fewer units left — items to reorder or source via Pasabuy soon.',
    how: ['Red means act soon.', 'Open Inventory to see which items and restock.'],
    where: 'Home tile → opens Inventory.',
  },
  {
    id: 'metric_skus', section: 'inventory', icon: '🔢', title: 'Metric: Active SKUs',
    keywords: ['active skus', 'skus', 'how many products', 'catalog size'],
    what: 'Active SKUs is the total number of products in your live catalog.',
    how: ['Open Inventory to browse or edit them.'],
    where: 'Home tile → opens Inventory.',
  },
  {
    id: 'fulfillment', section: 'omni_hub', icon: '🖨️', title: 'Packing & shipping (Fulfilment Hub)',
    keywords: ['pack', 'packing', 'ship', 'shipping', 'fulfil', 'fulfill', 'waybill', 'where do i pack', 'courier', 'scan order', 'start packing'],
    what: 'The Fulfilment Hub is where you pack and ship customer orders — scan each item (or type the SKU), verify the order, then print the courier waybill.',
    how: ['Open the order to pack.', 'Scan each item with the camera, or enter the SKU by hand.', 'Print the waybill and hand it to J&T / Lalamove / LEX.'],
    where: 'Sidebar → Fulfilment Hub.',
  },
  {
    id: 'custody', section: 'omni_hub', icon: '🛬', title: 'Receiving a cargo box',
    keywords: ['receive', 'custody', 'box arrived', 'handover', 'scan box', 'verify box', 'complete', 'lost item', 'box landed'],
    what: "When a box arrives at your hub, you confirm it arrived and scan its items to check everything matches the Italy packing list — so nothing was lost in transit. The verified items then become your custody stock, ready to sell.",
    how: ['Mark the box as arrived at your hub.', 'Scan each item to check it against the packing list.', 'Once it all checks out, the stock is yours to pack and ship.'],
    where: 'Fulfilment Hub → Box Handover.',
    more: 'No PIN — the scan is the confirmation. If a scan comes up short, the discrepancy check flags the missing item so you can report it. Stock stays in your own custody at your hub.',
  },
  {
    id: 'consignments', section: 'kanban', icon: '✈️', title: 'Flight consignments (box tracking)',
    keywords: ['flight', 'consignment', 'cargo', 'milan', 'mxp', 'track box', 'shipment', 'italy box', 'pack box', 'shipped'],
    what: 'A box is packed in Italy (each product scanned in), confirmed shipped, then tracked across the Milan → Philippines flight to the hub it is headed for.',
    how: ['In Italy: pack the box and scan each product into it — that builds its contents list.', 'Confirm the box as shipped once it is on the plane.', 'Track it to its destination hub for receiving.'],
    where: 'Sidebar → Flight Consignments.',
    more: 'Each box carries its scanned contents list, so the receiving hub can check on arrival that nothing was lost in transit.',
  },
  {
    id: 'inventory', section: 'inventory', icon: '📦', title: 'Inventory (products & stock)',
    keywords: ['inventory', 'products', 'stock', 'catalog', 'edit price', 'add product', 'sheet mode', 'csv'],
    what: 'Inventory is your master product catalog and stock levels. Sheet Mode lets you edit prices and stock like a spreadsheet.',
    how: ['Search or scroll to find a product.', 'Toggle Sheet mode to bulk-edit.', 'Use Upload CSV to add many at once.'],
    where: 'Sidebar → Inventory.',
  },
  {
    id: 'pasabuy', section: 'pasabuy_manager', icon: '🛍️', title: 'Pasabuy quotes',
    keywords: ['pasabuy', 'custom order', 'quote', 'source from italy', 'request', 'landed cost'],
    what: 'Pasabuy handles custom "buy-this-from-Italy" requests and works out the landed price for the customer.',
    how: ['Open the customer request and photo.', 'Enter the Italy cost and send the quote.', 'Once paid, it becomes a buy order for Milan.'],
    where: 'Sidebar → Pasabuy Quotes.',
  },
  {
    id: 'sourcing', section: 'sourcing', icon: '🧠', title: 'AI sourcing (draft products)',
    keywords: ['ai sourcing', 'draft product', 'review product', 'new product', 'ai suggestion', 'import suggestion'],
    what: 'AI Sourcing does the heavy writing for you. You enter only the essentials — name, brand, category, images, price, stock — and the AI drafts the description, SEO, tags, suggested uses and Filipino pairings for you to review.',
    how: ['Enter the basics: name, brand, category, images, price, stock.', 'Let the AI draft the description, tags and pairings.', 'Review, fix anything off, and approve to publish.'],
    where: 'Sidebar → AI Sourcing.',
    more: 'Straight from your business blueprint: staff focus on procurement and the essentials, and the AI handles the copywriting — so nobody writes product descriptions by hand.',
  },
  {
    id: 'suppliers', section: 'suppliers', icon: '🏬', title: 'Suppliers',
    keywords: ['supplier', 'vendor', 'purchase order', 'restock order'],
    what: 'Suppliers holds your vendor contacts and purchase orders — who you buy from and what has been ordered.',
    how: ['Keep supplier contacts up to date.', 'Raise a purchase order for a restock.', 'Mark orders received when cargo lands.'],
    where: 'Sidebar → Suppliers.',
  },
  {
    id: 'messages', section: 'inbox', icon: '📨', title: 'Messages',
    keywords: ['message', 'inbox', 'chat', 'whatsapp', 'viber', 'reply', 'customer message'],
    what: 'Messages is one inbox for WhatsApp, Facebook and Viber, with the AI ready to draft replies.',
    how: ['Reply to customer questions here.', 'Let the AI draft a reply, then edit it.', 'Turn a chat into an order or Pasabuy request.'],
    where: 'Sidebar → Messages.',
  },
  {
    id: 'customers', section: 'wholesale', icon: '💬', title: 'Customers & VIPs',
    keywords: ['customer', 'vip', 'wholesale', 'broadcast', 'crm', 'directory', 'order history'],
    what: 'Customers is your directory — order history, lifetime spend, VIP wholesale approvals, and mass Viber/email broadcasts.',
    how: ['Look up a customer to see their history.', 'Approve VIP / wholesale requests.', 'Send a targeted broadcast to bring buyers back.'],
    where: 'Sidebar → Customers.',
  },
  {
    id: 'coupons', section: 'coupons', icon: '🎟️', title: 'Coupons',
    keywords: ['coupon', 'voucher', 'discount', 'promo', 'promo code'],
    what: 'Coupons is where you create discount codes and voucher hunts to run promotions.',
    how: ['Create a code with its discount and limits.', 'Set the expiry date.', 'Share it with customers.'],
    where: 'Sidebar → Coupons.',
  },
  {
    id: 'staff', section: 'staff_permissions', icon: '👑', title: 'Staff & roles (PINs)',
    keywords: ['staff', 'role', 'pin', 'permission', 'access', 'add staff', 'sign in'],
    what: 'Staff & Roles is where you create staff PINs and decide who can see or change what. This powers the login gate.',
    how: ['Add a staff member and give them a PIN.', 'Pick their role / permissions.', 'Remove access the moment someone leaves.'],
    where: 'Sidebar → Settings → Staff & Roles.',
  },
  {
    id: 'channels', section: 'integrations', icon: '🔄', title: 'Channels & API keys',
    keywords: ['channel', 'api key', 'shopee', 'lazada', 'tiktok', 'meta', 'sync', 'integration'],
    what: 'Channels & Keys keeps stock and orders in sync with Shopee, Lazada, TikTok Shop and Meta.',
    how: ['Mostly setup — paste marketplace API keys here.', 'If a channel stops syncing, re-check its key.'],
    where: 'Sidebar → Settings → Channels & Keys.',
  },
  {
    id: 'globe', section: 'globe', icon: '🌐', title: 'Globe display',
    keywords: ['globe', '3d map', 'storefront display', 'featured products'],
    what: 'Globe Display controls which products appear on the public 3D map on your storefront.',
    how: ['Pick which products feature on the globe.', 'Reorder or hide items, then save.'],
    where: 'Sidebar → Settings → Globe Display.',
  },
  {
    id: 'tools', section: null, icon: '⚙️', title: 'The tools gear (calculator etc.)',
    keywords: ['calculator', 'tool', 'gear', 'margin', 'convert', 'vat', 'exchange rate', 'clock', 'weight'],
    what: 'The floating ⚙️ gear is your utility belt — calculator, margin, cargo weight, unit/VAT converters, a Milan/Manila clock and EUR→PHP rate.',
    how: ['Drag the gear anywhere on screen.', 'Click it and pick a tool.'],
    where: 'Floating gear button (bottom-right by default).',
  },
]

// Ordered "do this, then this" daily walkthrough for new staff.
export const DAILY_FLOW = [
  { icon: '🔒', title: 'Sign in', body: 'Enter your 4-digit staff PIN (or Google / master passcode). Your role decides which screens you can open.', section: 'staff_permissions' },
  { icon: '🏠', title: 'Check Home', body: "Read the four tiles: today's sales, orders to pack, low-stock, active SKUs. This is your to-do at a glance.", section: 'overview' },
  { icon: '🔔', title: 'Clear daily tasks', body: 'Tap the 🔔 in the top bar for the day’s reminders — expiring stock and orders waiting.', section: null },
  { icon: '🛬', title: 'Receive arrived boxes', body: 'If a box has arrived at your hub, mark it arrived and scan the items to check nothing is missing — then they become your custody stock.', section: 'omni_hub', more: 'The scan checks the box against its Italy packing list. Any shortfall is flagged by the discrepancy check.' },
  { icon: '🖨️', title: 'Pack pending orders', body: 'In the Fulfilment Hub, open each pending order, scan the items (or type the SKU), then print the courier waybill.', section: 'omni_hub' },
  { icon: '📦', title: 'Restock low items', body: 'Check low-stock alerts in Inventory; reorder from Suppliers or raise a Pasabuy sourcing request.', section: 'inventory' },
  { icon: '📨', title: 'Answer messages', body: 'Reply to customers in Messages (WhatsApp/Viber). The AI can draft replies for you.', section: 'inbox' },
  { icon: '✈️', title: 'Quote Pasabuy requests', body: 'Handle custom "buy-from-Italy" requests in Pasabuy Quotes and send landed-cost quotes.', section: 'pasabuy_manager' },
]

// Match a free-text question to the best topic. Returns { ok, topic }.
export function answerQuestion(query) {
  const q = (query || '').toLowerCase()
  if (!q.trim()) return { ok: false }

  let best = null
  let bestScore = 0
  for (const t of TOPICS) {
    let score = 0
    for (const kw of t.keywords) if (q.includes(kw)) score += kw.length > 6 ? 2 : 1
    if (t.title && q.includes(t.title.toLowerCase())) score += 3
    if (score > bestScore) { bestScore = score; best = t }
  }
  return bestScore > 0 ? { ok: true, topic: best } : { ok: false }
}
