import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseProductResearchPaste } from '../src/views/admin/productResearchContract.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON MAP-001 PRODUCT INTAKE & SKU AUDIT    ')
console.log('====================================================\n')

let failures = 0

function check(name, condition, failureMessage) {
  if (condition) {
    console.log(`[PASS] ${name}`)
  } else {
    console.error(`[FAIL] ${name}: ${failureMessage}`)
    failures++
  }
}

// 1. Migration 20260811_product_intake_and_sku_gate.sql
const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260811_product_intake_and_sku_gate.sql')
const migrationExists = fs.existsSync(migrationPath)
check('Migration 20260811_product_intake_and_sku_gate.sql exists', migrationExists, 'Migration file is missing')

if (migrationExists) {
  const migContent = fs.readFileSync(migrationPath, 'utf8')
  check(
    'Migration defines generate_k2_sku() and product_intake_sessions',
    migContent.includes('generate_k2_sku()') && migContent.includes('product_intake_sessions'),
    'Migration missing generate_k2_sku() or product_intake_sessions table'
  )
}

// 2. productIntakeService.js
const servicePath = path.join(rootDir, 'src', 'services', 'productIntakeService.js')
const serviceExists = fs.existsSync(servicePath)
check('productIntakeService.js exists', serviceExists, 'src/services/productIntakeService.js is missing')

if (serviceExists) {
  const svcContent = fs.readFileSync(servicePath, 'utf8')
  check(
    'Service exports searchIdentityDuplicates, createOrResumeIntakeSession, createProductDraftServer',
    svcContent.includes('searchIdentityDuplicates') &&
    svcContent.includes('createOrResumeIntakeSession') &&
    svcContent.includes('createProductDraftServer'),
    'Service missing required exports'
  )
}

// 3. ProductIntakeSessionModal.jsx
const modalPath = path.join(rootDir, 'src', 'views', 'admin', 'ProductIntakeSessionModal.jsx')
const modalExists = fs.existsSync(modalPath)
check('ProductIntakeSessionModal.jsx exists', modalExists, 'ProductIntakeSessionModal.jsx is missing')

if (modalExists) {
  const modalContent = fs.readFileSync(modalPath, 'utf8')
  check(
    'Modal implements phone-first intake checklist & publication review',
    modalContent.includes('Phone-First Product Intake') && modalContent.includes('publicationStatus'),
    'Modal missing phone-first intake structure or publication review'
  )
}

// 4. Sheet.jsx verification
const sheetPath = path.join(rootDir, 'src', 'views', 'admin', 'Sheet.jsx')
const sheetContent = fs.readFileSync(sheetPath, 'utf8')
check(
  'Sheet.jsx uses ProductIntakeSessionModal & eliminates NEW-XXXX browser SKU generation',
  sheetContent.includes('ProductIntakeSessionModal') && !sheetContent.includes('NEW-${Math.random()'),
  'Sheet.jsx still contains browser-generated NEW-XXXX SKUs'
)

// 5. Test parseProductResearchPaste contract with sample v3 payload
const sampleV3 = JSON.stringify({
  schema_version: 'k2.product-content.v3',
  product: {
    barcode: '8001234567890',
    name: 'San Pellegrino Sparkling Mineral Water 750ml',
    short_name: 'San Pellegrino 750ml',
    brand_name: 'San Pellegrino',
    variant: '750ml Glass Bottle',
    net_weight: '750ml',
    package_type: 'Glass Bottle',
    category: 'Beverage',
    subcategory: 'Mineral Water',
    origin: 'San Pellegrino Terme, Italy',
    ingredients: ['Natural Mineral Water', 'Carbon Dioxide'],
    allergens: []
  },
  copy: {
    card_description: 'Premium Italian natural sparkling mineral water.',
    full_description: 'Crisp, refreshing natural mineral water bottled at the source in Italy.',
    key_highlights: ['100% Imported from Italy', 'Natural Fine Bubble Carbonation'],
    why_buy: 'Authentic Italian dining experience',
    why_rare: null
  },
  seo: {
    seo_title: 'San Pellegrino Sparkling Water 750ml | K2 Jimzon',
    meta_description: 'Buy authentic San Pellegrino Sparkling Water 750ml imported directly from Italy.',
    page_heading: 'San Pellegrino Sparkling Mineral Water',
    supporting_heading: 'Italian Natural Fine Carbonated Water',
    search_keywords: ['san pellegrino water', 'sparkling water', 'italian mineral water']
  },
  usage: {
    summary: 'Serve chilled at 8-10°C.',
    use_cases: [
      { title: 'Fine Dining Pairing', best_for: 'Pairing with rich pasta and grilled meats' }
    ],
    instructions: [
      { title: 'Serving Guide', amount_or_ratio: '1 glass (250ml)', steps: ['Chill bottle', 'Pour gently'], expected_result: 'Crisp palate cleanser' }
    ],
    pairings: ['Pasta Carbonara', 'Grilled Ribeye'],
    storage: 'Store in a cool dry place.',
    warnings: []
  },
  media: {
    primary_alt_text: 'Front glass bottle of San Pellegrino Sparkling Water 750ml',
    primary_composition: 'Front view against clean luxury wood background',
    after_alt_text: 'Chilled glass of San Pellegrino with lemon slice',
    after_scene: 'In-use dining presentation',
    after_truth_constraints: ['Preserve authentic bottle label font']
  },
  verification: {
    sources: [
      { fields: ['product.name'], source_type: 'package_image', reference: 'upload:front', confidence: 'high' }
    ],
    unknown_fields: [],
    review_notes: ['Verified against physical bottle label']
  }
})

try {
  const parsed = parseProductResearchPaste(sampleV3)
  check('productResearchContract parses valid V3 payload', parsed && parsed.product.name.includes('San Pellegrino'), 'Failed to parse V3 payload')
} catch (e) {
  check('productResearchContract parses valid V3 payload', false, e.message)
}

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-001 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
