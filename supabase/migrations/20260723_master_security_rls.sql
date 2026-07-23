-- ====================================================================
-- K2 JIMZON MASTER SECURITY & ROW-LEVEL SECURITY (RLS) MIGRATION
-- Author: Antigravity AI Security Suite
-- Version: 2026.7 Production Hardened
-- Purpose: Enforces PostgreSQL Row-Level Security across all tables
-- ====================================================================

-- 0. Safely add 'Staff' and 'Admin' values to existing user_role ENUM type if present
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Staff';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Admin';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Customer';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'VIP';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 1. Create User Profiles Table linked to Supabase Auth Users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'Customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Marketplace Channel Credentials Table (AES-256 Vault Backend)
CREATE TABLE IF NOT EXISTS public.channel_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_code TEXT UNIQUE NOT NULL,
  encrypted_payload TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row-Level Security (RLS) on public tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_credentials ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    EXECUTE 'ALTER TABLE public.products ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pasabuy_requests') THEN
    EXECUTE 'ALTER TABLE public.pasabuy_requests ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cargo_boxes') THEN
    EXECUTE 'ALTER TABLE public.cargo_boxes ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_allocations') THEN
    EXECUTE 'ALTER TABLE public.staff_allocations ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers') THEN
    EXECUTE 'ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- --------------------------------------------------------------------
-- 4. RLS POLICIES FOR USER PROFILES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin full access to user profiles" ON public.user_profiles;
CREATE POLICY "Admin full access to user profiles" ON public.user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (role::text ILIKE 'Admin' OR role::text ILIKE 'Staff')
    )
  );

-- --------------------------------------------------------------------
-- 5. RLS POLICIES FOR PRODUCTS (Public Read, Admin Write)
-- --------------------------------------------------------------------
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    DROP POLICY IF EXISTS "Public products read access" ON public.products;
    CREATE POLICY "Public products read access" ON public.products FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admin write access for products" ON public.products;
    CREATE POLICY "Admin write access for products" ON public.products FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND (role::text ILIKE 'Admin' OR role::text ILIKE 'Staff')
      )
    );
  END IF;
END $$;

-- --------------------------------------------------------------------
-- 6. RLS POLICIES FOR ORDERS (Public Insert Checkout, Admin Full Access)
-- --------------------------------------------------------------------
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    DROP POLICY IF EXISTS "Public customer order placement" ON public.orders;
    CREATE POLICY "Public customer order placement" ON public.orders FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Admin full access to orders" ON public.orders;
    CREATE POLICY "Admin full access to orders" ON public.orders FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND (role::text ILIKE 'Admin' OR role::text ILIKE 'Staff')
      )
    );
  END IF;
END $$;

-- --------------------------------------------------------------------
-- 7. RLS POLICIES FOR CHANNEL CREDENTIALS (STRICT ADMIN EXCLUSIVE)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin exclusive access for channel credentials" ON public.channel_credentials;
CREATE POLICY "Admin exclusive access for channel credentials" ON public.channel_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role::text ILIKE 'Admin'
    )
  );

-- --------------------------------------------------------------------
-- 8. AUTOMATIC AUTH SIGN-UP TRIGGER FUNCTION
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'Customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- MASTER RLS MIGRATION COMPLETE (ENUM HARDENED)
-- ====================================================================
