const fs = require('fs');
const env = fs.readFileSync('c:/Users/jerze/K2 JImzon/.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  const isShopee = true;
  const shopeeCategory = 'Food';
  
  const rowToInsert = {
    sku: `TEST-CSV-1`,
    title: 'Test Shopee Product',
    description: 'A test product',
    usage_instructions: '',
    retail_price: 100,
    vip_price: 0,
    total_stock: 50,
    status: 'Active',
    origin: `Shopee|Food`
  };

  const { error } = await supabase.from('products').upsert([rowToInsert], { onConflict: 'sku' });
  console.log("Upsert Error:", error);
}
check();
