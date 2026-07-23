-- 0016_fefo_batch_tracking.sql
-- FEFO (First-Expired, First-Out) Batch & Best-Before Date Tracking

CREATE TABLE IF NOT EXISTS public.product_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku text NOT NULL REFERENCES public.products(sku) ON DELETE CASCADE,
    batch_code text NOT NULL,
    best_before_date date NOT NULL,
    quantity_available integer NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    arrival_flight text DEFAULT 'FLIGHT-MILAN-AUG2026',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on product_batches
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product_batches" ON public.product_batches FOR SELECT USING (true);
CREATE POLICY "Admins manage product_batches" ON public.product_batches FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_batches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
