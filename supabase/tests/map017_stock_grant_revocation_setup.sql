-- Fixture for the 20260925 stock PUBLIC-grant revocation rehearsal.
-- Mimics the live finding: PUBLIC plus both named roles can execute.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

create or replace function public.get_public_product_stock()
returns table (sku text, quantity integer)
language sql
security definer
set search_path = '' as
$$ select 'K2-REHEARSAL-SKU'::text, 1 $$;

revoke all on function public.get_public_product_stock() from public, anon, authenticated;
grant execute on function public.get_public_product_stock() to public, anon, authenticated;
