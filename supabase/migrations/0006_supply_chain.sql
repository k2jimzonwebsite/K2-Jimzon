-- 0006_supply_chain.sql
-- Run this in your Supabase SQL Editor to enable the Supply Chain Expansion

-- 1. Create Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    contact_email text,
    lead_time_days integer DEFAULT 14,
    performance_score integer DEFAULT 100 CHECK (performance_score BETWEEN 0 AND 100),
    outstanding_balance numeric DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create Purchase Orders Table
CREATE TYPE po_status AS ENUM ('Draft', 'Sent', 'Received', 'Cancelled');

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE,
    po_number text UNIQUE NOT NULL,
    status po_status NOT NULL DEFAULT 'Draft',
    total_amount numeric DEFAULT 0,
    expected_delivery date,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create PO Lines Table
CREATE TABLE IF NOT EXISTS public.po_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    sku text REFERENCES public.products(sku) ON DELETE RESTRICT,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_cost numeric NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage supply chain" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage supply chain" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage supply chain" ON public.po_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. RPC to auto-receive goods and increment stock
CREATE OR REPLACE FUNCTION receive_po(p_po_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_status po_status;
    v_line record;
BEGIN
    -- Check current status
    SELECT status INTO v_status FROM public.purchase_orders WHERE id = p_po_id FOR UPDATE;
    
    IF v_status = 'Received' THEN
        RAISE EXCEPTION 'PO is already received.';
    END IF;

    -- Loop through PO lines and increment stock
    FOR v_line IN SELECT sku, quantity FROM public.po_lines WHERE po_id = p_po_id
    LOOP
        UPDATE public.products
        SET total_stock = total_stock + v_line.quantity,
            updated_at = now()
        WHERE sku = v_line.sku;
    END LOOP;

    -- Mark PO as received
    UPDATE public.purchase_orders
    SET status = 'Received'
    WHERE id = p_po_id;

    RETURN true;
END;
$$;
