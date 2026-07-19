-- 0011_fix_rls_for_prototype.sql
-- Run this in your Supabase SQL Editor

-- 1. Fix the Products Table RLS to allow anonymous inserts for the prototype
DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" 
ON public.products 
FOR ALL 
TO public -- Allows both anon and authenticated
USING (true) 
WITH CHECK (true);

-- 2. Fix Storage RLS to allow anonymous uploads for the prototype
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

CREATE POLICY "Anyone can upload" 
ON storage.objects FOR INSERT 
TO public
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anyone can update" 
ON storage.objects FOR UPDATE 
TO public
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anyone can delete" 
ON storage.objects FOR DELETE 
TO public
USING (bucket_id = 'product-images');
