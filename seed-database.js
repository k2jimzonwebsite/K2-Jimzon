import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#\s]+?)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const url = env['VITE_SUPABASE_URL'];
const key = env['SUPABASE_SECRET_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.error("Missing URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function seedDatabase() {
  console.log('--- Seeding Supabase Omnichannel Database ---');

  const products = [
    { sku: 'TRF-OIL-500', name: 'Truffle Oil 500ml', srp: 1200, wholesale_price: 900, stock_available: 45, status: 'Live' },
    { sku: 'PST-GEN-190', name: 'Barilla Pesto Genovese 190g', srp: 329, wholesale_price: 256, stock_available: 12, status: 'Live' },
    { sku: 'NUT-BIS-304', name: 'Nutella Biscuits 304g', srp: 499, wholesale_price: 396, stock_available: 3, status: 'Live' }, // Low stock
    { sku: 'LAV-ORO-1KG', name: 'Lavazza Oro Whole Beans 1kg', srp: 1299, wholesale_price: 1020, stock_available: 26, status: 'Live' },
    { sku: 'MUT-PAS-400', name: 'Mutti Passata 400g', srp: 179, wholesale_price: 138, stock_available: 0, status: 'Live' }, // Out of stock
    { sku: 'PAR-REG-200', name: 'Parmigiano Reggiano 200g', srp: 650, wholesale_price: 520, stock_available: 0, status: 'Draft' }, // Draft status
  ];

  console.log('Inserting products...');
  for (const product of products) {
    await supabase.from('products').upsert(product);
  }

  // We need auth.users to create user_profiles, but we cannot insert directly to auth.users using simple API usually. 
  // For the sake of the dashboard UI testing which will fetch from user_profiles, we might just need to rely on what's there, 
  // or we can insert dummy UUIDs if RLS is bypassed. Let's try inserting dummy UUIDs to user_profiles.
  // Actually, we can just omit user_profiles for now since the Admin UI only needs to read from it, and if it's empty, it's empty.
  // Let's create some orders instead.
  
  const orders = [
    { sku: 'TRF-OIL-500', quantity: 2, channel_source: 'shopee_account_1', fulfillment_method: 'J&T Express', order_status: 'Pending', payment_status: 'Paid', customer_name: 'Maria Santos', total_amount: 2400 },
    { sku: 'PST-GEN-190', quantity: 5, channel_source: 'shopee_account_2', fulfillment_method: 'SPX', order_status: 'Packed', payment_status: 'Paid', customer_name: 'Cafe Roma', total_amount: 1645 },
    { sku: 'LAV-ORO-1KG', quantity: 1, channel_source: 'website_retail', fulfillment_method: 'GoGo Xpress', order_status: 'Pending', payment_status: 'Unpaid', customer_name: 'Website Guest', total_amount: 1299 },
    { sku: 'NUT-BIS-304', quantity: 24, channel_source: 'website_vip', fulfillment_method: 'Lalamove', order_status: 'Shipped', payment_status: 'Paid', customer_name: 'Juan Dela Cruz', total_amount: 9504 },
    { sku: 'TRF-OIL-500', quantity: 1, channel_source: 'shopee_account_1', fulfillment_method: 'J&T Express', order_status: 'Pending', payment_status: 'Paid', customer_name: 'Elena Guerrero', total_amount: 1200 },
  ];

  console.log('Inserting orders...');
  // Clear existing orders to prevent duplicate buildup on re-runs
  await supabase.from('orders').delete().neq('quantity', -1); // Deletes all

  const { error: orderError } = await supabase.from('orders').insert(orders);
  
  if (orderError) {
    console.error('Failed to insert orders:', orderError);
  } else {
    console.log('✅ Successfully seeded products and orders!');
  }
}

seedDatabase();
