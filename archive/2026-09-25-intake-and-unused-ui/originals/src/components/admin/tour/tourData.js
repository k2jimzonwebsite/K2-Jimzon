/**
 * K2 Jimzon: Admin BOS Interactive Spotlight Walkthrough Tour Data
 * Provides step-by-step SOP directives, target selector mappings, and ChatGPT prompt formulas.
 */

export const CHATGPT_PROMPT_TEMPLATES = [
  {
    key: 'dolci',
    category: 'Dolci & Biscuits',
    exampleItem: 'Mulino Bianco Baiocchi con Crema alla Nocciola e Cacao 260g',
    prompt: `You are the K2 Jimzon Master Product Catalog Specialist.
Convert this authentic Italian confectionery into our canonical JSON specification for our Manila storefront.

Product to inspect: [PRODUCT NAME]

Required JSON Output Structure:
{
  "name": "Mulino Bianco Baiocchi",
  "short": "Authentic Italian shortbread hazelnut and cocoa sandwich biscuits",
  "subcategory": "Dolci & Pasticceria",
  "country_of_origin": "Italy",
  "origin": "Barilla G. e R. Fratelli, Parma, Emilia-Romagna, Italy",
  "net_weight": 260,
  "package_type": "Bag / Box",
  "size": "260g",
  "ingredients": "Wheat flour 51.6%, sugar, sunflower oil, fresh eggs, skimmed milk powder, fresh pasteurized milk, raising agents, salt, wheat starch, flavorings. Hazelnut and cocoa cream 28%: sugar, shea fat, hazelnuts 7.1%, cocoa 2.6%, skimmed milk powder, wheat starch, flavorings.",
  "allergens": "Contains wheat (gluten), eggs, milk, hazelnuts. May contain traces of other nuts, sesame seeds, and soy.",
  "description": "Crafted in Parma according to authentic Italian tradition, Mulino Bianco Baiocchi are delicate shortbread cookies paired with a rich cream made of 100% Italian hazelnuts and fine cocoa.",
  "why_buy": "Iconic Italian breakfast and merienda favorite, imported directly from Milan.",
  "why_rare": "Hard to find in Philippine retail; sourced fresh from European stock in Milan.",
  "usage_instructions": "Enjoy alongside an espresso or dunked into a warm cappuccino.",
  "storage_instructions": "Store in a cool, dry place away from heat and direct sunlight.",
  "pairings": ["Espresso", "Cappuccino", "Latte Macchiato", "Vin Santo"],
  "seo_keywords": ["Mulino Bianco", "Baiocchi", "Italian biscuits", "hazelnut cookies", "Italian snacks Manila"]
}

Return ONLY the raw valid JSON object without markdown or code fences.`
  },
  {
    key: 'pasta',
    category: 'Pasta & Pantry',
    exampleItem: 'Pastificio Gentile Paccheri di Gragnano IGP 500g',
    prompt: `You are the K2 Jimzon Master Product Catalog Specialist.
Convert this artisanal Italian pasta provision into our canonical JSON specification for our Manila storefront.

Product to inspect: [PRODUCT NAME]

Required JSON Output Structure:
{
  "name": "Gentile Paccheri di Gragnano IGP",
  "short": "Artisanal bronze-cut Neapolitan paccheri with protected geographical indication",
  "subcategory": "Pasta & Dispensa",
  "country_of_origin": "Italy",
  "origin": "Pastificio Gentile, Gragnano, Campania, Italy",
  "net_weight": 500,
  "package_type": "Paper Bag",
  "size": "500g",
  "ingredients": "100% Italian durum wheat semolina, water from the Monti Lattari spring.",
  "allergens": "Contains wheat (gluten). Made in a facility handling mustard and soy.",
  "description": "Made in Gragnano using bronze dies and dried with the traditional Metodo Cirillo for up to 60 hours, ensuring exceptional sauce adherence and al dente bite.",
  "why_buy": "Authentic IGP certified artisanal pasta from the historic capital of Italian pasta.",
  "why_rare": "Small-batch bronze die production with slow low-temperature air drying.",
  "usage_instructions": "Boil in salted water for 14-16 minutes. Pair with robust seafood or slow-braised meat ragù.",
  "storage_instructions": "Store in dry pantry away from humidity.",
  "pairings": ["Neapolitan Ragù", "Genovese", "Calamari and Tomato Sugo", "Chianti Classico"],
  "seo_keywords": ["Gentile pasta", "Paccheri", "Gragnano IGP", "bronze cut pasta", "artisan Italian pasta Manila"]
}

Return ONLY the raw valid JSON object without markdown or code fences.`
  },
  {
    key: 'caffe',
    category: 'Caffè & Espresso',
    exampleItem: 'Lavazza Qualità Oro Macinato 250g',
    prompt: `You are the K2 Jimzon Master Product Catalog Specialist.
Convert this authentic Italian coffee product into our canonical JSON specification for our Manila storefront.

Product to inspect: [PRODUCT NAME]

Required JSON Output Structure:
{
  "name": "Lavazza Qualità Oro Ground Coffee",
  "short": "100% Arabica medium roast Italian espresso ground coffee",
  "subcategory": "Caffè & Bevande",
  "country_of_origin": "Italy",
  "origin": "Luigi Lavazza S.p.A., Torino, Piedmont, Italy",
  "net_weight": 250,
  "package_type": "Vacuum Tin / Foil Pack",
  "size": "250g",
  "ingredients": "100% Arabica roasted ground coffee beans.",
  "allergens": "Naturally caffeine-containing. Free of major allergens.",
  "description": "The historic blend created in 1956 by Luigi Lavazza in Turin. Selected 100% Arabica beans from Central and South America delivering floral, fruity notes with a lingering golden crema.",
  "why_buy": "The quintessential Italian home espresso with a smooth, aromatic finish.",
  "why_rare": "Direct Italian packaging roast profile formulated for European extraction standards.",
  "usage_instructions": "Ideal for Moka pot stove-top espresso and French press.",
  "storage_instructions": "Keep in an airtight container in a cool, dark cupboard after opening.",
  "pairings": ["Biscotti di Prato", "Cantuccini", "Dark Chocolate 70%", "Tiramisù"],
  "seo_keywords": ["Lavazza Qualita Oro", "Italian ground coffee", "Moka coffee Manila", "Arabica espresso"]
}

Return ONLY the raw valid JSON object without markdown or code fences.`
  },
  {
    key: 'olio',
    category: 'Olio & Aceto',
    exampleItem: 'Frantoi Cutrera Primo DOP Monti Iblei Extra Virgin Olive Oil 500ml',
    prompt: `You are the K2 Jimzon Master Product Catalog Specialist.
Convert this luxury Italian olive oil or vinegar into our canonical JSON specification for our Manila storefront.

Product to inspect: [PRODUCT NAME]

Required JSON Output Structure:
{
  "name": "Frantoi Cutrera Primo DOP Extra Virgin Olive Oil",
  "short": "First cold-pressed single-estate Sicilian monocultivar Tonda Iblea olive oil",
  "subcategory": "Olio & Condimenti",
  "country_of_origin": "Italy",
  "origin": "Frantoi Cutrera, Chiaramonte Gulfi, Sicily, Italy",
  "net_weight": 500,
  "package_type": "Dark UV Glass Bottle",
  "size": "500ml",
  "ingredients": "100% cold-extracted extra virgin olive oil (Tonda Iblea olives).",
  "allergens": "Free of declared allergens.",
  "description": "Award-winning DOP certified Sicilian extra virgin olive oil harvested by hand in Monti Iblei. Intense aroma of green tomato, fresh herbs, and artichoke with balanced spicy pepper finish.",
  "why_buy": "Consistently ranked among the top extra virgin olive oils in the world.",
  "why_rare": "Limited single-harvest estate bottling from century-old Sicilian groves.",
  "usage_instructions": "Drizzle raw over burrata, grilled Florentine steak, rustic bread, or ripe tomatoes.",
  "storage_instructions": "Store in dark bottle away from light and heat sources.",
  "pairings": ["Burrata di Bufala", "Bistecca alla Fiorentina", "Sourdough Crostini", "Bruschetta"],
  "seo_keywords": ["Frantoi Cutrera", "DOP olive oil", "Sicilian EVOO Manila", "luxury Italian olive oil"]
}

Return ONLY the raw valid JSON object without markdown or code fences.`
  }
]

