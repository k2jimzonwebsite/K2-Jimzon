-- 0008_product_description.sql
-- Add description column for products

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS description text;
