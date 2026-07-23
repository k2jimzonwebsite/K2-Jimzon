-- ==============================================================================
-- K2 JIMZON ENTERPRISE PRODUCTION DATABASE MIGRATION
-- Row-Level Security (RLS) & Role-Based Access Control (RBAC)
-- ==============================================================================

-- 1. Create User Profiles & Staff Roles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'Staff', -- 'SuperAdmin', 'Admin', 'Staff', 'VIP', 'Customer'
  station_pin_hash TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS Policies for user_profiles
CREATE POLICY "SuperAdmins can view and edit all user profiles" 
ON public.user_profiles 
FOR ALL 
USING (
  auth.jwt() ->> 'email' = 'k2jimzonwebsite@gmail.com' OR
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'SuperAdmin'
  )
);

CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 3. Row-Level Security Policies for Products & Inventory Table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public & Customers can read active products" 
ON public.products 
FOR SELECT 
USING (status IN ('Live', 'Active'));

CREATE POLICY "Only authorized Staff and Admins can insert/update products" 
ON public.products 
FOR ALL 
USING (
  auth.jwt() ->> 'email' = 'k2jimzonwebsite@gmail.com' OR
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND (role = 'Admin' OR role = 'SuperAdmin' OR (permissions->>'can_edit_inventory')::boolean = true)
  )
);

-- 4. Atomic Stock Decrement RPC Function with Mutex Locking
DROP FUNCTION IF EXISTS decrement_stock(text, integer);
DROP FUNCTION IF EXISTS decrement_stock(text, int);

CREATE OR REPLACE FUNCTION decrement_stock(p_sku TEXT, p_quantity INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products
  SET stock_available = stock_available - p_quantity,
      updated_at = NOW()
  WHERE sku = p_sku AND stock_available >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock available for SKU %', p_sku;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