// ── 1. CROSS-BORDER SUPPLY CHAIN TOUR ──────────────────────────────────────
const crossBorderTour = {
  id: 'cross_border_lifecycle',
  title: 'Italy Sourcing and Flight Consignments',
  shortTitle: 'Flight Consignments',
  category: 'Cross-Border Supply Chain',
  badge: 'Milan to Manila',
  accentColor: '#0284c7',
  theme: 'sky',
  description:
    'Step-by-step guide for Milan purchasing, flight cargo packing, airport customs check, physical box unboxing, and inventory lot receipt in Manila.',
  steps: [
    {
      id: 'cb_1',
      stepNumber: 1,
      targetSection: 'consignments',
      targetSelector: '[data-tour="flight-manifest"]',
      fallbackPosition: 'bottom',
      title: 'Step 1: Milan Sourcing and Fiscal Receipt',
      directive: 'Check Expiry Dates and Keep Store Receipts',
      whatToClick: 'Review purchase details in Flight Consignments workspace',
      sopAction:
        'Our Milan sourcing lead buys authentic Italian goods in local markets. Check that every item has at least 4 to 6 months before expiration. Take a clear photo of the store receipt with the price in Euros for company records.',
      exitCriteria: 'Receipt saved and items have at least 60 days of shelf life.',
    },
    {
      id: 'cb_2',
      stepNumber: 2,
      targetSection: 'consignments',
      targetSelector: '[data-tour="scan-consignment-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 2: Pack Flight Box and Apply Security Seal',
      directive: 'Pack Cargo Box and Record Seal Number',
      whatToClick: 'Click "Create manifest" or open active flight box',
      sopAction:
        'Pack items into heavy flight boxes. Bubble-wrap all glass jars. Count every item and enter the quantities into the manifest. Seal the box with numbered red security tape and write down the seal serial number.',
      exitCriteria: 'Cargo box sealed with security tape and linked to a scheduled flight.',
    },
    {
      id: 'cb_3',
      stepNumber: 3,
      targetSection: 'consignments',
      targetSelector: '[data-tour="flight-manifest"]',
      fallbackPosition: 'bottom',
      title: 'Step 3: Track Air Cargo Flight to Manila',
      directive: 'Monitor Flight Progress and Customs Clearance',
      whatToClick: 'Select flight manifest to view tracking details',
      sopAction:
        'The air cargo forwarder flies the box from Milan Malpensa to Manila NAIA. The system marks all items as In Transit. Staff can check the airway bill status until the plane touches down.',
      exitCriteria: 'Air cargo lands in Manila and clears airport terminal inspection.',
    },
    {
      id: 'cb_4',
      stepNumber: 4,
      targetSection: 'consignments',
      targetSelector: '[data-tour="scan-consignment-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 4: Receive Box at Manila Dock and Verify Seal',
      directive: 'Inspect Security Seal Before Opening',
      whatToClick: 'Click "Start Manila recount" or inspect arriving manifest',
      sopAction:
        'When the courier delivers the box in Manila, do not cut it open yet. Read the numbered security seal on the tape. Make sure the serial number matches what Milan entered. If the tape is broken or cut, stop and take photos.',
      exitCriteria: 'Security seal matches the manifest with zero signs of tampering.',
    },
    {
      id: 'cb_5',
      stepNumber: 5,
      targetSection: 'consignments',
      targetSelector: '[data-tour="reconcile-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 5: Open Box and Inspect Every Item',
      directive: 'Check Glass Jars and Packaging for Damage',
      whatToClick: 'Click "Review and finalize" to inspect quantities',
      sopAction:
        'Open the box on a clean metal table. Count every single unit. Check that glass jar lids are sealed tight. Check chocolates for melting. If any item is cracked or leaking, set it aside in Quarantine right away.',
      exitCriteria: 'Physical units counted and damaged items separated.',
    },
    {
      id: 'cb_6',
      stepNumber: 6,
      targetSection: 'inventory',
      targetSelector: '[data-tour="inventory-actions"]',
      fallbackPosition: 'bottom',
      title: 'Step 6: Route Items to Existing Stock or New SKU',
      directive: 'Sort Between Known Barcodes and New Products',
      whatToClick: 'Open Inventory Workspace to begin intake routing',
      sopAction:
        'Separate the incoming items into two piles: products we already sell (scan barcode to add stock) versus brand new products that need catalog creation with photos and Italian descriptions.',
      exitCriteria: 'Every item is sorted for stock restocking or catalog creation.',
    },
    {
      id: 'cb_7',
      stepNumber: 7,
      targetSection: 'inventory',
      targetSelector: '[data-tour="search-input"]',
      fallbackPosition: 'bottom',
      title: 'Step 7: Finalize Receiving and Create Batch Lots',
      directive: 'Confirm Stock Quantities on the Server',
      whatToClick: 'Search for items in Master Catalog to verify live stock',
      sopAction:
        'Confirm the final counts in the system. The server creates official batch lots with expiry dates. Once saved, these items are ready for online orders and store picking.',
      exitCriteria: 'Server records new batch lots and updates available inventory.',
    },
  ],
}

