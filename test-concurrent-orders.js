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

async function testConcurrency() {
  console.log('--- Testing Omnichannel Inventory Concurrency ---');

  // 1. Seed a test product
  const testSku = 'TEST-PESTO-' + Date.now();
  console.log(`Creating test product: ${testSku} with 50 units in stock...`);
  
  const { error: insertError } = await supabase
    .from('products')
    .insert([{ 
      sku: testSku, 
      title: 'Test Barilla Pesto', 
      retail_price: 329, 
      vip_price: 256, 
      total_stock: 50, 
      status: 'Live' 
    }]);

  if (insertError) {
    console.error('❌ Failed to insert test product:', insertError.message);
    console.log('Did you run the 0002_omnichannel_schema.sql migration in the SQL Editor?');
    return;
  }

  console.log('✅ Test product created.');

  // 2. Simulate 3 simultaneous webhook calls trying to buy
  console.log('Simulating 3 simultaneous webhook orders for 20 units each (total requested: 60)...');
  
  const promises = [
    supabase.rpc('decrement_stock', { p_sku: testSku, p_quantity: 20 }), // Shopee
    supabase.rpc('decrement_stock', { p_sku: testSku, p_quantity: 20 }), // VIP Portal
    supabase.rpc('decrement_stock', { p_sku: testSku, p_quantity: 20 })  // Retail Site
  ];

  const results = await Promise.allSettled(promises);
  
  let successes = 0;
  let failures = 0;

  results.forEach((res, i) => {
    if (res.status === 'fulfilled' && !res.value.error) {
      successes++;
      console.log(`[Order ${i+1}] ✅ Success! Reserved 20 units.`);
    } else {
      failures++;
      const msg = res.value?.error?.message || res.reason?.message;
      console.log(`[Order ${i+1}] ❌ Failed: ${msg}`);
    }
  });

  // 3. Verify final stock
  const { data: finalProduct } = await supabase
    .from('products')
    .select('total_stock')
    .eq('sku', testSku)
    .single();

  console.log('\n--- Test Results ---');
  console.log(`Final Stock for ${testSku}: ${finalProduct.total_stock}`);
  console.log('Expected: 10 (since 2 orders of 20 succeeded, and 1 order failed due to insufficient stock).');
  
  if (finalProduct.total_stock === 10) {
    console.log('🎉 ROW-LEVEL LOCKING WORKED PERFECTLY! No overselling occurred.');
  } else {
    console.error('⚠️ Warning: The stock calculation was incorrect.');
  }

  // Cleanup
  console.log('Cleaning up test data...');
  await supabase.from('products').delete().eq('sku', testSku);
}

testConcurrency();
