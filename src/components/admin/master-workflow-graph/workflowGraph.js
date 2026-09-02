/**
 * Master workflow GRAPH — the connective layer over workflowData.js
 *
 * Why this file exists
 * -------------------
 * `workflowData.js` holds 39 richly-described operational nodes across seven
 * workflows. What it never held was a single edge. The old canvas drew a line
 * from node N to node N+1 in DOM order, so the seven workflows rendered as seven
 * isolated straight lines and the six `decision` nodes could not actually branch —
 * a decision that cannot fork is a label, not a decision.
 *
 * In real operations these workflows are one connected system: a Milan box splits
 * at Manila into existing-SKU and new-product paths, both converge on the same
 * commit step, committed stock is what an order picks from, what a monthly count
 * audits, and what a custody handover moves. Pasabuy goods ride the same monthly
 * flight as consignment stock.
 *
 * This file expresses that. Nodes keep their canonical id, gain an explicit
 * upstream/downstream relationship, and carry grounding evidence pointing at the
 * real screens and database functions that implement them.
 *
 * Nothing here duplicates node content. `workflowData.js` remains the single
 * source of node copy, checklists, rules, and simulations.
 */

import { WORKFLOWS, WORKFLOW_SECTIONS } from './workflowData'

/** The one node every operator actually starts from. */
export const ENTRY_NODE_ID = 'admin.entry'

/**
 * Edge kinds carry meaning, and the canvas renders each differently.
 * - `sequence`  the ordinary next step inside one workflow
 * - `branch`    a decision fork; `condition` states which way and why
 * - `converge`  separate paths rejoining one shared step
 * - `enables`   a completed state that makes another workflow possible later,
 *               rather than a step an operator walks immediately
 * - `loopback`  a failure or rework path returning to an earlier step
 */
export const EDGE_KINDS = Object.freeze({
  SEQUENCE: 'sequence',
  BRANCH: 'branch',
  CONVERGE: 'converge',
  ENABLES: 'enables',
  LOOPBACK: 'loopback',
})

/**
 * The entry node is synthetic — it is the admin dashboard itself, not an
 * operational step — so it is defined here rather than in workflowData.js.
 */
export const ENTRY_NODE = {
  id: ENTRY_NODE_ID,
  type: 'entry',
  title: 'Open Admin BOS',
  actor: 'Any authorized staff member',
  location: 'Admin dashboard, after sign-in',
  short: 'Every operational path in the business starts here.',
  summary:
    'Signing in to Admin BOS is the single entrance to every workflow below. What an operator can reach from here depends on their role, hub, and assignment — the graph shows the whole system, not the subset any one person may act on.',
  checklist: [
    'Confirm you are signed in as the correct staff identity before acting.',
    'Pick the workflow that matches the physical situation in front of you, not the one you ran last time.',
  ],
  rules: [
    'Role, hub, and assignment decide what is permitted. Seeing a step in this map is not authorization to perform it.',
  ],
  grounding: [
    { kind: 'route', ref: '/admin-portal-k2-secure' },
    { kind: 'component', ref: 'src/views/admin/Admin.jsx' },
    { kind: 'component', ref: 'src/views/admin/Overview.jsx' },
  ],
}

/**
 * Grounding evidence — which real screen or database function implements a node.
 * Every ref below was verified to exist in the repository. Keep it that way: a
 * map that points at code which is not there is worse than one that admits a gap.
 */