// ── 2. AUTOMATIC INVENTORY RESTOCKING TOUR ─────────────────────────────────
const existingStockTour = {
  id: 'existing_stock_intake',
  title: 'Automatically Adding Stock to Existing SKU',
  shortTitle: 'Automatic Stock Intake',
  category: 'Stock Replenishment',
  badge: 'Existing Catalog SKU',
  accentColor: '#059669',
  theme: 'emerald',
  description:
    'Fast scanning procedure for items already in our catalog: scan barcodes, record expiration dates, and bin units on warehouse shelves.',
  steps: [
    {
      id: 'auto_1',
      stepNumber: 1,
      targetSection: 'inventory',
      targetSelector: '[data-tour="scan-box-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 1: Focus Barcode Scanner and Scan Item',
      directive: 'Point Scanner at Product Barcode',
      whatToClick: 'Click "Scan box" or point laser scanner at package barcode',
      sopAction:
        'Pick up an incoming item from the delivery box. Point the laser scanner at the printed 13-digit barcode. You do not need to type the code manually.',
      exitCriteria: 'Scanner reads the 13-digit barcode.',
    },
    {
      id: 'auto_2',
      stepNumber: 2,
      targetSection: 'inventory',
      targetSelector: '[data-tour="search-input"]',
      fallbackPosition: 'bottom',
      title: 'Step 2: Verify Master SKU Match',
      directive: 'Check That Scanned Details Match Physical Item',
      whatToClick: 'Check the product details displayed on screen',
      sopAction:
        'The system looks up the barcode and displays the product name and weight. Check that the net weight on the box in your hand matches what is on the screen, such as 260g versus 330g.',
      exitCriteria: 'Scanned code matches the correct master catalog product.',
    },
    {
      id: 'auto_3',
      stepNumber: 3,
      targetSection: 'inventory',
      targetSelector: '[data-tour="inventory-actions"]',
      fallbackPosition: 'bottom',
      title: 'Step 3: Register Batch Lot and Expiration Date',
      directive: 'Type Expiration Date and Counted Quantity',
      whatToClick: 'Enter the best-before date in YYYY-MM-DD format',
      sopAction:
        'Find the printed expiry date on the packaging. Enter the year, month, and day. Type the exact number of units you counted. Items with different expiration dates must be saved as separate lots.',
      exitCriteria: 'New batch lot saved with correct expiry date and quantity.',
    },
    {
      id: 'auto_4',
      stepNumber: 4,
      targetSection: 'inventory',
      targetSelector: null,
      fallbackPosition: 'center',
      title: 'Step 4: Physical Warehouse Binning',
      directive: 'Put Newer Stock Behind Older Units',
      whatToClick: 'Affix lot sticker and place units on the correct shelf',
      sopAction:
        '1. Stick the printed lot label on the storage bin.\n2. Carry the units to the shelf.\n3. Slide older stock to the front.\n4. Place the new units behind so pickers always grab the earliest-expiring items first.',
      exitCriteria: 'Physical units placed behind older stock in assigned bin.',
    },
    {
      id: 'auto_5',
      stepNumber: 5,
      targetSection: 'inventory',
      targetSelector: '[data-tour="search-input"]',
      fallbackPosition: 'bottom',
      title: 'Step 5: Verify Live Stock Balance',
      directive: 'Check Updated Stock in Inventory Table',
      whatToClick: 'Search product to confirm added inventory count',
      sopAction:
        'Look up the product in the table. The available count should reflect your added units. Customers can now buy these items online.',
      exitCriteria: 'Warehouse inventory balance updated and verified on server.',
    },
  ],
}

