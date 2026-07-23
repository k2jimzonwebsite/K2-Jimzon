import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Use Service Role Key to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
  console.log("Starting Pasabuy Simulation...");

  // 1. Supplier
  console.log("Inserting Supplier...");
  await supabase.from('suppliers').upsert({
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Truffle & Co. Italy',
    contact_email: 'sales@truffleco.it',
    lead_time_days: 7
  }, { onConflict: 'id' });

  // 2. Draft Products (using why_buy instead of description to map to existing schema)
  console.log("Inserting Draft Products...");
  const products = [
    { sku: 'PAS-TRF-001', name: 'White Truffle Oil 250ml', why_buy: null, primary_image_url: null, srp: 1500, wholesale_price: 1200, stock_available: 0, status: 'Draft' },
    { sku: 'PAS-TRF-002', name: 'Black Truffle Slices 50g', why_buy: null, primary_image_url: null, srp: 2000, wholesale_price: 1600, stock_available: 0, status: 'Draft' },
    { sku: 'PAS-TRF-003', name: 'Truffle Salt 100g', why_buy: null, primary_image_url: null, srp: 800, wholesale_price: 650, stock_available: 0, status: 'Draft' },
    { sku: 'PAS-TRF-004', name: 'Truffle Honey 150g', why_buy: null, primary_image_url: null, srp: 1200, wholesale_price: 950, stock_available: 0, status: 'Draft' },
    { sku: 'PAS-TRF-005', name: 'Truffle Butter 200g', why_buy: null, primary_image_url: null, srp: 1400, wholesale_price: 1100, stock_available: 0, status: 'Draft' }
  ];
  await supabase.from('products').upsert(products, { onConflict: 'sku' });

  // 3. Conversation
  console.log("Inserting Conversation & Messages...");
  await supabase.from('conversations').upsert({
    id: '22222222-2222-2222-2222-222222222222',
    customer_name: 'Cafe Roma (Pasabuy)',
    platform: 'WhatsApp',
    status: 'Open'
  }, { onConflict: 'id' });

  const messages = [
    { conversation_id: '22222222-2222-2222-2222-222222222222', sender_type: 'Customer', content: 'Hi Jimzon, can you pasabuy 5 specific truffle products for our new menu? Oil, Slices, Salt, Honey, and Butter.' },
    { conversation_id: '22222222-2222-2222-2222-222222222222', sender_type: 'Admin', content: 'Sure! I will have the AI scan the catalog and draft them into the inventory for review.' },
    { conversation_id: '22222222-2222-2222-2222-222222222222', sender_type: 'AI', content: 'SYSTEM: 5 SKUs (PAS-TRF-001 to 005) have been parsed and added as Draft. Awaiting description & photo review before ordering.' }
  ];
  await supabase.from('messages').insert(messages);

  // 4. Purchase Order
  console.log("Inserting Purchase Order...");
  await supabase.from('purchase_orders').upsert({
    id: '33333333-3333-3333-3333-333333333333',
    supplier_id: '11111111-1111-1111-1111-111111111111',
    po_number: 'PO-TRUFFLE-001',
    status: 'Sent',
    total_amount: 5500
  }, { onConflict: 'id' });

  const poLines = [
    { po_id: '33333333-3333-3333-3333-333333333333', sku: 'PAS-TRF-001', quantity: 5, unit_cost: 1000 },
    { po_id: '33333333-3333-3333-3333-333333333333', sku: 'PAS-TRF-002', quantity: 5, unit_cost: 1200 },
    { po_id: '33333333-3333-3333-3333-333333333333', sku: 'PAS-TRF-003', quantity: 5, unit_cost: 500 },
    { po_id: '33333333-3333-3333-3333-333333333333', sku: 'PAS-TRF-004', quantity: 5, unit_cost: 700 },
    { po_id: '33333333-3333-3333-3333-333333333333', sku: 'PAS-TRF-005', quantity: 5, unit_cost: 900 }
  ];
  await supabase.from('po_lines').insert(poLines);

  // 5. Orders
  console.log("Inserting Customer Orders...");
  const customerOrders = [
    { sku: 'PAS-TRF-001', quantity: 2, channel_source: 'direct_b2b', order_status: 'Pending', payment_status: 'Paid' },
    { sku: 'PAS-TRF-002', quantity: 2, channel_source: 'direct_b2b', order_status: 'Pending', payment_status: 'Paid' },
    { sku: 'PAS-TRF-003', quantity: 2, channel_source: 'direct_b2b', order_status: 'Pending', payment_status: 'Paid' },
    { sku: 'PAS-TRF-004', quantity: 2, channel_source: 'direct_b2b', order_status: 'Pending', payment_status: 'Paid' },
    { sku: 'PAS-TRF-005', quantity: 2, channel_source: 'direct_b2b', order_status: 'Pending', payment_status: 'Paid' }
  ];
  await supabase.from('orders').insert(customerOrders);

  console.log("Simulation Data Injected Successfully!");
}

runSimulation().catch(console.error);
