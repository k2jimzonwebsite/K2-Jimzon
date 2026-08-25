/**
 * K2 Jimzon — Master Workflow Graph Data Definitions
 * Complete operational workflows, step-by-step procedures, safety rules,
 * and ChatGPT/AI image generation prompt formulas for staff.
 */

export const WORKFLOWS = {
  new_inventory: {
    id: 'new_inventory',
    title: 'New Inventory & Intake Ingestion',
    icon: '📥',
    badge: 'Stock Ingestion',
    category: 'Inventory Operations',
    description:
      'Complete end-to-end procedure for receiving cargo boxes from Milan or local suppliers, barcode scanning, FEFO batch lot creation, quality inspection, and multi-channel inventory sync.',
    color: '#0284c7', // sky-600
    accentColor: '#38bdf8',
    stats: { steps: 6, scansRequired: 2, roles: ['Intake Staff', 'Hub Manager'] },
    nodes: [
      {
        id: 'inv_1',
        step: 1,
        title: 'Shipment Arrival & Seal Verification',
        actor: 'Receiving Staff',
        location: 'Manila Receiving Dock',
        type: 'intake',
        short: 'Verify international air cargo box number against flight manifest.',
        summary:
          'Inspect physical cargo boxes immediately upon courier/freight delivery. Verify tamper-evident security tape, box reference (e.g. BOX-2026-08-A), and check for external shipping damage.',
        checklist: [
          'Match cargo box ID against the Milan Flight Consignment manifest in Admin BOS.',
          'Verify tamper-evident tape is intact with no cuts, tears, or double-tape marks.',
          'Record unboxing timestamp and take photo of sealed box if any damage is visible.',
        ],
        rules: [
          'If box security seal is broken, do NOT proceed without manager sign-off.',
          'Never discard outer shipping labels until all internal items are fully reconciled.',
        ],
        adminJump: 'consignment',
        jumpLabel: 'Open Flight Manifests',
      },
      {
        id: 'inv_2',
        step: 2,
        title: 'Physical Unboxing & QC Inspection',
        actor: 'Intake Staff',
        location: 'Inspection Bench',
        type: 'action',
        short: 'Unbox goods under overhead lighting and inspect packaging integrity.',
        summary:
          'Unpack products onto clean stainless steel inspection surface. Check every individual unit for dents, packaging leaks, broken seals, melt damage (chocolates), or improper temperature exposure during transit.',
        checklist: [
          'Group items by brand and product family (e.g. Mulino Bianco, Marvis, Lavazza).',
          'Inspect glass jars for seal popping or micro-fractures.',
          'Check expiration dates printed on manufacturer packaging in DD/MM/YYYY format.',
        ],
        rules: [
          'Any item with less than 30 days of shelf life cannot be accepted into regular stock.',
          'Damaged packaging must be routed immediately to the Damaged Stock quarantine tray.',
        ],
        adminJump: 'intake',
        jumpLabel: 'Open Mobile Intake Tool',
      },
      {
        id: 'inv_3',
        step: 3,
        title: 'Barcode Scanning & Product Matching',
        actor: 'Intake Staff',
        location: 'Scan Station',
        type: 'scan',
        short: 'Scan manufacturer barcode (EAN-13) to match internal Master SKU.',
        summary:
          'Use USB laser scanner or mobile camera to scan the manufacturer barcode on each physical unit. The system automatically pulls product title, weight, and master specifications.',
        checklist: [
          'Scan physical barcode with zero manual keyboard entry whenever possible.',
          'Verify scanned unit size matches catalog definition (e.g. 260g vs 330g).',
          'If barcode is unrecognized, trigger New Product Intake flow in Admin BOS.',
        ],
        rules: [
          'Do NOT invent a dummy barcode; use the real printed EAN-13 code.',
          'Staff must count units physically and never copy expected numbers blindly.',
        ],
        adminJump: 'intake',
        jumpLabel: 'Scan Barcode',
      },
      {
        id: 'inv_4',
        step: 4,
        title: 'FEFO Batch Lot & Expiry Registration',
        actor: 'Intake Staff',
        location: 'Intake Terminal',
        type: 'decision',
        short: 'Create audited batch lot with exact expiry date and unit landed cost.',
        summary:
          'Register verified units into a new product_batches lot record. Enter precise Best Before Date, manufacturing batch number, unit purchase price in EUR, and allocated air cargo freight cost.',
        checklist: [
          'Enter expiration date accurately in YYYY-MM-DD format.',
          'Attach photo evidence of the printed expiry date on the packaging.',
          'Assign initial shelf location in Manila Hub (e.g. Shelf B-03, Cold Room 1).',
        ],
        rules: [
          'Operations Rulebook §5 strictly enforces First-Expired, First-Out (FEFO).',
          'Batches with identical expiry can be grouped; different expiries MUST have separate batch lots.',
        ],
        adminJump: 'inventory',
        jumpLabel: 'View Inventory Lots',
      },
      {
        id: 'inv_5',
        step: 5,
        title: 'Physical Custody Tagging & Placement',
        actor: 'Warehouse Custodian',
        location: 'Storage Shelving',
        type: 'action',
        short: 'Apply K2 batch QR tag and place on assigned warehouse shelf.',
        summary:
          'Affix K2 Jimzon internal lot sticker with QR code onto carton/shelf bin. Place newer stock behind older stock on shelves to naturally enforce physical FEFO picking.',
        checklist: [
          'Print batch lot label with SKU, Lot ID, Expiry Date, and Storage Requirements.',
          'Place lot onto designated shelf bin. Oldest expiry placed at the FRONT of the shelf.',
          'Verify ambient temperature (18°C–22°C for biscuits, 14°C–18°C for chocolates).',
        ],
        rules: [
          'Never mix different batch lots in the same bin without clear visual separation.',
        ],
        adminJump: 'inventory',
        jumpLabel: 'Shelf Locations',
      },
      {
        id: 'inv_6',
        step: 6,
        title: 'Commit Intake & Multi-Channel Sync',
        actor: 'Hub Manager',
        location: 'Admin BOS Terminal',
        type: 'complete',
        short: 'Approve intake batch; stock automatically syncs across all channels.',
        summary:
          'Manager reviews scan counts against flight manifest. Once approved, available sellable inventory immediately reflects on the Storefront, and auto-sync triggers across Shopee and Lazada channel connectors.',
        checklist: [
          'Verify total scanned count equals physical units placed on shelves.',
          'Click "Commit Batch" in Admin BOS to finalize the intake ledger entry.',
          'Confirm Storefront catalog live stock count increases accordingly.',
        ],
        rules: [
          'Intake commits are immutable. Adjustments require an authorized cycle count transaction.',
        ],
        adminJump: 'omni_hub',
        jumpLabel: 'Check Channel Sync',
      },
    ],
  },

  new_order: {
    id: 'new_order',
    title: 'Order Fulfillment & Packing Workflow',
    icon: '📦',
    badge: 'Order Fulfillment',
    category: 'Fulfillment Operations',
    description:
      'Step-by-step procedure for processing customer orders, allocating stock using strict FEFO rules, 2-factor scan verification at packing stations, and secure courier dispatch.',
    color: '#059669', // emerald-600
    accentColor: '#34d399',
    stats: { steps: 6, scansRequired: 2, roles: ['Fulfillment Staff', 'Dispatch Coordinator'] },
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
        adminJump: 'omni_hub',
        jumpLabel: 'Dispatch Ledger',
      },
    ],
  },

  inventory_handover: {
    id: 'inventory_handover',
    title: 'Two-Party Inventory Custody Handshake',
    icon: '🤝',
    badge: 'Custody Handshake',
    category: 'Custody & Security',
    description:
      'Rigorous two-party physical custody transfer protocol. Enforces operations rulebook §10: sender initiation, dual physical scans, and explicit electronic acceptance by the receiver.',
    color: '#d97706', // amber-600
    accentColor: '#fbbf24',
    stats: { steps: 5, scansRequired: 2, roles: ['Transferor (Sender)', 'Transferee (Receiver)'] },
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
        adminJump: 'inventory',
        jumpLabel: 'Custody History Log',
      },
    ],
  },

  monthly_count: {
    id: 'monthly_count',
    title: 'Monthly Cycle Count & Inventory Audit',
    icon: '📊',
    badge: 'Stock Audit',
    category: 'Inventory Audit',
    description:
      'Scheduled blind inventory cycle count procedure. Freezes warehouse zones, performs unbiased barcode recounts, classifies discrepancies, and executes audited ledger adjustments.',
    color: '#7c3aed', // violet-600
    accentColor: '#a78bfa',
    stats: { steps: 5, scansRequired: 1, roles: ['Audit Counter', 'Inventory Manager'] },
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
        adminJump: 'inventory',
        jumpLabel: 'Approve Audit Adjustments',
      },
    ],
  },

  product_creation_ai: {
    id: 'product_creation_ai',
    title: 'Product Catalog Creation & AI Studio Prompting',
    icon: '✨',
    badge: 'Catalog & AI Studio',
    category: 'Product Management',
    description:
      'Complete workflow for adding authentic Italian products to the catalog, configuring pricing boundaries, and generating photorealistic luxury editorial product imagery with ChatGPT / AI Studio.',
    color: '#e11d48', // rose-600
    accentColor: '#fb7185',
    stats: { steps: 6, scansRequired: 0, roles: ['Catalog Lead', 'Content Designer'] },
    nodes: [
      {
        id: 'prod_1',
        step: 1,
        title: 'Master Data & Sourcing Passport',
        actor: 'Catalog Lead',
        location: 'Admin Catalog Tool',
        type: 'intake',
        short: 'Enter authentic Italian brand, EAN-13 barcode, net weight, and origin.',
        summary:
          'Create a new product draft in Admin BOS. Enter official Italian brand name (e.g. Mulino Bianco, Gentile, Baci Perugina), Italian product title, net weight, packaging type, and verified origin region.',
        checklist: [
          'Enter exact Italian product title and English culinary subtitle.',
          'Input manufacturer printed EAN-13 barcode.',
          'Select correct category (Dolci, Caffè, Pasta & Dispensa, Cura, Bellezza).',
          'Record Italian region of origin (e.g. Gragnano, Campania / Alba, Piedmont).',
        ],
        rules: [
          'Never translate iconic Italian brand names (e.g. keep "Pan di Stelle", do not write "Bread of Stars").',
        ],
        adminJump: 'intake',
        jumpLabel: 'Create Product Draft',
      },
      {
        id: 'prod_2',
        step: 2,
        title: 'Pricing Tiers & Landed Cost Floor',
        actor: 'Pricing Lead / Owner',
        location: 'Admin Pricing Matrix',
        type: 'action',
        short: 'Set purchase cost (€), computed floor (₱), retail SRP, and wholesale tier.',
        summary:
          'Configure pricing boundaries. Enter original Italian shelf purchase price in EUR. System calculates landed cost floor based on active EUR/PHP exchange rate + cargo freight coefficient.',
        checklist: [
          'Enter purchase cost in EUR (e.g. €2.80).',
          'Review calculated landed cost floor in PHP (e.g. ₱310).',
          'Set consumer retail SRP in PHP (e.g. ₱480).',
          'Set B2B wholesale case price in PHP with minimum order quantity (e.g. ₱380, MOQ: 6).',
        ],
        rules: [
          'Retail SRP must NEVER be set below the calculated landed cost floor.',
        ],
        adminJump: 'inventory',
        jumpLabel: 'Configure Pricing',
      },
      {
        id: 'prod_3',
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
        adminJump: 'intake',
        jumpLabel: 'Open AI Prompt Studio',
      },
      {
        id: 'prod_4',
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
          'Upload After Image (biscuits on ceramic saucer / coffee crema in espresso cup).',
          'Test interactive slider in preview mode to ensure smooth touch swipe performance.',
        ],
        rules: [
          'Images must be compressed to WebP format under 250KB for fast mobile loading.',
        ],
        adminJump: 'intake',
        jumpLabel: 'Upload Product Media',
      },
      {
        id: 'prod_5',
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
        adminJump: 'intake',
        jumpLabel: 'Edit Specifications',
      },
      {
        id: 'prod_6',
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
          'Verify search tags (e.g. #biscotti #breakfast #mulino-bianco).',
          'Click "Publish Product". Verify new listing appears immediately in Storefront catalog.',
        ],
        rules: [
          'Product will show "Out of Stock · Request via Pasabuy" until the first batch lot is received.',
        ],
        adminJump: 'intake',
        jumpLabel: 'Publish Listing',
      },
    ],
  },

  pasabuy_lifecycle: {
    id: 'pasabuy_lifecycle',
    title: 'Pasabuy Custom Sourcing Workflow',
    icon: '🇮🇹',
    badge: 'Custom Sourcing',
    category: 'Pasabuy Concierge',
    description:
      'End-to-end concierge workflow for handling custom Italian product requests from Manila customers: request intake, Milan store research, cost computation, official quote approval, and flight delivery.',
    color: '#0284c7', // sky-600
    accentColor: '#38bdf8',
    stats: { steps: 6, scansRequired: 1, roles: ['Pasabuy Coordinator', 'Milan Sourcing Lead'] },
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
        adminJump: 'pasabuy_manager',
        jumpLabel: 'Open Pasabuy Queue',
      },
      {
        id: 'pasa_2',
        step: 2,
        title: 'Milan Sourcing & Cost Calculation',
        actor: 'Milan Sourcing Lead',
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
        adminJump: 'pasabuy_manager',
        jumpLabel: 'Confirm Deposit',
      },
      {
        id: 'pasa_5',
        step: 5,
        title: 'Milan Purchase & Flight Cargo Tagging',
        actor: 'Milan Buyer',
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
        adminJump: 'pasabuy_manager',
        jumpLabel: 'Finalize Pasabuy Delivery',
      },
    ],
  },
}

/**
 * AI Image Generation Prompt Studio Templates
 * Precision engineered for ChatGPT (DALL-E 3), Midjourney v6, FLUX.1, and Google Imagen 3.
 */
export const AI_IMAGE_PROMPT_TEMPLATES = [
  {
    category: 'Italian Bakery & Biscuits',
    key: 'biscuits',
    icon: '🍪',
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
    icon: '🫒',
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
    icon: '☕',
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
    icon: '🍝',
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
    icon: '🧼',
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