// ── 3. MANUAL INVENTORY TOUR (NEW PRODUCT INTAKE + CHATGPT) ────────────────
const newProductTour = {
  id: 'new_product_intake',
  title: 'Manual Product Intake with ChatGPT Studio',
  shortTitle: 'Manual Intake',
  category: 'New Product Creation',
  badge: 'New Catalog SKU',
  accentColor: '#e11d48',
  theme: 'rose',
  description:
    'Step-by-step guide for creating brand new Italian products: generate details with ChatGPT, paste into Smart Paste, set prices, and publish.',
  steps: [
    {
      id: 'man_1',
      stepNumber: 1,
      targetSection: 'inventory',
      targetSelector: '[data-tour="inventory-actions"]',
      fallbackPosition: 'bottom',
      title: 'Step 1: Open Inventory Workspace and Find Action Bar',
      directive: 'Locate New Product Buttons in Action Toolbar',
      whatToClick: 'Find "+ Add Product" and "Smart Paste" in top toolbar',
      sopAction:
        'When an Italian item arrives that is not yet in our catalog, we create a new master product. Look at the top toolbar for "+ Add Product" and "Smart Paste".',
      exitCriteria: 'Staff identifies where new catalog entries begin.',
    },
    {
      id: 'man_2',
      stepNumber: 2,
      targetSection: 'inventory',
      targetSelector: '[data-tour="smart-paste-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 2: Choose Smart Paste for Quick Data Entry',
      directive: 'Open Smart Paste to Avoid Manual Typing',
      whatToClick: 'Click "Smart Paste" to open the import window',
      sopAction:
        'Instead of typing Italian ingredients, allergens, descriptions, and storage notes by hand, our ChatGPT prompt creates all of it in seconds.',
      exitCriteria: 'Staff understands Smart Paste reads JSON to fill all fields automatically.',
    },
    {
      id: 'man_3',
      stepNumber: 3,
      targetSection: 'inventory',
      targetSelector: null,
      fallbackPosition: 'center',
      title: 'Step 3: Generate Catalog Details with ChatGPT Studio',
      directive: 'Copy ChatGPT Prompt and Run in ChatGPT',
      whatToClick: 'Click "Copy ChatGPT Prompt" below',
      sopAction:
        '1. Pick your product category below.\n2. Click "Copy ChatGPT Prompt" to copy the template.\n3. Open ChatGPT in another tab or on your phone.\n4. Take photos of the Italian packaging and attach them.\n5. Send the prompt and wait for ChatGPT to return the JSON code.',
      exitCriteria: 'Prompt copied to clipboard for use with ChatGPT.',
      chatGptIntegration: {
        enabled: true,
        defaultCategory: 'dolci',
        templates: CHATGPT_PROMPT_TEMPLATES,
      },
    },
    {
      id: 'man_4',
      stepNumber: 4,
      targetSection: 'inventory',
      targetSelector: '[data-tour="smart-paste-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 4: Paste JSON into Smart Paste and Review',
      directive: 'Paste the Output and Check Product Fields',
      whatToClick: 'Click "Smart Paste", paste JSON, and click "Validate & Preview"',
      sopAction:
        '1. Copy the JSON response from ChatGPT.\n2. Open Smart Paste in the toolbar.\n3. Paste the text and click "Validate & Preview".\n4. Review the product name, weight, ingredients, and allergen warnings.\n5. Click "Import Product" to save the draft.',
      exitCriteria: 'Product draft created with zero formatting errors.',
    },
    {
      id: 'man_5',
      stepNumber: 5,
      targetSection: 'inventory',
      targetSelector: '[data-tour="search-input"]',
      fallbackPosition: 'bottom',
      title: 'Step 5: Verify Saved Draft and Set Selling Price',
      directive: 'Search for New Item and Set Retail Price',
      whatToClick: 'Type product name in search bar to find new draft',
      sopAction:
        'The new product is saved as a Draft, hidden from shoppers. Search for it in the table below, open the editor, verify the Philippine Peso selling price, and upload packaging photos. Switch to Live when ready to sell.',
      exitCriteria: 'New product verified in table with unique SKU and correct details.',
    },
  ],
}

