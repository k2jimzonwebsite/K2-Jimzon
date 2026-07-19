-- 0004_audit_logs.sql
-- Run this in your Supabase SQL Editor to enable the Business Audit Log

-- 1. Create the Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id text NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create the Generic Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, user_id)
        VALUES (TG_TABLE_NAME::text, OLD.sku::text, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME::text, NEW.sku::text, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, user_id)
        VALUES (TG_TABLE_NAME::text, NEW.sku::text, 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger to Products Table
DROP TRIGGER IF EXISTS products_audit_trigger ON public.products;
CREATE TRIGGER products_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Enable RLS for Audit Logs (Admins only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'Admin'
  )
);
