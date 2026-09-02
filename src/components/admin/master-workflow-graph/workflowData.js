/**
 * K2 Jimzon — Master Workflow Graph Authoritative Data Definitions
 * Divided into clear operational sections:
 * 1. Cross-Border Supply Chain (Italy Cousin -> Air Transit -> Manila Arrival)
 * 2. Manila Intake & Decision Branching (New Product Creation vs Added Inventory)
 * 3. Inventory & Custody Management (FEFO Lots, Handover, Cycle Counts)
 * 4. Fulfillment & Customer Concierge (Order Packing & Pasabuy)
 */

export const WORKFLOW_GUIDE_META = Object.freeze({
  version: '2026-08-30-draft.1',
  approvalStatus: 'DRAFT — NOT LOCKED',
  effectiveDate: null,
  authority: 'K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md',
})

export const WORKFLOW_SECTIONS = [
  {
    id: 'all',
    label: 'All Workflows',
    description: 'Complete operational blueprint across all business domains.',
  },
  {
    id: 'cross_border',
    label: 'Italy & Cross-Border',
    description: 'Milan sourcing by cousin, pre-tagging, flight cargo boxes, and international transit.',
  },
  {
    id: 'intake_branching',
    label: 'Manila Intake & Catalog',
    description: 'PH receiving, box opening, QC check, and branching between Existing Stock vs New SKU Creation.',
  },
  {
    id: 'warehouse_custody',
    label: 'Warehouse & Custody',
    description: 'FEFO batch lots, shelf placement, two-party handshakes, and monthly cycle audits.',
  },
  {
    id: 'orders_fulfillment',
    label: 'Orders & Fulfillment',
    description: 'Customer payment verification, 2-factor picking, secure packing, and courier dispatch.',
  },
  {
    id: 'channel_intake',
    label: 'Channels & Integrations',
    description: 'How Shopee, Lazada, TikTok Shop, and social messaging connect to K2 — including the steps that are not built yet.',
  },
]