// ── 4. WAREHOUSE CUSTODY HANDOVER TOUR ─────────────────────────────────────
const handoverTour = {
  id: 'inventory_handover',
  title: 'Warehouse Custody Handover and Verification',
  shortTitle: 'Custody Handover',
  category: 'Warehouse and Custody',
  badge: 'Shift and Hub Transfer',
  accentColor: '#d97706',
  theme: 'amber',
  description:
    'Procedures for handing over stock between warehouse shifts, delivery drivers, or staging zones with count verification and sign-off.',
  steps: [
    {
      id: 'ho_1',
      stepNumber: 1,
      targetSection: 'inventory',
      targetSelector: '[data-tour="inventory-actions"]',
      fallbackPosition: 'bottom',
      title: 'Step 1: Stage Items for Custody Transfer',
      directive: 'Group Transfer Items in Designated Staging Area',
      whatToClick: 'Open Inventory Workspace to locate active lots',
      sopAction:
        'Move all items being handed over to the designated transfer bench. Keep items grouped by SKU and lot number. Never mix separate batches during transfer.',
      exitCriteria: 'Items arranged neatly with lot stickers facing forward.',
    },
    {
      id: 'ho_2',
      stepNumber: 2,
      targetSection: 'inventory',
      targetSelector: '[data-tour="search-input"]',
      fallbackPosition: 'bottom',
      title: 'Step 2: Joint Physical Count by Both Staff Members',
      directive: 'Count Every Item Together Before Signing',
      whatToClick: 'Search each SKU to compare physical units against system count',
      sopAction:
        'Both the outgoing staff member and the receiving staff member must count the items together. Compare physical jars and boxes against the numbers on screen. If a count is short, recount immediately before proceeding.',
      exitCriteria: 'Both parties agree on the exact unit count.',
    },
    {
      id: 'ho_3',
      stepNumber: 3,
      targetSection: 'inventory',
      targetSelector: '[data-tour="inventory-actions"]',
      fallbackPosition: 'bottom',
      title: 'Step 3: Record Custody Change in System',
      directive: 'Update Assigned Custodian in Admin BOS',
      whatToClick: 'Select lot line and reassign responsible staff member',
      sopAction:
        'In the custody tools, change the assigned staff name from the sender to the receiver. Enter a short note describing the transfer, such as shift change or vehicle loading.',
      exitCriteria: 'System records the new responsible staff member with timestamp.',
    },
    {
      id: 'ho_4',
      stepNumber: 4,
      targetSection: 'inventory',
      targetSelector: null,
      fallbackPosition: 'center',
      title: 'Step 4: Sign Paper Transfer Log',
      directive: 'Complete Signatures on Physical Logbook',
      whatToClick: 'Sign physical warehouse binder with date and time',
      sopAction:
        'Both staff members sign the warehouse transfer binder with full name, signature, date, and time. This ensures an unbroken chain of custody for imported Italian stock.',
      exitCriteria: 'Physical logbook signed by both staff members.',
    },
    {
      id: 'ho_5',
      stepNumber: 5,
      targetSection: 'inventory',
      targetSelector: null,
      fallbackPosition: 'center',
      title: 'Step 5: Lock Storage and Secure Area',
      directive: 'Return Key to Lockbox and Secure Shelf',
      whatToClick: 'Verify bin lock is secured and log key return',
      sopAction:
        'Place high-value items, such as olive oils and truffles, inside the locked cabinet. Return the key to the keybox and verify the door latch is secured.',
      exitCriteria: 'High-value inventory secured in locked storage.',
    },
  ],
}

// ── 5. MONTHLY CYCLE COUNT TOUR ───────────────────────────────────────────
const monthlyCountTour = {
  id: 'monthly_count',
  title: 'Monthly Cycle Count and Reconciliation',
  shortTitle: 'Cycle Count',
  category: 'Audit and Reconciliation',
  badge: 'Physical Inventory Audit',
  accentColor: '#9333ea',
  theme: 'purple',
  description:
    'Complete procedure for monthly warehouse stock counts: freezing movements, blind counting, resolving discrepancies, and owner approval.',
  steps: [
    {
      id: 'mc_1',
      stepNumber: 1,
      targetSection: 'owner_count_close',
      targetSelector: '[data-tour="cycle-count-board"]',
      fallbackPosition: 'bottom',
      title: 'Step 1: Pause Warehouse Shipments and Start Session',
      directive: 'Halt Outbound Picking During Physical Count',
      whatToClick: 'Open Owner Count & Close and start a new audit session',
      sopAction:
        'Before counting begins, stop all order packing and delivery dispatches. No units should enter or leave the warehouse while counting is in progress.',
      exitCriteria: 'Warehouse activities paused and count session started.',
    },
    {
      id: 'mc_2',
      stepNumber: 2,
      targetSection: 'owner_count_close',
      targetSelector: '[data-tour="cycle-count-board"]',
      fallbackPosition: 'bottom',
      title: 'Step 2: Perform Section-by-Section Blind Count',
      directive: 'Count Actual Shelf Units Without Looking at Records',
      whatToClick: 'Begin counting at Shelf Section A',
      sopAction:
        'Auditors count physical units on every shelf from top to bottom. Do not look at the expected system numbers beforehand. Write the exact count on the count sheet.',
      exitCriteria: 'Every shelf bin counted and recorded on paper sheet.',
    },
    {
      id: 'mc_3',
      stepNumber: 3,
      targetSection: 'owner_count_close',
      targetSelector: '[data-tour="cycle-count-board"]',
      fallbackPosition: 'bottom',
      title: 'Step 3: Enter Counts and Check for Differences',
      directive: 'Type Counted Units into System',
      whatToClick: 'Enter unit counts in the Stock Count section',
      sopAction:
        'Enter the physical counts for each product lot. The system calculates differences between physical units and database units. Any difference of even one unit is highlighted.',
      exitCriteria: 'All item counts entered into the audit form.',
    },
    {
      id: 'mc_4',
      stepNumber: 4,
      targetSection: 'owner_count_close',
      targetSelector: '[data-tour="cycle-count-board"]',
      fallbackPosition: 'bottom',
      title: 'Step 4: Recount Any Mismatched Items',
      directive: 'Inspect Surrounding Shelves for Misplaced Units',
      whatToClick: 'Review discrepancy list and conduct second count',
      sopAction:
        'For any item with a discrepancy, have a second staff member recount the shelf. Check adjacent bins and the packing station to see if units were placed in the wrong slot.',
      exitCriteria: 'Second count confirms genuine variance or finds misplaced units.',
    },
    {
      id: 'mc_5',
      stepNumber: 5,
      targetSection: 'owner_count_close',
      targetSelector: '[data-tour="cycle-count-board"]',
      fallbackPosition: 'bottom',
      title: 'Step 5: Owner Review and Authorization',
      directive: 'Submit Variance Report for Owner Sign-off',
      whatToClick: 'Click "Save progress" and submit for owner review',
      sopAction:
        'Only the business owner can approve inventory write-offs or adjustments. The owner reviews the final variance report, enters an audit reason, and confirms the close.',
      exitCriteria: 'Owner reviews and approves the stock reconciliation.',
    },
    {
      id: 'mc_6',
      stepNumber: 6,
      targetSection: 'inventory',
      targetSelector: '[data-tour="search-input"]',
      fallbackPosition: 'bottom',
      title: 'Step 6: Resume Normal Warehouse Operations',
      directive: 'Unfreeze Picking and Verify Stock Balances',
      whatToClick: 'Return to Inventory Workspace to inspect active stock',
      sopAction:
        'Once approved, the system updates inventory balances to match physical truth. Warehouse picking and packing resume normally.',
      exitCriteria: 'Inventory balances updated and picking resumed.',
    },
  ],
}

