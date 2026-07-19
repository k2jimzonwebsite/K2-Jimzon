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
    { sku: 'TRF-OIL-500', title: 'Truffle Oil 500ml', retail_price: 1200, vip_price: 900, total_stock: 45, status: 'Live' },
    { sku: 'PST-GEN-190', title: 'Barilla Pesto Genovese 190g', retail_price: 329, vip_price: 256, total_stock: 12, status: 'Live' },
    { sku: 'NUT-BIS-304', title: 'Nutella Biscuits 304g', retail_price: 499, vip_price: 396, total_stock: 3, status: 'Live' }, // Low stock
    { sku: 'LAV-ORO-1KG', title: 'Lavazza Oro Whole Beans 1kg', retail_price: 1299, vip_price: 1020, total_stock: 26, status: 'Live' },
    { sku: 'MUT-PAS-400', title: 'Mutti Passata 400g', retail_price: 179, vip_price: 138, total_stock: 0, status: 'Live' }, // Out of stock
    { sku: 'PAR-REG-200', title: 'Parmigiano Reggiano 200g', retail_price: 650, vip_price: 520, total_stock: 0, status: 'Draft' }, // Draft status
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
    { sku: 'TRF-OIL-500', quantity: 2, channel_source: 'shopee_account_1', fulfillment_method: 'J&T Express', order_status: 'Pending', payment_status: 'Paid' },
    { sku: 'PST-GEN-190', quantity: 5, channel_source: 'shopee_account_2', fulfillment_method: 'SPX', order_status: 'Packed', payment_status: 'Paid' },
    { sku: 'LAV-ORO-1KG', quantity: 1, channel_source: 'website_retail', fulfillment_method: 'GoGo Xpress', order_status: 'Pending', payment_status: 'Unpaid' },
    { sku: 'NUT-BIS-304', quantity: 24, channel_source: 'website_vip', fulfillment_method: 'Lalamove', order_status: 'Shipped', payment_status: 'Paid' },
    { sku: 'TRF-OIL-500', quantity: 1, channel_source: 'shopee_account_1', fulfillment_method: 'J&T Express', order_status: 'Pending', payment_status: 'Paid' },
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
