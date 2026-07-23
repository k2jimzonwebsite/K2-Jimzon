-- 0012_usage_instructions.sql
-- Add usage_instructions column to products

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS usage_instructions text;
