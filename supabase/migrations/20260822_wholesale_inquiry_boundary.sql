-- K2 Jimzon MAP-019: secure wholesale inquiry capture only.
-- This does not create organizations, buyers, price lists, credit, or terms.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'Admin BFF foundation must be applied first';
  end if;
end
$preflight$;

create table if not exists public.wholesale_inquiries (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default
    ('WI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))),
  customer_id uuid not null references public.customers(id) on delete restrict,
  conversation_id uuid not null unique references public.conversations(id) on delete restrict,
  organization_name text not null check (length(trim(organization_name)) between 1 and 160),
  business_type text not null check (business_type in (
    'cafe_restaurant','retail_deli','hospitality','corporate','distributor','other'
  )),
  contact_role text check (contact_role is null or length(trim(contact_role)) between 1 and 100),
  volume_band text not null check (volume_band in (
    'starter','case_regular','high_volume','recurring_weekly','unsure'
  )),
  delivery_area text not null check (length(trim(delivery_area)) between 2 and 200),
  target_items text not null check (length(trim(target_items)) between 2 and 1500),
  customer_notes text check (customer_notes is null or length(trim(customer_notes)) between 1 and 1000),
  status text not null default 'submitted' check (status in ('submitted','under_review','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wholesale_inquiries enable row level security;
alter table public.wholesale_inquiries force row level security;
revoke all on table public.wholesale_inquiries from public, anon, authenticated;

create table if not exists k2_private.wholesale_inquiry_receipts (
  idempotency_key uuid primary key,
  payload_hash bytea not null check (octet_length(payload_hash)=32),
  inquiry_id uuid not null unique references public.wholesale_inquiries(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on table k2_private.wholesale_inquiry_receipts from public, anon, authenticated;

create table if not exists k2_private.wholesale_inquiry_events (
  id bigint generated always as identity primary key,
  inquiry_id uuid not null references public.wholesale_inquiries(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  reason text not null check (length(trim(reason)) between 3 and 500),
  actor_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  check (from_status in ('submitted','under_review','closed')),
  check (to_status in ('submitted','under_review','closed')),
  check (from_status <> to_status)
);
revoke all on table k2_private.wholesale_inquiry_events from public, anon, authenticated;
create index if not exists wholesale_inquiry_events_inquiry_time_idx
  on k2_private.wholesale_inquiry_events(inquiry_id,occurred_at desc);

create or replace function public.submit_wholesale_inquiry_v1(
  p_timestamp bigint, p_nonce uuid, p_payload_text text, p_ip_hash text,
  p_signature text, p_guest_grant_hash text default null
)
returns table(
  ok boolean, error_code text, retry_after_seconds integer,
  public_reference text, conversation_reference text, status text,
  created_at timestamptz, guest_grant_token text
)
language plpgsql security definer set search_path=''
as $$
declare
  v_payload jsonb; v_identity record; v_inquiry public.wholesale_inquiries;
  v_conversation public.conversations; v_message public.messages;
  v_receipt k2_private.wholesale_inquiry_receipts; v_rate record;
  v_ip bytea; v_contact bytea; v_payload_hash bytea; v_existing_hash bytea;
  v_key uuid; v_email text; v_phone text; v_message_text text;
begin
  if not k2_private.verify_guest_bff_request(
    'wholesale_inquiry',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature
  ) then
    return query select false,'REQUEST_REPLAYED',0,null::text,null::text,null::text,null::timestamptz,null::text; return;
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' or exists (
    select 1 from jsonb_object_keys(v_payload) key where key not in (
      'organizationName','businessType','customerName','contactRole','email','phone',
      'deliveryArea','volumeBand','targetItems','notes','idempotencyKey'
    )
  ) then
    return query select false,'REQUEST_INVALID',0,null::text,null::text,null::text,null::timestamptz,null::text; return;
  end if;
  v_email:=lower(trim(coalesce(v_payload->>'email','')));
  v_phone:=regexp_replace(coalesce(v_payload->>'phone',''),'[^0-9+]','','g');
  if length(trim(coalesce(v_payload->>'organizationName',''))) not between 1 and 160
    or coalesce(v_payload->>'businessType','') not in ('cafe_restaurant','retail_deli','hospitality','corporate','distributor','other')
    or length(trim(coalesce(v_payload->>'customerName',''))) not between 1 and 140
    or length(trim(coalesce(v_payload->>'contactRole',''))) > 100
    or (v_email='' and v_phone='')
    or (v_email<>'' and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (v_phone<>'' and length(regexp_replace(v_phone,'[^0-9]','','g')) < 7)
    or length(trim(coalesce(v_payload->>'deliveryArea',''))) not between 2 and 200
    or coalesce(v_payload->>'volumeBand','') not in ('starter','case_regular','high_volume','recurring_weekly','unsure')
    or length(trim(coalesce(v_payload->>'targetItems',''))) not between 2 and 1500
    or length(trim(coalesce(v_payload->>'notes',''))) > 1000
    or coalesce(v_payload->>'idempotencyKey','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return query select false,'REQUEST_INVALID',0,null::text,null::text,null::text,null::timestamptz,null::text; return;
  end if;
  v_ip:=decode(p_ip_hash,'hex'); v_contact:=k2_private.contact_hash(v_payload);
  v_payload_hash:=extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256');
  v_key:=(v_payload->>'idempotencyKey')::uuid;
  if p_guest_grant_hash ~ '^[0-9a-f]{64}$' then v_existing_hash:=decode(p_guest_grant_hash,'hex'); end if;
  select * into v_rate from k2_private.consume_guest_rate('wholesale_inquiry','ip',v_ip,3600,5);
  if not v_rate.allowed then return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,null::text,null::text,null::text,null::timestamptz,null::text; return; end if;
  select * into v_rate from k2_private.consume_guest_rate('wholesale_inquiry','contact',v_contact,86400,3);
  if not v_rate.allowed then return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,null::text,null::text,null::text,null::timestamptz,null::text; return; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_key::text,0));
  select * into v_receipt from k2_private.wholesale_inquiry_receipts where idempotency_key=v_key;
  if found then
    if v_receipt.payload_hash is distinct from v_payload_hash then
      return query select false,'IDEMPOTENCY_CONFLICT',0,null::text,null::text,null::text,null::timestamptz,null::text;
    else
      select * into v_inquiry from public.wholesale_inquiries where id=v_receipt.inquiry_id;
      select * into v_conversation from public.conversations where id=v_inquiry.conversation_id;
      return query select true,null::text,0,v_inquiry.public_reference,v_conversation.guest_reference,v_inquiry.status,v_inquiry.created_at,null::text;
    end if; return;
  end if;
  select * into v_identity from k2_private.resolve_guest_identity(v_payload,'website_guest',v_existing_hash);
  insert into public.conversations(customer_id,customer_name,customer_email,customer_phone,platform,status,source_kind,source_id,unread_count,last_inbound_at,response_due_at)
  values(v_identity.customer_id,trim(v_payload->>'customerName'),nullif(v_email,''),nullif(v_phone,''),'Website','Open','wholesale_inquiry',v_key,1,now(),null)
  returning * into v_conversation;
  v_message_text:='Wholesale inquiry'||E'\nOrganization: '||trim(v_payload->>'organizationName')||E'\nBusiness type: '||(v_payload->>'businessType')||E'\nContact role: '||coalesce(nullif(trim(v_payload->>'contactRole'),''),'Not provided')||E'\nVolume band: '||(v_payload->>'volumeBand')||E'\nDelivery area: '||trim(v_payload->>'deliveryArea')||E'\nTarget items: '||trim(v_payload->>'targetItems')||E'\nNotes: '||coalesce(nullif(trim(v_payload->>'notes'),''),'None');
  insert into public.messages(conversation_id,sender_type,content,is_draft,delivery_status,provider_event_key,direction)
  values(v_conversation.id,'Customer',v_message_text,false,'received','wholesale-inquiry:'||v_key::text,'inbound') returning * into v_message;
  update public.conversations set last_message_at=v_message.created_at,last_inbound_at=v_message.created_at,updated_at=now() where id=v_conversation.id returning * into v_conversation;
  insert into public.wholesale_inquiries(customer_id,conversation_id,organization_name,business_type,contact_role,volume_band,delivery_area,target_items,customer_notes)
  values(v_identity.customer_id,v_conversation.id,trim(v_payload->>'organizationName'),v_payload->>'businessType',nullif(trim(v_payload->>'contactRole'),''),v_payload->>'volumeBand',trim(v_payload->>'deliveryArea'),trim(v_payload->>'targetItems'),nullif(trim(v_payload->>'notes'),'')) returning * into v_inquiry;
  insert into public.guest_access_grant_scopes(grant_id,scope_kind,scope_id,permissions)
  values(v_identity.grant_id,'conversation',v_conversation.id,array['read','reply']::text[]) on conflict do nothing;
  insert into k2_private.wholesale_inquiry_receipts(idempotency_key,payload_hash,inquiry_id) values(v_key,v_payload_hash,v_inquiry.id);
  return query select true,null::text,0,v_inquiry.public_reference,v_conversation.guest_reference,v_inquiry.status,v_inquiry.created_at,v_identity.raw_grant_token;
end; $$;
revoke all on function public.submit_wholesale_inquiry_v1(bigint,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_wholesale_inquiry_v1(bigint,uuid,text,text,text,text) to anon;

create or replace function public.list_admin_wholesale_inquiries_v1()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
  if auth.uid() is null or not public.is_staff() then raise exception using errcode='42501',message='K2_ADMIN_ACCESS_REQUIRED'; end if;
  if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception using errcode='42501',message='K2_ADMIN_AAL2_REQUIRED'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'publicReference',i.public_reference,'conversationReference',c.guest_reference,
    'organizationName',i.organization_name,'businessType',i.business_type,
    'contactName',c.customer_name,'contactRole',i.contact_role,
    'email',c.customer_email,'phone',c.customer_phone,'volumeBand',i.volume_band,
    'deliveryArea',i.delivery_area,'targetItems',i.target_items,
    'customerNotes',i.customer_notes,'status',i.status,
    'createdAt',i.created_at,'updatedAt',i.updated_at
  ) order by i.created_at desc)
  from (select * from public.wholesale_inquiries order by created_at desc limit 200) i
  join public.conversations c on c.id=i.conversation_id),'[]'::jsonb);
end $$;
revoke all on function public.list_admin_wholesale_inquiries_v1() from public,anon,authenticated;
grant execute on function public.list_admin_wholesale_inquiries_v1() to authenticated;

create or replace function public.execute_admin_wholesale_inquiry_command_v1(
  p_action text, p_timestamp bigint, p_nonce uuid, p_idempotency_key uuid,
  p_payload_text text, p_signature text
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_payload_hash text;
  v_receipt k2_private.admin_command_receipts; v_inquiry public.wholesale_inquiries;
  v_result jsonb; v_recent integer; v_inserted integer; v_reason text; v_to text;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED'; end if;
  if p_action<>'wholesale_inquiry_review' then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or (v_payload-array['inquiryReference','toStatus','reason'])<>'{}'::jsonb
     or coalesce(v_payload->>'inquiryReference','') !~ '^WI-[0-9A-F]{16}$'
     or coalesce(v_payload->>'toStatus','') not in ('submitted','under_review','closed')
     or length(trim(coalesce(v_payload->>'reason',''))) not between 3 and 500 then
    raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_receipt from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.payload_hash<>v_payload_hash then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
    if v_receipt.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
    return v_receipt.result;
  end if;
  select count(*)::integer into v_recent from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_recent>=30 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
    values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_receipt from k2_private.admin_command_receipts
      where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_receipt.payload_hash<>v_payload_hash then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
    if v_receipt.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
    return v_receipt.result;
  end if;
  select * into v_inquiry from public.wholesale_inquiries
    where public_reference=v_payload->>'inquiryReference' for update;
  if not found then raise exception using errcode='P0002',message='K2_WHOLESALE_INQUIRY_NOT_FOUND'; end if;
  v_to:=v_payload->>'toStatus'; v_reason:=trim(v_payload->>'reason');
  if v_to=v_inquiry.status or not (
    (v_inquiry.status='submitted' and v_to in ('under_review','closed')) or
    (v_inquiry.status='under_review' and v_to in ('submitted','closed')) or
    (v_inquiry.status='closed' and v_to='under_review')
  ) then raise exception using errcode='22023',message='K2_WHOLESALE_STATUS_CONFLICT'; end if;
  insert into k2_private.wholesale_inquiry_events(inquiry_id,from_status,to_status,reason,actor_id)
    values(v_inquiry.id,v_inquiry.status,v_to,v_reason,v_actor);
  update public.wholesale_inquiries set status=v_to,updated_at=now()
    where id=v_inquiry.id returning * into v_inquiry;
  v_result:=jsonb_build_object(
    'publicReference',v_inquiry.public_reference,'status',v_inquiry.status,
    'updatedAt',v_inquiry.updated_at,'commercialAuthorityAvailable',false
  );
  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end $$;
revoke all on function public.execute_admin_wholesale_inquiry_command_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_wholesale_inquiry_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

notify pgrst,'reload schema';
commit;
