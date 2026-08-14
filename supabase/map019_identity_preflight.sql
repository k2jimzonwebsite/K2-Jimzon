-- Read-only live compatibility gate for MAP-019 hybrid identity migration.
do $$
begin
  if to_regclass('public.order_requests') is null
     or to_regclass('public.pasabuy_requests') is null
     or to_regclass('public.conversations') is null
     or to_regclass('public.messages') is null
     or to_regclass('public.user_profiles') is null then
    raise exception 'MAP-019 required live tables are missing';
  end if;
  if to_regprocedure('public.is_staff()') is null then
    raise exception 'MAP-019 requires public.is_staff()';
  end if;
  if exists (select 1 from public.conversations where customer_id is not null) then
    raise exception 'MAP-019 requires an explicit migration for existing conversation customer IDs';
  end if;
  if to_regclass('public.customers') is not null and exists (
    select 1 from (values ('id'),('display_name'),('status'),('created_source')) expected(column_name)
    where not exists (
      select 1 from information_schema.columns actual
      where actual.table_schema='public' and actual.table_name='customers'
        and actual.column_name=expected.column_name
    )
  ) then raise exception 'Existing customers table is incompatible'; end if;
  raise notice 'MAP-019 identity preflight passed';
end $$;
