-- Harden the Admin-only permanent product deletion confirmation boundary.
-- The legacy implementation stored bcrypt hashes on a broadly readable profile
-- table and did not require AAL2 to set or use a PIN. This migration moves the
-- credential into a private schema, adds bounded retries and idempotency, and
-- permits deletion only for unused products with no operational history.

begin;

create schema if not exists k2_private;
revoke all on schema k2_private from public, anon, authenticated;

create table if not exists k2_private.staff_delete_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  pin_set_at timestamptz not null default now(),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  attempt_window_started_at timestamptz,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
revoke all on table k2_private.staff_delete_credentials from public, anon, authenticated;

create table if not exists k2_private.product_delete_operations (
  actor_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (actor_id, request_id)
);
revoke all on table k2_private.product_delete_operations from public, anon, authenticated;

alter table public.product_deletions
  add column if not exists reason text,
  add column if not exists request_id uuid;

create unique index if not exists product_deletions_request_sku_uniq
  on public.product_deletions (request_id, sku)
  where request_id is not null;

-- Copy any existing hashes before replacing the functions that depend on the
-- old public columns. Dynamic SQL keeps this safe if a clean installation has
-- already removed those columns.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_profiles'
      and column_name='delete_pin_hash'
  ) then
    execute $copy$
      insert into k2_private.staff_delete_credentials(user_id,pin_hash,pin_set_at)
      select id,delete_pin_hash,coalesce(delete_pin_set_at,now())
      from public.user_profiles
      where delete_pin_hash is not null
      on conflict (user_id) do nothing
    $copy$;
  end if;
end;
$$;

create or replace function public.has_delete_pin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_profiles
    where id=auth.uid() and role::text='Admin'
  ) then
    raise exception using errcode='42501', message='K2_ADMIN_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_AAL2_REQUIRED';
  end if;
  return exists (
    select 1 from k2_private.staff_delete_credentials where user_id=auth.uid()
  );
end;
$$;

create or replace function public.set_delete_pin(new_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_profiles
    where id=auth.uid() and role::text='Admin'
  ) then
    raise exception using errcode='42501', message='K2_ADMIN_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_AAL2_REQUIRED';
  end if;
  if new_pin is null or new_pin !~ '^[0-9]{4}$' then
    raise exception using errcode='22023', message='K2_DELETE_PIN_INVALID_FORMAT';
  end if;

  insert into k2_private.staff_delete_credentials(
    user_id,pin_hash,pin_set_at,failed_attempts,attempt_window_started_at,
    locked_until,updated_at
  ) values (
    auth.uid(),extensions.crypt(new_pin,extensions.gen_salt('bf',12)),now(),0,null,null,now()
  )
  on conflict (user_id) do update set
    pin_hash=excluded.pin_hash,
    pin_set_at=excluded.pin_set_at,
    failed_attempts=0,
    attempt_window_started_at=null,
    locked_until=null,
    updated_at=now();

  insert into public.audit_logs(
    table_name,record_id,action,old_data,new_data,user_id
  ) values (
    'staff_delete_credentials',auth.uid()::text,'UPDATE',
    jsonb_build_object('configured',true),
    jsonb_build_object('configured',true,'changed_at',now()),auth.uid()
  );
  return true;
end;
$$;

