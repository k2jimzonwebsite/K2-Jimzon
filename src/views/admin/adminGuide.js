// Retrieval-first operations knowledge for the admin guide.
// This is intentionally deterministic and local: it can cite K2's approved
// rules without pretending that an external AI or live channel is connected.

const RULEBOOK = 'Operations Rulebook'

export const TOPICS = [
  {
    id: 'overview', section: 'overview', category: 'Workspace', title: 'Command center',
    keywords: ['dashboard', 'home', 'overview', 'priority', 'start shift', 'what needs attention'],
    what: 'The Command center is the staff action center for verified website activity and operational exceptions. A missing metric is a setup or query warning, not automatically zero.',
    how: ['Start each shift here.', 'Open the highest-risk exception queue first.', 'Drill into the source records before acting.'],
    where: 'Sidebar → Command center.', source: `${RULEBOOK} §20–21`,
  },
  {
    id: 'shortcuts', section: null, category: 'Workspace', title: 'Keyboard shortcuts',
    keywords: ['shortcut', 'keyboard', 'hotkey', 'quick key', 'faster', 'ctrl k', 'alt s', 'go to'],
    what: 'Keyboard shortcuts open tools and workspaces quickly, but they do not bypass permissions, confirmations, exact scans, or server validation.',
    how: ['Press Ctrl/⌘ + K to search.', 'Press Alt + S for the Scan center.', 'Press ? to see every shortcut.', 'Use G then a destination key to move between workspaces.'],
    where: 'Available throughout the admin while focus is not inside a text field.', source: `${RULEBOOK} §22–24`,
  },
  {
    id: 'scan_center', section: null, category: 'Scanning', title: 'Scan center',
    keywords: ['scan center', 'scanner', 'barcode', 'camera', 'scan product', 'what scan'],
    what: 'The Scan center is one safe entry point for product research, order packing, Milan packing, Manila receiving, and inventory lookup. It routes to the correct record-first workflow.',
    how: ['Open it with Alt + S or the Scan button.', 'Choose the operation, not only the barcode type.', 'Select the order, flight, or box before operational unit scans.'],
    where: 'Top bar → Scan, or Alt + S.', source: `${RULEBOOK} §9, §14, §24`,
    more: 'A camera barcode, USB scanner, and typed code all represent the same scan input. Camera denial must leave typed entry available.',
  },
  {
    id: 'new_product', section: 'inventory', category: 'Product master', title: 'Research and add a new product',
    keywords: ['new product', 'add product', 'product prompt', 'ai prompt', 'smart paste', 'packaging photo', 'ingredients', 'allergen', 'usage'],
    what: 'A barcode scan can prepare an evidence-first research prompt. The result is a draft only: staff must review identity, variant, sources, claims, images, and required fields before publishing.',
    how: ['Scan the barcode or enter the product name.', 'Choose the research focus and copy the generated prompt.', 'Attach clear packaging photos to the research tool.', 'Paste the returned JSON into Smart Paste.', 'Review the draft and its evidence before saving or publishing.'],
    where: 'Scan center → New product research, or Inventory → Scan product.', source: `${RULEBOOK} §6`,
    more: 'Product import never creates inventory quantity. Stock enters through receiving or a controlled, audited adjustment.',
  },
  {
    id: 'product_variants', section: 'inventory', category: 'Product master', title: 'Similar-looking variants',
    keywords: ['variant', 'same design', 'similar product', 'concentration', 'size', 'flavor', 'shade', 'pack count', 'wrong sku'],
    what: 'Different concentration, size, flavor, shade, formulation, or pack count must use different SKUs even when the packaging looks almost identical.',
    how: ['Use the manufacturer barcode when it uniquely identifies the variant.', 'Create a K2 internal code when a barcode is shared or unreliable.', 'Never identify a similar variant by eyesight alone.'],
    where: 'Inventory product master and every scanning workflow.', source: `${RULEBOOK} §6, §9`,
  },
  {
    id: 'inventory', section: 'inventory', category: 'Inventory', title: 'Product catalog and stock',
    keywords: ['inventory', 'products', 'stock', 'catalog', 'price', 'sheet mode', 'csv', 'batch', 'expiry', 'lot'],
    what: 'Inventory combines the stable product master with persisted stock and lot evidence. Available stock is derived from controlled quantities; it must not be typed as an unsupported number.',
    how: ['Search by SKU, product, barcode, or origin.', 'Use exception filters for out-of-stock, low-stock, expiry risk, and drafts.', 'Open the exact SKU or batch before making a controlled change.'],
    where: 'Sidebar → Inventory.', source: `${RULEBOOK} §3, §5–6`,
  },
  {
    id: 'flight_consignment', section: 'consignment', category: 'Flights', title: 'Flight consignments',
    keywords: ['flight', 'consignment', 'cargo', 'milan', 'manila', 'italy box', 'manifest', 'arrive', 'receive', 'reconcile'],
    what: 'A consignment preserves the complete flight → box → manifest line → scan → receipt trail. Milan establishes packed counts; Manila performs a separate physical recount.',
    how: ['Create or select the flight and exact box.', 'Scan every packed unit in Milan.', 'Seal and mark transit only through valid states.', 'On arrival, independently scan every unit in Manila.', 'Classify discrepancies, then finalize accepted inventory exactly once.'],
    where: 'Sidebar → Flight Consignments.', source: `${RULEBOOK} §7, §9`,
  },
  {
    id: 'milan_scanning', section: 'consignment', category: 'Scanning', title: 'Milan box packing scans',
    keywords: ['milan scan', 'pack italy', 'expected count', 'seal box', 'overage', 'shortage'],
    what: 'In Milan, one product scan increments one matching line by one inside the selected flight and box. Wrong or excessive scans are exceptions, not accepted stock.',
    how: ['Select the flight and box first.', 'Scan each physical unit once.', 'Watch expected, scanned, remaining, wrong-item, and overage counts.', 'Acknowledge any unresolved difference before sealing.'],
    where: 'Flight Consignments → select manifest → Milan scanner.', source: `${RULEBOOK} §9`,
  },
  {
    id: 'manila_scanning', section: 'consignment', category: 'Scanning', title: 'Manila receiving scans',
    keywords: ['manila scan', 'manila', 'receive box', 'recount', 'arrives', 'arrival count', 'missing item', 'damage', 'quarantine', 'discrepancy'],
    what: 'Manila receiving is an independent observation. It never copies Milan totals. Questionable, damaged, unknown-expiry, or short-life units remain exceptions or quarantined until resolved.',
    how: ['Select the arriving flight and box.', 'Scan every physical unit again.', 'Compare expected, packed, and received counts.', 'Classify discrepancies and finalize only accepted inventory.'],
    where: 'Flight Consignments → select manifest → Manila scanner.', source: `${RULEBOOK} §9`,
  },
  {
    id: 'fulfillment', section: 'omni_hub', category: 'Orders', title: 'Order packing and fulfillment',
    keywords: ['pack order', 'fulfillment', 'fulfilment', 'ship', 'waybill', 'courier', 'wrong item', 'pick order'],
    what: 'Packing is order-first. Staff opens or scans one exact order, marketplace waybill, or K2 packing QR, then records one immutable scan for every required unit.',
    how: ['Confirm and reserve the request first.', 'Open the exact order before product scanning.', 'Scan quantity five five times unless an authorized audited bulk count exists.', 'Complete only after every expected line reconciles.'],
    where: 'Sidebar → Fulfillment Hub.', source: `${RULEBOOK} §12–14`,
    more: 'A product scan alone never chooses an order globally. Direct website orders use a K2 packing QR until courier booking creates a real waybill.',
  },
  {
    id: 'waybills', section: 'omni_hub', category: 'Orders', title: 'Waybills and delivery labels',
    keywords: ['waybill', 'label', 'print', 'shipping label', 'delivery label', 'tracking'],
    what: 'Marketplace labels come from the marketplace. Direct website and Pasabuy orders receive a real courier waybill only after booking; before that, K2 uses an internal packing QR.',
    how: ['Use the marketplace Seller Center until its waybill API is connected.', 'For direct orders, record the communicated courier quote and customer confirmation.', 'Print a real courier label only after the booking returns it.'],
    where: 'Fulfillment Hub and the relevant Seller Center/courier.', source: `${RULEBOOK} §13–14`,
  },
  {
    id: 'pasabuy', section: 'pasabuy_manager', category: 'Pasabuy', title: 'Pasabuy requests and quotes',
    keywords: ['pasabuy', 'custom order', 'quote', 'source italy', 'landed cost', 'markup', 'customer request'],
    what: 'Pasabuy is a request-and-sourcing case, not ordinary cart checkout. The system may show cost components, but the owner chooses each final price based on the specific case.',
    how: ['Record the customer request and missing information.', 'Research the exact item and costs.', 'Save a versioned quote and owner rationale.', 'Record customer acceptance before purchase.', 'Track purchase, flight, receipt, allocation, and delivery as separate facts.'],
    where: 'Sidebar → Pasabuy Quotes.', source: `${RULEBOOK} §8, §17`,
  },
  {
    id: 'channels', section: 'integrations', category: 'Channels', title: 'Marketplace channel readiness',
    keywords: ['channel', 'api', 'shopee', 'lazada', 'tiktok', 'connector', 'sync', 'listing'],
    what: 'Website, Pasabuy, Shopee, TikTok Shop, and Lazada eventually normalize into canonical orders. Credentials, order capture, listings, stock sync, messages, waybills, and health remain separate capabilities.',
    how: ['Prepare complete catalog drafts now.', 'Keep secrets only in backend secret storage.', 'Enable one approved API capability at a time.', 'Mark a capability ready only after a real operation is reconciled.'],
    where: 'Sidebar → Channel Readiness.', source: `${RULEBOOK} §11`,
    more: 'One successful webhook does not mean the entire channel is live. Until adapters exist, use the Seller Centers and record only verified facts.',
  },
  {
    id: 'messages', section: 'inbox', category: 'Communication', title: 'Messages and customer communication',
    keywords: ['message', 'inbox', 'chat', 'reply', 'customer communication', 'shopee message', 'lazada message', 'tiktok message'],
    what: 'Messages displays persisted conversation records. A copied draft is not sent, and external channel delivery cannot be claimed until its connector confirms delivery.',
    how: ['Review persisted conversations and internal notes.', 'Use the verified external customer channel while connectors are unavailable.', 'Record decisions and link them to the relevant order, Pasabuy request, or exception.'],
    where: 'Sidebar → Messages.', source: `${RULEBOOK} §19`,
  },
  {
    id: 'coupons', section: 'coupons', category: 'Sales', title: 'Coupons and vouchers',
    keywords: ['coupon', 'voucher', 'discount', 'promo', 'redemption', 'campaign'],
    what: 'Coupons use database-backed terms, limits, validity, and status. The order keeps a snapshot, and redemption occurs with confirmation rather than trusting the browser.',
    how: ['Create the campaign rules.', 'Review dates, minimum spend, limits, and status.', 'Confirm orders through the controlled server workflow.'],
    where: 'Sidebar → Coupons.', source: `${RULEBOOK} §18`,
  },
  {
    id: 'suppliers', section: 'suppliers', category: 'Supply', title: 'Suppliers and purchase orders',
    keywords: ['supplier', 'vendor', 'purchase order', 'po', 'restock order'],
    what: 'Suppliers records who K2 buys from and the purchase commitments that precede packing into flight boxes. Estimated and actual quantities and costs remain distinct.',
    how: ['Maintain supplier identity and contact evidence.', 'Record the purchase commitment.', 'Capture actual purchased quantities and costs.', 'Link received units through the consignment workflow.'],
    where: 'Sidebar → Suppliers.', source: `${RULEBOOK} §7, §17`,
  },
  {
    id: 'customers', section: 'wholesale', category: 'Customers', title: 'Customers and channel identities',
    keywords: ['customer', 'profile', 'identity', 'vip', 'wholesale', 'directory'],
    what: 'Customer profiles hold registered identities. Cross-channel identity linking must preserve the original records and require staff confirmation when uncertain.',
    how: ['Search the registered profile.', 'Verify the contact or channel identity.', 'Link operational records without deleting original channel history.'],
    where: 'Sidebar → Customers.', source: `${RULEBOOK} §3, §19`,
  },
  {
    id: 'custody', section: 'omni_hub', category: 'Inventory', title: 'Stock custody transfers',
    keywords: ['custody', 'transfer stock', 'handover stock', 'location', 'custodian', 'move stock', 'receiver'],
    what: 'A custody transfer moves an exact quantity from one lot, location, and custodian to another. Offered units cannot be sold or transferred again while acceptance is pending.',
    how: ['Select the exact source lot and quantity.', 'Record destination and reason.', 'Let the receiver accept or reject when that control is enabled.', 'Verify the immutable transfer history.'],
    where: 'Fulfillment Hub → custody and handover tools.', source: `${RULEBOOK} §10`,
  },
  {
    id: 'expiry_fefo', section: 'inventory', category: 'Inventory', title: 'Expiry control and FEFO',
    keywords: ['expiry', 'expired', 'fefo', 'shelf life', 'clearance', 'batch date', 'first expire'],
    what: 'FEFO selects the earliest eligible lot, not simply the oldest row. Expired, damaged, quarantined, unavailable, wrong-location, wrong-custody, and unknown-date expiry-tracked lots are excluded.',
    how: ['Correct missing batch or expiry evidence.', 'Use ordinary sale only at 90 or more days by default.', 'Use an approved disclosed clearance path for 31–89 days.', 'Do not sell 0–30 day, expired, or unknown-date expiry-tracked stock.'],
    where: 'Inventory → expiry exceptions and batch details.', source: `${RULEBOOK} §5`,
  },
  {
    id: 'website_orders', section: 'omni_hub', category: 'Orders', title: 'Direct website order requests',
    keywords: ['website order', 'direct order', 'order request', 'checkout', 'confirm order', 'reserve stock'],
    what: 'Until payment and courier APIs exist, website checkout creates an order request. Submission does not mean paid and does not reserve stock; confirmation revalidates the request and reserves eligible stock atomically.',
    how: ['Review the submitted request.', 'Confirm customer details, price, discount, delivery state, and eligible stock.', 'Use the server confirmation workflow.', 'Proceed to order-first packing only after confirmation.'],
    where: 'Fulfillment Hub → website requests.', source: `${RULEBOOK} §12, §14`,
  },
  {
    id: 'payments', section: 'omni_hub', category: 'Finance', title: 'Payment evidence and verification',
    keywords: ['payment', 'paid', 'proof', 'receipt', 'verify payment', 'refund', 'settlement'],
    what: 'Payment evidence is separate from verified payment. A screenshot or customer submission cannot count as paid revenue until an authorized verifier confirms the method, amount, reference, and evidence.',
    how: ['Record evidence without marking paid.', 'Review the amount, method, payer, reference, and proof.', 'Have an authorized staff member verify or reject it.', 'Keep marketplace payout settlement separate.'],
    where: 'Payment controls remain partial; use the linked order record and verified manual process.', source: `${RULEBOOK} §16`,
  },
  {
    id: 'customer_exceptions', section: 'inbox', category: 'Exceptions', title: 'Returns, cancellations, refunds, and failed delivery',
    keywords: ['return', 'cancel', 'cancellation', 'exchange', 'refund', 'failed delivery', 'complaint', 'exception'],
    what: 'K2 has no universal automatic outcome for customer exceptions. Each case links communication, evidence, an authorized decision, stock disposition, financial effect, and final outcome.',
    how: ['Open or record the customer conversation.', 'Gather evidence and link the order or fulfillment.', 'Propose a resolution without promising approval.', 'Record the authorized decision and resulting stock/payment actions.'],
    where: 'Messages and the linked operational record; a dedicated case workspace is still future work.', source: `${RULEBOOK} §15`,
  },
  {
    id: 'failure_retry', section: null, category: 'Safety', title: 'Failures, retries, and duplicate prevention',
    keywords: ['failed', 'error', 'retry', 'timeout', 'duplicate', 'double scan', 'idempotent', 'offline'],
    what: 'A timeout is not proof of success or failure. Before retrying an inventory, payment, receiving, connector, or fulfillment action, check server truth and preserve its idempotency key or record context.',
    how: ['Keep the exact record open.', 'Read the visible server error.', 'Refresh or verify persisted truth.', 'Retry only through the guarded action; never recreate the record blindly.'],
    where: 'Applies throughout the admin.', source: `${RULEBOOK} §24`,
  },
  {
    id: 'staff', section: 'staff_permissions', category: 'Security', title: 'Staff roles and permissions',
    keywords: ['staff', 'role', 'permission', 'access', 'invite', 'security', 'mfa'],
    what: 'Staff access uses real authenticated sessions and server-enforced roles. Sensitive actions require the minimum capability, confirmation, reason, and an audit event.',
    how: ['Invite the staff identity.', 'Assign the minimum role needed.', 'Verify privileged access and remove it promptly when no longer needed.'],
    where: 'Sidebar → Staff & Roles.', source: `${RULEBOOK} §22–23`,
  },
  {
    id: 'globe', section: 'globe', category: 'Storefront', title: '3D globe display',
    keywords: ['globe', '3d map', 'storefront display', 'featured product'],
    what: 'Globe Display controls public storefront presentation. It does not change stock, publication readiness, or channel availability.',
    how: ['Choose only reviewed products.', 'Reorder or hide display items.', 'Verify the public globe after saving.'],
    where: 'Sidebar → Globe Display.', source: 'System Brain Current → Storefront presentation',
  },
]

