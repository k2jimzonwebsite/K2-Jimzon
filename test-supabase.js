import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually for this quick test
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#\s]+?)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const url = env['VITE_SUPABASE_URL'];
const key = env['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.error("Missing URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
  console.log('Testing connection to Supabase...');
  console.log(`URL: ${url}`);
  
  // Try to fetch products (testing the migration ran)
  const { data, error } = await supabase.from('globe_products').select('*').limit(3);
  
  if (error) {
    console.error('❌ Error fetching from globe_products:', error.message);
    // Might mean migration wasn't run
  } else {
    console.log('✅ Successfully connected to Supabase and fetched from globe_products!');
    console.log(`Found ${data.length} products. (Preview: ${data.map(p => p.product_id).join(', ')})`);
  }
}

testConnection();
