// Plain-English knowledge base for the admin Dashboard Guide + Start-here flow.
// Single source of truth for "what is this / how do I / where is it" answers.
// No external AI, no live queries — accurate, honest, instant.

export const TOPICS = [
  {
    id: 'overview', section: 'overview', icon: '🏠', title: 'Home dashboard',
    keywords: ['dashboard', 'home', 'overview', 'what is this', 'main page', 'summary', 'what for'],
    what: "The Home screen is a database-backed action center for verified website sales, submitted order requests, Pasabuy cases, expiry risks, and channel readiness.",
    how: ['Start your shift here.', 'Review the four exception queues.', 'Treat missing launch-core data as a setup warning, not a zero.'],
    where: 'Sidebar → Home (top item).',
  },
  {
    id: 'metric_sales', section: 'overview', icon: '💰', title: "Metric: Today's sales",
    keywords: ["today's sales", 'todays sales', 'sales metric', 'revenue', 'gross'],
    what: "Today's verified sales is the peso value of website order requests whose payment status was explicitly verified today. Marketplace sales are excluded until their connectors are live.",
    how: ['Do not count submitted requests as revenue.', 'Reconcile marketplace revenue in the Seller Centers until connectors are enabled.'],
    where: 'Home screen, first tile.',
  },
  {
    id: 'metric_pending', section: 'omni_hub', icon: '📦', title: 'Metric: Pending fulfilment',
    keywords: ['pending', 'pending fulfilment', 'pending fulfillment', 'waiting to pack', 'unpacked'],
    what: 'Pending fulfilment is the number of confirmed order lines waiting to be packed. Payment is tracked separately.',
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
    what: 'The Fulfilment Hub reviews submitted website requests, reserves stock atomically after confirmation, and records packing scans.',
    how: ['Confirm the customer and stock first.', 'Scan or type each SKU to mark its line packed.', 'Print only the internal packing record, then attach the real marketplace or courier label.'],
    where: 'Sidebar → Fulfilment Hub.',
  },
  {
    id: 'custody', section: 'omni_hub', icon: '📥', title: 'Your custody stock',
    keywords: ['custody', 'my stock', 'box handover', 'handover', 'my items', 'stock i hold', 'hub stock'],
    what: 'Once a received box has been scan-verified, its items become your custody stock in the Fulfilment Hub — the stock you personally hold at your hub and ship customer orders from.',
    how: ['Open Fulfilment Hub → Box Handover to see the stock credited to you.', 'Pack customer orders from your custody stock.', 'Transfer items to another staff member if needed.'],
    where: 'Fulfilment Hub → Box Handover.',
    more: 'The launch core uses one shared master balance and records which staff member or hub holds each physical batch. Channel allocations can be added later without creating separate stock truths.',
  },
  {
    id: 'consignments', section: 'kanban', icon: '✈️', title: 'Flight consignments (pack, ship, receive)',
    keywords: ['flight', 'consignment', 'cargo', 'milan', 'mxp', 'track box', 'shipment', 'italy box', 'pack box', 'shipped', 'receive', 'scan box', 'arrived', 'verify', 'discrepancy', 'lost item'],
    what: "Flight Consignments is the box's whole journey: packed in Italy (each product scanned in), confirmed shipped, then scanned again on arrival in the Philippines to verify nothing was lost in transit.",
    how: ['In Italy: pack the box and scan each product into it — that builds its contents list.', 'Confirm the box as shipped once it is on the plane.', 'On arrival at the hub, scan the items to check them against the packing list.', 'Any shortfall is flagged by the discrepancy check.'],
    where: 'Sidebar → Flight Consignments → Italy ✈ Manila Manifests.',
    more: "Both the Italy packing scanner and the Manila receiving scanner use the device camera. Verified items then move to the receiver's custody stock in the Fulfilment Hub.",
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
    how: ['Open the persisted customer request.', 'Record the Italy cost, FX source, freight, tax, and quote validity.', 'Copy the saved quote to the verified customer channel, then record approval before purchasing.'],
    where: 'Sidebar → Pasabuy Quotes.',
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
    what: 'Messages shows conversations that have actually reached the database. External messaging connectors are not enabled yet.',
    how: ['Review only persisted conversation rows.', 'Verify any drafted reply before use.', 'Use the customer’s verified contact channel until connectors are live.'],
    where: 'Sidebar → Messages.',
  },
  {
    id: 'customers', section: 'wholesale', icon: '💬', title: 'Customers & VIPs',
    keywords: ['customer', 'profile', 'directory', 'registered'],
    what: 'Customers lists real registered profiles. Wholesale pricing and broadcasts are not enabled in Step 1.',
    how: ['Use the directory to confirm whether a profile exists.', 'Manage staff access separately in Staff & Roles.', 'Use verified external contact channels for customer follow-up.'],
    where: 'Sidebar → Customers.',
  },
  {
    id: 'staff', section: 'staff_permissions', icon: '👑', title: 'Staff & roles',
    keywords: ['staff', 'role', 'permission', 'access', 'add staff', 'sign in'],
    what: 'Staff & Roles is where you invite authenticated staff and assign server-enforced roles.',
    how: ['Invite the staff email.', 'Pick the minimum role needed.', 'Remove access the moment someone leaves.'],
    where: 'Sidebar → Settings → Staff & Roles.',
  },
  {
    id: 'channels', section: 'integrations', icon: '🔄', title: 'Channels & API keys',
    keywords: ['channel', 'api key', 'shopee', 'lazada', 'tiktok', 'meta', 'sync', 'integration'],
    what: 'Channel readiness shows Website, Pasabuy, Shopee, TikTok Shop, and Lazada status plus catalog gaps. Marketplace connectors are not enabled yet.',
    how: ['Prepare catalog rows as drafts.', 'Keep marketplace secrets in backend function secrets only.', 'Mark a channel operational only after reconciling a real event.'],
    where: 'Sidebar → Channel readiness.',
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
  { icon: '🔒', title: 'Sign in', body: 'Use an invited staff account and complete authenticator verification when required. Database policies enforce the role.', section: 'staff_permissions' },
  { icon: '🏠', title: 'Check Home', body: 'Review verified website sales and the order, Pasabuy, expiry, and listing exception queues.', section: 'overview' },
  { icon: '🔔', title: 'Clear daily tasks', body: 'Tap the 🔔 in the top bar for the day’s reminders — expiring stock and orders waiting.', section: null },
  { icon: '🛬', title: 'Receive arrived boxes', body: 'If a box has arrived at your hub, open Flight Consignments → Manifests and scan the items to check nothing is missing. Verified items become your custody stock in the Fulfilment Hub.', section: 'kanban', more: 'The Manila scanner checks the box against its Italy packing list. Any shortfall is flagged by the discrepancy check.' },
  { icon: '🖨️', title: 'Pack pending orders', body: 'In the Fulfilment Hub, confirm the request, scan each line, and print the internal packing record. Generate the real courier label in the courier or Seller Center.', section: 'omni_hub' },
  { icon: '📦', title: 'Restock low items', body: 'Check low-stock alerts in Inventory; reorder from Suppliers or raise a Pasabuy sourcing request.', section: 'inventory' },
  { icon: '📨', title: 'Review messages', body: 'Review persisted conversation records and prepare a safe internal reply template. Use the verified external customer channel until connectors are live.', section: 'inbox' },
  { icon: '✈️', title: 'Quote Pasabuy requests', body: 'Save versioned landed-cost quotes, then copy the approved wording to the customer’s verified contact channel.', section: 'pasabuy_manager' },
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
