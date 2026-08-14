-- K2 Jimzon Admin BOS: signed lot, expiry, and clearance boundary.
-- Prepared only. Apply in the coordinated Admin BFF cutover after the shared
-- foundation and private request secret are installed.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'Admin BFF foundation must be applied first';
  end if;
  if to_regclass('public.product_batches') is null
     or to_regclass('public.batch_change_events') is null
     or to_regclass('public.inventory_balances') is null then
    raise exception 'Live lot and inventory tables are incomplete';
  end if;
end
$preflight$;

-- The live compatibility trigger previously forced quantity_available back to
-- physical quantity on every update, including reservation changes. Keep only
-- the name/date compatibility behavior and derive availability from physical
-- quantity, reservations, disposition, shelf life, and clearance evidence.
create or replace function public.sync_product_batch_compat_columns()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
declare v_expiry date;
begin
  new.box_code:=coalesce(nullif(new.box_code,''),nullif(new.batch_code,''));
  new.batch_code:=coalesce(nullif(new.batch_code,''),new.box_code);
  new.expiry_date:=coalesce(new.expiry_date,new.best_before_date);
  new.best_before_date:=coalesce(new.best_before_date,new.expiry_date);
  new.quantity:=greatest(coalesce(new.quantity,0),0);
  new.reserved_quantity:=greatest(coalesce(new.reserved_quantity,0),0);
  if new.reserved_quantity>new.quantity then
    raise exception using errcode='23514',message='K2_LOT_RESERVED_CONFLICT';
  end if;
  v_expiry:=coalesce(new.expiry_date,new.best_before_date);
  if new.quantity=0 then new.inventory_status:='depleted';
  elsif v_expiry<current_date then new.inventory_status:='expired';
  elsif coalesce(new.inventory_status,'quarantine')='available' and
        (v_expiry is null or v_expiry<=current_date+30) then
    new.inventory_status:='quarantine';
  end if;
  new.quantity_available:=case when new.inventory_status='available' and (
    v_expiry>=current_date+90 or
    (v_expiry between current_date+31 and current_date+89 and new.clearance_approved_at is not null)
  ) then greatest(new.quantity-new.reserved_quantity,0) else 0 end;
  return new;
end;
$$;

-- Normalize the current rows through the corrected trigger before adding the
-- invariant. This remains inside the migration transaction.
update public.product_batches set updated_at=updated_at;
do $constraint$
begin
  if not exists(
    select 1 from pg_constraint where conrelid='public.product_batches'::regclass
      and conname='product_batches_quantity_available_check'
  ) then
    alter table public.product_batches add constraint product_batches_quantity_available_check
      check(quantity_available>=0 and quantity_available<=greatest(quantity-reserved_quantity,0));
  end if;
end
$constraint$;

