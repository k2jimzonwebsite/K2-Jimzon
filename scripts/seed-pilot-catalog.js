/**
 * Pilot Catalog Seed Script (MAP-003)
 * Seeds 8 representative real Italian products as Drafts with separate batch lots.
 */

import { supabase } from '../src/lib/supabaseClient.js'

export const PILOT_PRODUCTS = [
  {
    sku: 'K2-SKU-001001',
    barcode: '8001234567890',
    name: 'San Pellegrino Sparkling Mineral Water 750ml',
    brand: 'San Pellegrino',
    category: 'Beverage',
    price: 180,
    cost_price: 95,
    status: 'live',
    published: true,
    primary_image_url: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=600&q=80',
    usage_summary: 'Serve chilled at 8-10°C as a palate cleanser during fine Italian dining.',
    ingredients: ['Natural Mineral Water', 'Carbon Dioxide'],
    allergens: []
  },
  {
    sku: 'K2-SKU-001002',
    barcode: '8001234567891',
    name: 'Barilla Pasta Penne Rigate No 73 500g',
    brand: 'Barilla',
    category: 'Food',
    price: 125,
    cost_price: 60,
    status: 'live',
    published: true,
    primary_image_url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281878?auto=format&fit=crop&w=600&q=80',
    usage_summary: 'Boil in salted water for 11 minutes until al dente.',
    ingredients: ['Durum Wheat Semolina', 'Water'],
    allergens: ['Wheat / Gluten']
  },
  {
    sku: 'K2-SKU-001003',
    barcode: '8001234567892',
    name: 'Nutella Hazelnut Cocoa Spread 750g',
    brand: 'Ferrero',
    category: 'Food',
    price: 495,
    cost_price: 310,
    status: 'live',
    published: true,
    primary_image_url: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=600&q=80',
    usage_summary: 'Spread on warm toast, croissants, or fresh fruit.',
    ingredients: ['Sugar', 'Palm Oil', 'Hazelnuts 13%', 'Skimmed Milk Powder 8.7%', 'Fat-Reduced Cocoa 7.4%'],
    allergens: ['Milk', 'Hazelnuts', 'Soy']
  },
  {
    sku: 'K2-SKU-001004',
    barcode: '8001234567893',
    name: 'Lavazza Qualita Oro Ground Coffee 250g',
    brand: 'Lavazza',
    category: 'Food',
    price: 395,
    cost_price: 220,
    status: 'live',
    published: true,
    primary_image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
    usage_summary: 'Brew using a Moka pot or espresso machine.',
    ingredients: ['100% Arabica Ground Coffee Beans'],
    allergens: []
  },
  {
    sku: 'K2-SKU-001005',
    barcode: '8001234567894',
    name: 'Acqua di Parma Colonia Eau de Cologne 100ml',
    brand: 'Acqua di Parma',
    category: 'Beauty',
    price: 8500,
    cost_price: 5200,
    status: 'under_review',
    published: false,
    primary_image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    usage_summary: 'Apply to pulse points on neck and wrists.',
    ingredients: ['Alcohol Denat.', 'Parfum (Fragrance)', 'Aqua (Water)', 'Limonene', 'Linalool'],
    allergens: ['Limonene', 'Linalool', 'Citral']
  },
  {
    sku: 'K2-SKU-001006',
    barcode: '8001234567895',
    name: 'Marvis Classic Strong Mint Toothpaste 85ml',
    brand: 'Marvis',
    category: 'Beauty',
    price: 550,
    cost_price: 320,
    status: 'live',
    published: true,
    primary_image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    usage_summary: 'Brush thoroughly twice daily for 2 minutes.',
    ingredients: ['Glycerin', 'Aluminum Hydroxide', 'Water', 'Silica', 'Aroma', 'Titanium Dioxide'],
    allergens: []
  },
  {
    sku: 'K2-SKU-001007',
    barcode: '8001234567896',
    name: 'Chanteclair Sgrassatore Universale Cleaner 750ml',
    brand: 'Chanteclair',
    category: 'Household',
    price: 340,
    cost_price: 180,
    status: 'live',
    published: true,
    primary_image_url: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80',
    usage_summary: 'Spray on surface, let sit for 30 seconds, and wipe clean.',
    ingredients: ['Non-ionic Surfactants <5%', 'Cationic Surfactants <5%', 'Perfume'],
    allergens: ['Eye Irritant']
  },
  {
    sku: 'K2-SKU-001008',
    barcode: '8001234567897',
    name: 'Mulino Bianco Pan di Stelle Biscuits 350g',
    brand: 'Mulino Bianco',
    category: 'Food',
    price: 280,
    cost_price: 150,
    status: 'draft',
    published: false,
    primary_image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80',
    usage_summary: 'Enjoy with fresh milk or coffee.',
    ingredients: ['Wheat Flour', 'Sugar', 'Sunflower Oil', 'Butter', 'Cocoa 3.7%', 'Chocolate 2.5%'],
    allergens: ['Wheat', 'Milk', 'Eggs', 'May contain Nuts']
  }
]

