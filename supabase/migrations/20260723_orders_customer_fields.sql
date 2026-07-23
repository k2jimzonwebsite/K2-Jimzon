-- Order attribution: let website orders carry the buyer and the line total.
-- Additive and idempotent — safe to run on the live database as-is.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name  text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS total_amount   numeric;

-- Optional: backfill existing rows so the admin board isn't blank for old orders.
UPDATE public.orders
SET customer_name = COALESCE(customer_name, 'Website Guest')
WHERE customer_name IS NULL;