// ── 6. CUSTOMER ORDER FULFILLMENT TOUR ─────────────────────────────────────
const newOrderTour = {
  id: 'new_order',
  title: 'Customer Order Fulfillment and Dispatch',
  shortTitle: 'Order Fulfillment',
  category: 'Orders and Fulfillment',
  badge: 'Customer Delivery',
  accentColor: '#4f46e5',
  theme: 'indigo',
  description:
    'Complete order fulfillment procedure: verifying customer payment, picking earliest-expiring lots, packing securely, and courier handover.',
  steps: [
    {
      id: 'ord_1',
      stepNumber: 1,
      targetSection: 'fulfillment',
      targetSelector: '[data-tour="fulfillment-queue"]',
      fallbackPosition: 'bottom',
      title: 'Step 1: Check Inbound Orders and Verify Payment',
      directive: 'Review Payment Proof Before Reserving Stock',
      whatToClick: 'Inspect order request in Confirmation Queue',
      sopAction:
        'Open the confirmation queue in Omni-Operations Hub. Review the customer address, contact details, and payment receipt screenshot. Confirm that funds arrived in the official account before approving.',
      exitCriteria: 'Payment verified and customer order approved.',
    },
    {
      id: 'ord_2',
      stepNumber: 2,
      targetSection: 'fulfillment',
      targetSelector: '[data-tour="fulfillment-queue"]',
      fallbackPosition: 'bottom',
      title: 'Step 2: Allocate Earliest-Expiring Batch Lots',
      directive: 'Pick Stock Based on First-Expired, First-Out',
      whatToClick: 'Check reserved batch lots on the order slip',
      sopAction:
        'The system reserves units from the earliest-expiring batch lot. Check the batch ID and shelf location on the packing slip before heading into the warehouse.',
      exitCriteria: 'Earliest-expiring batch lot assigned to order.',
    },
    {
      id: 'ord_3',
      stepNumber: 3,
      targetSection: 'fulfillment',
      targetSelector: '[data-tour="pack-ship-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 3: Scan Barcode to Confirm Item Pick',
      directive: 'Scan Item Barcode at Packing Station',
      whatToClick: 'Point scanner at item barcode in Scan Station form',
      sopAction:
        'Bring the physical items to the packing table. Scan each product barcode with the handheld scanner. The system confirms the item matches the order and marks the unit as packed.',
      exitCriteria: 'Item scanned and confirmed against order requirements.',
    },
    {
      id: 'ord_4',
      stepNumber: 4,
      targetSection: 'fulfillment',
      targetSelector: '[data-tour="pack-ship-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 4: Pack with Protective Cushioning',
      directive: 'Wrap Glass Bottles in Bubble Wrap',
      whatToClick: 'Assemble box and prepare packing materials',
      sopAction:
        'Wrap olive oil bottles and pasta sauce jars in thick bubble wrap. Fill empty spaces with paper cushions so items cannot rattle or crack during motorbike delivery. Seal the box with packing tape.',
      exitCriteria: 'Fragile items protected and shipping box sealed.',
    },
    {
      id: 'ord_5',
      stepNumber: 5,
      targetSection: 'fulfillment',
      targetSelector: '[data-tour="pack-ship-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 5: Generate Shipping Waybill',
      directive: 'Print Courier Shipping Label',
      whatToClick: 'Click "Delivery & waybill" to print courier label',
      sopAction:
        'Open the order delivery modal. Review the selected courier (such as Lalamove, Grab, or J&T Express). Print the courier waybill and stick it flat on the outside of the box.',
      exitCriteria: 'Shipping label printed and attached to outside of package.',
    },
    {
      id: 'ord_6',
      stepNumber: 6,
      targetSection: 'fulfillment',
      targetSelector: '[data-tour="fulfillment-queue"]',
      fallbackPosition: 'bottom',
      title: 'Step 6: Hand Package to Courier Rider',
      directive: 'Check Rider Identity and Hand Over Box',
      whatToClick: 'Click "Handover to courier" and record rider name',
      sopAction:
        'When the courier rider arrives, verify their name and plate number against the booking. Hand over the package, ask the rider to sign your pickup sheet, and click Handover to Courier in Admin BOS.',
      exitCriteria: 'Package handed to courier and dispatch recorded.',
    },
    {
      id: 'ord_7',
      stepNumber: 7,
      targetSection: 'fulfillment',
      targetSelector: '[data-tour="fulfillment-queue"]',
      fallbackPosition: 'bottom',
      title: 'Step 7: Track Delivery to Customer Doorstep',
      directive: 'Monitor Delivery Status Until Received',
      whatToClick: 'Check delivery status column in Live Orders',
      sopAction:
        'Follow the delivery tracking link until the rider completes drop-off. Once confirmed by the customer, mark the order as Delivered in the system.',
      exitCriteria: 'Order marked as successfully delivered to customer.',
    },
  ],
}