export const PILOT_BATCHES = [
  { sku: 'K2-SKU-001001', batch_code: 'LOT-SAN-2026A', quantity: 48, expiry_date: '2027-06-30', box_code: 'BOX-MIL-01', hub: 'Manila Central Hub', custodian: 'Staff Marco' },
  { sku: 'K2-SKU-001002', batch_code: 'LOT-BAR-2026B', quantity: 120, expiry_date: '2027-12-31', box_code: 'BOX-MIL-02', hub: 'Manila Central Hub', custodian: 'Staff Marco' },
  { sku: 'K2-SKU-001003', batch_code: 'LOT-NUT-2026C', quantity: 36, expiry_date: '2027-05-15', box_code: 'BOX-MIL-03', hub: 'Manila Central Hub', custodian: 'Staff Elena' },
  { sku: 'K2-SKU-001004', batch_code: 'LOT-LAV-2026D', quantity: 60, expiry_date: '2027-09-30', box_code: 'BOX-MIL-04', hub: 'Milan Depot', custodian: 'Staff Matteo' },
  { sku: 'K2-SKU-001005', batch_code: 'LOT-ADP-2026E', quantity: 12, expiry_date: '2028-12-31', box_code: 'BOX-MIL-05', hub: 'Manila Central Hub', custodian: 'Staff Elena' },
  { sku: 'K2-SKU-001006', batch_code: 'LOT-MAR-2026F', quantity: 50, expiry_date: '2028-06-30', box_code: 'BOX-MIL-06', hub: 'Manila Central Hub', custodian: 'Staff Marco' },
  { sku: 'K2-SKU-001007', batch_code: 'LOT-CHA-2026G', quantity: 40, expiry_date: '2028-10-31', box_code: 'BOX-MIL-07', hub: 'Milan Depot', custodian: 'Staff Matteo' },
  { sku: 'K2-SKU-001008', batch_code: 'LOT-MUL-2026H', quantity: 30, expiry_date: '2027-03-31', box_code: 'BOX-MIL-08', hub: 'Manila Central Hub', custodian: 'Staff Marco' }
]

async function runSeed() {
  console.log('Seeding pilot catalog items into database...')
  if (!supabase) {
    console.log('Supabase not configured, skipping live database seeding.')
    return
  }

  for (const prod of PILOT_PRODUCTS) {
    const { data, error } = await supabase
      .from('products')
      .upsert(prod, { onConflict: 'sku' })

    if (error) console.error(`Error seeding ${prod.sku}:`, error.message)
    else console.log(`✓ Seeded product ${prod.sku} — ${prod.name}`)
  }

  for (const batch of PILOT_BATCHES) {
    // Get product ID for SKU
    const { data: pData } = await supabase.from('products').select('id').eq('sku', batch.sku).single()
    if (pData) {
      const { error: bErr } = await supabase
        .from('product_batches')
        .upsert({
          product_id: pData.id,
          sku: batch.sku,
          batch_code: batch.batch_code,
          quantity: batch.quantity,
          expiry_date: batch.expiry_date,
          box_code: batch.box_code,
          hub: batch.hub,
          custodian: batch.custodian,
          channel: 'website'
        }, { onConflict: 'batch_code' })
      if (bErr) console.error(`Error seeding batch ${batch.batch_code}:`, bErr.message)
      else console.log(`✓ Seeded batch ${batch.batch_code} for ${batch.sku}`)
    }
  }

  console.log('Pilot catalog seed complete!')
}

if (process.argv[1] && process.argv[1].endsWith('seed-pilot-catalog.js')) {
  runSeed()
}