create or replace function public.execute_admin_lot_command_v1(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payload jsonb;
  v_payload_hash text;
  v_receipt k2_private.admin_command_receipts;
  v_lot jsonb;
  v_existing public.product_batches;
  v_saved public.product_batches;
  v_batch_id uuid;
  v_qty integer;
  v_reserved integer;
  v_available integer;
  v_status text;
  v_requested_status text;
  v_expiry date;
  v_clearance_at timestamptz;
  v_clearance_by uuid;
  v_result jsonb;
  v_count integer;
  v_inserted integer;
  v_total integer;
  v_sellable integer;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action not in ('lots_reconcile','lot_clearance') then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;

  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' then
    raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');

  select * into v_receipt from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_receipt.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_receipt.result;
  end if;

  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count>=30 then
    raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';
  end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_receipt from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_receipt.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_receipt.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_receipt.result;
  end if;

  if p_action='lots_reconcile' then
    if (v_payload-array['sku','reason','lots'])<>'{}'::jsonb
       or length(trim(coalesce(v_payload->>'sku',''))) not between 1 and 120
       or length(trim(coalesce(v_payload->>'reason',''))) not between 10 and 500
       or jsonb_typeof(v_payload->'lots')<>'array'
       or jsonb_array_length(v_payload->'lots')>50 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    perform 1 from public.products where sku=trim(v_payload->>'sku') for update;
    if not found then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;

    for v_lot in select * from jsonb_array_elements(v_payload->'lots') loop
      if jsonb_typeof(v_lot)<>'object'
         or (v_lot-array['id','boxCode','batchCode','quantity','expiryDate','landedDate','hub','custodian','channel','pinned','status'])<>'{}'::jsonb
         or (v_lot->'id' is not null and jsonb_typeof(v_lot->'id')<>'null'
             and coalesce(v_lot->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
         or jsonb_typeof(v_lot->'quantity')<>'number'
         or (v_lot->>'quantity')::numeric<>trunc((v_lot->>'quantity')::numeric)
         or (v_lot->>'quantity')::integer not between 0 and 1000000
         or jsonb_typeof(v_lot->'pinned')<>'boolean'
         or coalesce(v_lot->>'status','') not in ('available','quarantine','damaged','expired','unaccounted','depleted')
         or length(trim(coalesce(v_lot->>'boxCode',''))) > 120
         or length(trim(coalesce(v_lot->>'batchCode',''))) > 120
         or length(trim(coalesce(v_lot->>'hub',''))) > 120
         or length(trim(coalesce(v_lot->>'custodian',''))) > 120
         or length(trim(coalesce(v_lot->>'channel',''))) > 80
         or (nullif(v_lot->>'expiryDate','') is not null and coalesce(v_lot->>'expiryDate','') !~ '^\d{4}-\d{2}-\d{2}$')
         or (nullif(v_lot->>'landedDate','') is not null and coalesce(v_lot->>'landedDate','') !~ '^\d{4}-\d{2}-\d{2}$')
         or (v_lot->>'quantity')::integer>0 and (
           nullif(trim(coalesce(v_lot->>'boxCode','')),'') is null
           or nullif(trim(coalesce(v_lot->>'batchCode','')),'') is null
           or nullif(v_lot->>'expiryDate','') is null
           or nullif(trim(coalesce(v_lot->>'hub','')),'') is null
           or nullif(trim(coalesce(v_lot->>'custodian','')),'') is null
         ) then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      if nullif(v_lot->>'expiryDate','')::date<'2000-01-01'::date
         or nullif(v_lot->>'expiryDate','')::date>current_date+3653
         or nullif(v_lot->>'landedDate','')::date<'2000-01-01'::date
         or nullif(v_lot->>'landedDate','')::date>current_date then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
    end loop;

    if exists(
      select 1 from jsonb_array_elements(v_payload->'lots') x
      where nullif(x->>'id','') is not null
      group by x->>'id' having count(*)>1
    ) or exists(
      select 1 from public.product_batches b where b.sku=trim(v_payload->>'sku')
      and not exists(select 1 from jsonb_array_elements(v_payload->'lots') x where x->>'id'=b.id::text)
    ) then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;

    v_count:=0;
    for v_lot in select * from jsonb_array_elements(v_payload->'lots') loop
      v_batch_id:=nullif(v_lot->>'id','')::uuid;
      v_qty:=(v_lot->>'quantity')::integer;
      v_expiry:=nullif(v_lot->>'expiryDate','')::date;
      v_requested_status:=v_lot->>'status';
      v_reserved:=0;
      v_clearance_at:=null;
      v_clearance_by:=null;

      if v_batch_id is not null then
        select * into v_existing from public.product_batches
        where id=v_batch_id and sku=trim(v_payload->>'sku') for update;
        if not found then
          raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
        end if;
        v_reserved:=coalesce(v_existing.reserved_quantity,0);
        if v_qty<v_reserved then
          raise exception using errcode='23514',message='K2_LOT_RESERVED_CONFLICT';
        end if;
        v_clearance_at:=v_existing.clearance_approved_at;
        v_clearance_by:=v_existing.clearance_approved_by;
        if v_existing.expiry_date is distinct from v_expiry or v_requested_status<>'available' then
          v_clearance_at:=null;
          v_clearance_by:=null;
        end if;
      end if;

      v_status:=case
        when v_qty=0 then 'depleted'
        when v_expiry<current_date then 'expired'
        when v_expiry<=current_date+30 then 'quarantine'
        when v_requested_status='available' and v_expiry between current_date+31 and current_date+89
             and v_clearance_at is null then 'quarantine'
        else v_requested_status end;
      v_available:=case when v_status='available' and (
        v_expiry>=current_date+90 or
        (v_expiry between current_date+31 and current_date+89 and v_clearance_at is not null)
      ) then greatest(v_qty-v_reserved,0) else 0 end;

      if v_batch_id is null then
        insert into public.product_batches(
          sku,box_code,batch_code,quantity,quantity_available,reserved_quantity,
          expiry_date,best_before_date,landed_date,hub,custodian,channel,is_pinned,
          inventory_status,clearance_approved_at,clearance_approved_by,updated_at
        ) values(
          trim(v_payload->>'sku'),nullif(trim(v_lot->>'boxCode'),''),nullif(trim(v_lot->>'batchCode'),''),
          v_qty,v_available,0,v_expiry,v_expiry,coalesce(nullif(v_lot->>'landedDate','')::date,current_date),
          nullif(trim(v_lot->>'hub'),''),nullif(trim(v_lot->>'custodian'),''),nullif(trim(v_lot->>'channel'),''),
          (v_lot->>'pinned')::boolean,v_status,null,null,now()
        ) returning * into v_saved;
        insert into public.batch_change_events(batch_id,sku,reason,old_data,new_data,actor_id)
        values(v_saved.id,v_saved.sku,trim(v_payload->>'reason'),null,to_jsonb(v_saved),v_actor);
      else
        update public.product_batches set
          box_code=nullif(trim(v_lot->>'boxCode'),''),batch_code=nullif(trim(v_lot->>'batchCode'),''),
          quantity=v_qty,quantity_available=v_available,expiry_date=v_expiry,best_before_date=v_expiry,
          landed_date=coalesce(nullif(v_lot->>'landedDate','')::date,landed_date),
          hub=nullif(trim(v_lot->>'hub'),''),custodian=nullif(trim(v_lot->>'custodian'),''),
          channel=nullif(trim(v_lot->>'channel'),''),is_pinned=(v_lot->>'pinned')::boolean,
          inventory_status=v_status,clearance_approved_at=v_clearance_at,
          clearance_approved_by=v_clearance_by,updated_at=now()
        where id=v_batch_id returning * into v_saved;
        insert into public.batch_change_events(batch_id,sku,reason,old_data,new_data,actor_id)
        values(v_saved.id,v_saved.sku,trim(v_payload->>'reason'),to_jsonb(v_existing),to_jsonb(v_saved),v_actor);
      end if;
      v_count:=v_count+1;
    end loop;

    select coalesce(sum(quantity),0)::integer,coalesce(sum(quantity_available),0)::integer
    into v_total,v_sellable from public.product_batches where sku=trim(v_payload->>'sku');
    insert into public.inventory_balances(sku,location_code,on_hand)
    values(trim(v_payload->>'sku'),'MANILA_MAIN',v_total)
    on conflict(sku,location_code) do update set on_hand=excluded.on_hand,updated_at=now();
    perform set_config('k2.allow_stock_write','on',true);
    update public.products set stock_available=v_sellable,total_stock=v_sellable
    where sku=trim(v_payload->>'sku');
    v_result:=jsonb_build_object('sku',trim(v_payload->>'sku'),'updatedLots',v_count,
      'physicalQuantity',v_total,'sellableQuantity',v_sellable);

  else
    if (v_payload-array['batchId','approved','reason'])<>'{}'::jsonb
       or coalesce(v_payload->>'batchId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(v_payload->'approved')<>'boolean'
       or length(trim(coalesce(v_payload->>'reason',''))) not between 10 and 500 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_existing from public.product_batches
    where id=(v_payload->>'batchId')::uuid for update;
    if not found then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_expiry:=coalesce(v_existing.expiry_date,v_existing.best_before_date);
    if (v_payload->>'approved')::boolean and (
      v_expiry is null or v_expiry<current_date+31 or v_expiry>current_date+89
      or v_existing.quantity<=0 or v_existing.inventory_status not in ('available','quarantine')
    ) then
      raise exception using errcode='23514',message='K2_CLEARANCE_INELIGIBLE';
    end if;
    update public.product_batches set
      clearance_approved_at=case when (v_payload->>'approved')::boolean then now() else null end,
      clearance_approved_by=case when (v_payload->>'approved')::boolean then v_actor else null end,
      inventory_status=case when (v_payload->>'approved')::boolean then 'available' else 'quarantine' end,
      quantity_available=case when (v_payload->>'approved')::boolean
        then greatest(quantity-reserved_quantity,0) else 0 end,
      updated_at=now()
    where id=v_existing.id returning * into v_saved;
    insert into public.batch_change_events(batch_id,sku,reason,old_data,new_data,actor_id)
    values(v_saved.id,v_saved.sku,trim(v_payload->>'reason'),to_jsonb(v_existing),to_jsonb(v_saved),v_actor);
    select coalesce(sum(quantity_available),0)::integer into v_sellable
    from public.product_batches where sku=v_saved.sku;
    perform set_config('k2.allow_stock_write','on',true);
    update public.products set stock_available=v_sellable,total_stock=v_sellable where sku=v_saved.sku;
    v_result:=jsonb_build_object('batchId',v_saved.id,'sku',v_saved.sku,
      'approved',(v_payload->>'approved')::boolean,'inventoryStatus',v_saved.inventory_status,
      'quantityAvailable',v_saved.quantity_available,'sellableQuantity',v_sellable);
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_lot_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

create or replace view public.v_product_stock_from_batches as
select sku,coalesce(sum(quantity_available),0) as stock_from_batches
from public.product_batches group by sku;
alter view public.v_product_stock_from_batches set (security_invoker=true);

create or replace view public.v_expiring_batches as
select b.id,b.sku,coalesce(p.name,p.title::varchar,p.sku) as product_name,
  b.box_code,b.hub,b.custodian,b.channel,b.quantity,
  coalesce(b.expiry_date,b.best_before_date) as expiry_date,b.is_pinned,
  coalesce(b.expiry_date,b.best_before_date)-current_date as days_left,
  case when coalesce(b.expiry_date,b.best_before_date) is null then 'none'
       when coalesce(b.expiry_date,b.best_before_date)<current_date then 'expired'
       when coalesce(b.expiry_date,b.best_before_date)<=current_date+30 then 'critical'
       when coalesce(b.expiry_date,b.best_before_date)<=current_date+90 then 'warning'
       else 'fresh' end as status
from public.product_batches b join public.products p on p.sku=b.sku
where b.quantity>0;
alter view public.v_expiring_batches set (security_invoker=true);

select set_config('k2.allow_stock_write','on',true);
update public.products p set
  stock_available=coalesce((select v.stock_from_batches from public.v_product_stock_from_batches v where v.sku=p.sku),0),
  total_stock=coalesce((select v.stock_from_batches from public.v_product_stock_from_batches v where v.sku=p.sku),0);

revoke execute on function public.reconcile_product_batches(text,jsonb,text) from authenticated;
revoke execute on function public.set_batch_clearance_approval(uuid,boolean,text) from authenticated;

notify pgrst,'reload schema';
commit;
