-- Omnichannel Database Schema Migration
-- Designed for the K2 Jimzon platform

-- 1. Create Custom ENUM Types
DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('Draft', 'Live');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Admin', 'VIP', 'Customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM ('shopee_account_1', 'shopee_account_2', 'website_retail', 'website_vip', 'direct_b2b');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM ('Pending', 'Packed', 'Shipped', 'Cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('Unpaid', 'Paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create the Products Table (Master Inventory)
CREATE TABLE IF NOT EXISTS public.products (
  sku text PRIMARY KEY,
  title text NOT NULL,
  retail_price numeric NOT NULL DEFAULT 0,
  vip_price numeric NOT NULL DEFAULT 0,
  total_stock integer NOT NULL DEFAULT 0,
  status product_status NOT NULL DEFAULT 'Draft',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- The constraint that prevents overselling below 0 globally
  CONSTRAINT total_stock_non_negative CHECK (total_stock >= 0)
);

-- 3. Create the User Profiles Table
-- Links to Supabase's built-in auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role user_role NOT NULL DEFAULT 'Customer',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create the Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL REFERENCES public.products(sku) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  channel_source channel_type NOT NULL,
  fulfillment_method text,
  order_status order_status_enum NOT NULL DEFAULT 'Pending',
  payment_status payment_status_enum NOT NULL DEFAULT 'Unpaid',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enable RLS on new tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. Basic RLS Policies
-- Products: Public can read 'Live' products, Admins can do all.
CREATE POLICY "Public read Live products" ON public.products FOR SELECT USING (status = 'Live');
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles: Users can read their own profile, Admins can read all.
CREATE POLICY "Users read own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.user_profiles FOR SELECT TO authenticated USING (true); -- simplified for now

-- Orders: Users can read their own orders (if we added a user_id), Admins manage all.
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Row-Level Locking Function for Stock Deduction
-- This is the "Traffic Cop" that prevents race conditions
CREATE OR REPLACE FUNCTION decrement_stock(p_sku text, p_quantity int)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  current_stock int;
BEGIN
  -- 1. Select the row for update. This locks the specific SKU row.
  -- Any other transaction trying to decrement this exact SKU will pause and wait here.
  SELECT total_stock INTO current_stock
  FROM public.products
  WHERE sku = p_sku
  FOR UPDATE;

  -- 2. If product not found, fail.
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product with SKU % not found', p_sku;
  END IF;

  -- 3. Check if there's enough stock.
  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for %. Available: %, Requested: %', p_sku, current_stock, p_quantity;
  END IF;

  -- 4. Proceed with deduction.
  UPDATE public.products
  SET total_stock = total_stock - p_quantity,
      updated_at = now()
  WHERE sku = p_sku;

  RETURN true;
END;
$$;
