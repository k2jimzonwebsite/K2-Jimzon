-- PREPARED ONLY. MAP-018 / MAP-028 I-016. No provider or production activation.
begin;
create table if not exists k2_private.intake_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.product_intake_sessions(id),
  actor_id uuid not null,
  request_id uuid not null,
  kind text not null check (kind in ('content','PRIMARY','AFTER')),
  product_key text not null,
  version text not null,
  evidence jsonb not null,
  reviewed_content jsonb not null,
  brief text not null default '',
  reserved_usd_micros bigint not null check (reserved_usd_micros > 0),
  actual_usd_micros bigint, -- null until provider invoice reconciliation; never fabricated
  status text not null default 'dispatched' check (status in ('dispatched','completed','failed')),
  result jsonb,
  failure text,
  latency_ms bigint,
  decision text check (decision in ('accepted','rejected')),
  review_reason text,
  reviewed_at timestamptz,
  attachment_result jsonb,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  unique(session_id,kind),
  unique(actor_id,request_id)
);
alter table k2_private.intake_ai_jobs enable row level security;
alter table k2_private.intake_ai_jobs force row level security;
revoke all on k2_private.intake_ai_jobs from public,anon,authenticated;
create index if not exists intake_ai_jobs_budget_idx on k2_private.intake_ai_jobs(created_at,product_key);

-- Separate signer namespace: do not replace the shared action allowlist.
create or replace function public.execute_admin_intake_ai_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_session public.product_intake_sessions;
  v_job k2_private.intake_ai_jobs; v_config k2_private.ai_spend_control_config;
  v_secret bytea; v_hash text; v_expected text; v_hits integer; v_bucket timestamptz;
  v_kind text; v_cost bigint; v_session_spend bigint; v_month_spend bigint; v_product_spend bigint;
  v_product_key text; v_jobs jsonb; v_ready boolean; v_evidence jsonb;
  v_product public.products; v_assignment jsonb; v_media jsonb; v_attached jsonb;