export const NODE_GROUNDING = {
  // Channel intake. Several of these nodes describe work that has no
  // implementation yet; where that is the case the grounding names the screen
  // that records the *absence* rather than inventing a module.
  ch_1: [{ kind: 'screen', ref: 'src/views/admin/ChannelIntegrations.jsx' }],
  ch_2: [
    { kind: 'screen', ref: 'src/views/admin/ChannelIntegrations.jsx' },
    { kind: 'table', ref: 'channel_credentials.encrypted_payload' },
  ],
  ch_3: [
    { kind: 'component', ref: 'supabase/functions/shopee-webhook/index.ts' },
    { kind: 'component', ref: 'supabase/functions/shopee-webhook/validation.js' },
    { kind: 'rpc', ref: 'capture_shopee_event_v1()' },
  ],
  ch_4: [
    { kind: 'table', ref: 'order_requests.channel_source' },
    { kind: 'table', ref: 'channel_listings.channel_source' },
  ],
  ch_5: [
    { kind: 'screen', ref: 'src/views/admin/InventoryGrid.jsx' },
    { kind: 'table', ref: 'channel_listings.external_item_id' },
  ],
  ch_6: [
    { kind: 'table', ref: 'inventory_reservations.packed_quantity' },
    { kind: 'table', ref: 'product_batches.quantity_available' },
  ],
  ch_7: [
    { kind: 'screen', ref: 'src/views/admin/Inbox.jsx' },
    { kind: 'component', ref: 'src/lib/channelMeta.js' },
  ],
  ch_8: [
    { kind: 'screen', ref: 'src/views/admin/ChannelIntegrations.jsx' },
    { kind: 'rpc', ref: 'verify_internal_channel_event()' },
    { kind: 'table', ref: 'channel_connections.status' },
  ],
  cb_1: [{ kind: 'screen', ref: 'src/views/admin/Kanban.jsx' }],
  cb_2: [
    { kind: 'screen', ref: 'src/views/admin/ConsignmentManager.jsx' },
    { kind: 'rpc', ref: 'create_consignment_manifest()' },
    { kind: 'rpc', ref: 'add_consignment_item_v2()' },
    { kind: 'rpc', ref: 'record_packing_scan()' },
  ],
  cb_3: [{ kind: 'table', ref: 'consignments.flight_number' }],
  cb_4: [
    { kind: 'screen', ref: 'src/views/admin/ConsignmentScannerModal.jsx' },
    { kind: 'rpc', ref: 'record_consignment_item_scan()' },
  ],
  cb_5: [{ kind: 'table', ref: 'consignment_items.manila_scanned_qty' }],
  cb_6: [{ kind: 'screen', ref: 'src/views/admin/InventoryGrid.jsx' }],
  cb_7: [
    { kind: 'rpc', ref: 'finalize_consignment_receipt()' },
    { kind: 'table', ref: 'product_batches' },
    { kind: 'table', ref: 'inventory_balances' },
  ],

  ext_1: [{ kind: 'screen', ref: 'src/views/admin/InventoryGrid.jsx' }],
  ext_2: [{ kind: 'table', ref: 'product_batches.best_before_date' }],
  ext_3: [{ kind: 'screen', ref: 'src/views/admin/Sheet.jsx' }],
  ext_4: [{ kind: 'table', ref: 'product_batches.hub' }],
  ext_5: [{ kind: 'rpc', ref: 'finalize_consignment_receipt()' }],

  np_1: [{ kind: 'screen', ref: 'src/views/admin/ProductIntakeSessionModal.jsx' }],
  np_2: [{ kind: 'screen', ref: 'src/views/admin/Sheet.jsx' }],
  np_3: [{ kind: 'screen', ref: 'src/views/admin/ProductAiEnrichmentModal.jsx' }],
  np_4: [{ kind: 'screen', ref: 'src/views/admin/PhotoManagerModal.jsx' }],
  np_5: [{ kind: 'screen', ref: 'src/views/admin/ProductIntakeSessionModal.jsx' }],
  np_6: [{ kind: 'table', ref: 'products.status' }],

  hand_1: [{ kind: 'screen', ref: 'src/views/admin/InventoryGrid.jsx' }],
  hand_2: [{ kind: 'table', ref: 'product_batches.custodian' }],
  hand_3: [{ kind: 'table', ref: 'product_batches.hub' }],
  hand_4: [{ kind: 'screen', ref: 'src/views/admin/MobileScannerModal.jsx' }],
  hand_5: [
    { kind: 'rpc', ref: 'transfer_inventory_custody_exact()' },
    { kind: 'rpc', ref: 'transfer_inventory_custody()' },
  ],

  cnt_1: [{ kind: 'screen', ref: 'src/views/admin/InventoryGrid.jsx' }],
  cnt_2: [{ kind: 'screen', ref: 'src/views/admin/MobileScannerModal.jsx' }],
  cnt_3: [{ kind: 'screen', ref: 'src/views/admin/DiscrepancyReconciliationModal.jsx' }],
  cnt_4: [{ kind: 'screen', ref: 'src/views/admin/DiscrepancyReconciliationModal.jsx' }],
  cnt_5: [
    { kind: 'rpc', ref: 'reconcile_product_batches()' },
    { kind: 'table', ref: 'inventory_events' },
  ],

  ord_1: [
    { kind: 'screen', ref: 'src/views/admin/OmniOperationsHub.jsx' },
    { kind: 'table', ref: 'order_requests' },
  ],
  ord_2: [{ kind: 'screen', ref: 'src/views/admin/Inbox.jsx' }],
  ord_3: [{ kind: 'rpc', ref: 'set_order_request_payment_status()' }],
  ord_4: [
    { kind: 'rpc', ref: 'deduct_stock_fefo()' },
    { kind: 'rpc', ref: 'record_packing_scan()' },
  ],
  ord_5: [{ kind: 'screen', ref: 'src/views/admin/PackingSlipModal.jsx' }],
  ord_6: [{ kind: 'rpc', ref: 'fulfill_order_request()' }],

  pasa_1: [{ kind: 'screen', ref: 'src/views/admin/PasabuyManager.jsx' }],
  pasa_2: [{ kind: 'screen', ref: 'src/views/admin/PasabuyManager.jsx' }],
  pasa_3: [{ kind: 'rpc', ref: 'save_pasabuy_quote()' }],
  pasa_4: [{ kind: 'rpc', ref: 'transition_pasabuy_request()' }],
  pasa_5: [{ kind: 'rpc', ref: 'add_consignment_item_v2()' }],
  pasa_6: [{ kind: 'rpc', ref: 'transition_pasabuy_request()' }],
}