// ── 7. PASABUY CUSTOM SOURCING TOUR ────────────────────────────────────────
const pasabuyTour = {
  id: 'pasabuy_lifecycle',
  title: 'Pasabuy Custom Sourcing and Delivery',
  shortTitle: 'Pasabuy Concierge',
  category: 'Custom Pasabuy Sourcing',
  badge: 'VIP Custom Sourcing',
  accentColor: '#0d9488',
  theme: 'teal',
  description:
    'Complete workflow for special requests: reviewing item feasibility, calculating Euro to Peso landed costs, issuing quotes, and delivering to client.',
  steps: [
    {
      id: 'pb_1',
      stepNumber: 1,
      targetSection: 'pasabuy',
      targetSelector: '[data-tour="pasabuy-table"]',
      fallbackPosition: 'bottom',
      title: 'Step 1: Review Customer Sourcing Request',
      directive: 'Check Request Feasibility with Milan Sourcing',
      whatToClick: 'Select customer request in Pasabuy Priority Queue',
      sopAction:
        'A customer requested an Italian product not in our standard catalog. Check the brand, size, and packaging photo. Message our Milan sourcing lead to confirm availability in Italian stores.',
      exitCriteria: 'Item confirmed as available in Milan specialty stores.',
    },
    {
      id: 'pb_2',
      stepNumber: 2,
      targetSection: 'pasabuy',
      targetSelector: '[data-tour="pasabuy-quote-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 2: Calculate Landed Cost in Philippine Pesos',
      directive: 'Calculate Euro Price, Shipping, and Customs Tax',
      whatToClick: 'Enter cost figures into Pasabuy Quote Calculator',
      sopAction:
        'Enter the retail price in Euros, current exchange rate, item weight in kilograms, air freight cost, and customs tax. The calculator figures the true landed cost and suggests the retail price.',
      exitCriteria: 'Landed cost calculated with exchange rate and freight included.',
    },
    {
      id: 'pb_3',
      stepNumber: 3,
      targetSection: 'pasabuy',
      targetSelector: '[data-tour="pasabuy-quote-btn"]',
      fallbackPosition: 'bottom',
      title: 'Step 3: Issue Formal Quote to Customer',
      directive: 'Send Quoted Price and Validity Period',
      whatToClick: 'Click "Save quote version" and copy quotation message',
      sopAction:
        'Save the quote version with a 7-day validity period. Copy the formatted quotation text and send it to the customer via WhatsApp, Viber, or email. Wait for their written confirmation before purchasing.',
      exitCriteria: 'Customer accepts quote and agrees to purchase terms.',
    },
    {
      id: 'pb_4',
      stepNumber: 4,
      targetSection: 'pasabuy',
      targetSelector: '[data-tour="pasabuy-table"]',
      fallbackPosition: 'bottom',
      title: 'Step 4: Confirm Purchase in Milan Store',
      directive: 'Direct Milan Lead to Buy Physical Item',
      whatToClick: 'Advance case status to "Purchasing" then "Purchased"',
      sopAction:
        'Once the customer approves, notify Milan to buy the product. Milan sends the store receipt and photo proof of the item with the expiration date clearly visible.',
      exitCriteria: 'Product purchased in Milan and receipt uploaded.',
    },
    {
      id: 'pb_5',
      stepNumber: 5,
      targetSection: 'consignments',
      targetSelector: '[data-tour="flight-manifest"]',
      fallbackPosition: 'bottom',
      title: 'Step 5: Pack in Air Cargo and Ship to Manila',
      directive: 'Include Item in Next Flight Manifest',
      whatToClick: 'Open Flight Consignments to tag item in cargo box',
      sopAction:
        'Pack the special item into the next scheduled flight box. Write the customer name on the bubble wrap. Tag the item with the Pasabuy reference number in the flight manifest.',
      exitCriteria: 'Item packed in flight box with Pasabuy case tag.',
    },
    {
      id: 'pb_6',
      stepNumber: 6,
      targetSection: 'fulfillment',
      targetSelector: '[data-tour="fulfillment-queue"]',
      fallbackPosition: 'bottom',
      title: 'Step 6: Receive in Manila and Dispatch to Client',
      directive: 'Inspect Packaging and Hand to Delivery Courier',
      whatToClick: 'Open Omni-Operations Hub to book client delivery',
      sopAction:
        'When the flight arrives in Manila, inspect the item for damage. Message the customer that their item is ready. Book express courier delivery and mark the case as Delivered.',
      exitCriteria: 'Custom provision received by customer and case closed.',
    },
  ],
}

