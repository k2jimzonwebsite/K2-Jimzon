/**
 * K2 Jimzon — Master Workflow Graph Authoritative Data Definitions
 * Divided into clear operational sections:
 * 1. Cross-Border Supply Chain (Italy Cousin -> Air Transit -> Manila Arrival)
 * 2. Manila Intake & Decision Branching (New Product Creation vs Added Inventory)
 * 3. Inventory & Custody Management (FEFO Lots, Handover, Cycle Counts)
 * 4. Fulfillment & Customer Concierge (Order Packing & Pasabuy)
 */

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
          { issue: 'Customs delay / flight reschedule', fix: 'Update consignment ETA in Admin BOS; automatically alerts customer care for pending Pasabuy orders.' },
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
          { issue: 'Shortage (fewer units in box than manifest)', fix: 'Log item discrepancy code SHORT-01; system automatically alerts Milan buyer.' },
        ],
        adminJump: 'intake',
        jumpLabel: 'Open Mobile Intake Tool',
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
        title: 'Commit Stock & Multi-Channel Sync',
        actor: 'Hub Manager',
        location: 'Admin BOS Terminal',
        type: 'complete',
        short: 'Approve batch lot; inventory immediately goes live across Storefront and channels.',
        summary:
          'Hub Manager reviews the intake reconciliation sheet. Clicking "Commit Batch" writes permanent ledger entries, assigns shelf bin location, and pushes live available stock to Storefront, Shopee, and Lazada.',
        checklist: [
          'Verify total counted units equals physical stock on shelves.',
          'Affix K2 Jimzon internal lot label with QR code onto shelf bin.',
          'Click "Commit Batch". Confirm live stock increases on Storefront.',
        ],
        rules: [
          'Intake commits are permanent audit records; corrections require a manager-authorized cycle adjustment.',
        ],
        simulation: {
          testBarcode: 'COMMIT-ALL-CHANNELS',
          expectedResult: 'Committed: +48 units live on Storefront, Shopee, and Lazada.',
        },
        troubleshooting: [
          { issue: 'Storefront stock count not updating', fix: 'Clear Redis cache in System DevOps modal or verify catalog status is Active.' },
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'Verify Live Stock',
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
        adminJump: 'intake',
        jumpLabel: 'Scan Barcode',
      },
      {
        id: 'ext_2',
        step: 2,
        title: 'New FEFO Batch Lot & Expiry Registration',
        actor: 'Intake Staff',
        location: 'Intake Terminal',
        type: 'decision',
        short: 'Enter Best Before Date (YYYY-MM-DD) and landed cost for the new arrival.',
        summary:
          'Create a new product_batches entry for this specific shipment arrival. Record the printed expiry date, unit EUR cost (€), freight surcharge, and total physical units received.',
        checklist: [
          'Enter expiration date accurately in YYYY-MM-DD format from the physical packaging.',
          'Input EUR purchase cost from cousin’s store receipt (e.g. €2.40).',
          'System automatically computes landed cost floor in PHP (₱310.00).',
        ],
        rules: [
          'Different expiry dates MUST be tracked as separate batch lots to enforce FEFO picking.',
        ],
        simulation: {
          testBarcode: 'LOT-NEW-2027',
          expectedResult: 'Batch Created: 24 units, Expiry: 2027-04-30, Landed Cost: ₱310.00.',
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
        title: 'Physical Lot Sticker Printing',
        actor: 'Intake Staff',
        location: 'Intake Desk Printer',
        type: 'action',
        short: 'Print K2 internal batch lot QR sticker with SKU, expiry, and storage instructions.',
        summary:
          'Thermal printer generates adhesive K2 lot label containing SKU, Lot Number, Best Before Date, and barcode for fulfillment scanners.',
        checklist: [
          'Print batch lot label.',
          'Affix label onto carton case or master shelf bin.',
        ],
        rules: [
          'Do not obscure manufacturer original ingredients or allergen box with the sticker.',
        ],
        simulation: {
          testBarcode: 'PRINT-LOT-TAG',
          expectedResult: 'Printed: Lot #LOT-2027-04-30 / SKU IT-MUL-001.',
        },
        troubleshooting: [
          { issue: 'Thermal ribbon faint', fix: 'Replace thermal ribbon or clean printhead with isopropyl alcohol swab.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Print Batch Labels',
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
        title: 'Commit Added Stock to Live Channels',
        actor: 'Hub Manager',
        location: 'Admin BOS Terminal',
        type: 'complete',
        short: 'Manager authorizes batch; stock count increments across all channels.',
        summary:
          'Manager reviews added batch count against flight consignment manifest. Click "Commit Stock Addition" to push live inventory updates to the Storefront, Shopee, and Lazada.',
        checklist: [
          'Verify total units added (+24).',
          'Confirm Storefront stock badge updates from Low Stock to In Stock.',
        ],
        rules: [
          'Ledger entries are permanent and traceable to the staff member who performed the intake.',
        ],
        simulation: {
          testBarcode: 'COMMIT-ADD-STOCK',
          expectedResult: 'Stock Increment Live: Total on Hand 14 -> 38 units.',
        },
        troubleshooting: [
          { issue: 'Shopee sync delay', fix: 'Check Integrations tab to force manual webhook sync.' },
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'Channel Inventory Hub',
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
      'Complete workflow for new Italian items not yet in our catalog: Master SKU registration, EUR landed cost pricing matrix, ChatGPT / AI Studio photo generation, Before/After unboxing setup, and live publication.',
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
        adminJump: 'intake',
        jumpLabel: 'Create Product Draft',
      },
      {
        id: 'np_2',
        step: 2,
        title: 'Pricing Matrix & Landed Cost Floor',
        actor: 'Pricing Lead / Owner',
        location: 'Admin Pricing Matrix',
        type: 'action',
        short: 'Input purchase cost in EUR (€); system calculates landed cost floor and margins in PHP (₱).',
        summary:
          'Enter original Italian store purchase price from cousin’s receipt in EUR. System calculates landed cost floor in PHP based on active exchange rate, air freight weight share, and customs duty.',
        checklist: [
          'Enter purchase cost in EUR (e.g. €3.50).',
          'Review calculated landed cost floor in PHP (e.g. ₱380.00).',
          'Set consumer retail SRP in PHP (e.g. ₱590.00).',
          'Set wholesale B2B case price in PHP with MOQ (e.g. ₱480.00, MOQ: 12).',
        ],
        rules: [
          'Consumer SRP must NEVER be set below the calculated landed cost floor.',
        ],
        simulation: {
          testBarcode: 'PRICE-MARGIN-CHECK',
          expectedResult: 'Pricing Valid: Floor ₱380.00 -> SRP ₱590.00 (Gross Margin: 35.6%).',
        },
        troubleshooting: [
          { issue: 'Exchange rate spike', fix: 'Update active EUR/PHP rate in Settings to recalculate all pricing floors.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Configure Pricing',
      },
      {
        id: 'np_3',
        step: 3,
        title: 'ChatGPT & AI Studio Photorealistic Image Generation',
        actor: 'Content Designer',
        location: 'AI Image Studio',
        type: 'action',
        short: 'Generate luxury editorial product photos using K2 verified prompt formulas.',
        summary:
          'Use K2’s tested prompt engineering formulas in ChatGPT / Midjourney / AI Studio to create hyper-realistic editorial product photography matching the Tuscan wood and linen storefront aesthetic.',
        checklist: [
          'Select product category and packaging style from the AI Prompt Studio.',
          'Copy the structured prompt formula with lighting, texture, and lens parameters.',
          'Generate 1:1 square image (Catalog tile) and 4:3 landscape image (Hero spotlight).',
          'Check for visual defects (distorted text, unnatural reflections, fake logos).',
        ],
        rules: [
          'Always use authentic Italian aesthetic constraints (warm morning sunlight, linen cloth, reclaimed oak).',
          'Negative prompts must strictly exclude artificial neon lighting, 3D renders, and plastic glare.',
        ],
        hasPromptStudio: true,
        simulation: {
          testBarcode: 'AI-PROMPT-GENERATE',
          expectedResult: 'Prompt Formula Ready: DALL-E 3 & Midjourney v6 Format.',
        },
        troubleshooting: [
          { issue: 'AI generated gibberish letters on packaging', fix: 'Paste the authentic vector brand logo over the generated box in editor.' },
        ],
        adminJump: 'intake',
        jumpLabel: 'Open AI Prompt Studio',
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
          'Images must be compressed to WebP format under 250KB for fast mobile loading.',
        ],
        simulation: {
          testBarcode: 'MEDIA-UPLOAD-OK',
          expectedResult: 'WebP Compressed: Primary (142 KB), After Image (168 KB), Slider Configured.',
        },
        troubleshooting: [
          { issue: 'Image file > 1MB', fix: 'Compress to WebP format under 250KB limit.' },
        ],
        adminJump: 'intake',
        jumpLabel: 'Upload Media',
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
        adminJump: 'intake',
        jumpLabel: 'Edit Specifications',
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
          'Click "Publish Product". Verify new listing appears immediately in Storefront catalog.',
        ],
        rules: [
          'Product will show "Out of Stock · Request via Pasabuy" until the first batch lot is received.',
        ],
        simulation: {
          testBarcode: 'PUBLISH-LIVE-OK',
          expectedResult: 'Listing Published: Live on Storefront (/product/IT-GEN-003).',
        },
        troubleshooting: [
          { issue: 'Product not showing in catalog', fix: 'Clear browser cache or verify category filter assignment.' },
        ],
        adminJump: 'intake',
        jumpLabel: 'Publish Listing',
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
          'Once all units are verified, receiver clicks "Accept Custody & Confirm Receipt" in Admin BOS with session PIN/biometric verification. The inventory lot custodian ID updates permanently.',
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
      'Scheduled blind inventory cycle count procedure. Freezes warehouse zones, performs unbiased barcode recounts, classifies discrepancies, and executes audited ledger adjustments.',
    color: '#7c3aed',
    accentColor: '#a78bfa',
    stats: { steps: 5, scansRequired: 1, roles: ['Audit Counter', 'Inventory Manager'], estTime: '45-60 mins' },
    nodes: [
      {
        id: 'cnt_1',
        step: 1,
        title: 'Audit Schedule & Zone Freeze',
        actor: 'Inventory Manager',
        location: 'Manila Hub',
        type: 'intake',
        short: 'Select warehouse zone to audit and temporarily freeze picking in that zone.',
        summary:
          'Manager schedules monthly cycle count for designated category or shelf section (e.g. Zone A: Coffee & Drinks; Zone B: Pasta & Oils). The system freezes order picking in that specific zone during count.',
        checklist: [
          'Notify fulfillment team of zone freeze window (typically 6:00 AM – 8:00 AM).',
          'Ensure all incoming intakes from earlier shifts are committed before starting count.',
          'Print blank shelf audit tally sheets or launch Mobile Audit Tool.',
        ],
        rules: [
          'No picking or stock movements are allowed in the active audit zone during counting.',
        ],
        simulation: {
          testBarcode: 'AUDIT-ZONE-A',
          expectedResult: 'Zone A Frozen: 14 Shelf Locations Locked for Cycle Count.',
        },
        troubleshooting: [
          { issue: 'Urgent order requires item from frozen zone', fix: 'Expedite audit of that specific shelf bin first before releasing item.' },
        ],
        adminJump: 'inventory',
        jumpLabel: 'Schedule Cycle Count',
      },
      {
        id: 'cnt_2',
        step: 2,
        title: 'Blind Physical Barcode Recount',
        actor: 'Audit Counter (Staff A)',
        location: 'Warehouse Shelves',
        type: 'scan',
        short: 'Staff scans every shelf item blindly without seeing system quantities.',
        summary:
          'Staff member scans every item shelf-by-shelf. The interface intentionally conceals expected quantities ("blind count") to prevent confirmation bias or shortcutting.',
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
        title: 'Automated Variance Analysis',
        actor: 'System / Manager',
        location: 'Admin BOS Terminal',
        type: 'decision',
        short: 'System compares physical scan numbers against ledger and flags variances.',
        summary:
          'The cycle count engine cross-references physical scans against active batch lots. Identifies discrepancies: Overages (+), Shortages (-), or Batch Mismatches.',
        checklist: [
          'Review variance summary table showing Expected vs Scanned counts.',
          'Identify items with zero discrepancy (automatically verified).',
          'Highlight items with variance > 0 for immediate secondary recount.',
        ],
        rules: [
          'Any variance exceeding ₱500 in value requires a mandatory recount by a second staff member.',
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
          { issue: 'Unexplained missing unit', fix: 'Check packing station cameras for last 7 days to verify if unit was erroneously included in another order.' },
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
          'Manager reviews final variance report with attached evidence and reason codes. Approving the audit writes compensating adjustment entries to the inventory ledger and unfreezes the zone.',
        checklist: [
          'Review total net financial impact of the monthly audit.',
          'Enter manager authorization credentials.',
          'Unfreeze warehouse zone and resume normal fulfillment picking.',
        ],
        rules: [
          'Audit adjustment records are permanently archived for accounting and financial compliance.',
        ],
        simulation: {
          testBarcode: 'MGR-ADJUST-APPROVE',
          expectedResult: 'Audit Closed: Ledger Adjusted (-₱310.00), Zone A Unfrozen for Fulfillment.',
        },
        troubleshooting: [
          { issue: 'Adjustment exceeds threshold limit', fix: 'Requires 2-person executive authorization (Manager + Owner).' },
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
          'Order is received in Admin BOS. System automatically reserves physical stock from the earliest-expiring active batch lot (FEFO) to prevent overselling.',
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
          { issue: 'Insufficient stock in earliest batch', fix: 'System automatically splits reservation across consecutive FEFO lots; verify both lots on pick list.' },
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
          'Set payment deadline window (standard: 24 hours for stock reservation).',
        ],
        rules: [
          'No items are packed or dispatched until payment is 100% verified or COD is approved.',
        ],
        simulation: {
          testBarcode: 'MSG-QUOTE-SENT',
          expectedResult: 'Quote Sent: Metro Manila Same-Day ₱180 (Total ₱1,620).',
        },
        troubleshooting: [
          { issue: 'Customer unresponsive past 24 hours', fix: 'Send reminder SMS; if unanswered after 48h, auto-release reserved stock back to active inventory.' },
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
          'Both staff member and packing station camera record the scan event.',
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
        title: 'Secure Packing & Waybill Generation',
        actor: 'Fulfillment Staff',
        location: 'Packing Station',
        type: 'action',
        short: 'Pack with protective padding, seal with security tape, and attach waybill.',
        summary:
          'Wrap glass jars in honeycomb bubble wrap and place moisture-sensitive items into insulated pouches. Seal the box with branded K2 tamper tape. Print and affix the shipping waybill.',
        checklist: [
          'Include official K2 Jimzon product care note and receipt in box.',
          'Apply shock-absorbing cushioning so items cannot move or rattle inside box.',
          'Affix waterproof adhesive shipping label with recipient name, phone, and address.',
        ],
        rules: [
          'Chocolates must include reusable frozen gel pack during dry/warm season.',
        ],
        simulation: {
          testBarcode: 'WAYBILL-MNL-409',
          expectedResult: 'Waybill Printed: Tracking #K2-MNL-2026-8901, Dispatch Gate: Station 2.',
        },
        troubleshooting: [
          { issue: 'Thermal printer jam', fix: 'Reprint waybill using "Reprint Label" button; verify barcode contrast before attaching.' },
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'Print Waybill',
      },
      {
        id: 'ord_6',
        step: 6,
        title: 'Courier Handover & Tracking Notification',
        actor: 'Dispatch Coordinator',
        location: 'Dispatch Desk',
        type: 'complete',
        short: 'Hand over to courier rider, capture rider photo/signature, and send tracking.',
        summary:
          'Rider arrives (Lalamove/Grab/Courier). Scan rider QR / record driver details. Mark order as Dispatched in Admin BOS. Customer automatically receives live courier tracking link.',
        checklist: [
          'Verify rider name and plate number match the booking app.',
          'Obtain courier signature on physical dispatch sheet.',
          'Click "Dispatched" in Admin BOS to trigger automated tracking SMS/Email.',
        ],
        rules: [
          'Never hand over package without recording driver plate number and booking ID.',
        ],
        simulation: {
          testBarcode: 'DISPATCH-LALAMOVE',
          expectedResult: 'Dispatched: Rider Juan D. (Plate: NQ-9102), Customer SMS notified.',
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
          'Set quote validity window (standard: 7 days based on EUR exchange rate).',
          'Send interactive quote approval link to customer.',
        ],
        rules: [
          'Never purchase goods in Italy before the customer explicitly accepts the quote.',
        ],
        simulation: {
          testBarcode: 'QUOTE-GEN-OK',
          expectedResult: 'Quote #Q-9912 Issued: ₱1,380.00 Total (Valid for 7 days).',
        },
        troubleshooting: [
          { issue: 'Customer requests discount on quote', fix: 'Only volume orders (5+ units) qualify for freight consolidation discounts.' },
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
        short: 'Customer approves quote and pays 50% deposit or full payment.',
        summary:
          'Customer accepts quote and submits deposit via GCash/Maya/Bank Transfer. Finance confirms payment in bank ledger. Request status advances to "Approved for Purchasing".',
        checklist: [
          'Record payment transaction reference number.',
          'Advance request status to "Purchasing Queue (Milan)" in Admin BOS.',
          'Notify Milan buyer with purchase priority flag.',
        ],
        rules: [
          'Custom non-catalog items require at least 50% non-refundable deposit.',
        ],
        simulation: {
          testBarcode: 'DEP-PAID-50PCT',
          expectedResult: 'Deposit Verified: ₱690.00 received via Maya. Transferred to Milan Purchasing Queue.',
        },
        troubleshooting: [
          { issue: 'Customer wants to cancel after deposit', fix: 'If item has NOT been physically bought in Milan, refund deposit minus ₱100 handling fee.' },
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
