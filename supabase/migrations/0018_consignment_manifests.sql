-- 0018_consignment_manifests.sql
-- Flight Consignments (Milan to Manila) & Box Receiving Reconciliation

CREATE TABLE IF NOT EXISTS public.consignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_code text UNIQUE NOT NULL,
    flight_number text DEFAULT 'PR 721 (Milan - Manila)',
    departure_city text DEFAULT 'Milan, Italy',
    destination_city text DEFAULT 'Manila, Philippines',
    status text NOT NULL DEFAULT 'Packing_Italy' CHECK (status IN ('Packing_Italy', 'In_Transit', 'Arrived_Manila', 'Completed')),
    packed_at timestamptz DEFAULT now(),
    arrived_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consignment_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_id uuid REFERENCES public.consignments(id) ON DELETE CASCADE,
    sku text NOT NULL REFERENCES public.products(sku) ON DELETE RESTRICT,
    batch_code text NOT NULL,
    best_before_date date NOT NULL,
    italy_packed_qty integer NOT NULL DEFAULT 0 CHECK (italy_packed_qty >= 0),
    manila_scanned_qty integer NOT NULL DEFAULT 0 CHECK (manila_scanned_qty >= 0),
    status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Matched', 'Discrepancy')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_consignment_sku UNIQUE (consignment_id, sku)
);

-- Enable RLS
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read consignments" ON public.consignments FOR SELECT USING (true);
CREATE POLICY "Admins manage consignments" ON public.consignments FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public read consignment_items" ON public.consignment_items FOR SELECT USING (true);
CREATE POLICY "Admins manage consignment_items" ON public.consignment_items FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consignments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consignment_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
