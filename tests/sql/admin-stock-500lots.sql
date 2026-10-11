-- Appended to guarded rollback-only boundary setup. Exact global admitted set.
reset role;set local session_replication_role=replica;
delete from public.inventory_reservations where sku is distinct from 'SYN-STOCK-BOUNDARY';
delete from public.product_batches where sku is distinct from 'SYN-STOCK-BOUNDARY';
create temporary table stock_cap_lots as select gen_random_uuid() id from generate_series(1,499);
insert into public.product_batches(id,sku,quantity,reserved_quantity,quantity_available) select id,'SYN-STOCK-BOUNDARY',0,0,0 from pg_temp.stock_cap_lots;
insert into pg_temp.stock_cap_lots values('89500000-0000-4000-8000-000000000003');
grant select on pg_temp.stock_cap_lots to authenticated;
set local session_replication_role=origin;set local role authenticated;
do $admitted$ declare j jsonb;begin
 j:=public.read_admin_lot_snapshot_v1('');
 if j->>'complete' is distinct from 'true' or jsonb_array_length(j->'lots') is distinct from 500
  or jsonb_array_length(j->'products') is distinct from 1 or jsonb_array_length(j->'reservations') is distinct from 0 or jsonb_array_length(j->'orders') is distinct from 0 then raise exception 'GLOBAL500_CARDINALITIES_INVALID';end if;
 if (select jsonb_agg(l->>'id' order by l->>'id') from jsonb_array_elements(j->'lots') l)
  is distinct from (select jsonb_agg(id::text order by id::text) from pg_temp.stock_cap_lots)
  or j->'products'->0->>'sku' is distinct from 'SYN-STOCK-BOUNDARY' then raise exception 'GLOBAL500_IDENTITIES_INVALID';end if;
end $admitted$;
rollback;
select 'K2_ADMIN_STOCK_BOUNDARY_CHECKS_OK';
select 'K2_ADMIN_STOCK_GLOBAL500_ADMITTED_OK';