export const WORKFLOWS = {
  // -------------------------------------------------------------
  // 1. CROSS-BORDER LIFECYCLE: ITALY TO MANILA END-TO-END
  // -------------------------------------------------------------
  cross_border_lifecycle: {
    id: 'cross_border_lifecycle',
    sectionId: 'cross_border',
    title: 'Italy Sourcing to Manila Intake Lifecycle',
    iconName: 'PlaneIcon',
    badge: 'Cross-Border Supply Chain',
    category: 'Italy & Cross-Border',
    description:
      'Complete journey of Italian provisions: Sourced by cousin in Milan, pre-inventoried into flight cargo boxes, air transit to Manila (PH), physical box opening, QC checking, and branching into new vs added inventory.',
    color: '#0284c7',
    accentColor: '#38bdf8',
    stats: { steps: 7, scansRequired: 3, roles: ['Milan Cousin / Buyer', 'Manila Intake Staff', 'Hub Manager'], estTime: '3-7 days transit' },
    nodes: [
      {
        id: 'cb_1',
        step: 1,
        title: 'Milan Sourcing & Store Purchase',
        actor: 'Milan Sourcing Lead (Cousin)',
        location: 'Milan Supermarkets & Bottegas (Esselunga, Coop, Eataly)',
        type: 'intake',
        short: 'Cousin purchases authentic Italian goods, collects store receipts, and checks shelf expiry.',
        summary:
          'Our Milan sourcing lead (cousin) visits Italian supermarkets and specialty bottegas. Inspects manufacturer batch dates on physical packaging to ensure at least 4–6 months of remaining shelf life. Collects official store fiscal receipts in EUR (€).',
        checklist: [
          'Verify packaging condition and check manufacturer expiry date in DD/MM/YYYY format.',
          'Save official store fiscal receipt (Scontrino Fiscale) and photograph for accounting proof.',
          'Store purchases in climate-controlled staging area in Milan (18°C–20°C).',
        ],
        rules: [
          'Never purchase products with less than 60 days before expiration date.',
          'Always record unit purchase price in EUR (€) on store receipt.',
        ],
        simulation: {
          testBarcode: 'MILAN-BUY-0825',
          expectedResult: 'Purchase Logged: 36 units Mulino Bianco Baiocchi (€2.40/unit, Esselunga Milan).',
        },
        troubleshooting: [
          { issue: 'Variant out of stock in Milan store', fix: 'Check neighboring Coop/Carrefour or notify Manila team for alternative flavor approval.' },
        ],
        adminJump: 'kanban',
        jumpLabel: 'Open Italy Purchasing',
      },
      {
        id: 'cb_2',
        step: 2,
        title: 'Milan Box Packing & Manifest Pre-Tagging',
        actor: 'Milan Sourcing Lead (Cousin)',
        location: 'Milan Staging Hub (MXP)',
        type: 'action',
        short: 'Cousin creates Flight Cargo Box in Admin BOS, packs goods, and applies tamper seal.',
        summary:
          'Goods are organized into heavy-duty flight cargo boxes (e.g. BOX-2026-08-A). Cousin logs item quantities and printed EAN barcodes into the Flight Consignment Manifest in Admin BOS. Applies tamper-evident numbered security tape.',
        checklist: [
          'Create new Flight Box ID in Admin Consignments tool (e.g. BOX-2026-08-A).',
          'Scan or enter item EAN barcodes and count total units placed in box.',
          'Affix outer box shipping label and record numbered security seal serial number.',
        ],
        rules: [
          'Crate must be sealed with numbered security tape before delivery to air cargo forwarder.',
          'Glass jars must be individually bubble-wrapped before packing into cargo boxes.',
        ],
        simulation: {
          testBarcode: 'BOX-2026-08-A',
          expectedResult: 'Flight Box Sealed: 48 units total, Seal #SEAL-IT-9901, Linked to Flight AZ-784.',
        },
        troubleshooting: [
          { issue: 'Mismatch in item count before sealing', fix: 'Recount box contents physically; update manifest line items before applying seal.' },
        ],
        adminJump: 'consignment',
        jumpLabel: 'Create Flight Manifest',
      },
      {
        id: 'cb_3',
        step: 3,
        title: 'Air Cargo International Transit',
        actor: 'Air Freight Forwarder',
        location: 'In Flight (Milan MXP -> Manila MNL)',
        type: 'action',
        short: 'Cargo box flies via air freight to Manila; stock status locked as In Transit.',
        summary:
          'Box is handed over to air cargo forwarder at Malpensa Airport (MXP). Flies to Ninoy Aquino International Airport (NAIA, Manila). The system marks all items as "In Transit" with tracked flight ETA.',
        checklist: [
          'Confirm Master Air Waybill (MAWB) tracking number in flight portal.',
          'Monitor customs clearance status at Manila terminal.',
        ],
        rules: [
          'Items in transit cannot be allocated for immediate customer fulfillment until received.',
        ],
        simulation: {
          testBarcode: 'FLIGHT-AZ784-TRANSIT',
          expectedResult: 'In-Transit Verified: Air Cargo ETA Manila 14:30 PHT, Customs Status: Clear.',
        },
        troubleshooting: [
          { issue: 'Customs delay / flight reschedule', fix: 'Record the revised ETA on the consignment, review every linked Pasabuy case, and contact affected customers manually. No automatic alert is sent.' },
        ],
        adminJump: 'consignment',
        jumpLabel: 'Track Flight Consignments',
      },
      {
        id: 'cb_4',
        step: 4,
        title: 'Manila Airport Receipt & Seal Verification',
        actor: 'Manila Intake Staff',
        location: 'Manila Receiving Dock',
        type: 'scan',
        short: 'Box arrives in Manila; staff verifies tamper seal against Milan manifest.',
        summary:
          'Manila warehouse receives physical box from freight delivery driver. Staff immediately scans outer box QR and checks the security seal serial number against what the cousin recorded in Milan.',
        checklist: [
          'Scan outer box barcode in Admin BOS Consignments tool.',
          'Verify security seal serial number matches Milan manifest with zero signs of tampering.',
          'Capture photo evidence of sealed box upon delivery.',
        ],
        rules: [
          'If seal is cut, altered, or replaced with regular clear tape, halt unboxing and notify Hub Manager.',
        ],
        simulation: {
          testBarcode: 'SEAL-IT-9901',
          expectedResult: 'Seal Match Confirmed: Serial #SEAL-IT-9901 intact from Milan Hub.',
        },
        troubleshooting: [
          { issue: 'Seal broken / box punctured', fix: 'Mark consignment as "Damaged on Arrival"; photograph all 6 sides of box before cutting open.' },
        ],
        adminJump: 'consignment',
        jumpLabel: 'Verify Inbound Box',
      },
      {
        id: 'cb_5',
        step: 5,
        title: 'Physical Box Opening & Item Quality Check',
        actor: 'Manila Intake Staff',
        location: 'Stainless Steel Inspection Bench',
        type: 'action',
        short: 'Cut seal, unpack items under bright lighting, and inspect physical condition.',
        summary:
          'Unpack products onto a sanitized stainless steel bench. Group items by brand. Check each unit for glass lid integrity, vacuum seal clicks on jars, chocolate melt/bloom, and printed expiry dates.',
        checklist: [
          'Count physical units unpackaged from box against expected manifest count.',
          'Inspect glass bottles and jars for micro-cracks or oil seepage.',
          'Check chocolate bars for heat deformation or packaging tears.',
        ],
        rules: [
          'Any leaking, cracked, or melted item must be moved immediately to Quarantine.',
        ],
        simulation: {
          testBarcode: 'QC-UNBOX-CHECK',
          expectedResult: 'QC Passed: 48/48 units in pristine condition (0 breakages).',
        },
        troubleshooting: [
          { issue: 'Shortage (fewer units in box than manifest)', fix: 'Record the counted shortage and evidence in the receipt workflow, then notify the Milan buyer through the approved staff channel. Admin BOS does not send that notice automatically.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Inventory Intake',
      },
      {
        id: 'cb_6',
        step: 6,
        title: 'Decision Branch: Existing SKU vs New Product',
        actor: 'Manila Intake Staff',
        location: 'Scan Terminal',
        type: 'decision',
        short: 'Scan barcode: If item exists in catalog -> Add Stock. If new -> Create SKU.',
        summary:
          'Staff laser-scans the printed manufacturer barcode (EAN-13). The system queries the master catalog in real-time and routes staff to the correct workflow branch.',
        checklist: [
          'Scan product EAN-13 barcode with laser scanner.',
          'Branch A (Catalog Match): Click "Add Batch to Existing SKU" (enters expiry date & cost).',
          'Branch B (No Match / New Item): Click "Create New Product Intake" (enters title, AI prompts, specs).',
        ],
        rules: [
          'Never create duplicate SKU listings for products that already exist under another variant.',
        ],
        simulation: {
          testBarcode: '8013355998124',
          expectedResult: 'Catalog Lookup: Found Master SKU IT-MUL-001 (Baiocchi 260g) -> Routing to Batch Intake.',
        },
        troubleshooting: [
          { issue: 'Barcode unreadable', fix: 'Search catalog manually by Italian brand name (e.g. Mulino Bianco) and select matching variant.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Product Catalog Lookup',
      },
      {
        id: 'cb_7',
        step: 7,
        title: 'Finalize Manila Receipt & Verify Stock',
        actor: 'Hub Manager',
        location: 'Admin BOS Terminal',
        type: 'complete',
        short: 'Finalize the verified receipt, then check the canonical lot and sellable-stock result.',
        summary:
          'The authorized Hub Manager reviews the Manila recount and finalizes the receipt through the consignment workflow. The server creates or updates canonical batch and inventory records. Storefront availability is derived separately from eligible stock and product publication state; marketplace publishing and stock sync are not connected.',
        checklist: [
          'Verify total counted units equals physical stock on shelves.',
          'Record the physical shelf location and lot identifier used on the container or shelf label.',
          'Finalize the receipt, then verify the resulting batch, physical quantity, reserved quantity, and sellable quantity in Inventory.',
        ],
        rules: [
          'Intake commits are permanent audit records; corrections require a manager-authorized cycle adjustment.',
        ],
        simulation: {
          testBarcode: 'RECEIPT-REHEARSAL',
          expectedResult: 'Expected record shape: finalized receipt plus canonical batch and inventory events. No marketplace sync is implied.',
        },
        troubleshooting: [
          { issue: 'Storefront stock count differs from Inventory', fix: 'Do not edit product stock directly. Verify the lot is eligible, the product is Live, and the Storefront is using its server-backed catalog. Preserve the mismatch and escalate if those records agree.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Verify Inventory Record',
      },
    ],
  },

  // -------------------------------------------------------------
  // 2. INTAKE BRANCH A: ADDING INVENTORY TO EXISTING SKU
  // -------------------------------------------------------------
  existing_stock_intake: {
    id: 'existing_stock_intake',
    sectionId: 'intake_branching',
    title: 'Quick Intake (Adding Stock to Existing SKU)',
    iconName: 'BoxIcon',
    badge: 'Existing Catalog SKU',
    category: 'Manila Intake & Catalog',
    description:
      'Fast-track intake procedure for products that already exist in our master catalog. Scan barcode, record new FEFO expiry date, calculate landed cost (€ -> ₱), and add units directly to stock.',
    color: '#059669',
    accentColor: '#34d399',
    stats: { steps: 5, scansRequired: 2, roles: ['Intake Staff', 'Warehouse Custodian'], estTime: '5-8 mins' },
    nodes: [
      {
        id: 'ext_1',
        step: 1,
        title: 'Barcode Scan & Existing SKU Match',
        actor: 'Intake Staff',
        location: 'Scan Station',
        type: 'scan',
        short: 'Laser-scan EAN-13 barcode to pull existing product master profile.',
        summary:
          'Scan the manufacturer barcode on the physical item. The system instantly loads the product name, Italian brand, weight, category, current retail price (₱), and existing active batches.',
        checklist: [
          'Scan physical barcode with zero keyboard typing.',
          'Confirm scanned unit matches catalog size (e.g. 260g vs 330g).',
          'Verify current retail SRP is up to date.',
        ],
        rules: [
          'Never mix different net weight variants into the same SKU listing.',
        ],
        simulation: {
          testBarcode: '8013355998124',
          expectedResult: 'Matched: SKU IT-MUL-001 | Mulino Bianco Baiocchi 260g | Current Stock: 14 units.',
        },
        troubleshooting: [
          { issue: 'Different packaging artwork on new batch', fix: 'Upload secondary packaging photo in Product Media Manager without changing SKU.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Inventory Scan',
      },
      {
        id: 'ext_2',
        step: 2,
        title: 'New FEFO Batch Lot & Expiry Registration',
        actor: 'Intake Staff',
        location: 'Intake Terminal',
        type: 'decision',
        short: 'Enter the printed best-before date, verified quantity, source, location, custodian, and documented cost.',
        summary:
          'Use the canonical intake or receipt command for this shipment. Record the printed expiry, verified physical quantity, source, hub, custodian, and documented PHP unit cost. A product row never receives stock directly.',
        checklist: [
          'Enter expiration date accurately in YYYY-MM-DD format from the physical packaging.',
          'Keep the source receipt with the purchase currency and amount; record only the reviewed PHP cost required by the canonical command.',
          'If a landed-cost calculation is needed, use the reviewed Pasabuy/cost record and obtain the required owner pricing rationale. Intake does not invent a final price.',
        ],
        rules: [
          'Different expiry dates MUST be tracked as separate batch lots to enforce FEFO picking.',
        ],
        simulation: {
          testBarcode: 'LOT-NEW-2027',
          expectedResult: 'Expected record shape: one source-linked batch with verified quantity, expiry, hub, custodian, and an inventory event.',
        },
        troubleshooting: [
          { issue: 'Expiry date printed in Italian format (DD.MM.YY)', fix: 'Convert accurately: 15.08.27 = 2027-08-15.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Batch Lot Manager',
      },
      {
        id: 'ext_3',
        step: 3,
        title: 'Physical Lot Identification',
        actor: 'Intake Staff',
        location: 'Intake Desk and Shelf Bin',
        type: 'action',
        short: 'Prepare a readable physical lot label from the saved SKU, lot, expiry, and storage facts.',
        summary:
          'After the canonical batch exists, copy its exact SKU, lot identifier, best-before date, and storage facts onto the physical label used by the warehouse. Admin BOS does not currently claim an integrated lot-label printer.',
        checklist: [
          'Prepare the physical label using the saved batch facts; do not invent a lot number.',
          'Affix label onto carton case or master shelf bin.',
        ],
        rules: [
          'Do not obscure manufacturer original ingredients or allergen box with the sticker.',
        ],
        simulation: {
          testBarcode: 'LOT-LABEL-REHEARSAL',
          expectedResult: 'Expected physical check: label values exactly match the saved batch record.',
        },
        troubleshooting: [
          { issue: 'Label cannot be read or scanned', fix: 'Replace it before shelving and compare every printed value with the saved batch. Do not change the database to match a bad label.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Batch Records',
      },
      {
        id: 'ext_4',
        step: 4,
        title: 'Shelf Bin Placement (Physical FEFO)',
        actor: 'Warehouse Custodian',
        location: 'Warehouse Shelving (Bin B-03)',
        type: 'action',
        short: 'Place newly arrived stock BEHIND older expiring stock on the shelf.',
        summary:
          'Bring verified units to designated shelf bin. Position the newly arrived batch (further expiry date) behind existing batches on the shelf so fulfillment pickers naturally grab the earliest-expiring unit first.',
        checklist: [
          'Locate assigned shelf bin in dry pantry / cold room.',
          'Slide older batch units to the front of the shelf.',
          'Place new batch units directly behind.',
        ],
        rules: [
          'Never place newer stock in front of older stock.',
        ],
        simulation: {
          testBarcode: 'BIN-PLACED-B03',
          expectedResult: 'Placed: Bin B-03 (Front: Exp 2026-11, Back: Exp 2027-04).',
        },
        troubleshooting: [
          { issue: 'Shelf full', fix: 'Assign overflow shelf bin location in Admin BOS and cross-tag.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Shelf Locations',
      },
      {
        id: 'ext_5',
        step: 5,
        title: 'Finalize Added Stock',
        actor: 'Hub Manager',
        location: 'Admin BOS Terminal',
        type: 'complete',
        short: 'Manager finalizes the verified receipt and checks the resulting canonical lot balances.',
        summary:
          'Manager reviews the Manila recount against the flight manifest and finalizes the receipt. The resulting batch becomes part of canonical Inventory. Storefront eligibility is derived separately; marketplace connectors remain separate and must not be inferred.',
        checklist: [
          'Verify total units added (+24).',
          'Confirm Inventory shows the expected physical, reserved, and sellable quantities for the exact lot.',
        ],
        rules: [
          'Ledger entries are permanent and traceable to the staff member who performed the intake.',
        ],
        simulation: {
          testBarcode: 'COMMIT-ADD-STOCK',
          expectedResult: 'Stock Increment Live: Total on Hand 14 -> 38 units.',
        },
        troubleshooting: [
          { issue: 'A marketplace quantity does not match', fix: 'Treat the marketplace as manual unless Channel Readiness has end-to-end proof. Reconcile in its Seller Center; there is no force-sync control.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Verify Lot Balances',
      },
    ],
  },

  // -------------------------------------------------------------
  // 3. INTAKE BRANCH B: CREATING BRAND NEW PRODUCT (AI STUDIO)
  // -------------------------------------------------------------
  new_product_intake: {
    id: 'new_product_intake',
    sectionId: 'intake_branching',
    title: 'New Product Intake & Catalog Creation',
    iconName: 'SparkleIcon',
    badge: 'New Catalog SKU',
    category: 'Manila Intake & Catalog',
    description:
      'Create one server-assigned Draft, prepare evidence-backed content through the approved manual ChatGPT Projects, review PRIMARY/AFTER media, add inventory only through a truthful source workflow, then review publication separately.',
    color: '#e11d48',
    accentColor: '#fb7185',
    stats: { steps: 6, scansRequired: 1, roles: ['Catalog Lead', 'Content Designer'], estTime: '15-20 mins' },
    nodes: [
      {
        id: 'np_1',
        step: 1,
        title: 'Master SKU Registration & Sourcing Passport',
        actor: 'Catalog Lead',
        location: 'Admin Catalog Tool',
        type: 'intake',
        short: 'Register Italian brand name, authentic title, English culinary subtitle, and EAN-13.',
        summary:
          'Create a new product draft in Admin BOS. Enter official Italian brand (e.g. Gentile, Mulino Bianco, Marvis), Italian product title, net weight (e.g. 500g), packaging type, and verified Italian region of origin.',
        checklist: [
          'Enter exact Italian title and English culinary subtitle.',
          'Scan physical manufacturer printed EAN-13 barcode.',
          'Select category (Dolci, Caffè, Pasta & Dispensa, Cura, Bellezza).',
          'Record Italian region of origin (e.g. Gragnano, Campania).',
        ],
        rules: [
          'Never translate iconic Italian brand names into English.',
        ],
        simulation: {
          testBarcode: '8005432109876',
          expectedResult: 'SKU Draft Created: IT-GEN-003 | Gentile Paccheri di Gragnano IGP 500g.',
        },
        troubleshooting: [
          { issue: 'Duplicate barcode error', fix: 'Check if product was already created under an alternative SKU.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Add Product',
      },
      {
        id: 'np_2',
        step: 2,
        title: 'Owner Pricing Review',
        actor: 'Pricing Lead / Owner',
        location: 'Admin Inventory · product editor',
        type: 'action',
        short: 'Record reviewed PHP prices only after source cost and landed-cost evidence are available.',
        summary:
          'Preserve the original purchase evidence and the separate landed-cost record. The owner or authorized pricing lead chooses the product SRP and wholesale price with a written rationale; there is no universal automatic final-price formula.',
        checklist: [
          'Verify the source purchase evidence and reviewed landed-cost record belong to this exact variant.',
          'Choose the PHP retail price and, when applicable, wholesale price and MOQ.',
          'Record the required owner pricing rationale before saving.',
        ],
        rules: [
          'Final price cannot be below the reviewed landed cost, and AI may never choose or approve any price.',
        ],
        simulation: {
          testBarcode: 'PRICING-REHEARSAL',
          expectedResult: 'Expected record shape: reviewed price values plus an owner rationale; no automatic price approval.',
        },
        troubleshooting: [
          { issue: 'Cost evidence or exchange basis changed', fix: 'Do not mass-recalculate product prices from the guide. Correct the landed-cost record, then run a new reasoned owner pricing review for each affected price.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Configure Pricing',
      },
      {
        id: 'np_3',
        step: 3,
        title: 'Manual Product Content & Image Projects',
        actor: 'Content Designer',
        location: 'Admin Inventory · Smart Scan and Smart Paste',
        type: 'action',
        short: 'Use K2 Product Content first, then K2 Product Image Studio for separate PRIMARY and AFTER candidates.',
        summary:
          'In Inventory, Smart Scan prepares the versioned request for the private K2 Product Content ChatGPT Project. Staff attaches the exact package evidence, pastes the request, and sends the single JSON response to Smart Paste. After field-by-field review, Smart Paste prepares separate PRIMARY and AFTER requests for the private K2 Product Image Studio.',
        checklist: [
          'Install the K2 Product Content and K2 Product Image Studio instructions in two separate private ChatGPT Projects once.',
          'Attach readable front, back/label, barcode, and exact-variant photos to K2 Product Content; paste the Smart Scan request.',
          'Paste the single schema response into Smart Paste, validate it, and accept or reject every evidence-backed content, usage, instruction, SEO, warning, and media-brief field.',
          'Attach the real front-package photo to K2 Product Image Studio and run the product-specific PRIMARY and AFTER requests separately.',
          'Reject any image that changes the package, branding, variant, size, claims, or required composition; upload only approved images to their matching slots.',
        ],
        rules: [
          'K2 Product Content returns text/JSON only. K2 Product Image Studio returns one candidate for the requested slot only.',
          'AI cannot set SKU, price, cost, stock, quantity, lot, batch, expiry, custody, approval, or publication.',
          'If package fidelity cannot be preserved, use the original package photo.',
        ],
        simulation: {
          testBarcode: 'MANUAL-AI-HANDOFF',
          expectedResult: 'Expected review package: one validated content object plus separately reviewed PRIMARY and AFTER candidates. Nothing is saved automatically.',
        },
        troubleshooting: [
          { issue: 'The generated package text, logo, size, or variant differs', fix: 'Reject the candidate. Do not repair a fabricated package claim; retry with the exact source photo or keep the original photo.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Smart Scan',
      },
      {
        id: 'np_4',
        step: 4,
        title: 'Before/After Unboxing Experience Setup',
        actor: 'Content Designer',
        location: 'Product Media Manager',
        type: 'action',
        short: 'Upload packaging shot (Before) and served / unboxed shot (After).',
        summary:
          'Set up K2’s signature interactive Before/After comparison slider. Upload the sealed package photograph as "Before", and the unboxed / prepared culinary presentation as "After".',
        checklist: [
          'Upload Primary Image (sealed package on linen canvas).',
          'Upload After Image (biscuits on ceramic saucer / pasta on plate).',
          'Test interactive slider in preview mode to ensure smooth touch swipe performance.',
        ],
        rules: [
          'Uploads accept only the reviewed image types and size limit shown by Product Media Manager; the current secure limit is 4 MB per JPEG, PNG, or WebP file.',
        ],
        simulation: {
          testBarcode: 'MEDIA-UPLOAD-OK',
          expectedResult: 'Expected media state: approved PRIMARY and AFTER images assigned to the exact Draft without changing its content review.',
        },
        troubleshooting: [
          { issue: 'Image is rejected by upload validation', fix: 'Use a real JPEG, PNG, or WebP under 4 MB. Keep prior successful images and retry only the unfinished file.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Product Photos',
      },
      {
        id: 'np_5',
        step: 5,
        title: 'Ingredients, Allergens & Preparation Guide',
        actor: 'Catalog Lead',
        location: 'Product Detail Editor',
        type: 'decision',
        short: 'Input verified ingredients, bold allergen declarations, and recipe pairings.',
        summary:
          'Enter certified nutritional and allergen specifications from the physical package. Write conversational Filipino pairing notes (e.g. "Best paired with morning espresso or warm pandesal").',
        checklist: [
          'Enter complete ingredients list.',
          'Highlight bold allergens (e.g. Contains Wheat, Milk, Hazelnuts, Soy).',
          'Add 2–3 authentic culinary pairing tags and step-by-step preparation tips.',
        ],
        rules: [
          'Allergen warnings are safety-critical; never omit gluten, nuts, dairy, or egg warnings.',
        ],
        simulation: {
          testBarcode: 'SPEC-VERIFY-PASS',
          expectedResult: 'Allergens Flagged: 100% Durum Wheat Semolina (Gluten). Cook time: 14 mins.',
        },
        troubleshooting: [
          { issue: 'Ingredients only printed in Italian', fix: 'Use Italian culinary translation reference guide.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Product Editor',
      },
      {
        id: 'np_6',
        step: 6,
        title: 'Review & Live Storefront Activation',
        actor: 'Catalog Lead / Manager',
        location: 'Admin BOS Terminal',
        type: 'complete',
        short: 'Preview mobile layout, verify tags, and publish live to the Storefront.',
        summary:
          'Inspect full product detail preview on mobile and desktop viewports. Check SEO title, category placement, and stock availability badge. Toggle product status from Draft to Active.',
        checklist: [
          'Inspect mobile product page preview for typography alignment and image clarity.',
          'Verify search tags (e.g. #pasta #gragnano #artisanal).',
          'Save the reasoned Live status, then verify the server response. On a configured preview or production deployment, confirm the exact product route appears in the Storefront catalog.',
        ],
        rules: [
          'Product will show "Out of Stock · Request via Pasabuy" until the first batch lot is received.',
        ],
        simulation: {
          testBarcode: 'PUBLISH-LIVE-OK',
          expectedResult: 'Expected state: one reasoned Live product with its required primary media; deployed Storefront visibility is verified separately.',
        },
        troubleshooting: [
          { issue: 'Product not showing in catalog', fix: 'Clear browser cache or verify category filter assignment.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Review Publication',
      },
    ],
  },

  // -------------------------------------------------------------
  // 4. WAREHOUSE & CUSTODY MANAGEMENT
  // -------------------------------------------------------------
  inventory_handover: {
    id: 'inventory_handover',
    sectionId: 'warehouse_custody',
    title: 'Two-Party Inventory Custody Handshake',
    iconName: 'ShieldIcon',
    badge: 'Custody Handshake',
    category: 'Warehouse & Custody',
    description:
      'Rigorous two-party physical custody transfer protocol. Enforces operations rulebook §10: sender initiation, dual physical scans, and explicit electronic acceptance by the receiver.',
    color: '#d97706',
    accentColor: '#fbbf24',
    stats: { steps: 5, scansRequired: 2, roles: ['Transferor (Sender)', 'Transferee (Receiver)'], estTime: '10 mins' },
    nodes: [
      {
        id: 'hand_1',
        step: 1,
        title: 'Transfer Request Initiation',
        actor: 'Sender (Current Custodian)',
        location: 'Source Hub / Station',
        type: 'intake',
        short: 'Sender selects batch lot, quantity, and designated recipient staff member.',
        summary:
          'The current responsible custodian opens the Custody Transfer tool in Admin BOS. Selects the exact batch lot, quantity to transfer, origin location, destination hub, and recipient staff ID.',
        checklist: [
          'Verify physical count of units to transfer matches system batch availability.',
          'Select verified recipient staff member from the active staff directory.',
          'Generate unique Custody Transfer Manifest ID (e.g. TRF-2026-0825-01).',
        ],
        rules: [
          'Sender action ALONE never transfers custody; it only creates an open transfer offer.',
          'Stock is locked into "In Transit" status and cannot be sold during transfer.',
        ],
        simulation: {
          testBarcode: 'TRF-INIT-0825',
          expectedResult: 'Transfer Offer Created: 12 units of Lot LOT-2026-08-01 -> Receiver: Maria S.',
        },
        troubleshooting: [
          { issue: 'Recipient staff not listed', fix: 'Verify recipient is active in Staff & Roles permissions table with Custodian capability.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Initiate Transfer',
      },
      {
        id: 'hand_2',
        step: 2,
        title: 'Pre-Transit Physical Count & QC',
        actor: 'Sender',
        location: 'Source Packing Area',
        type: 'action',
        short: 'Sender packs units into a secure transfer crate and seals it.',
        summary:
          'Units are placed into a transfer crate. Sender performs a 100% item count, records unit serial/batch details, and seals the crate with a numbered plastic zip tie / security seal.',
        checklist: [
          'Count physical units one by one.',
          'Record security seal serial number on the transfer manifest.',
          'Attach printed transfer sheet with QR code onto crate exterior.',
        ],
        rules: [
          'Damaged or missing units must be reconciled BEFORE initiating transfer.',
        ],
        simulation: {
          testBarcode: 'SEAL-SN-9941',
          expectedResult: 'Seal Registered: Serial #SEAL-9941 locked to Manifest TRF-2026-0825-01.',
        },
        troubleshooting: [
          { issue: 'Missing or broken seal before dispatch', fix: 'Discard broken seal; apply new seal and update serial number in transfer record.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'View Custody Manifest',
      },
      {
        id: 'hand_3',
        step: 3,
        title: 'Secure Physical Transit',
        actor: 'Internal Courier / Staff',
        location: 'In Transit',
        type: 'action',
        short: 'Crate is transported between hubs or designated storage rooms.',
        summary:
          'Transfer crate is transported under secure conditions. If transporting chocolate or perishable goods between hubs, insulated temperature-controlled box is mandatory.',
        checklist: [
          'Maintain transit log with departure time and expected arrival time.',
          'Keep custody crate within direct physical sight of the authorized transporter.',
        ],
        rules: [
          'No intermediate handoffs to unverified third parties are permitted.',
        ],
        simulation: {
          testBarcode: 'TRANSIT-CHECKPOINT',
          expectedResult: 'In-Transit Verified: Departure 10:15 AM, ETA Destination 10:45 AM.',
        },
        troubleshooting: [
          { issue: 'Transit delay > 1 hour', fix: 'Transporter must notify receiving hub; check temperature indicator upon arrival.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Track Open Transfers',
      },
      {
        id: 'hand_4',
        step: 4,
        title: 'Physical Receipt & Independent Recount',
        actor: 'Receiver (Designated Staff)',
        location: 'Destination Receiving Hub',
        type: 'scan',
        short: 'Receiver breaks seal, unpacks crate, and independently scans every unit.',
        summary:
          'The designated receiver receives the crate, inspects the security seal number, opens the crate, and scans every unit using a barcode scanner to verify count independently.',
        checklist: [
          'Verify security seal number matches the transfer manifest in Admin BOS.',
          'Scan every individual unit barcode into the receiving verification screen.',
          'Check packaging for transit damage or temperature degradation.',
        ],
        rules: [
          'Receiver must NEVER accept a transfer without performing a physical recount scan.',
          'If any unit is missing or broken, flag a Transfer Variance Exception immediately.',
        ],
        simulation: {
          testBarcode: 'RECV-SCAN-12OF12',
          expectedResult: 'Physical Recount Verified: 12/12 units scanned successfully with zero variance.',
        },
        troubleshooting: [
          { issue: 'Unit count shortage (e.g. 11/12 scanned)', fix: 'Do not sign standard handshake; select "Partial Receipt with Exception" to log sender discrepancy.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Scan Received Crate',
      },
      {
        id: 'hand_5',
        step: 5,
        title: 'Electronic Handshake & Ownership Transfer',
        actor: 'Receiver',
        location: 'Destination Terminal',
        type: 'complete',
        short: 'Receiver signs electronic handshake; custody legally transfers in ledger.',
        summary:
          'After both parties compare the exact lot and quantity, the authorized receiver submits the custody command with a written reason. The server records the authenticated actor and changes the canonical custodian only if every invariant passes.',
        checklist: [
          'Review final scanned count vs manifest line items.',
          'Enter staff PIN to authenticate the electronic signature.',
          'System logs immutable timestamp, sender ID, receiver ID, and location history.',
        ],
        rules: [
          'Custody transfer is irreversible once signed. The receiver is now legally responsible.',
        ],
        simulation: {
          testBarcode: 'HANDSHAKE-SEALED',
          expectedResult: 'Ownership Transferred: Active Custodian updated to Maria S. (Audit Log #CUST-9012).',
        },
        troubleshooting: [
          { issue: 'Session PIN forgotten', fix: 'Use TOTP Authenticator 2-Factor code or request supervisor identity verification.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Custody History Log',
      },
    ],
  },

  monthly_count: {
    id: 'monthly_count',
    sectionId: 'warehouse_custody',
    title: 'Monthly Cycle Count & Inventory Audit',
    iconName: 'GridIcon',
    badge: 'Stock Audit',
    category: 'Warehouse & Custody',
    description:
      'Controlled physical count procedure: define a count boundary, pause movements through staff coordination, recount independently, classify discrepancies, and use the canonical reconciliation command.',
    color: '#7c3aed',
    accentColor: '#a78bfa',
    stats: { steps: 5, scansRequired: 1, roles: ['Audit Counter', 'Inventory Manager'], estTime: '45-60 mins' },
    nodes: [
      {
        id: 'cnt_1',
        step: 1,
        title: 'Define Count Boundary & Pause Movements',
        actor: 'Inventory Manager',
        location: 'Manila Hub',
        type: 'intake',
        short: 'Name the shelves or lots being counted and coordinate a temporary manual pause on their movement.',
        summary:
          'The Inventory Manager defines the exact shelf, category, or lot scope and tells affected staff not to pick, receive, or transfer those units during the count. Admin BOS does not currently provide a technical warehouse-zone lock.',
        checklist: [
          'Record the count scope, responsible staff, and agreed movement-pause window.',
          'Ensure all incoming intakes from earlier shifts are committed before starting count.',
          'Prepare an independent count sheet or scanner record before reviewing ledger quantities.',
        ],
        rules: [
          'If a scoped unit moves during counting, stop and restart that lot’s count from a known state.',
        ],
        simulation: {
          testBarcode: 'COUNT-BOUNDARY-REHEARSAL',
          expectedResult: 'Expected evidence: named lots/shelves, count owner, start time, and a manually acknowledged movement pause. No system lock is implied.',
        },
        troubleshooting: [
          { issue: 'An urgent order needs a scoped item', fix: 'Finish and record that exact lot’s count before moving it, or stop and restart the lot after the movement. Do not pretend the earlier count remained valid.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Schedule Cycle Count',
      },
      {
        id: 'cnt_2',
        step: 2,
        title: 'Independent Physical Recount',
        actor: 'Audit Counter (Staff A)',
        location: 'Warehouse Shelves',
        type: 'scan',
        short: 'Count each physical unit and its exact lot before comparing with the ledger.',
        summary:
          'Staff counts the defined scope shelf-by-shelf and records the exact SKU, lot, expiry, location, and physical quantity. To reduce confirmation bias, complete the physical record before opening the current ledger values; the current UI does not claim a dedicated blind-count mode.',
        checklist: [
          'Scan barcode on each physical unit on Shelf 1, Shelf 2, Shelf 3 systematically.',
          'Verify and record expiry date on packaging to verify batch lot integrity.',
          'Flag any unstickered or uncataloged items for quarantine.',
        ],
        rules: [
          'Never estimate or multiply box stacks; scan every unit physically.',
        ],
        simulation: {
          testBarcode: 'BLIND-SCAN-SHELF-01',
          expectedResult: 'Shelf 1 Counted: 42 Units Scanned (System quantities hidden).',
        },
        troubleshooting: [
          { issue: 'Dusty barcode / scanner misread', fix: 'Wipe barcode label with dry microfiber cloth; use manual 13-digit EAN entry as fallback.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Launch Blind Scanner',
      },
      {
        id: 'cnt_3',
        step: 3,
        title: 'Compare Count With Canonical Lots',
        actor: 'Inventory Manager',
        location: 'Admin BOS Terminal',
        type: 'decision',
        short: 'Compare each independently counted lot with its canonical physical, reserved, and sellable quantities.',
        summary:
          'Open the exact lots in Inventory and compare the physical count with the canonical records. Classify matches, overages, shortages, wrong-lot items, and location/custody mismatches. A match needs no adjustment; a mismatch requires a second independent recount before any write.',
        checklist: [
          'Review variance summary table showing Expected vs Scanned counts.',
          'Record items with zero discrepancy as reviewed without writing an adjustment.',
          'Highlight items with variance > 0 for immediate secondary recount.',
        ],
        rules: [
          'Every variance requires a second independent recount before reconciliation, regardless of value.',
        ],
        simulation: {
          testBarcode: 'VAR-ANALYZE-RUN',
          expectedResult: 'Analysis Complete: 12 SKUs Matched, 1 SKU Variance (-1 unit Mulino Bianco).',
        },
        troubleshooting: [
          { issue: 'Overage detected (more units than system)', fix: 'Check if an intake batch was physically placed on shelf before being committed in Admin BOS.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Review Variance Report',
      },
      {
        id: 'cnt_4',
        step: 4,
        title: 'Secondary Recount & Discrepancy Classification',
        actor: 'Shift Lead (Staff B)',
        location: 'Audit Zone',
        type: 'action',
        short: 'Independent second staff member recounts flagged items and classifies cause.',
        summary:
          'A different staff member recounts the flagged discrepancy items. If variance persists, staff classifies the exact cause code (e.g. Expired & Discarded, Packaging Breakage, Store Sampling, Missing).',
        checklist: [
          'Staff B performs targeted recount of flagged SKUs only.',
          'If breakage or damage, attach photo evidence of damaged packaging.',
          'Select authoritative reason code in the Discrepancy Resolution Form.',
        ],
        rules: [
          'Never attribute a shortage to "unknown" without shift supervisor investigation.',
        ],
        simulation: {
          testBarcode: 'DISC-REASON-DMG',
          expectedResult: 'Classified: Reason Code BRK-01 (Packaging squashed during warehouse handling).',
        },
        troubleshooting: [
          { issue: 'A unit remains unexplained after the second count', fix: 'Preserve the discrepancy and available physical, packing, order, and custody evidence for manager investigation. Do not invent a cause or claim camera evidence exists.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Classify Discrepancies',
      },
      {
        id: 'cnt_5',
        step: 5,
        title: 'Manager Authorization & Ledger Adjustment',
        actor: 'Inventory Manager / Owner',
        location: 'Admin BOS Terminal',
        type: 'complete',
        short: 'Manager signs off on cycle count adjustment; inventory ledger balances.',
        summary:
          'Manager reviews the final before/after lots, reservations, evidence, and reason. The canonical reconciliation command preserves lot IDs and writes inventory events only if the resulting physical quantity does not fall below active reservations. Staff then ends the manually coordinated movement pause.',
        checklist: [
          'Review total net financial impact of the monthly audit.',
          'Submit the reasoned reconciliation through the authorized Admin command.',
          'Read back the exact lot and event result, then tell staff the movement pause has ended.',
        ],
        rules: [
          'Audit adjustment records are permanently archived for accounting and financial compliance.',
        ],
        simulation: {
          testBarcode: 'MGR-ADJUST-APPROVE',
          expectedResult: 'Expected record shape: preserved lot identity, reasoned before/after inventory events, reservations intact, and staff-confirmed movement resumption.',
        },
        troubleshooting: [
          { issue: 'The command rejects the reconciliation', fix: 'Keep the original ledger unchanged. Resolve omitted lots, stale versions, reservation conflicts, permissions, or invalid quantities, then retry with the same reviewed evidence.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Approve Audit Adjustments',
      },
    ],
  },

  // -------------------------------------------------------------
  // 5. ORDERS & FULFILLMENT OPERATIONS
  // -------------------------------------------------------------
  new_order: {
    id: 'new_order',
    sectionId: 'orders_fulfillment',
    title: 'Order Fulfillment & Packing Workflow',
    iconName: 'BagIcon',
    badge: 'Order Fulfillment',
    category: 'Orders & Fulfillment',
    description:
      'Step-by-step procedure for processing customer orders, allocating stock using strict FEFO rules, 2-factor scan verification at packing stations, and secure courier dispatch.',
    color: '#059669',
    accentColor: '#34d399',
    stats: { steps: 6, scansRequired: 2, roles: ['Fulfillment Staff', 'Dispatch Coordinator'], estTime: '8-12 mins/order' },
    nodes: [
      {
        id: 'ord_1',
        step: 1,
        title: 'Order Intake & Stock Reservation',
        actor: 'System / Staff',
        location: 'Omni-Hub Dashboard',
        type: 'intake',
        short: 'Order arrives from Storefront, Shopee, Lazada, or Wholesale channel.',
        summary:
          'A submitted website order is only a request and does not reserve stock. Authorized staff reviews the order and confirms it through the canonical command, which revalidates price, discount, customer details, and eligible inventory and then reserves exact FEFO lots atomically.',
        checklist: [
          'Review customer contact info, delivery address, and requested items.',
          'Verify inventory reservation status is green with sufficient unallocated stock.',
          'Check for special order notes (e.g. gift packaging, preferred delivery hours).',
        ],
        rules: [
          'Never manually override FEFO batch allocation without written manager approval.',
        ],
        simulation: {
          testBarcode: 'ORD-2026-8901',
          expectedResult: 'Order Intake Verified: 3 items, Total ₱1,440, Stock Reserved.',
        },
        troubleshooting: [
          { issue: 'The earliest eligible batch cannot cover the full quantity', fix: 'The confirmation command may reserve the remaining quantity from the next eligible FEFO lot. Read back every exact reserved lot before picking.' },
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'Open Omni-Hub Orders',
      },
      {
        id: 'ord_2',
        step: 2,
        title: 'Customer Contact & Total Confirmation',
        actor: 'Customer Care Staff',
        location: 'Admin Messaging Center',
        type: 'action',
        short: 'Confirm delivery method, courier rates, and send payment details.',
        summary:
          'Reach out to customer via WhatsApp/Viber/SMS/Storefront Chat. Confirm final courier delivery rate (Lalamove, Grab, Borzo, or provincial air cargo) and provide official GCash/Maya/Bank Transfer details.',
        checklist: [
          'Quote exact delivery fee based on customer address and package size/weight.',
          'Provide official K2 Jimzon payment account details (never personal staff accounts).',
          'Record any owner-approved payment or reservation deadline for this order; do not invent a standard deadline.',
        ],
        rules: [
          'No items are packed or dispatched until payment is 100% verified or COD is approved.',
        ],
        simulation: {
          testBarcode: 'MSG-QUOTE-SENT',
          expectedResult: 'Quote Sent: Metro Manila Same-Day ₱180 (Total ₱1,620).',
        },
        troubleshooting: [
          { issue: 'Customer is unresponsive before an approved deadline', fix: 'Contact the customer through an available channel, then use the reasoned order exception workflow. The guide never releases reserved stock automatically.' },
        ],
        adminJump: 'inbox',
        jumpLabel: 'Open Customer Messages',
      },
      {
        id: 'ord_3',
        step: 3,
        title: 'Payment Verification & Release to Queue',
        actor: 'Finance / Shift Lead',
        location: 'Admin BOS Terminal',
        type: 'decision',
        short: 'Verify transaction reference in bank/e-wallet and advance order status.',
        summary:
          'Cross-reference customer payment screenshot with actual merchant bank ledger. Once confirmed, mark order status as Paid / Ready for Packing.',
        checklist: [
          'Verify transaction reference number matches bank statement.',
          'Confirm received amount matches exact order total + quoted courier fee.',
          'Advance order state to "Packing Queue" in Admin BOS.',
        ],
        rules: [
          'Never accept unverified payment screenshots without checking bank notification.',
        ],
        simulation: {
          testBarcode: 'PAY-GCASH-9982',
          expectedResult: 'Payment Verified: Ref #GC-889102, ₱1,620.00 confirmed in GCash merchant account.',
        },
        troubleshooting: [
          { issue: 'Partial payment / missing courier fee', fix: 'Hold order in Payment Pending; contact customer with exact missing balance amount.' },
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'View Packing Queue',
      },
      {
        id: 'ord_4',
        step: 4,
        title: 'FEFO Shelf Picking & Barcode Verification',
        actor: 'Fulfillment Staff',
        location: 'Warehouse Shelving',
        type: 'scan',
        short: 'Pick exact batch from shelf and scan barcode at packing station.',
        summary:
          'Staff brings pick list to warehouse shelves. Retrieve the specific batch lot specified on the order. Bring items to the packing station and perform 2-factor scan verification.',
        checklist: [
          'Locate designated shelf bin indicated on pick sheet.',
          'Verify item expiry date matches the allocated lot record.',
          'Scan each product barcode at packing station to confirm 100% SKU match.',
        ],
        rules: [
          'Packing station software will reject incorrect SKU or wrong batch lot scans.',
          'The canonical packing command records the authenticated staff actor and exact unit scan.',
        ],
        simulation: {
          testBarcode: '8013355998124',
          expectedResult: 'Packing Scan Match: Item 1 of 3 Verified (Baiocchi 260g, Lot LOT-2026-08-01).',
        },
        troubleshooting: [
          { issue: 'Wrong variant picked by accident', fix: 'Scanner emits error buzzer; return unit to shelf and pick correct SKU indicated on screen.' },
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'Packing Station Scanner',
      },
      {
        id: 'ord_5',
        step: 5,
        title: 'Secure Packing & Courier Booking',
        actor: 'Fulfillment Staff',
        location: 'Packing Station',
        type: 'action',
        short: 'Pack securely, use the K2 packing QR, then obtain the real courier waybill from the booking provider.',
        summary:
          'Pack and seal the verified order. Before courier booking, use the K2 order/packing QR; it is not a courier label. Book the courier in the provider portal and only then record and attach the real tracking or waybill details.',
        checklist: [
          'Include official K2 Jimzon product care note and receipt in box.',
          'Apply shock-absorbing cushioning so items cannot move or rattle inside box.',
          'After booking, compare the real courier label with the order address before attaching it.',
        ],
        rules: [
          'Chocolates must include reusable frozen gel pack during dry/warm season.',
        ],
        simulation: {
          testBarcode: 'K2-PACKING-QR',
          expectedResult: 'Expected state: packed order plus K2 packing QR; courier tracking remains empty until a real booking is recorded.',
        },
        troubleshooting: [
          { issue: 'Courier portal or printer is unavailable', fix: 'Keep the order packed but not dispatched. Retry in the courier portal or use its documented manual fallback; never fabricate a tracking number.' },
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'Open Packing Record',
      },
      {
        id: 'ord_6',
        step: 6,
        title: 'Courier Handover & Customer Update',
        actor: 'Dispatch Coordinator',
        location: 'Dispatch Desk',
        type: 'complete',
        short: 'Verify the booked courier, record the handover evidence, and send the real tracking details through an available channel.',
        summary:
          'When the booked courier arrives, compare the provider booking details with the rider or counter handover. Record courier, tracking, actor, time, and available evidence in Admin BOS. Then send the real tracking details to the customer through an actually connected channel; no automatic SMS or email is claimed.',
        checklist: [
          'Verify rider name and plate number match the booking app.',
          'Record the booking ID, tracking reference, handover time, and available evidence.',
          'Mark the order dispatched only after handover succeeds, then manually send the tracking details through the recorded customer conversation or external app in use.',
        ],
        rules: [
          'Never hand over package without recording driver plate number and booking ID.',
        ],
        simulation: {
          testBarcode: 'DISPATCH-LALAMOVE',
          expectedResult: 'Expected record shape: dispatched fulfillment with real courier/tracking evidence and a separately recorded customer communication.',
        },
        troubleshooting: [
          { issue: 'Rider cancellation / no-show', fix: 'Re-book backup courier rider in delivery portal; update pickup ETA in customer chat.' },
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'Dispatch Ledger',
      },
    ],
  },

  pasabuy_lifecycle: {
    id: 'pasabuy_lifecycle',
    sectionId: 'orders_fulfillment',
    title: 'Pasabuy Custom Sourcing Workflow',
    iconName: 'PlaneIcon',
    badge: 'Custom Sourcing',
    category: 'Orders & Fulfillment',
    description:
      'End-to-end concierge workflow for handling custom Italian product requests from Manila customers: request intake, Milan store research, cost computation, official quote approval, and flight delivery.',
    color: '#0284c7',
    accentColor: '#38bdf8',
    stats: { steps: 6, scansRequired: 1, roles: ['Pasabuy Coordinator', 'Milan Sourcing Lead'], estTime: '2-5 days' },
    nodes: [
      {
        id: 'pasa_1',
        step: 1,
        title: 'Customer Request Intake & Triage',
        actor: 'Pasabuy Coordinator',
        location: 'Pasabuy Manager',
        type: 'intake',
        short: 'Review customer request details, product reference photo, and target budget.',
        summary:
          'Customer submits request via Storefront Pasabuy form or chat. Coordinator reviews requested Italian item, brand, variant size, target budget, and shipping preference (Air Cargo vs Sea Freight).',
        checklist: [
          'Review reference photo and product link submitted by customer.',
          'Verify customer contact email and mobile number.',
          'Assign unique Pasabuy Reference ID (e.g. PSB-2026-0825-09).',
        ],
        rules: [
          'Prohibited items (flammable liquids, perishable uncured meats) must be rejected immediately.',
        ],
        simulation: {
          testBarcode: 'PSB-2026-0825-09',
          expectedResult: 'Request Triaged: Baci Perugina Tin 400g, Target Budget ₱1,200, Air Cargo.',
        },
        troubleshooting: [
          { issue: 'Vague product description without photo', fix: 'Send message requesting photo of packaging or exact weight to avoid buying wrong variant in Italy.' },
        ],
        adminJump: 'pasabuy_manager',
        jumpLabel: 'Open Pasabuy Queue',
      },
      {
        id: 'pasa_2',
        step: 2,
        title: 'Milan Sourcing & Cost Calculation',
        actor: 'Milan Sourcing Lead (Cousin)',
        location: 'Milan Hub / Italian Stores',
        type: 'action',
        short: 'Milan team checks store availability and calculates landed cost floor.',
        summary:
          'Milan buyer checks physical stock in Italian supermarkets, bottegas, or pharmacies (Esselunga, Coop, Eataly). Records exact retail purchase price in EUR, local Italian VAT, and weight for air freight calculation.',
        checklist: [
          'Confirm exact product availability in Milan shops.',
          'Enter purchase price in EUR into Admin Pasabuy Cost Calculator.',
          'Calculate air cargo freight based on volumetric weight and fuel surcharge.',
        ],
        rules: [
          'Calculated landed cost sets the hard price floor; quote must ensure positive gross margin.',
        ],
        simulation: {
          testBarcode: 'COST-CALC-RUN',
          expectedResult: 'Cost Breakdown: Item €12.50 + Air Freight €4.20 + Duty €1.80 = Landed ₱1,120.',
        },
        troubleshooting: [
          { issue: 'Item out of stock in Milan supermarkets', fix: 'Check specialty bottegas or propose comparable authentic Italian alternative to customer.' },
        ],
        adminJump: 'pasabuy_manager',
        jumpLabel: 'Open Cost Calculator',
      },
      {
        id: 'pasa_3',
        step: 3,
        title: 'Official Itemized Quote Generation',
        actor: 'Pasabuy Coordinator',
        location: 'Admin BOS Terminal',
        type: 'decision',
        short: 'Generate formal quote breakdown and send to customer for approval.',
        summary:
          'Coordinator generates official K2 Pasabuy Quote in PHP showing item price, international freight share, handling fee, and estimated delivery ETA. Quote is sent via customer chat/email.',
        checklist: [
          'Review itemized breakdown (Product cost + Air Cargo + Customs + Concierge fee).',
          'Set the owner-approved validity and terms on this quote; there is no universal duration.',
          'Send the itemized quote through an actually available customer channel and record that communication.',
        ],
        rules: [
          'Never purchase goods in Italy before the customer explicitly accepts the quote.',
        ],
        simulation: {
          testBarcode: 'QUOTE-GEN-OK',
          expectedResult: 'Quote #Q-9912 Issued: ₱1,380.00 Total (Valid for 7 days).',
        },
        troubleshooting: [
          { issue: 'Customer requests a discount or changed terms', fix: 'Return the quote to owner review. No automatic percentage, quantity threshold, or discount rule applies.' },
        ],
        adminJump: 'pasabuy_manager',
        jumpLabel: 'Issue Quote',
      },
      {
        id: 'pasa_4',
        step: 4,
        title: 'Customer Approval & Downpayment',
        actor: 'Customer / Finance Lead',
        location: 'Payment Gateway / Bank',
        type: 'action',
        short: 'Record the customer’s explicit quote acceptance, then verify any owner-approved payment requirement.',
        summary:
          'The customer explicitly accepts the exact quote and its recorded payment terms. Finance verifies any required payment against the merchant ledger before staff advances the request to the purchasing state.',
        checklist: [
          'Record payment transaction reference number.',
          'Advance request status to "Purchasing Queue (Milan)" in Admin BOS.',
          'Notify Milan buyer with purchase priority flag.',
        ],
        rules: [
          'Deposit amount, refundability, and cancellation terms are quote-specific owner decisions and must be communicated before payment.',
        ],
        simulation: {
          testBarcode: 'PASABUY-PAYMENT-REHEARSAL',
          expectedResult: 'Expected record shape: accepted quote, separately verified payment evidence when required, and a reasoned purchasing transition.',
        },
        troubleshooting: [
          { issue: 'Customer asks to cancel after payment', fix: 'Open a customer exception, preserve the quote, payment, purchase state, and communication evidence, then obtain an authorized case-by-case decision. No automatic refund or handling fee applies.' },
        ],
        adminJump: 'pasabuy_manager',
        jumpLabel: 'Confirm Deposit',
      },
      {
        id: 'pasa_5',
        step: 5,
        title: 'Milan Purchase & Flight Cargo Tagging',
        actor: 'Milan Buyer (Cousin)',
        location: 'Milan Retailers / MXP Hub',
        type: 'action',
        short: 'Buyer purchases item in Italy, applies Pasabuy QR tag, and loads into flight cargo box.',
        summary:
          'Buyer purchases item, uploads store receipt photo to Admin BOS, affixes Pasabuy tracking sticker, and places item into the designated scheduled air cargo flight box.',
        checklist: [
          'Inspect purchased item packaging and verify expiry date.',
          'Upload official store purchase receipt photo.',
          'Scan item into Flight Cargo Box manifest.',
        ],
        rules: [
          'Item is linked to the flight consignment tracking number.',
        ],
        simulation: {
          testBarcode: 'PSB-TAG-BOX2',
          expectedResult: 'Purchased in Milan: Receipt Uploaded (€12.50), Packed into Flight Box #BOX-2026-08-B.',
        },
        troubleshooting: [
          { issue: 'Store receipt lost', fix: 'Use bank card charge slip and take photo of store price tag as secondary proof.' },
        ],
        adminJump: 'consignment',
        jumpLabel: 'View Flight Box Manifest',
      },
      {
        id: 'pasa_6',
        step: 6,
        title: 'Manila Receiving & Final Dispatch',
        actor: 'Manila Hub Coordinator',
        location: 'Manila Hub',
        type: 'complete',
        short: 'Flight arrives, item is scanned at Manila Hub, and courier delivers to customer.',
        summary:
          'Cargo arrives at Manila Hub. Staff scans Pasabuy reference barcode, performs final inspection, collects remaining balance (if any), and books same-day courier directly to customer.',
        checklist: [
          'Scan Pasabuy reference barcode upon unboxing flight cargo.',
          'Confirm customer delivery address and notify customer of arrival.',
          'Dispatch via courier and provide live tracking link.',
        ],
        rules: [
          'Mark Pasabuy request as Completed only after verified courier delivery.',
        ],
        simulation: {
          testBarcode: 'PSB-FINAL-DISPATCH',
          expectedResult: 'Delivered: Remaining ₱690 paid, Courier Lalamove dispatched to customer.',
        },
        troubleshooting: [
          { issue: 'Customer address changed while in transit', fix: 'Update delivery address in booking system before scheduling final rider.' },
        ],
        adminJump: 'pasabuy_manager',
        jumpLabel: 'Finalize Pasabuy Delivery',
      },
    ],
  },
  // -------------------------------------------------------------
  // 8. CHANNEL INTAKE: MARKETPLACE AND SOCIAL INTEGRATION
  //
  // MAP-028. This map is deliberately honest about what is not built.
  // A staff member reading it must be able to tell, at a glance, which steps
  // K2 can perform today and which ones require an adapter that does not
  // exist. Drawing an unbuilt connector as if it worked would be worse than
  // drawing nothing: it would set an expectation that a marketplace order is
  // arriving somewhere when nobody is watching for it.
  // -------------------------------------------------------------
  channel_integration_lifecycle: {
    id: 'channel_integration_lifecycle',
    sectionId: 'channel_intake',
    title: 'Marketplace & Social Channel Connection Lifecycle',
    iconName: 'GridIcon',
    badge: 'Channels & Integrations',
    category: 'Channels & Integrations',
    description:
      'The real path from a seller-portal credential to stock and messages inside K2 — Shopee, Lazada, TikTok Shop, and the social inboxes. Steps marked NOT BUILT have no adapter today; the Seller Center remains the system of record for those.',
    color: '#7c3aed',
    accentColor: '#a78bfa',
    stats: {
      steps: 8,
      scansRequired: 0,
      roles: ['Owner / Account Holder', 'Admin', 'Channel Staff'],
      estTime: 'Days to weeks — provider approval dominates',
    },
    nodes: [
      {
        id: 'ch_1',
        step: 1,
        title: 'Obtain Seller Portal Access',
        actor: 'Owner / Account Holder',
        location: 'Shopee Open Platform · Lazada Open Platform · TikTok Shop Partner Center',
        type: 'intake',
        short: 'Register the K2 developer app on each marketplace and record which shop it is bound to.',
        summary:
          'Every marketplace requires an approved developer application before any API call is possible. This is an account and paperwork step, not an engineering one, and it usually takes the longest. K2 operates more than one shop per marketplace, so each credential set must be recorded against the specific shop it belongs to — not against the marketplace as a whole.',
        checklist: [
          'Register the K2 application on the marketplace open platform and record the app identifiers.',
          'Note the exact shop ID for every K2 shop on that marketplace, not just the first one.',
          'Record which staff member physically holds stock for each shop.',
          'Capture the approved API scopes; a scope K2 was not granted is a capability K2 does not have.',
        ],
        rules: [
          'Never paste marketplace credentials into the Admin UI, a note, or a message. They belong in the server secret store only.',
          'One credential set per shop. Two Shopee shops are two credential sets, never one shared set.',
        ],
        troubleshooting: [
          { issue: 'Marketplace rejects or delays the app review', fix: 'Continue operating that channel from its Seller Center. Do not mark the channel connected in Admin; the readiness board must keep showing the truth.' },
          { issue: 'Only one shop was approved', fix: 'Record only that shop. A second shop that has no credential must not inherit the first shop’s connection status.' },
        ],
        adminJump: 'integrations',
        jumpLabel: 'Open Channel Readiness',
      },
      {
        id: 'ch_2',
        step: 2,
        title: 'Store Secrets Server-Side',
        actor: 'Admin',
        location: 'Supabase Edge Function secrets',
        type: 'action',
        short: 'Load the partner keys into server secrets. They never reach the browser.',
        summary:
          'The Channel Readiness screen lists the exact secret names each channel needs — for example SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY and SHOPEE_SHOP_ID. These are set in the Supabase function settings and read only by server-side code. The Admin browser bundle must never contain a marketplace key; the build boundary check exists to catch exactly that mistake.',
        checklist: [
          'Set each named secret in the Supabase Edge Function settings.',
          'Confirm the secret names match what the function reads, character for character.',
          'Re-run the secret and build-boundary scans so no key reached a browser bundle.',
        ],
        rules: [
          'A marketplace secret in a VITE_ variable is a leak. VITE_ variables are compiled into the public bundle.',
          'Rotate any credential that has ever been pasted into a chat, a ticket, or a screenshot.',
        ],
        troubleshooting: [
          { issue: 'Function reports a missing secret', fix: 'Confirm the exact name and that it was set on the correct Supabase project, then redeploy the function so it picks the value up.' },
        ],
        adminJump: 'integrations',
        jumpLabel: 'View Required Secrets',
      },
      {
        id: 'ch_3',
        step: 3,
        title: 'Verify the Webhook Signature Path',
        actor: 'Admin',
        location: 'Supabase Edge Function — shopee-webhook',
        type: 'decision',
        short: 'Shopee ingress is prepared locally but still needs provider and real-event verification. Lazada and TikTok have none.',
        summary:
          'Shopee is the only channel with a locally prepared ingress path. Its function is designed to verify the push signature, bound the body to 256 KiB with an absolute read deadline, build a deterministic event identity, enforce a replay window, and hand the event to one atomic capture command. It is not operational until exact provider signing, credentials, limits, deployment, and one real event are verified end to end. Lazada and TikTok Shop have no function, validation module, or capture command, so those channels stay in their Seller Centers.',
        checklist: [
          'Confirm the signing string against the approved marketplace documentation before enabling the endpoint.',
          'Send one real push and confirm a captured event appears with the expected shop and event identity.',
          'Confirm a replayed push preserves the original row rather than creating a second one.',
        ],
        rules: [
          'One successful webhook does not mean the channel is live. It means one event arrived.',
          'Do not build a second ingress shape for Lazada or TikTok. Reuse the Shopee pattern so the security review carries over.',
        ],
        troubleshooting: [
          { issue: 'Pushes arrive but fail signature verification', fix: 'The signing string is almost always the cause. Compare the exact concatenation order against the marketplace docs; do not relax verification to make it pass.' },
          { issue: 'A Lazada or TikTok event needs handling today', fix: 'There is no path. Handle it in the Seller Center and record the outcome manually.' },
        ],
        adminJump: 'integrations',
        jumpLabel: 'Check Channel Status',
      },
      {
        id: 'ch_4',
        step: 4,
        title: 'Agree the Channel Vocabulary — BLOCKING',
        actor: 'Admin',
        location: 'Database schema',
        type: 'decision',
        short: 'Three different spellings for the same channels exist today. Settle them before the first real row.',
        summary:
          'The same marketplace is currently named in several ways across the system: orders accept a fixed short list, an older type carries per-account names, and the channel listing table has no constraint at all. A connector writing one spelling while a report reads another produces silence, not an error. Fixing this while the tables hold no marketplace rows costs almost nothing; fixing it afterwards means rewriting live data.',
        checklist: [
          'Choose one canonical name per channel, and one way to express which K2 shop a row belongs to.',
          'Apply the vocabulary as a constraint on every table that carries a channel, including channel listings.',
          'Map or retire the older per-account type so only one vocabulary survives.',
        ],
        rules: [
          'A channel column without a constraint will eventually hold a typo, and nothing will report it.',
          'Shop identity must exist on an order before the first marketplace order arrives. It cannot be inferred later.',
        ],
        troubleshooting: [
          { issue: 'A report shows zero marketplace rows that should exist', fix: 'Compare the exact channel string the writer used against the string the reader filtered on. A mismatch returns an empty result, not an error.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Inventory',
      },
      {
        id: 'ch_5',
        step: 5,
        title: 'Map SKUs to Channel Listings',
        actor: 'Channel Staff',
        location: 'Admin — Inventory & Channel Listings',
        type: 'action',
        short: 'Link each K2 SKU to its marketplace item so an incoming event can find the product.',
        summary:
          'A marketplace event identifies a product by the marketplace’s own item ID, not by the K2 SKU. The channel listing record is the translation between them, and it also holds the per-channel price, the publication state, and the last sync result. Without a listing row, an inbound event has no product to attach to.',
        checklist: [
          'Record the external item ID and external SKU ID exactly as the marketplace reports them.',
          'Set the channel price if it differs from the K2 retail price.',
          'Leave publication state as draft until the listing has been checked against the live marketplace page.',
        ],
        rules: [
          'Two K2 shops listing the same SKU are two listing rows, never one. They have different external identifiers.',
          'A listing row is a mapping, not a stock record. Stock stays in the batch ledger.',
        ],
        troubleshooting: [
          { issue: 'External item ID changed after a marketplace edit', fix: 'Update the listing row. An unmapped event should be reviewed by a person, never guessed onto the nearest SKU.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Channel Listings',
      },
      {
        id: 'ch_6',
        step: 6,
        title: 'Decide the Stock Pool and the Oversell Rule — BLOCKING FOR CHANNEL TWO',
        actor: 'Owner / Admin',
        location: 'Policy decision, then schema',
        type: 'decision',
        short: 'One pool, or per-shop allocation? Decide before two channels sell the same stock.',
        summary:
          'Master Inventory is the Philippines-wide sum of everything K2 holds, including stock physically held by shop staff. The moment two channels can sell the same item, a race exists: a Shopee sale and a website sale can both succeed against the last unit. With one channel live this is invisible. With two it is the defining failure of multi-channel retail, and marketplace accounts are penalised for cancellations in ways that are slow and expensive to recover.',
        checklist: [
          'Decide whether a marketplace sale decrements the same pool the website sells from, or whether each shop holds a reserved allocation.',
          'Decide the behaviour when the race is lost: oversell and apologise, or under-list and protect the account rating.',
          'Write the decision down before any adapter is built against an assumption.',
        ],
        rules: [
          'Allocating stock to a shop changes the holder, never the total. Master Inventory does not shrink.',
          'Do not let two systems each believe they own the last unit.',
        ],
        troubleshooting: [
          { issue: 'A marketplace order cannot be fulfilled because the unit was sold on the website', fix: 'This is the race, not a data error. Cancel through the marketplace flow, record the cause, and treat repeat occurrences as a signal the allocation rule is wrong.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Open Master Inventory',
      },
      {
        id: 'ch_7',
        step: 7,
        title: 'Social & Messaging Inboxes — NOT BUILT',
        actor: 'Channel Staff',
        location: 'Messenger · Instagram · WhatsApp · Viber · TikTok',
        type: 'decision',
        short: 'The unified inbox can display these platforms. Nothing delivers messages into it.',
        summary:
          'The admin inbox already understands these platforms and will render them correctly the moment rows exist — each has its own label and colour so staff can recognise the source instantly. But no webhook, adapter, or capture command exists for any of them. A customer messaging K2 on Instagram today reaches no K2 system. Only the website and Virtual Store chat write real conversation rows, and those two are themselves gated behind an unapplied migration.',
        checklist: [
          'Keep answering these platforms in their own apps until an adapter exists.',
          'Do not mark a social channel as connected on the readiness board because messages are being answered manually.',
        ],
        rules: [
          'Never tell a customer their message was received "in the system" for a platform K2 does not ingest.',
          'The inbox showing a platform name is not evidence that platform is connected.',
        ],
        troubleshooting: [
          { issue: 'Staff expect Instagram messages to appear in the inbox', fix: 'They will not. There is no ingestion. Answer in the app and record any commitment made as an internal note on the related order.' },
        ],
        adminJump: 'inbox',
        jumpLabel: 'Open Unified Inbox',
      },
      {
        id: 'ch_8',
        step: 8,
        title: 'Record Only Verified Channel Status',
        actor: 'Admin',
        location: 'Admin — Channel Readiness',
        type: 'complete',
        short: 'The readiness board is an evidence record, not an intention board.',
        summary:
          'A channel is marked operational only after a real event from that channel has been observed end to end. Everything else stays not connected. The value of this board is that a staff member can trust it: if it says a channel is connected, orders from that channel are actually arriving somewhere a person is watching.',
        checklist: [
          'Mark a channel operational only after observing a real, verified event through the full path.',
          'Record what was verified and when, so the claim can be re-checked later.',
          'Re-verify after any credential rotation or marketplace API version change.',
        ],
        rules: [
          'Outbound listing publication does not exist yet. The listing table has columns for it, which is preparation, not capability.',
          'An optimistic status on this board becomes an operational failure the day someone relies on it.',
        ],
        troubleshooting: [
          { issue: 'Unsure whether a channel counts as connected', fix: 'It does not. If it needed a judgement call, the evidence is not there yet.' },
        ],
        adminJump: 'integrations',
        jumpLabel: 'Open Channel Readiness',
      },
    ],
  },

}

export const AI_IMAGE_PROMPT_TEMPLATES = [
  {
    category: 'Italian Bakery & Biscuits',
    key: 'biscuits',
    exampleItem: 'Mulino Bianco Baiocchi / Pan di Stelle',
    recommendedAspectRatio: '1:1 (Catalog) or 4:3 (Spotlight)',
    promptFormula:
      'Commercial luxury editorial product photograph of [PRODUCT NAME] in its authentic Italian matte paper packaging, placed elegantly on a rustic reclaimed Tuscan wood surface. A few loose golden baked cookies and delicate chocolate hazelnuts sit artfully beside the open package on a vintage handmade ceramic saucer. Soft natural morning window sunlight streaming from the left, warm amber and olive undertones, shallow depth of field (f/2.8, 85mm lens), ultra-sharp packaging typography, photorealistic textures, 8k resolution, quiet luxury gourmet atmosphere.',
    negativePrompt:
      'plastic glare, neon lighting, oversaturated colors, distorted letters, blurry text, cartoon, 3D render, CGI, watermark, stock photo watermark, artificial studio flash, sterile white background.',
    tips: [
      'Replace [PRODUCT NAME] with the exact Italian product name (e.g. Mulino Bianco Baiocchi con crema di nocciole e cacao).',
      'For the After shot: specify "the package open with three cookies arranged on a linen napkin".',
      'For Storefront consistency, always specify warm morning sunlight and matte wooden background.',
    ],
  },
  {
    category: 'Artisanal Olive Oil & Vinegar',
    key: 'olive_oil',
    exampleItem: 'Frantoio Muraglia Extra Virgin Olive Oil / Aceto Balsamico di Modena',
    recommendedAspectRatio: '1:1 or 3:4',
    promptFormula:
      'Editorial luxury gourmet still life photography of an artisanal Italian extra virgin olive oil ceramic jar [PRODUCT NAME]. The bottle stands proud on a dark aged olive wood tabletop next to a rough-torn crust of artisan ciabatta bread and a small terracotta dipping dish filled with glowing golden-green olive oil. Gentle side illumination catching the glossy olive oil surface, soft natural shadows, rustic stone kitchen backdrop with fresh olive branch sprigs, Hasselblad 100mm f/3.2, hyper-detailed ceramic glaze texture, rich warm Mediterranean color palette, 8k.',
    negativePrompt:
      'harsh direct flash, plastic bottle, cheap grocery shelf, distorted labels, modern stainless steel kitchen, low resolution, blown out highlights, artificial rendering.',
    tips: [
      'Mention the specific bottle material (e.g. "hand-painted rainbow ceramic jar" or "dark amber glass bottle").',
      'Include a crust of rustic bread and terracotta dipping bowl for appetizing food storytelling.',
    ],
  },
  {
    category: 'Italian Espresso & Coffee',
    key: 'coffee',
    exampleItem: 'Lavazza Qualità Oro / Illy Classico Ground Coffee',
    recommendedAspectRatio: '1:1 (Catalog)',
    promptFormula:
      'High-end commercial culinary photograph of [PRODUCT NAME] Italian roasted coffee in its vacuum-sealed golden tin canister. The canister is positioned on a worn Tuscan walnut wood counter next to a classic Italian aluminum moka pot with delicate wisps of steam and a freshly brewed porcelain espresso cup showing thick golden-brown crema. Scattered dark roasted whole coffee beans resting around the base. Soft warm ambient café lighting, 90mm macro lens, crisp branding details on the tin, cozy authentic Italian bottega mood, photorealistic, 8k.',
    negativePrompt:
      'paper takeaway cup, Starbucks style, cold lighting, plastic packaging, text gibberish, synthetic rendering, blown highlights, messy composition.',
    tips: [
      'Specify the moka pot and porcelain espresso cup with golden crema.',
      'Whole beans scattered on dark wood create an authentic artisanal roastery aesthetic.',
    ],
  },
  {
    category: 'Bronze-Die Pasta & Sauces',
    key: 'pasta',
    exampleItem: 'Gentile Pasta di Gragnano IGP / Salsa Pronta di Pomodoro Ciliegino',
    recommendedAspectRatio: '1:1 or 16:9',
    promptFormula:
      'Artisanal Italian food photography of [PRODUCT NAME] packaging made of traditional rough blue and cream paper, standing on a flour-dusted rustic wooden prep table in a traditional Gragnano workshop. Nearby sits a glass jar of vibrant deep red cherry tomato sauce, fresh fragrant basil leaves, and a sprinkle of coarse sea salt. Soft diffused daylight from a tall arched window, tactile rough bronze-die pasta texture visible through the package window, Canon EOS R5 85mm f/2.0, genuine Italian craftsmanship aesthetic, ultra-high resolution.',
    negativePrompt:
      'cooked spaghetti mess, fast food look, plastic cellophane shine, blurry labels, synthetic textures, studio white seamless, oversaturated reds.',
    tips: [
      'Highlight the rough matte paper packaging and tactile bronze-die texture.',
      'Flour-dusted wooden surfaces give immediate handmade artisanal authority.',
    ],
  },
  {
    category: 'Italian Bath, Scents & Wellness',
    key: 'wellness',
    exampleItem: 'Nesti Dante Luxury Soap / Marvis Classic Strong Mint Toothpaste',
    recommendedAspectRatio: '1:1',
    promptFormula:
      'Luxury spa and grooming editorial product photograph of [PRODUCT NAME] in its vintage embossed Florentine wrapper. The product rests on a fluted travertine marble slab beside a textured natural linen washcloth and a small glass vial with botanical lavender and citrus sprigs. Soft gentle morning bathroom sunlight, delicate water droplets on the marble, crisp metallic foil stamping on the packaging, quiet luxury wellness styling, Sony A7R V 90mm macro, 8k, museum-quality clean composition.',
    negativePrompt:
      'cheap plastic soap dish, messy bathroom, harsh fluorescent lighting, distorted typography, fake brand names, oversaturation, CGI render.',
    tips: [
      'Use travertine marble or linen washcloth props for wellness/scents products.',
      'Specify metallic foil embossing and crisp vintage Italian label typography.',
    ],
  },
]