// ── 8. MULTI-CHANNEL INTEGRATION TOUR ──────────────────────────────────────
const channelTour = {
  id: 'channel_integration_lifecycle',
  title: 'Channels and Integrations Synchronization',
  shortTitle: 'Channel Integrations',
  category: 'Channels and Marketplaces',
  badge: 'Shopee, Lazada, TikTok',
  accentColor: '#0891b2',
  theme: 'slate',
  description:
    'Operating procedures for external sales channels: monitoring connection states, validating listing drafts, and managing stock synchronization safely.',
  steps: [
    {
      id: 'ci_1',
      stepNumber: 1,
      targetSection: 'channel_integrations',
      targetSelector: '[data-tour="channel-connectors"]',
      fallbackPosition: 'bottom',
      title: 'Step 1: Check Connection Status for Each Channel',
      directive: 'Review Operational Health Across Platforms',
      whatToClick: 'Inspect channel status cards in Channel Integrations',
      sopAction:
        'Check the connection status for Website, Pasabuy, Shopee, TikTok Shop, and Lazada. Confirm whether each channel is Operational, Events-only, or Not connected.',
      exitCriteria: 'Channel connection states reviewed across all five platforms.',
    },
    {
      id: 'ci_2',
      stepNumber: 2,
      targetSection: 'channel_integrations',
      targetSelector: '[data-tour="channel-connectors"]',
      fallbackPosition: 'bottom',
      title: 'Step 2: Prepare Product Listing Drafts',
      directive: 'Format Item Titles and Descriptions for Marketplaces',
      whatToClick: 'Review marketplace listing table and draft counts',
      sopAction:
        'Review channel product drafts. Make sure product titles, weights, photos, and prices meet platform standards. Do not mark items as published until inventory is verified.',
      exitCriteria: 'Draft listings validated with required fields.',
    },
    {
      id: 'ci_3',
      stepNumber: 3,
      targetSection: 'channel_integrations',
      targetSelector: '[data-tour="channel-connectors"]',
      fallbackPosition: 'bottom',
      title: 'Step 3: Allocate Safety Stock for External Platforms',
      directive: 'Reserve Dedicated Units to Prevent Overselling',
      whatToClick: 'Inspect stock numbers in Channel Integrations overview',
      sopAction:
        'When connecting external channels, allocate safety buffer stock. Never list 100% of warehouse stock across multiple channels simultaneously to avoid overselling during flash sales.',
      exitCriteria: 'Stock buffers configured to protect inventory availability.',
    },
    {
      id: 'ci_4',
      stepNumber: 4,
      targetSection: 'channel_integrations',
      targetSelector: '[data-tour="channel-connectors"]',
      fallbackPosition: 'bottom',
      title: 'Step 4: Test Inbound Order Webhook Notifications',
      directive: 'Verify That External Orders Reach K2 Jimzon',
      whatToClick: 'Click "Connector checklist" to review webhook health',
      sopAction:
        'Check that orders placed on external platforms trigger webhook events into K2 Jimzon. Orders must appear in our central fulfillment queue with the channel source clearly marked.',
      exitCriteria: 'Channel orders flow into central queue without manual retyping.',
    },
    {
      id: 'ci_5',
      stepNumber: 5,
      targetSection: 'channel_integrations',
      targetSelector: '[data-tour="channel-connectors"]',
      fallbackPosition: 'bottom',
      title: 'Step 5: Review Channel Platform Fees and Deductions',
      directive: 'Audit Marketplace Commissions and Payouts',
      whatToClick: 'Open Owner Count & Close to compare fees against payouts',
      sopAction:
        'Compare platform sales reports against bank payouts. Check marketplace commissions, transaction fees, and shipping subsidies. Record any discrepancies in the monthly close.',
      exitCriteria: 'Platform fees reconciled against actual bank deposits.',
    },
    {
      id: 'ci_6',
      stepNumber: 6,
      targetSection: 'channel_integrations',
      targetSelector: '[data-tour="channel-connectors"]',
      fallbackPosition: 'bottom',
      title: 'Step 6: Fall Back to Seller Center When Needed',
      directive: 'Use Native Platform Portals During Connector Downtime',
      whatToClick: 'Open marketplace portal links in the channel table',
      sopAction:
        'If a platform connector is offline or undergoing maintenance, use the official Seller Center links in the table. Process orders directly inside Shopee, Lazada, or TikTok until the connection is restored.',
      exitCriteria: 'Staff knows how to use Seller Center portals as manual backup.',
    },
  ],
}

export const SPOTLIGHT_TOURS = {
  // Direct workflow IDs
  cross_border_lifecycle: crossBorderTour,
  existing_stock_intake: existingStockTour,
  new_product_intake: newProductTour,
  inventory_handover: handoverTour,
  monthly_count: monthlyCountTour,
  new_order: newOrderTour,
  pasabuy_lifecycle: pasabuyTour,
  channel_integration_lifecycle: channelTour,

  // Aliases for backwards compatibility with intake buttons
  manual_inventory: newProductTour,
  auto_inventory: existingStockTour,
}

export const WORKFLOW_TOUR_MAP = {
  cross_border_lifecycle: 'cross_border_lifecycle',
  existing_stock_intake: 'existing_stock_intake',
  auto_inventory: 'existing_stock_intake',
  new_product_intake: 'new_product_intake',
  manual_inventory: 'new_product_intake',
  inventory_handover: 'inventory_handover',
  monthly_count: 'monthly_count',
  new_order: 'new_order',
  pasabuy_lifecycle: 'pasabuy_lifecycle',
  channel_integration_lifecycle: 'channel_integration_lifecycle',
}

/**
 * Returns the list of 8 canonical tours for modal rendering.
 */
export function getAvailableTours() {
  return [
    newProductTour,
    existingStockTour,
    crossBorderTour,
    newOrderTour,
    pasabuyTour,
    monthlyCountTour,
    handoverTour,
    channelTour,
  ]
}

/**
 * Compiles a full prompt for ChatGPT given an Italian category key and optional product name override.
 */
export function generateChatGPTListingPrompt(categoryKey = 'dolci', customProductName = '') {
  const template =
    CHATGPT_PROMPT_TEMPLATES.find((t) => t.key === categoryKey) ||
    CHATGPT_PROMPT_TEMPLATES[0]
  const targetProduct = customProductName.trim() || template.exampleItem
  return template.prompt.replace('[PRODUCT NAME]', targetProduct)
}