create or replace function public.delete_products_with_pin_v2(
  p_skus text[],
  p_candidate_pin text,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_credential k2_private.staff_delete_credentials;
  v_skus text[];
  v_payload_hash text;
  v_existing k2_private.product_delete_operations;
  v_product record;
  v_count integer := 0;
  v_failed integer;
  v_result jsonb;
begin
  if v_actor is null or not exists (
    select 1 from public.user_profiles
    where id=v_actor and role::text='Admin'
  ) then
    raise exception using errcode='42501', message='K2_ADMIN_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_AAL2_REQUIRED';
  end if;
  if p_request_id is null then
    raise exception using errcode='22023', message='K2_REQUEST_ID_REQUIRED';
  end if;
  if p_candidate_pin is null or p_candidate_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok',false,'code','INVALID_PIN');
  end if;
  if char_length(trim(coalesce(p_reason,''))) < 8
     or char_length(trim(p_reason)) > 500 then
    return jsonb_build_object('ok',false,'code','INVALID_REASON');
  end if;
  if p_skus is null or cardinality(p_skus) < 1 or cardinality(p_skus) > 50
     or exists (select 1 from unnest(p_skus) s where s is null or trim(s)='') then
    return jsonb_build_object('ok',false,'code','INVALID_PRODUCTS');
  end if;

  select array_agg(distinct trim(s) order by trim(s)) into v_skus from unnest(p_skus) s;
  v_payload_hash := encode(extensions.digest(
    array_to_string(v_skus,E'\n') || E'\n' || trim(p_reason),'sha256'
  ),'hex');

  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':delete_products',0));
  select * into v_existing from k2_private.product_delete_operations
  where actor_id=v_actor and request_id=p_request_id;
  if found then
    if v_existing.payload_hash <> v_payload_hash then
      return jsonb_build_object('ok',false,'code','IDEMPOTENCY_CONFLICT');
    end if;
    if v_existing.result is not null then return v_existing.result; end if;
    return jsonb_build_object('ok',false,'code','OPERATION_IN_PROGRESS');
  end if;

  select * into v_credential
  from k2_private.staff_delete_credentials
  where user_id=v_actor for update;
  if not found then return jsonb_build_object('ok',false,'code','PIN_NOT_SET'); end if;
  if v_credential.locked_until is not null and v_credential.locked_until > now() then
    return jsonb_build_object(
      'ok',false,'code','PIN_LOCKED',
      'retry_after_seconds',greatest(1,ceil(extract(epoch from (v_credential.locked_until-now())))::integer)
    );
  end if;

  if v_credential.attempt_window_started_at is null
     or v_credential.attempt_window_started_at <= now()-interval '10 minutes' then
    v_failed := 1;
  else
    v_failed := v_credential.failed_attempts+1;
  end if;

  if v_credential.pin_hash <> extensions.crypt(p_candidate_pin,v_credential.pin_hash) then
    update k2_private.staff_delete_credentials set
      failed_attempts=least(v_failed,5),
      attempt_window_started_at=case
        when attempt_window_started_at is null or attempt_window_started_at <= now()-interval '10 minutes'
          then now() else attempt_window_started_at end,
      locked_until=case when v_failed >= 5 then now()+interval '15 minutes' else null end,
      updated_at=now()
    where user_id=v_actor;
    return jsonb_build_object(
      'ok',false,
      'code',case when v_failed >= 5 then 'PIN_LOCKED' else 'INVALID_PIN' end,
      'attempts_remaining',greatest(0,5-v_failed),
      'retry_after_seconds',case when v_failed >= 5 then 900 else null end
    );
  end if;

  update k2_private.staff_delete_credentials set
    failed_attempts=0,attempt_window_started_at=null,locked_until=null,updated_at=now()
  where user_id=v_actor;

  if exists (
    select 1 from unnest(v_skus) requested(sku)
    left join public.products p on p.sku=requested.sku
    where p.sku is null
  ) then
    return jsonb_build_object('ok',false,'code','PRODUCT_NOT_FOUND');
  end if;

  -- Permanent deletion is only for unused setup mistakes. Operational records,
  -- stock, allocations, listings, and order history must remain attributable.
  if exists (select 1 from public.product_batches where sku=any(v_skus))
     or exists (select 1 from public.staff_allocations where sku=any(v_skus))
     or exists (select 1 from public.inventory_balances where sku=any(v_skus))
     or exists (select 1 from public.channel_listings where sku=any(v_skus))
     or exists (select 1 from public.orders where sku=any(v_skus))
     or exists (select 1 from public.order_request_items where sku=any(v_skus))
     or exists (select 1 from public.consignment_items where sku=any(v_skus))
     or exists (select 1 from public.inventory_events where sku=any(v_skus)) then
    return jsonb_build_object('ok',false,'code','PRODUCT_HAS_HISTORY');
  end if;

  insert into k2_private.product_delete_operations(actor_id,request_id,payload_hash)
  values(v_actor,p_request_id,v_payload_hash);
  select email into v_email from public.user_profiles where id=v_actor;

  for v_product in
    select * from public.products where sku=any(v_skus) order by sku for update
  loop
    insert into public.product_deletions(
      sku,product_name,snapshot,deleted_by,deleted_by_email,reason,request_id
    ) values (
      v_product.sku,coalesce(v_product.name,v_product.title,v_product.sku),
      to_jsonb(v_product),v_actor,v_email,trim(p_reason),p_request_id
    );
    delete from public.products where sku=v_product.sku;
    v_count := v_count+1;
  end loop;

  v_result := jsonb_build_object('ok',true,'deleted_count',v_count,'request_id',p_request_id);
  update k2_private.product_delete_operations
  set result=v_result,completed_at=now()
  where actor_id=v_actor and request_id=p_request_id;
  return v_result;
exception
  when foreign_key_violation then
    return jsonb_build_object('ok',false,'code','PRODUCT_HAS_HISTORY');
end;
$$;

-- Harden the legacy delete RPC during the deployment transition. It remains
-- Admin+AAL2-only, but the new client uses v2 for durable retries and reasons.
create or replace function public.delete_products_with_pin(skus text[],candidate_pin text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_profiles where id=auth.uid() and role::text='Admin'
  ) then raise exception using errcode='42501', message='K2_ADMIN_REQUIRED'; end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_AAL2_REQUIRED';
  end if;
  raise exception using errcode='0A000', message='K2_DELETE_CLIENT_UPGRADE_REQUIRED';
end;
$$;

revoke all on function public.has_delete_pin() from public,anon;
revoke all on function public.set_delete_pin(text) from public,anon;
revoke all on function public.delete_products_with_pin(text[],text) from public,anon;
revoke all on function public.delete_products_with_pin_v2(text[],text,text,uuid) from public,anon;
grant execute on function public.has_delete_pin() to authenticated;
grant execute on function public.set_delete_pin(text) to authenticated;
grant execute on function public.delete_products_with_pin(text[],text) to authenticated;
grant execute on function public.delete_products_with_pin_v2(text[],text,text,uuid) to authenticated;

drop function if exists public.verify_delete_pin(text);

alter table public.user_profiles
  drop column if exists delete_pin_hash,
  drop column if exists delete_pin_set_at;

notify pgrst,'reload schema';
commit;