export const DAILY_FLOW = [
  { title: 'Sign in securely', body: 'Use an invited staff account. Permissions remain server-enforced.', section: 'staff_permissions' },
  { title: 'Check the Command center', body: 'Review verified activity and operational exception queues.', section: 'overview' },
  { title: 'Clear alerts', body: 'Review expiring stock and work waiting for attention.', section: null },
  { title: 'Receive arrived boxes', body: 'Select the exact flight and box, then independently scan each unit in Manila and reconcile differences.', section: 'consignment', more: 'Accepted inventory is finalized exactly once. Questionable units stay in an exception or quarantine path.' },
  { title: 'Pack confirmed orders', body: 'Open the exact order first, then scan every physical unit and reconcile its expected lines.', section: 'omni_hub' },
  { title: 'Review inventory risks', body: 'Work through out-of-stock, low-stock, expiry, and draft product exceptions.', section: 'inventory' },
  { title: 'Review messages', body: 'Use persisted conversation records and verified external channels until channel messaging APIs are connected.', section: 'inbox' },
  { title: 'Process Pasabuy cases', body: 'Keep request, quote, owner-selected price, purchase, shipment, receipt, and settlement facts separate.', section: 'pasabuy_manager' },
]

const normalize = value => (value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export function searchGuide(query, { section, limit = 3 } = {}) {
  const normalizedQuery = normalize(query)
  const tokens = normalizedQuery.split(' ').filter(token => token.length > 1)
  if (!normalizedQuery) {
    return TOPICS
      .map(topic => ({ topic, score: topic.section === section ? 2 : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.topic)
  }

  return TOPICS
    .map(topic => {
      const title = normalize(topic.title)
      const haystack = normalize([topic.title, topic.category, topic.what, topic.where, ...(topic.keywords || [])].join(' '))
      let score = topic.section === section ? 1 : 0
      if (title === normalizedQuery) score += 15
      if (title.includes(normalizedQuery)) score += 8
      for (const keyword of topic.keywords || []) {
        const normalizedKeyword = normalize(keyword)
        if (normalizedQuery.includes(normalizedKeyword)) score += normalizedKeyword.length > 6 ? 6 : 3
      }
      for (const token of tokens) {
        if (title.includes(token)) score += 3
        else if (haystack.includes(token)) score += 1
      }
      return { topic, score }
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.topic.title.localeCompare(b.topic.title))
    .slice(0, limit)
    .map(result => result.topic)
}

export function answerQuestion(query, options = {}) {
  const matches = searchGuide(query, options)
  return matches.length ? { ok: true, topic: matches[0], topics: matches } : { ok: false, topics: [] }
}
