-- IDEA-20261002-05 / MAP-018/023/026. PREPARED ONLY, outside activation migrations.
-- Caller must supply its one server-owned post-lock instant and reviewed hierarchy bound.
-- This predicate acquires no locks and changes no stock, policy, receipt or listing.
do $preflight$
begin
 if current_user <> 'postgres'
    or to_regprocedure('k2_private.effective_category_minimum_v1(uuid,integer)') is null
    or to_regclass('public.hubs') is null or to_regclass('public.custodians') is null then
  raise exception 'K2_CATEGORY_LOT_TARGET_INVALID';
 end if;
 if to_regprocedure('k2_private.lot_is_eligible_for_category_v1(public.product_batches,integer,timestamp with time zone)') is not null then
  raise exception 'K2_CATEGORY_LOT_ALREADY_PRESENT';
 end if;
end $preflight$;

create function k2_private.lot_is_eligible_for_category_v1(
 p_lot public.product_batches,p_max_depth integer,p_evaluation_instant timestamptz)
returns boolean language plpgsql stable security definer set search_path='' as $lot$
declare
 v_category uuid;
 v_minimum integer;
 v_expiry date:=coalesce(p_lot.expiry_date,p_lot.best_before_date);
 v_today date;
 v_days numeric;
begin
 if p_evaluation_instant is null or not pg_catalog.isfinite(p_evaluation_instant)
    or v_expiry is null or not pg_catalog.isfinite(v_expiry) then return false; end if;
 -- A finite timestamp near the type limit can still overflow during timezone conversion.
 begin
  v_today:=(p_evaluation_instant at time zone 'Asia/Manila')::date;
 exception when datetime_field_overflow then return false;
 end;
 select p.category_id into v_category from public.products p where p.sku=p_lot.sku;
 if not found or v_category is null then return false; end if;
 v_minimum:=k2_private.effective_category_minimum_v1(v_category,p_max_depth);
 if v_minimum is null then return false; end if;
 -- Each finite date's epoch offset fits int; widen BEFORE subtracting offsets.
 -- This avoids adding a potentially int-max policy minimum to a near-limit date.
 v_days:=(v_expiry-date '2000-01-01')::numeric-(v_today-date '2000-01-01')::numeric;
 return exists (
  select 1 from public.hubs h
  join public.custodians c on c.id=p_lot.custodian and c.hub_id=h.id
  where h.id=p_lot.hub and h.id='HUB-MNL-CENTRAL' and h.country='PH'
   and p_lot.inventory_status='available' and p_lot.quantity>0
   and p_lot.reserved_quantity>=0 and p_lot.reserved_quantity<=p_lot.quantity
   and (
    v_days>=v_minimum
    or (
     v_days between 31 and 89
     and p_lot.clearance_approved_at is not null and p_lot.clearance_approved_by is not null
     and p_lot.clearance_approved_at<=p_evaluation_instant
     and exists (
      select 1 from public.batch_change_events e
      where e.batch_id=p_lot.id and e.sku=p_lot.sku and e.actor_id=p_lot.clearance_approved_by
       and nullif(pg_catalog.btrim(e.reason),'') is not null
       -- Preserve both supported approval writers and same-instant marker/event evidence.
       and e.created_at=p_lot.clearance_approved_at and e.created_at<=p_evaluation_instant
       and coalesce(e.new_data->>'expiry_date',e.new_data->>'best_before_date')=v_expiry::text
       and (
        e.new_data->'clearance_approved'='true'::jsonb
        or (e.new_data->>'clearance_approved_by'=p_lot.clearance_approved_by::text
         and case when pg_catalog.pg_input_is_valid(
          e.new_data->>'clearance_approved_at','timestamp with time zone')
          then (e.new_data->>'clearance_approved_at')::timestamptz end=p_lot.clearance_approved_at
         and e.old_data->'clearance_approved_at' is distinct from e.new_data->'clearance_approved_at')
       )
       and not exists (
        select 1 from public.batch_change_events x
        where x.batch_id=p_lot.id and x.sku=p_lot.sku and x.id<>e.id
         and x.created_at>=p_lot.clearance_approved_at and x.created_at<=p_evaluation_instant
         and (
          x.new_data->'clearance_approved'='false'::jsonb
          or (x.new_data ? 'inventory_status' and (
           x.new_data->>'inventory_status' is distinct from 'available'
           or x.old_data->'expiry_date' is distinct from x.new_data->'expiry_date'
           or x.old_data->'best_before_date' is distinct from x.new_data->'best_before_date'
          ))
         )
       )
     )
    )
   )
 );
end $lot$;
revoke all on function k2_private.lot_is_eligible_for_category_v1(public.product_batches,integer,timestamptz)
 from public,anon,authenticated,service_role;
