-- 0015_channel_listings_and_schema_sync.sql
-- Enables multi-channel listing map and standardizes product/channel schema

-- 1. Extend chat_platform enum with additional channels
ALTER TYPE chat_platform ADD VALUE IF NOT EXISTS 'Instagram';
ALTER TYPE chat_platform ADD VALUE IF NOT EXISTS 'TikTok';
ALTER TYPE chat_platform ADD VALUE IF NOT EXISTS 'Shopee';
ALTER TYPE chat_platform ADD VALUE IF NOT EXISTS 'Lazada';
ALTER TYPE chat_platform ADD VALUE IF NOT EXISTS 'Website';
ALTER TYPE chat_platform ADD VALUE IF NOT EXISTS 'Pasabuy';

-- 2. Extend channel_type enum
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'lazada';
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'tiktok_shop';

-- 3. Create channel_listings table
CREATE TABLE IF NOT EXISTS public.channel_listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku text NOT NULL REFERENCES public.products(sku) ON DELETE CASCADE,
    channel_source text NOT NULL, -- e.g. 'shopee_account_1', 'lazada', 'tiktok_shop', 'website_retail'
    external_item_id text,
    external_sku_id text,
    channel_price numeric,
    status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Unlinked')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_sku_channel UNIQUE (sku, channel_source)
);

-- 4. Enable RLS on channel_listings
ALTER TABLE public.channel_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read channel_listings" ON public.channel_listings FOR SELECT USING (true);
CREATE POLICY "Admins manage channel_listings" ON public.channel_listings FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Enable Realtime on conversations, messages, and channel_listings
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_listings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
