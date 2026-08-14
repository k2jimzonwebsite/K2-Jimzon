-- K2 Jimzon Admin BOS: signed coupon administration boundary.
-- Prepared only. Apply with the shared Admin BFF foundation, private request
-- secret, server routes, UI flag, and deployed denial tests in one cutover.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'Admin BFF foundation must be applied first';
  end if;
  if to_regclass('public.coupons') is null or to_regclass('public.user_profiles') is null then
    raise exception 'Live coupon or staff tables are incomplete';
  end if;
end
$preflight$;

create table if not exists public.coupon_change_events (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check(event_type in ('created','activated','paused','archived')),
  reason text not null check(length(trim(reason)) between 10 and 500),
  old_data jsonb,
  new_data jsonb not null,
  operation_key uuid not null,
  created_at timestamptz not null default now(),
  unique(actor_id,operation_key)
);
alter table public.coupon_change_events enable row level security;
alter table public.coupon_change_events force row level security;
revoke all on table public.coupon_change_events from public,anon,authenticated;

create or replace function public.execute_admin_coupon_command_v1(
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
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_payload_hash text;
  v_receipt k2_private.admin_command_receipts;
  v_existing public.coupons;
  v_saved public.coupons;
  v_result jsonb;
  v_count integer;
  v_inserted integer;
  v_code text;
  v_description text;
  v_type text;
  v_value numeric;
  v_min numeric;
  v_max integer;
  v_start timestamptz;
  v_end timestamptz;
  v_active boolean;
  v_hunt boolean;
  v_clue text;
  v_reason text;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action not in ('coupon_create','coupon_state','coupon_archive') then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;
  if not exists(
    select 1 from public.user_profiles where id=v_actor and role::text='Admin'
  ) then
    raise exception using errcode='42501',message='K2_COUPON_ADMIN_REQUIRED';
  end if;

  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' then
    raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');

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
  if v_count>=20 then
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

  if p_action='coupon_create' then
    if not (v_payload ?& array['code','description','discountType','discountValue','minSpend',
       'maxRedemptions','startsAt','endsAt','isActive','isHunt','clue','reason'])
       or (v_payload-array['code','description','discountType','discountValue','minSpend',
       'maxRedemptions','startsAt','endsAt','isActive','isHunt','clue','reason'])<>'{}'::jsonb
       or jsonb_typeof(v_payload->'discountValue')<>'number'
       or jsonb_typeof(v_payload->'minSpend')<>'number'
       or jsonb_typeof(v_payload->'isActive')<>'boolean'
       or jsonb_typeof(v_payload->'isHunt')<>'boolean'
       or (v_payload->'maxRedemptions' is not null and jsonb_typeof(v_payload->'maxRedemptions') not in ('number','null'))
       or (v_payload->'endsAt' is not null and jsonb_typeof(v_payload->'endsAt') not in ('string','null')) then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_code:=upper(trim(coalesce(v_payload->>'code','')));
    v_description:=trim(coalesce(v_payload->>'description',''));
    v_type:=coalesce(v_payload->>'discountType','');
    v_value:=(v_payload->>'discountValue')::numeric;
    v_min:=(v_payload->>'minSpend')::numeric;
    v_max:=case when v_payload->'maxRedemptions'='null'::jsonb then null else (v_payload->>'maxRedemptions')::integer end;
    v_start:=(v_payload->>'startsAt')::timestamptz;
    v_end:=case when v_payload->'endsAt'='null'::jsonb then null else (v_payload->>'endsAt')::timestamptz end;
    v_active:=(v_payload->>'isActive')::boolean;
    v_hunt:=(v_payload->>'isHunt')::boolean;
    v_clue:=nullif(trim(coalesce(v_payload->>'clue','')),'');
    v_reason:=trim(coalesce(v_payload->>'reason',''));
    if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'
       or length(v_description) not between 3 and 300
       or v_type not in ('percentage','fixed')
       or v_value<=0 or v_value>(case when v_type='percentage' then 100 else 1000000 end)
       or v_min<0 or v_min>10000000
       or (v_max is not null and (v_max<1 or v_max>1000000))
       or v_start<now()-interval '7 days' or v_start>now()+interval '5 years'
       or (v_end is not null and (v_end<=v_start or v_end>now()+interval '5 years'))
       or (v_active and v_end is not null and v_end<=now())
       or (v_hunt and (v_clue is null or length(v_clue) not between 3 and 300))
       or length(v_reason) not between 10 and 500 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    insert into public.coupons(
      code,description,discount_type,discount_value,min_spend,max_redemptions,
      starts_at,ends_at,is_active,is_hunt,clue,created_by
    ) values(
      v_code,v_description,v_type,v_value,v_min,v_max,v_start,v_end,
      v_active,v_hunt,case when v_hunt then v_clue else null end,v_actor
    ) returning * into v_saved;
    insert into public.coupon_change_events(
      coupon_id,actor_id,event_type,reason,old_data,new_data,operation_key
    ) values(v_saved.id,v_actor,'created',v_reason,null,to_jsonb(v_saved),p_idempotency_key);
    v_result:=jsonb_build_object('couponId',v_saved.id,'code',v_saved.code,
      'active',v_saved.is_active,'archived',false);

  elsif p_action='coupon_state' then
    if not (v_payload ?& array['couponId','active','reason'])
       or (v_payload-array['couponId','active','reason'])<>'{}'::jsonb
       or coalesce(v_payload->>'couponId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(v_payload->'active')<>'boolean'
       or length(trim(coalesce(v_payload->>'reason',''))) not between 10 and 500 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_existing from public.coupons
    where id=(v_payload->>'couponId')::uuid for update;
    if not found or v_existing.archived_at is not null
       or v_existing.is_active=(v_payload->>'active')::boolean
       or ((v_payload->>'active')::boolean and (
         (v_existing.ends_at is not null and v_existing.ends_at<=now())
         or (v_existing.max_redemptions is not null and v_existing.redemption_count>=v_existing.max_redemptions)
       )) then
      raise exception using errcode='23514',message='K2_COUPON_STATE_CONFLICT';
    end if;
    update public.coupons set is_active=(v_payload->>'active')::boolean
    where id=v_existing.id returning * into v_saved;
    insert into public.coupon_change_events(
      coupon_id,actor_id,event_type,reason,old_data,new_data,operation_key
    ) values(v_saved.id,v_actor,case when v_saved.is_active then 'activated' else 'paused' end,
      trim(v_payload->>'reason'),to_jsonb(v_existing),to_jsonb(v_saved),p_idempotency_key);
    v_result:=jsonb_build_object('couponId',v_saved.id,'code',v_saved.code,
      'active',v_saved.is_active,'archived',false);

  else
    if not (v_payload ?& array['couponId','reason'])
       or (v_payload-array['couponId','reason'])<>'{}'::jsonb
       or coalesce(v_payload->>'couponId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or length(trim(coalesce(v_payload->>'reason',''))) not between 10 and 500 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_existing from public.coupons
    where id=(v_payload->>'couponId')::uuid for update;
    if not found or v_existing.archived_at is not null then
      raise exception using errcode='23514',message='K2_COUPON_STATE_CONFLICT';
    end if;
    update public.coupons set is_active=false,archived_at=now()
    where id=v_existing.id returning * into v_saved;
    insert into public.coupon_change_events(
      coupon_id,actor_id,event_type,reason,old_data,new_data,operation_key
    ) values(v_saved.id,v_actor,'archived',trim(v_payload->>'reason'),
      to_jsonb(v_existing),to_jsonb(v_saved),p_idempotency_key);
    v_result:=jsonb_build_object('couponId',v_saved.id,'code',v_saved.code,
      'active',false,'archived',true);
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_coupon_command_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_coupon_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

-- Reads remain RLS staff-scoped because the BFF restores the staff JWT. Browser
-- mutations are removed only in the coordinated feature-flag cutover.
revoke insert,update,delete on table public.coupons from authenticated;

notify pgrst,'reload schema';
commit;
