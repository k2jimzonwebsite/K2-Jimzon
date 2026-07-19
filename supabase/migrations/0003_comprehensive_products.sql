-- 0003_comprehensive_products.sql
-- Run this in your Supabase SQL Editor

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS origin text DEFAULT 'Milan, IT',
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS hue integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS tag text,
  ADD COLUMN IF NOT EXISTS why_buy text,
  ADD COLUMN IF NOT EXISTS why_rare text,
  ADD COLUMN IF NOT EXISTS inside text,
  ADD COLUMN IF NOT EXISTS pairings text[] DEFAULT '{}';
