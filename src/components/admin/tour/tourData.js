/**
 * K2 Jimzon — Admin BOS Interactive Spotlight Walkthrough Tour Data
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

export const SPOTLIGHT_TOURS = {
  // ── 1. MANUAL INVENTORY TOUR (NEW PRODUCT INTAKE + CHATGPT) ───────────────
  manual_inventory: {
    id: 'manual_inventory',
    title: 'Manual Product Intake with ChatGPT Studio',
    shortTitle: 'Manual Intake',
    category: 'New Product Creation',
    badge: 'New Catalog SKU',
    accentColor: '#e11d48', // rose-600
    theme: 'rose',
    description:
      'Step-by-step interactive SOP for onboarding brand-new Italian provisions: generating specs via ChatGPT, pasting JSON into Smart Paste, creating master SKUs, and publishing to the storefront.',
    steps: [
      {
        id: 'man_1',
        stepNumber: 1,
        targetSection: 'inventory',
        targetSelector: '[data-tour="inventory-actions"]',
        fallbackPosition: 'bottom',
        title: 'Step 1: Open Inventory Workspace & Locate Action Bar',
        directive: 'Examine the Inventory Action Toolbar',
        whatToClick: 'Locate the "+ Add Product" and "Smart Paste" buttons in the action toolbar',
        sopAction:
          'When an unlisted Italian product arrives in Manila that has no matching SKU in our catalog, you will create a new Master Product record. Notice the action buttons in the top-right toolbar: "Smart Paste" and "Add Product".',
        exitCriteria: 'Staff recognizes the two entry points for creating new catalog products.',
      },
      {
        id: 'man_2',
        stepNumber: 2,
        targetSection: 'inventory',
        targetSelector: '[data-tour="smart-paste-btn"]',
        fallbackPosition: 'bottom',
        title: 'Step 2: Choose Smart Paste for AI-Powered Ingestion',
        directive: 'Click "Smart Paste" or Prepare Your Spec',
        whatToClick: 'Click "Smart Paste" to open the JSON parser modal',
        sopAction:
          'Instead of typing dozens of fields manually (ingredients, allergens, Italian descriptions, culinary pairings, and SEO keywords), K2 uses our structured ChatGPT JSON workflow to prepare everything in seconds.',
        exitCriteria: 'Staff understands that Smart Paste consumes canonical JSON to populate product fields automatically.',
      },
      {
        id: 'man_3',
        stepNumber: 3,
        targetSection: 'inventory',
        targetSelector: null, // Full spotlight modal center
        fallbackPosition: 'center',
        title: 'Step 3: Generate Catalog Spec with ChatGPT Studio',
        directive: 'Copy the ChatGPT Prompt & Run in ChatGPT',
        whatToClick: 'Click "Copy ChatGPT Prompt" below',
        sopAction:
          '1. Select your product category template below.\n2. Click "Copy ChatGPT Prompt" to copy the pre-tested system instruction to your clipboard.\n3. Open ChatGPT (in a new browser tab or mobile app).\n4. Attach photos of the physical Italian product packaging (front, back/label, and barcode).\n5. Send the prompt and wait for ChatGPT to generate the single JSON object.',
        exitCriteria: 'ChatGPT prompt copied and understood by staff member.',
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
        title: 'Step 4: Paste JSON into Smart Paste & Review Fields',
        directive: 'Paste the Returned JSON and Verify Data',
        whatToClick: 'Click "Smart Paste", paste the JSON, and click "Validate & Preview"',
        sopAction:
          '1. Copy the raw JSON response from ChatGPT.\n2. Click "Smart Paste" in the toolbar.\n3. Paste the JSON into the text area and click "Validate & Preview".\n4. Review the extracted fields: Italian name, net weight, ingredients, allergen warnings, and storage rules.\n5. Click "Import Product" to save the new Master SKU draft.',
        exitCriteria: 'JSON validated with 0 schema errors and product draft saved.',
      },
      {
        id: 'man_5',
        stepNumber: 5,
        targetSection: 'inventory',
        targetSelector: '[data-tour="search-input"]',
        fallbackPosition: 'bottom',
        title: 'Step 5: Verify Saved Draft & Set Owner Pricing',
        directive: 'Search the New Product in Master Catalog',
        whatToClick: 'Type the product name in the search bar to locate your new Draft',
        sopAction:
          'Once imported, the product is created in "Draft" status (invisible to storefront customers). Search for it in the table below, click to open its editor, review the owner PHP retail price, and upload product packaging photos. When ready, switch status to "Live" to make it buyable!',
        exitCriteria: 'New product verified in table with unique SKU and correct origin classification.',
      },
    ],
  },

  // ── 2. AUTOMATIC INVENTORY TOUR (SCAN BARCODE + BATCH REPLENISHMENT) ──────
  auto_inventory: {
    id: 'auto_inventory',
    title: 'Automatically Adding Stock to Existing SKU',
    shortTitle: 'Automatic Stock Intake',
    category: 'Stock Replenishment',
    badge: 'Existing Catalog SKU',
    accentColor: '#059669', // emerald-600
    theme: 'emerald',
    description:
      'Fast-track scanning intake procedure for items already in our catalog: laser-scanning EAN-13 barcodes, logging manufacturer FEFO expiry dates, and shelf placement.',
    steps: [
      {
        id: 'auto_1',
        stepNumber: 1,
        targetSection: 'inventory',
        targetSelector: '[data-tour="scan-box-btn"]',
        fallbackPosition: 'bottom',
        title: 'Step 1: Focus Barcode Scanner & Laser-Scan Item',
        directive: 'Scan Physical EAN-13 Barcode',
        whatToClick: 'Click "Scan box" or point laser scanner at product packaging barcode',
        sopAction:
          'When unboxing incoming boxes from Milan, pick up the physical item and scan its printed manufacturer EAN-13 barcode. You do not need to type anything by hand.',
        exitCriteria: 'Laser scanner successfully reads the physical 13-digit EAN barcode.',
      },
      {
        id: 'auto_2',
        stepNumber: 2,
        targetSection: 'inventory',
        targetSelector: '[data-tour="search-input"]',
        fallbackPosition: 'bottom',
        title: 'Step 2: Instant Master SKU Match Confirmation',
        directive: 'Verify Product Details Match Physical Item',
        whatToClick: 'Check the loaded product card to confirm SKU and net weight',
        sopAction:
          'The system instantly looks up the barcode in the master catalog and loads the product profile. Confirm that the packaging net weight (e.g. 260g vs 330g) matches what is physically in your hand.',
        exitCriteria: 'Scanned barcode matches active Master SKU with zero discrepancy.',
      },
      {
        id: 'auto_3',
        stepNumber: 3,
        targetSection: 'inventory',
        targetSelector: '[data-tour="inventory-actions"]',
        fallbackPosition: 'bottom',
        title: 'Step 3: Register New FEFO Batch Lot & Expiry Date',
        directive: 'Enter Expiration Date & Intake Quantity',
        whatToClick: 'Record the best-before date in YYYY-MM-DD format from the physical packaging',
        sopAction:
          'Inspect the printed expiration date on the packaging. Enter the date accurately (YYYY-MM-DD) and the counted unit quantity. Different expiry dates must be recorded as separate batch lots to ensure First-Expired, First-Out (FEFO) order picking!',
        exitCriteria: 'Batch lot created with verified expiry date, hub, and intake quantity.',
      },
      {
        id: 'auto_4',
        stepNumber: 4,
        targetSection: 'inventory',
        targetSelector: null,
        fallbackPosition: 'center',
        title: 'Step 4: Physical Warehouse Binning (Physical FEFO)',
        directive: 'Position Stock Behind Older Expiring Units',
        whatToClick: 'Affix lot sticker and place units on designated warehouse shelf',
        sopAction:
          '1. Affix the printed lot ID sticker onto the case or storage bin.\n2. Bring items to the designated warehouse shelf location.\n3. Slide older-expiring units to the front of the shelf.\n4. Place new units directly behind them so order pickers automatically pick the earliest-expiring items first.',
        exitCriteria: 'Physical units staged behind older stock in assigned bin.',
      },
      {
        id: 'auto_5',
        stepNumber: 5,
        targetSection: 'inventory',
        targetSelector: '[data-tour="search-input"]',
        fallbackPosition: 'bottom',
        title: 'Step 5: Verify Reconciled Lot Balance',
        directive: 'Check Live Available Units in Inventory',
        whatToClick: 'Verify available units in MANILA_MAIN warehouse reflect the added count',
        sopAction:
          'Check the inventory table to ensure the available units have incremented. Stock is immediately eligible for customer order reservations and fulfillment picking in Omni-Operations Hub.',
        exitCriteria: 'Location inventory balance reconciled and verified on server.',
      },
    ],
  },
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
