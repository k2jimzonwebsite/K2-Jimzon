const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function simulateWebhook() {
  console.log('Simulating incoming Shopee Webhook...');
  
  // Use identical created_at to group these order items as a single shipment
  const orderGroupCreatedAt = new Date().toISOString();
  
  const mockOrder = [
    { sku: 'IT-MUTT-PASS400', quantity: 2, channel_source: 'shopee_account_1', fulfillment_method: 'J&T Express', order_status: 'Pending', payment_status: 'Paid', created_at: orderGroupCreatedAt },
    { sku: 'IT-MUTT-POLP400', quantity: 1, channel_source: 'shopee_account_1', fulfillment_method: 'J&T Express', order_status: 'Pending', payment_status: 'Paid', created_at: orderGroupCreatedAt },
    { sku: 'IT-PIST-CREM200', quantity: 1, channel_source: 'shopee_account_1', fulfillment_method: 'J&T Express', order_status: 'Pending', payment_status: 'Paid', created_at: orderGroupCreatedAt }
  ];
  
  const { error } = await supabase.from('orders').insert(mockOrder);
  
  if (error) {
    console.error(error);
  } else {
    console.log('Successfully received webhook and inserted multi-item order into Global Logistics!');
  }
}
simulateWebhook();
