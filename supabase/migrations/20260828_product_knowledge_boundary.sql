-- MAP-027 — durable, approval-gated product knowledge.
--
-- Until now the Interactive Shop and the product page read their descriptions,
-- usage notes and FAQs from a development fixture compiled into the bundle.
-- That meant production had no knowledge at all: every panel rendered
-- "Information not available yet", and the Store Asset Studio could review and
-- approve copy that was then discarded on reload because nothing persisted it.
--
-- This is the storage the approval gate was always written against. The rule
-- the application already enforces is enforced again here, at the boundary:
-- only rows whose status is exactly 'approved' are readable by the public, and
-- no client role may write a row at all. Writes arrive solely through the
-- signed admin command below, so "approved" can only ever mean a member of
-- staff pressed approve.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null
     or to_regprocedure('public.is_staff()') is null then
    raise exception 'Admin BFF command foundation must be applied first';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.product_knowledge (
  sku text not null,
  field_key text not null,
  status text not null default 'draft',
  value text not null default '',
  provenance jsonb not null default '{}'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_knowledge_pkey primary key (sku, field_key),
  constraint product_knowledge_status_check
    check (status in ('draft', 'approved')),
  constraint product_knowledge_field_key_check
    check (field_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  constraint product_knowledge_value_length_check
    check (char_length(value) <= 4000),
  -- An approved row with no text would render as an empty section rather than
  -- as the honest unavailable state, so approval requires content.
  constraint product_knowledge_approved_has_value_check
    check (status <> 'approved' or char_length(btrim(value)) > 0)
);

create table if not exists public.product_knowledge_faqs (
  id uuid not null default gen_random_uuid(),
  sku text not null,
  position integer not null default 0,
  status text not null default 'draft',
  question text not null,
  answer text not null,
  provenance jsonb not null default '{}'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_knowledge_faqs_pkey primary key (id),
  constraint product_knowledge_faqs_status_check
    check (status in ('draft', 'approved')),
  constraint product_knowledge_faqs_question_length_check
    check (char_length(question) between 1 and 300),
  constraint product_knowledge_faqs_answer_length_check
    check (char_length(answer) between 1 and 2000)
);

create index if not exists product_knowledge_approved_idx
  on public.product_knowledge (sku) where status = 'approved';
create index if not exists product_knowledge_faqs_approved_idx
  on public.product_knowledge_faqs (sku, position) where status = 'approved';

-- ---------------------------------------------------------------------------
-- Read boundary
--
-- The storefront reads the catalog directly under RLS, so knowledge is read the
-- same way rather than through a new anonymous function. That keeps the
-- anonymous function surface exactly as it was.
-- ---------------------------------------------------------------------------

alter table public.product_knowledge enable row level security;
alter table public.product_knowledge force row level security;
alter table public.product_knowledge_faqs enable row level security;
alter table public.product_knowledge_faqs force row level security;

revoke all on table public.product_knowledge from public, anon, authenticated;
revoke all on table public.product_knowledge_faqs from public, anon, authenticated;
grant select on table public.product_knowledge to anon, authenticated;
grant select on table public.product_knowledge_faqs to anon, authenticated;

drop policy if exists product_knowledge_public_read_approved on public.product_knowledge;
create policy product_knowledge_public_read_approved
on public.product_knowledge for select to anon, authenticated
using (status = 'approved');

drop policy if exists product_knowledge_staff_read_all on public.product_knowledge;
create policy product_knowledge_staff_read_all
on public.product_knowledge for select to authenticated
using (public.is_staff());

drop policy if exists product_knowledge_faqs_public_read_approved on public.product_knowledge_faqs;
create policy product_knowledge_faqs_public_read_approved
on public.product_knowledge_faqs for select to anon, authenticated
using (status = 'approved');

drop policy if exists product_knowledge_faqs_staff_read_all on public.product_knowledge_faqs;
create policy product_knowledge_faqs_staff_read_all
on public.product_knowledge_faqs for select to authenticated
using (public.is_staff());

-- No insert, update or delete policy exists for any client role, so the only
-- write path is the security-definer command below.

commit;

begin;

-- ---------------------------------------------------------------------------
-- Write boundary
--
-- One command replaces the whole record for one SKU, which is how the Store
-- Asset Studio actually works: a person reads a product's fields and FAQs
-- together, edits what is wrong, and saves. Replacing the record makes the save
-- idempotent and leaves no orphaned rows from a removed FAQ.
-- ---------------------------------------------------------------------------

create or replace function public.save_product_knowledge_v1(
  p_sku text,
  p_fields jsonb,
  p_faqs jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sku text := btrim(coalesce(p_sku, ''));
  v_actor uuid := auth.uid();
  v_field jsonb;
  v_faq jsonb;
  v_key text;
  v_status text;
  v_position integer := 0;
  v_approved_fields integer := 0;
  v_approved_faqs integer := 0;
begin
  if not public.is_staff() then
    raise exception using errcode='28000', message='K2_STAFF_ACCESS_REQUIRED';
  end if;
  if v_sku = '' or char_length(v_sku) > 120 then
    raise exception using errcode='22023', message='K2_KNOWLEDGE_SKU_INVALID';
  end if;
  -- Knowledge describes a product the catalog actually carries. Without this a
  -- typo in a SKU would create a record no surface can ever read.
  if not exists (select 1 from public.products p where p.sku = v_sku) then
    raise exception using errcode='22023', message='K2_KNOWLEDGE_SKU_UNKNOWN';
  end if;
  if jsonb_typeof(p_fields) <> 'array' or jsonb_typeof(p_faqs) <> 'array' then
    raise exception using errcode='22023', message='K2_KNOWLEDGE_PAYLOAD_INVALID';
  end if;
  if jsonb_array_length(p_fields) > 20 or jsonb_array_length(p_faqs) > 20 then
    raise exception using errcode='22023', message='K2_KNOWLEDGE_PAYLOAD_TOO_LARGE';
  end if;

  delete from public.product_knowledge where sku = v_sku;
  delete from public.product_knowledge_faqs where sku = v_sku;

  for v_field in select * from jsonb_array_elements(p_fields) loop
    v_key := btrim(coalesce(v_field->>'key', ''));
    v_status := coalesce(v_field->>'status', 'draft');
    if v_status not in ('draft', 'approved') then
      raise exception using errcode='22023', message='K2_KNOWLEDGE_STATUS_INVALID';
    end if;
    insert into public.product_knowledge(
      sku, field_key, status, value, provenance, approved_by, approved_at
    ) values (
      v_sku, v_key, v_status, coalesce(v_field->>'value', ''),
      coalesce(v_field->'provenance', '{}'::jsonb),
      case when v_status = 'approved' then v_actor end,
      case when v_status = 'approved' then now() end
    );
    if v_status = 'approved' then v_approved_fields := v_approved_fields + 1; end if;
  end loop;

  for v_faq in select * from jsonb_array_elements(p_faqs) loop
    v_status := coalesce(v_faq->>'status', 'draft');
    if v_status not in ('draft', 'approved') then
      raise exception using errcode='22023', message='K2_KNOWLEDGE_STATUS_INVALID';
    end if;
    insert into public.product_knowledge_faqs(
      sku, position, status, question, answer, provenance, approved_by, approved_at
    ) values (
      v_sku, v_position, v_status,
      btrim(coalesce(v_faq->>'question', '')), btrim(coalesce(v_faq->>'answer', '')),
      coalesce(v_faq->'provenance', '{}'::jsonb),
      case when v_status = 'approved' then v_actor end,
      case when v_status = 'approved' then now() end
    );
    if v_status = 'approved' then v_approved_faqs := v_approved_faqs + 1; end if;
    v_position := v_position + 1;
  end loop;

  return jsonb_build_object(
    'sku', v_sku,
    'approvedFields', v_approved_fields,
    'approvedFaqs', v_approved_faqs,
    'savedAt', now()
  );
end;
$$;

revoke all on function public.save_product_knowledge_v1(text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.save_product_knowledge_v1(text,jsonb,jsonb)
  to authenticated;

create or replace function public.product_knowledge_capability_v1()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select public.is_staff(); $$;

revoke all on function public.product_knowledge_capability_v1()
  from public, anon, authenticated;
grant execute on function public.product_knowledge_capability_v1()
  to authenticated;

commit;

begin;

-- ---------------------------------------------------------------------------
-- Signed admin command
--
-- Same shape as every other admin command: the request is HMAC-verified, the
-- idempotency key is recorded before the work runs, a replay with a different
-- payload is a conflict rather than a second write, and the caller is rate
-- limited. Knowledge is customer-facing copy, so it gets the same treatment as
-- a customer-visible reply rather than a looser one.
-- ---------------------------------------------------------------------------

create or replace function public.execute_admin_product_knowledge_v1(
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
  v_existing k2_private.admin_command_receipts;
  v_result jsonb;
  v_count integer;
  v_inserted integer;
begin
  if p_action <> 'product_knowledge_save'
     or not k2_private.verify_admin_bff_request(
       p_action, p_timestamp, p_nonce, p_idempotency_key, p_payload_text, p_signature
     ) then
    raise exception using errcode='28000', message='K2_ADMIN_REQUEST_REPLAYED';
  end if;

  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object'
     or (v_payload - array['sku','fields','faqs']) <> '{}'::jsonb then
    raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash := encode(
    extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex'
  );

  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count >= 60 then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  insert into k2_private.admin_command_receipts(
    actor_id, action, idempotency_key, payload_hash
  ) values (v_actor, p_action, p_idempotency_key, v_payload_hash)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.result;
  end if;

  v_result := public.save_product_knowledge_v1(
    v_payload->>'sku', v_payload->'fields', v_payload->'faqs'
  );

  update k2_private.admin_command_receipts
  set result=v_result, completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_product_knowledge_v1(text,bigint,uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.execute_admin_product_knowledge_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

notify pgrst,'reload schema';
commit;
