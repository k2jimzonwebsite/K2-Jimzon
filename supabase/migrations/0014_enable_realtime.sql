-- 0013_enable_realtime.sql
-- Enable real-time updates for the products table so the PC dashboard updates instantly when you scan from your phone

BEGIN;
  -- Remove the table from the publication if it's already there (to avoid errors)
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS products;
  
  -- Add the table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
COMMIT;
