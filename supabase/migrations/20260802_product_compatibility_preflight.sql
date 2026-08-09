-- K2 launch preflight: make both historical product schemas available before
-- the launch-core migration reads either set of column names.
-- Safe to rerun. This does not create inventory, orders, or payment records.

begin;

alter table public.products add column if not exists name text;
alter table public.products add column if not exists srp numeric;
alter table public.products add column if not exists wholesale_price numeric;
alter table public.products add column if not exists stock_available integer;
alter table public.products add column if not exists primary_image_url text;
alter table public.products add column if not exists title text;
alter table public.products add column if not exists retail_price numeric;
alter table public.products add column if not exists vip_price numeric;
alter table public.products add column if not exists total_stock integer;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists updated_at timestamptz default now();

-- If the launch trigger already exists from a partial run, permit this one
-- compatibility-only stock alias synchronization inside the transaction.
select set_config('k2.allow_stock_write', 'on', true);

update public.products
set name = coalesce(nullif(name, ''), nullif(title, ''), sku),
    title = coalesce(nullif(title, ''), nullif(name, ''), sku),
    srp = coalesce(srp, retail_price, 0),
    retail_price = coalesce(retail_price, srp, 0),
    wholesale_price = coalesce(wholesale_price, vip_price, retail_price, srp, 0),
    vip_price = coalesce(vip_price, wholesale_price, srp, retail_price, 0),
    stock_available = greatest(coalesce(stock_available, total_stock, 0), 0),
    total_stock = greatest(coalesce(total_stock, stock_available, 0), 0),
    primary_image_url = coalesce(primary_image_url, image_url),
    image_url = coalesce(image_url, primary_image_url),
    updated_at = coalesce(updated_at, now());

commit;