begin
  if v_actor is null or not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='AI_JOB_UNAVAILABLE';
  end if;
  if p_action is null or p_action not in ('intake_ai_read','intake_ai_claim','intake_ai_complete','intake_ai_review','intake_ai_attach','intake_ai_candidate')
    or p_timestamp is null or p_nonce is null or p_idempotency_key is null
    or p_payload_text is null or octet_length(p_payload_text)>6000000
    or p_signature is null or p_signature !~ '^[a-f0-9]{64}$'
    or abs(extract(epoch from clock_timestamp())::bigint-p_timestamp)>300 then
    raise exception 'AI_JOB_UNAVAILABLE';
  end if;
  select request_secret into v_secret from k2_private.admin_bff_secrets where singleton;
  if v_secret is null then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  v_expected:=encode(extensions.hmac(convert_to(p_action||E'\n'||p_timestamp::text||E'\n'||p_nonce::text||E'\n'||v_actor::text||E'\n'||p_idempotency_key::text||E'\n'||v_hash,'UTF8'),v_secret,'sha256'),'hex');
  if extensions.digest(v_expected,'sha256')<>extensions.digest(p_signature,'sha256') then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at)
    values(v_actor,p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  if not found then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  v_bucket:=date_trunc('minute',clock_timestamp());
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
    values('actor','intake-ai:'||v_actor::text,v_bucket,1)
    on conflict(scope,subject,bucket_start) do update set hit_count=k2_private.admin_request_rate_buckets.hit_count+1 returning hit_count into v_hits;
  if v_hits>60 then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  v_payload:=p_payload_text::jsonb;
  -- Ownership is intentionally stricter than ordinary Admin reads.
  select * into v_session from public.product_intake_sessions
    where id=(v_payload->>'sessionId')::uuid and created_by=v_actor for update;
  if not found then raise exception using errcode='42501',message='AI_JOB_UNAVAILABLE'; end if;
  v_product_key:=lower(trim(coalesce(nullif(v_session.barcode,''),nullif(v_session.scanned_identity,''),v_session.id::text)));
  select * into v_config from k2_private.ai_spend_control_config where config_key='default' for update;
  select coalesce(sum(reserved_usd_micros),0) into v_session_spend from k2_private.intake_ai_jobs where session_id=v_session.id;
  select coalesce(sum(reserved_usd_micros),0) into v_product_spend from k2_private.intake_ai_jobs where product_key=v_product_key;
  select coalesce(sum(reserved_usd_micros),0) into v_month_spend from k2_private.intake_ai_jobs where created_at>=date_trunc('month',clock_timestamp() at time zone 'UTC') at time zone 'UTC';
  v_ready:=coalesce(v_config.paid_path_enabled and v_config.provider_model_snapshot='gpt-4.1-mini-2025-04-14+gpt-image-1:k2.intake-ai.2026-09-06'
    and v_config.per_product_usd_micros>v_product_spend and v_config.per_session_usd_micros>v_session_spend and v_config.monthly_usd_micros>v_month_spend,false);
  if p_action='intake_ai_read' then
    select coalesce(jsonb_agg((to_jsonb(j)-'evidence'-'reviewed_content')#-'{result,image}' order by j.created_at),'[]'::jsonb) into v_jobs
      from k2_private.intake_ai_jobs j where session_id=v_session.id;
    return jsonb_build_object('jobs',v_jobs,'productId',v_session.product_id,'budget',jsonb_build_object('ready',v_ready,'sessionReserved',v_session_spend,'productReserved',v_product_spend,'monthReserved',v_month_spend,'perSessionCap',v_config.per_session_usd_micros,'perProductCap',v_config.per_product_usd_micros,'monthlyCap',v_config.monthly_usd_micros));
  end if;
  if p_action='intake_ai_claim' then
    v_kind:=v_payload->>'kind';
    if v_kind is null or v_kind not in ('content','PRIMARY','AFTER') or v_payload->>'confirmation' is distinct from 'CONFIRM_PAID_INTAKE'
      or v_payload->>'version' is distinct from 'k2.intake-ai.2026-09-06' then raise exception 'AI_JOB_CONFLICT'; end if;
    select * into v_job from k2_private.intake_ai_jobs where session_id=v_session.id and kind=v_kind;
    if found then return jsonb_build_object('dispatch',false,'job',to_jsonb(v_job)-'evidence'-'reviewed_content'); end if;
    if exists(select 1 from k2_private.intake_ai_jobs where actor_id=v_actor and request_id=p_idempotency_key) then raise exception 'AI_JOB_CONFLICT'; end if;
    if exists(select 1 from k2_private.intake_ai_jobs where session_id=v_session.id and status='dispatched') then raise exception 'AI_JOB_CONFLICT'; end if;
    if v_session.status<>'active' or v_session.product_id is not null then raise exception 'AI_JOB_CONFLICT'; end if;
    if not v_ready then raise exception 'AI_BUDGET_BLOCKED'; end if;
    v_cost:=case when v_kind='content' then 100000 else 1000000 end;
    if v_product_spend+v_cost>v_config.per_product_usd_micros or v_session_spend+v_cost>v_config.per_session_usd_micros or v_month_spend+v_cost>v_config.monthly_usd_micros then raise exception 'AI_BUDGET_BLOCKED'; end if;
    v_evidence:=v_session.packaging_images;
    if jsonb_array_length(v_evidence) not between 1 and 3
      or not exists(select 1 from jsonb_array_elements(v_evidence) e where e->>'slot'='PRIMARY')
      or exists(select 1 from jsonb_array_elements(v_evidence) e where e->>'path' not like v_actor::text||'/'||v_session.id::text||'/%' or e->>'sha256' is null)
      or v_session.checklist_step not in ('research_handoff','field_review','draft_saved') then raise exception 'AI_EVIDENCE_REQUIRED'; end if;
    if v_kind<>'content' and (v_session.field_decisions->>'name' is distinct from 'accepted'
      or nullif(v_session.draft_payload->'product'->>'name','') is null
      or length(trim(coalesce(v_payload->>'brief',''))) not between 8 and 1500) then raise exception 'AI_REVIEW_REQUIRED'; end if;
    insert into k2_private.intake_ai_jobs(session_id,actor_id,request_id,kind,product_key,version,evidence,reviewed_content,brief,reserved_usd_micros)
      values(v_session.id,v_actor,p_idempotency_key,v_kind,v_product_key,v_payload->>'version',v_evidence,v_session.draft_payload,coalesce(v_payload->>'brief',''),v_cost) returning * into v_job;
    return jsonb_build_object('dispatch',true,'job',to_jsonb(v_job)-'evidence'-'reviewed_content','evidence',v_evidence);
  end if;
  select * into v_job from k2_private.intake_ai_jobs where id=(v_payload->>'jobId')::uuid and session_id=v_session.id for update;
  if not found then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  if p_action='intake_ai_candidate' then
    if v_job.kind='content' or v_job.status<>'completed' then raise exception 'AI_JOB_UNAVAILABLE'; end if;
    return jsonb_build_object('job',to_jsonb(v_job)-'evidence'-'reviewed_content');
  end if;
  if p_action='intake_ai_complete' then
    if v_job.request_id<>p_idempotency_key then raise exception 'AI_JOB_CONFLICT'; end if;
    if v_job.status='dispatched' then
      if v_payload->>'failure' is null and (jsonb_typeof(v_payload->'result') is distinct from 'object') then raise exception 'AI_JOB_CONFLICT'; end if;
      update k2_private.intake_ai_jobs set result=nullif(v_payload->'result','null'::jsonb),failure=left(v_payload->>'failure',80),
        status=case when v_payload->>'failure' is null then 'completed' else 'failed' end,
        latency_ms=(v_payload->>'latencyMs')::bigint,completed_at=clock_timestamp() where id=v_job.id returning * into v_job;
    end if;
  elsif p_action='intake_ai_attach' then
    if v_job.attachment_result is not null then return jsonb_build_object('job',to_jsonb(v_job)-'evidence'-'reviewed_content'); end if;
    if v_job.decision is distinct from 'accepted' or v_job.kind='content' or v_session.product_id is null then raise exception 'AI_REVIEW_REQUIRED'; end if;
    select * into v_product from public.products where id=v_session.product_id for update;
    if not found or v_product.sku is distinct from v_payload->'before'->>'sku'
      or v_product.primary_image_url is distinct from v_payload->'before'->>'primary_image_url'
      or coalesce(to_jsonb(v_product.lifestyle_images),'[]'::jsonb) is distinct from coalesce(nullif(v_payload->'before'->'lifestyle_images','null'::jsonb),'[]'::jsonb)
      or coalesce(to_jsonb(v_product.secondary_images),'[]'::jsonb) is distinct from coalesce(nullif(v_payload->'before'->'secondary_images','null'::jsonb),'[]'::jsonb) then raise exception 'AI_JOB_CONFLICT'; end if;
    v_assignment:=v_payload->'assignment';
    v_media:=(v_assignment->>'p_payload_text')::jsonb;
    if v_assignment->>'p_action' is distinct from 'product_media_assign' or v_assignment->>'p_idempotency_key' is distinct from v_job.id::text or v_media->>'sku' is distinct from v_product.sku then raise exception 'AI_JOB_CONFLICT'; end if;
    -- Existing signed media commands alone register/attach canonical assets.
    v_attached:=public.execute_admin_product_media_assignment_v1(v_assignment->>'p_action',(v_assignment->>'p_timestamp')::bigint,(v_assignment->>'p_nonce')::uuid,(v_assignment->>'p_idempotency_key')::uuid,v_assignment->>'p_payload_text',v_assignment->>'p_signature');
    update k2_private.intake_ai_jobs set attachment_result=v_attached where id=v_job.id returning * into v_job;
  elsif p_action='intake_ai_review' then
    if v_job.status<>'completed' or v_job.kind='content'
      or v_payload->>'decision' is null or v_payload->>'decision' not in ('accepted','rejected')
      or length(trim(coalesce(v_payload->>'reason',''))) not between 8 and 500 then raise exception 'AI_REVIEW_REQUIRED'; end if;
    if v_job.decision is not null and v_job.decision<>v_payload->>'decision' then raise exception 'AI_JOB_CONFLICT'; end if;
    update k2_private.intake_ai_jobs set decision=v_payload->>'decision',review_reason=v_payload->>'reason',reviewed_at=coalesce(reviewed_at,clock_timestamp()) where id=v_job.id returning * into v_job;
  end if;
  return jsonb_build_object('job',(to_jsonb(v_job)-'evidence'-'reviewed_content')#-'{result,image}');
end;
$$;
revoke all on function public.execute_admin_intake_ai_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.execute_admin_intake_ai_v1(text,bigint,uuid,uuid,text,text) to authenticated;
commit;
