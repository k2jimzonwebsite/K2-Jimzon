-- Prepared MAP-023 catalog spreadsheet identity/version support.
-- Additive only: this migration does not enable the inactive Admin BFF or
-- authorize spreadsheet commits.

create extension if not exists pgcrypto;

alter table public.products
  add column if not exists catalog_id uuid default gen_random_uuid(),
  add column if not exists catalog_record_version bigint not null default 1,
  add column if not exists country_of_origin text,
  add column if not exists net_weight numeric,
  add column if not exists product_video_url text;

update public.products
set country_of_origin=coalesce(country_of_origin,origin)
where country_of_origin is null and origin is not null;

update public.products set catalog_id=gen_random_uuid() where catalog_id is null;
alter table public.products alter column catalog_id set not null;

create unique index if not exists products_catalog_id_uidx
  on public.products(catalog_id);

create or replace function public.bump_product_catalog_record_version()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  new.catalog_id=old.catalog_id;
  new.catalog_record_version=old.catalog_record_version+1;
  new.updated_at=now();
  return new;
end;
$$;

revoke all on function public.bump_product_catalog_record_version() from public,anon,authenticated;

drop trigger if exists products_catalog_record_version_trigger on public.products;
create trigger products_catalog_record_version_trigger
before update on public.products
for each row execute function public.bump_product_catalog_record_version();

comment on column public.products.catalog_id is
  'Immutable internal catalog identity used by controlled spreadsheet round trips.';
comment on column public.products.catalog_record_version is
  'Monotonic optimistic-concurrency version; spreadsheet imports must match it.';
