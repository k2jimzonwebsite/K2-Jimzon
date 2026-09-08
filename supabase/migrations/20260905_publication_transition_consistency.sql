-- MAP-018 H-018: preserve approved relisting and side-effect-free status replay.
-- Prepared only; apply after the intake and signed BFF boundary dependencies.
begin;

do $$ begin
  if to_regprocedure('public.transition_product_publication_server(uuid,text)') is null then
    raise exception 'K2_PUBLICATION_TRANSITION_DEPENDENCY_MISSING';
  end if;
end $$;

create or replace function public.transition_product_publication_server(
  p_session_id uuid,
  p_requested_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.product_intake_sessions%rowtype;
  v_product public.products%rowtype;
  v_target text;
  v_old_status text;
  v_missing text[] := '{}';
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception using errcode = '42501', message = 'K2_STAFF_REQUIRED';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'K2_AAL2_REQUIRED';
  end if;
  v_target := case lower(trim(coalesce(p_requested_status, '')))
    when 'draft' then 'Draft'
    when 'under_review' then 'Under Review'
    when 'live' then 'Live'
    when 'unlisted' then 'Unlisted'
    when 'discontinued' then 'Discontinued'
    else null end;
  if v_target is null then
    raise exception using errcode = '22023', message = 'K2_PUBLICATION_STATUS_INVALID';
  end if;

  select * into v_session
  from public.product_intake_sessions
  where id = p_session_id
    and product_id is not null
    and (created_by = auth.uid() or public.is_admin())
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'K2_INTAKE_PRODUCT_NOT_FOUND';
  end if;
  select * into v_product from public.products where id = v_session.product_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'K2_PRODUCT_NOT_FOUND';
  end if;
  v_old_status := v_product.status;

  -- An unchanged status is a read-like replay after authorization and row locks.
  -- It must not repeat publication side effects or rewrite review timestamps.
  if v_old_status = v_target then
    return jsonb_build_object('success', true, 'product_id', v_product.id, 'status', v_target);
  end if;

  if v_target = 'Under Review' and not exists (
    select 1
    from jsonb_array_elements(v_session.packaging_images) image
    where image ->> 'slot' = 'PRIMARY' and image ->> 'upload_status' = 'uploaded'
  ) then
    v_missing := array_append(v_missing, 'verified_primary_evidence');
  end if;
  if v_target = 'Live' then
    if nullif(trim(v_product.name), '') is null then v_missing := array_append(v_missing, 'name'); end if;
    if v_product.brand_id is null then v_missing := array_append(v_missing, 'brand'); end if;
    if v_product.category_id is null then v_missing := array_append(v_missing, 'category'); end if;
    if coalesce(v_product.srp, v_product.retail_price, 0) <= 0 then v_missing := array_append(v_missing, 'price'); end if;
    if nullif(trim(v_product.primary_image_url), '') is null then v_missing := array_append(v_missing, 'primary_image'); end if;
    if not coalesce(v_product.is_human_reviewed, false) then v_missing := array_append(v_missing, 'human_review'); end if;
    if v_product.status not in ('Under Review', 'Unlisted') then v_missing := array_append(v_missing, 'under_review_state'); end if;
  end if;
  if cardinality(v_missing) > 0 then
    raise exception using errcode = '23514',
      message = 'K2_PUBLICATION_NOT_READY', detail = array_to_string(v_missing, ',');
  end if;
  if (v_product.status, v_target) not in (
    ('Draft', 'Draft'), ('Draft', 'Under Review'),
    ('Under Review', 'Under Review'), ('Under Review', 'Draft'),
    ('Under Review', 'Live'), ('Under Review', 'Unlisted'),
    ('Live', 'Live'), ('Live', 'Unlisted'), ('Live', 'Discontinued'),
    ('Unlisted', 'Unlisted'), ('Unlisted', 'Live'), ('Unlisted', 'Discontinued'),
    ('Discontinued', 'Discontinued')
  ) then
    raise exception using errcode = '23514', message = 'K2_PUBLICATION_TRANSITION_INVALID';
  end if;

  update public.products set status = v_target, updated_at = now()
  where id = v_product.id;
  update public.product_intake_sessions set
    checklist_step = 'publication_review',
    status = case when v_target in ('Live', 'Discontinued') then 'completed' else status end,
    completed_at = case when v_target in ('Live', 'Discontinued') then now() else completed_at end
  where id = p_session_id;
  insert into public.audit_logs (
    table_name, record_id, action, old_data, new_data, user_id
  ) values (
    'products', v_product.id::text, 'TRANSITION_PUBLICATION',
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', v_target, 'intake_session_id', p_session_id),
    auth.uid()
  );
  return jsonb_build_object('success', true, 'product_id', v_product.id, 'status', v_target);
end;
$$;

-- CREATE OR REPLACE preserves the existing ACL. Do not reopen a direct RPC
-- that a later boundary migration may have restricted.

notify pgrst, 'reload schema';
commit;
