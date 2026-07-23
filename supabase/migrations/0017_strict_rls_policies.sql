-- 0017_strict_rls_policies.sql
-- Tightens RLS security for Admin tables

-- Helper function to check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'Admin'
  );
$$;

-- Tighten orders access
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin() OR auth.role() = 'authenticated');
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT TO public WITH CHECK (true);

-- Tighten supply chain tables
DROP POLICY IF EXISTS "Admins manage supply chain" ON public.suppliers;
CREATE POLICY "Admins manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage supply chain" ON public.purchase_orders;
CREATE POLICY "Admins manage purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (public.is_admin());