/**
 * The edge list. This is the part that did not exist.
 *
 * Read it as operations logic, not as UI wiring: each edge is a claim about how
 * physical goods, money, or authority actually move through the business.
 */
export const EDGES = [
  // --- Entrance: what an operator can start ---------------------------------
  { from: ENTRY_NODE_ID, to: 'cb_1', kind: EDGE_KINDS.BRANCH, label: 'Start a Milan consignment', condition: 'A new monthly buying trip is beginning' },
  { from: ENTRY_NODE_ID, to: 'ord_1', kind: EDGE_KINDS.BRANCH, label: 'Handle an order', condition: 'A customer order request has arrived' },
  { from: ENTRY_NODE_ID, to: 'pasa_1', kind: EDGE_KINDS.BRANCH, label: 'Handle a pasabuy request', condition: 'A customer asked for something not in stock' },
  { from: ENTRY_NODE_ID, to: 'cnt_1', kind: EDGE_KINDS.BRANCH, label: 'Run a stock count', condition: 'A scheduled audit is due' },
  { from: ENTRY_NODE_ID, to: 'hand_1', kind: EDGE_KINDS.BRANCH, label: 'Move custody', condition: 'Stock must change hands or hub' },
  { from: ENTRY_NODE_ID, to: 'ch_1', kind: EDGE_KINDS.BRANCH, label: 'Connect a sales channel', condition: 'A marketplace or social channel is being brought online' },

  // --- Cross-border lifecycle: Milan to committed stock ----------------------
  { from: 'cb_1', to: 'cb_2', kind: EDGE_KINDS.SEQUENCE },
  { from: 'cb_2', to: 'cb_3', kind: EDGE_KINDS.SEQUENCE },
  { from: 'cb_3', to: 'cb_4', kind: EDGE_KINDS.SEQUENCE },
  { from: 'cb_4', to: 'cb_5', kind: EDGE_KINDS.SEQUENCE },
  { from: 'cb_5', to: 'cb_6', kind: EDGE_KINDS.SEQUENCE },

  // The decision that the old canvas could not draw.
  { from: 'cb_6', to: 'ext_1', kind: EDGE_KINDS.BRANCH, label: 'Existing SKU', condition: 'The barcode matches a product already in the catalogue' },
  { from: 'cb_6', to: 'np_1', kind: EDGE_KINDS.BRANCH, label: 'New product', condition: 'No catalogue match — the SKU must be created before it can hold stock' },

  // --- Existing-SKU path ----------------------------------------------------
  { from: 'ext_1', to: 'ext_2', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ext_2', to: 'ext_3', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ext_3', to: 'ext_4', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ext_4', to: 'ext_5', kind: EDGE_KINDS.SEQUENCE },

  // --- New-product path -----------------------------------------------------
  { from: 'np_1', to: 'np_2', kind: EDGE_KINDS.SEQUENCE },
  { from: 'np_2', to: 'np_3', kind: EDGE_KINDS.SEQUENCE },
  { from: 'np_3', to: 'np_4', kind: EDGE_KINDS.SEQUENCE },
  { from: 'np_4', to: 'np_5', kind: EDGE_KINDS.SEQUENCE },
  { from: 'np_5', to: 'np_6', kind: EDGE_KINDS.SEQUENCE },

  // Both paths rejoin. This convergence is the reason a single graph beats
  // seven separate diagrams: the commit step is shared, not duplicated.
  { from: 'ext_5', to: 'cb_7', kind: EDGE_KINDS.CONVERGE, label: 'Added stock' },
  { from: 'np_6', to: 'cb_7', kind: EDGE_KINDS.CONVERGE, label: 'New listing' },

  // --- What committed stock makes possible ----------------------------------
  { from: 'cb_7', to: 'ord_1', kind: EDGE_KINDS.ENABLES, label: 'Sellable stock', condition: 'Orders can only reserve stock that is committed and live' },
  { from: 'cb_7', to: 'cnt_1', kind: EDGE_KINDS.ENABLES, label: 'Auditable stock', condition: 'A count audits committed batches' },
  { from: 'cb_7', to: 'hand_1', kind: EDGE_KINDS.ENABLES, label: 'Movable stock', condition: 'Custody transfers move committed batches between holders' },

  // --- Order fulfillment ----------------------------------------------------
  { from: 'ord_1', to: 'ord_2', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ord_2', to: 'ord_3', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ord_3', to: 'ord_4', kind: EDGE_KINDS.BRANCH, label: 'Payment verified', condition: 'Funds confirmed against the order total' },
  { from: 'ord_3', to: 'ord_2', kind: EDGE_KINDS.LOOPBACK, label: 'Not yet paid', condition: 'Return to the customer conversation; stock stays reserved, never picked' },
  { from: 'ord_4', to: 'ord_5', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ord_5', to: 'ord_6', kind: EDGE_KINDS.SEQUENCE },

  // --- Monthly count --------------------------------------------------------
  { from: 'cnt_1', to: 'cnt_2', kind: EDGE_KINDS.SEQUENCE },
  { from: 'cnt_2', to: 'cnt_3', kind: EDGE_KINDS.SEQUENCE },
  { from: 'cnt_3', to: 'cnt_5', kind: EDGE_KINDS.BRANCH, label: 'Counts match', condition: 'Physical count equals the ledger — no adjustment needed' },
  { from: 'cnt_3', to: 'cnt_4', kind: EDGE_KINDS.BRANCH, label: 'Variance found', condition: 'Physical count differs — a second blind recount is required before any write' },
  { from: 'cnt_4', to: 'cnt_5', kind: EDGE_KINDS.CONVERGE },

  // --- Custody handover -----------------------------------------------------
  { from: 'hand_1', to: 'hand_2', kind: EDGE_KINDS.SEQUENCE },
  { from: 'hand_2', to: 'hand_3', kind: EDGE_KINDS.SEQUENCE },
  { from: 'hand_3', to: 'hand_4', kind: EDGE_KINDS.SEQUENCE },
  { from: 'hand_4', to: 'hand_5', kind: EDGE_KINDS.SEQUENCE },
  { from: 'hand_4', to: 'cnt_4', kind: EDGE_KINDS.LOOPBACK, label: 'Recount mismatch', condition: 'Receiving count differs from the sending count — classify it before transferring ownership' },

  // --- Pasabuy --------------------------------------------------------------
  { from: 'pasa_1', to: 'pasa_2', kind: EDGE_KINDS.SEQUENCE },
  { from: 'pasa_2', to: 'pasa_3', kind: EDGE_KINDS.SEQUENCE },
  { from: 'pasa_3', to: 'pasa_4', kind: EDGE_KINDS.BRANCH, label: 'Quote approved', condition: 'Customer accepted the itemized quote and paid the downpayment' },
  { from: 'pasa_4', to: 'pasa_5', kind: EDGE_KINDS.SEQUENCE },

  // Pasabuy goods are not a separate supply chain — they ride the same monthly
  // flight as consignment stock, which is why this edge exists.
  { from: 'pasa_5', to: 'cb_3', kind: EDGE_KINDS.CONVERGE, label: 'Same monthly flight', condition: 'Pasabuy items are tagged into the same air cargo consignment' },
  { from: 'cb_5', to: 'pasa_6', kind: EDGE_KINDS.BRANCH, label: 'Pasabuy item', condition: 'Item is reserved for a named customer and never enters sellable stock' },
  { from: 'pasa_6', to: 'ord_5', kind: EDGE_KINDS.CONVERGE, label: 'Dispatch', condition: 'Pasabuy and stock orders share one packing and courier path' },

  // --- Channels & integrations ---------------------------------------------
  { from: 'ch_1', to: 'ch_2', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ch_2', to: 'ch_3', kind: EDGE_KINDS.SEQUENCE },
  // Only Shopee has an ingress path. The other two marketplaces stop here and
  // stay in their Seller Centers, and the map says so rather than drawing a
  // connector that does not exist.
  { from: 'ch_3', to: 'ch_4', kind: EDGE_KINDS.BRANCH, label: 'Ingress verified', condition: 'A signed marketplace push was captured end to end — Shopee only today' },
  { from: 'ch_3', to: 'ch_8', kind: EDGE_KINDS.BRANCH, label: 'No adapter exists', condition: 'Lazada, TikTok Shop, and every social platform — record the channel as not connected and operate it from its own portal' },
  { from: 'ch_4', to: 'ch_5', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ch_5', to: 'ch_6', kind: EDGE_KINDS.SEQUENCE },
  { from: 'ch_6', to: 'ch_8', kind: EDGE_KINDS.CONVERGE, label: 'Stock rule agreed', condition: 'The pool and oversell behaviour are decided before a second channel sells' },
  // Social messaging hangs off credential setup rather than the marketplace
  // ingress path: these platforms carry conversations, not orders.
  { from: 'ch_2', to: 'ch_7', kind: EDGE_KINDS.BRANCH, label: 'Messaging channel', condition: 'The channel carries customer conversations rather than orders' },
  { from: 'ch_7', to: 'ch_8', kind: EDGE_KINDS.CONVERGE, label: 'Record honestly', condition: 'Answering in the platform app does not make the channel connected' },
  // A connected channel is what makes marketplace orders reachable by the
  // existing fulfillment path. `enables`, not `sequence`: nobody walks from
  // here to picking in one sitting.
  { from: 'ch_8', to: 'ord_1', kind: EDGE_KINDS.ENABLES, label: 'Channel orders become workable', condition: 'Once a channel is verified, its orders join the existing order and fulfillment path' },
]

/** Every node in the graph, entry node first. */
export const ALL_NODES = (() => {
  const nodes = [{ ...ENTRY_NODE, workflowId: null, sectionId: 'all' }]
  for (const [workflowId, workflow] of Object.entries(WORKFLOWS)) {
    for (const node of workflow.nodes || []) {
      nodes.push({
        ...node,
        workflowId,
        sectionId: workflow.sectionId,
        workflowTitle: workflow.title,
        grounding: NODE_GROUNDING[node.id] || [],
      })
    }
  }
  return nodes
})()

const NODE_BY_ID = new Map(ALL_NODES.map((n) => [n.id, n]))

export function getNode(id) {
  return NODE_BY_ID.get(id) || null
}

/** Edges arriving at `id` — "where did we come from?" */
export function getUpstream(id) {
  return EDGES.filter((e) => e.to === id).map((e) => ({ ...e, node: getNode(e.from) }))
}

/** Edges leaving `id` — "what can you do here?" */
export function getDownstream(id) {
  return EDGES.filter((e) => e.from === id).map((e) => ({ ...e, node: getNode(e.to) }))
}

/**
 * Longest-path layering (Coffman-Graham style depth), so a node always sits to
 * the right of everything that must happen before it. Loopback edges are ignored
 * for depth or they would create cycles and flatten the layout.
 */
export function computeLayers() {
  const forward = EDGES.filter((e) => e.kind !== EDGE_KINDS.LOOPBACK)
  const depth = new Map(ALL_NODES.map((n) => [n.id, 0]))

  // Relax repeatedly; the graph is tiny, so a bounded fixpoint is cheaper to
  // reason about than a topological sort with cycle handling.
  for (let pass = 0; pass < ALL_NODES.length; pass += 1) {
    let changed = false
    for (const edge of forward) {
      const next = depth.get(edge.from) + 1
      if (next > (depth.get(edge.to) ?? 0)) {
        depth.set(edge.to, next)
        changed = true
      }
    }
    if (!changed) break
  }

  const layers = []
  for (const node of ALL_NODES) {
    const d = depth.get(node.id) ?? 0
    if (!layers[d]) layers[d] = []
    layers[d].push(node)
  }
  return layers.map((layer) => layer || [])
}

/**
 * All simple paths between two nodes, for the path tracer. Loopbacks are
 * excluded so a trace terminates and reads as a route rather than a loop.
 */
export function tracePaths(fromId, toId, limit = 8) {
  const results = []
  const forward = EDGES.filter((e) => e.kind !== EDGE_KINDS.LOOPBACK)

  const walk = (current, path, seen) => {
    if (results.length >= limit) return
    if (current === toId) {
      results.push([...path])
      return
    }
    for (const edge of forward.filter((e) => e.from === current)) {
      if (seen.has(edge.to)) continue
      seen.add(edge.to)
      path.push(edge)
      walk(edge.to, path, seen)
      path.pop()
      seen.delete(edge.to)
    }
  }

  if (getNode(fromId) && getNode(toId)) walk(fromId, [], new Set([fromId]))
  return results
}

/** Nodes with no upstream other than the entry node — real starting points. */
export function getEntryPoints() {
  return getDownstream(ENTRY_NODE_ID).map((e) => e.node).filter(Boolean)
}

/** Nodes nothing leaves — terminal outcomes. */
export function getTerminalNodes() {
  return ALL_NODES.filter((n) => getDownstream(n.id).every((e) => e.kind === EDGE_KINDS.LOOPBACK))
}

export const GRAPH_STATS = {
  nodeCount: ALL_NODES.length,
  edgeCount: EDGES.length,
  branchCount: EDGES.filter((e) => e.kind === EDGE_KINDS.BRANCH).length,
  convergeCount: EDGES.filter((e) => e.kind === EDGE_KINDS.CONVERGE).length,
  loopbackCount: EDGES.filter((e) => e.kind === EDGE_KINDS.LOOPBACK).length,
}

export { WORKFLOW_SECTIONS }
