-- 0009_mock_pasabuy.sql
-- Run this in your Supabase SQL Editor to simulate the 5-product pasabuy

-- 1. Create a Supplier for the Pasabuy
INSERT INTO public.suppliers (id, name, contact_email, lead_time_days)
VALUES ('11111111-1111-1111-1111-111111111111', 'Truffle & Co. Italy', 'sales@truffleco.it', 7)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the 5 Draft Products (Mocked from AI Parsing)
INSERT INTO public.products (sku, title, description, image_url, retail_price, vip_price, total_stock, status)
VALUES 
  ('PAS-TRF-001', 'White Truffle Oil 250ml', NULL, NULL, 1500, 1200, 0, 'Draft'),
  ('PAS-TRF-002', 'Black Truffle Slices 50g', NULL, NULL, 2000, 1600, 0, 'Draft'),
  ('PAS-TRF-003', 'Truffle Salt 100g', NULL, NULL, 800, 650, 0, 'Draft'),
  ('PAS-TRF-004', 'Truffle Honey 150g', NULL, NULL, 1200, 950, 0, 'Draft'),
  ('PAS-TRF-005', 'Truffle Butter 200g', NULL, NULL, 1400, 1100, 0, 'Draft')
ON CONFLICT (sku) DO UPDATE SET status = 'Draft', total_stock = 0;

-- 3. Create the Customer Conversation (Inbox)
INSERT INTO public.conversations (id, customer_name, platform, status)
VALUES ('22222222-2222-2222-2222-222222222222', 'Cafe Roma (Pasabuy)', 'WhatsApp', 'Open')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (conversation_id, sender_type, content)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Customer', 'Hi Jimzon, can you pasabuy 5 specific truffle products for our new menu? Oil, Slices, Salt, Honey, and Butter.'),
  ('22222222-2222-2222-2222-222222222222', 'Admin', 'Sure! I will have the AI scan the catalog and draft them into the inventory for review.'),
  ('22222222-2222-2222-2222-222222222222', 'AI', 'SYSTEM: 5 SKUs (PAS-TRF-001 to 005) have been parsed and added as Draft. Awaiting description & photo review before ordering.');

-- 4. Create the Purchase Order
INSERT INTO public.purchase_orders (id, supplier_id, po_number, status, total_amount)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'PO-TRUFFLE-001', 'Sent', 5500)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.po_lines (po_id, sku, quantity, unit_cost)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'PAS-TRF-001', 5, 1000),
  ('33333333-3333-3333-3333-333333333333', 'PAS-TRF-002', 5, 1200),
  ('33333333-3333-3333-3333-333333333333', 'PAS-TRF-003', 5, 500),
  ('33333333-3333-3333-3333-333333333333', 'PAS-TRF-004', 5, 700),
  ('33333333-3333-3333-3333-333333333333', 'PAS-TRF-005', 5, 900);

-- 5. Create the Customer Order (Pending Fulfillment)
-- We map these to 5 pending rows in the orders table
INSERT INTO public.orders (sku, quantity, channel_source, order_status, payment_status)
VALUES 
  ('PAS-TRF-001', 2, 'direct_b2b', 'Pending', 'Paid'),
  ('PAS-TRF-002', 2, 'direct_b2b', 'Pending', 'Paid'),
  ('PAS-TRF-003', 2, 'direct_b2b', 'Pending', 'Paid'),
  ('PAS-TRF-004', 2, 'direct_b2b', 'Pending', 'Paid'),
  ('PAS-TRF-005', 2, 'direct_b2b', 'Pending', 'Paid');
