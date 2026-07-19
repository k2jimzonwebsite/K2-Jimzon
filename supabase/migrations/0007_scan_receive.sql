-- 0007_scan_receive.sql
-- Adds an RPC to process barcode-scanned quantities for Purchase Orders

CREATE OR REPLACE FUNCTION receive_po_scanned(p_po_id uuid, p_scanned jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_status po_status;
    v_item jsonb;
    v_sku text;
    v_qty integer;
BEGIN
    -- Check current status
    SELECT status INTO v_status FROM public.purchase_orders WHERE id = p_po_id FOR UPDATE;
    
    IF v_status = 'Received' THEN
        RAISE EXCEPTION 'PO is already received.';
    END IF;

    -- p_scanned should be an array of objects: [{"sku": "SKU-1", "scanned_qty": 5}, ...]
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_scanned)
    LOOP
        v_sku := (v_item->>'sku')::text;
        v_qty := (v_item->>'scanned_qty')::integer;

        IF v_qty > 0 THEN
            UPDATE public.products
            SET total_stock = total_stock + v_qty,
                updated_at = now()
            WHERE sku = v_sku;
        END IF;
    END LOOP;

    -- Mark PO as received
    UPDATE public.purchase_orders
    SET status = 'Received'
    WHERE id = p_po_id;

    RETURN true;
END;
$$;
