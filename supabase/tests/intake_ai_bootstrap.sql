\ir map018_cleanup_bootstrap.sql
create table public.products(id uuid primary key,sku text,primary_image_url text,lifestyle_images text[],secondary_images text[], image_url text, published boolean default false,status text default 'Draft',updated_at timestamptz);
create schema storage;
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,created_at timestamptz default now());
create type public.user_role as enum ('Admin','Staff');
create table public.user_profiles(id uuid primary key,role public.user_role);
create table k2_private.admin_command_receipts(actor_id uuid,action text,idempotency_key uuid,payload_hash text,result jsonb,created_at timestamptz default now(),completed_at timestamptz,primary key(actor_id,action,idempotency_key));
-- Only satisfies the real spend migration preflight; migration replaces it below.
create function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text) returns boolean language sql as $$ select false $$;
alter table public.product_intake_sessions add column barcode text, add column scanned_identity text default 'fixture-product', add column product_id uuid, add column assigned_sku text, add column status text default 'active', add column checklist_step text default 'research_handoff', add column packaging_images jsonb default '[]', add column field_decisions jsonb default '{}', add column draft_payload jsonb default '{}';
update public.product_intake_sessions set packaging_images=jsonb_build_array(jsonb_build_object('slot','PRIMARY','path',created_by::text||'/'||id::text||'/primary.png','sha256',repeat('a',64),'type','image/png'));
create table k2_private.admin_request_rate_buckets(scope text, subject text,bucket_start timestamptz,hit_count integer,primary key(scope,subject,bucket_start));
\ir ../migrations/20260830_paid_ai_spend_controls.sql
\ir ../migrations/20260822_admin_product_media_boundary.sql
update k2_private.ai_spend_control_config set paid_path_enabled=true,provider_model_snapshot='gpt-4.1-mini-2025-04-14+gpt-image-1:k2.intake-ai.2026-09-06',per_product_usd_micros=2100000,per_session_usd_micros=2100000,monthly_usd_micros=2100000;
-- Test-only signature producer: real production verifier and HMAC are exercised.
create function public.intake_test_call(action text,payload jsonb,request_id uuid default gen_random_uuid()) returns jsonb language plpgsql as $$
declare t bigint:=extract(epoch from clock_timestamp())::bigint; n uuid:=gen_random_uuid(); s text;
begin
 s:=encode(extensions.hmac(convert_to('intake_ai_'||action||E'\n'||t::text||E'\n'||n::text||E'\n'||auth.uid()::text||E'\n'||request_id::text||E'\n'||encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),'UTF8'),decode(repeat('05',32),'hex'),'sha256'),'hex');
 return public.execute_admin_intake_ai_v1('intake_ai_'||action,t,n,request_id,payload::text,s);
end $$;
create function public.intake_test_signed(action text,payload jsonb,request_id uuid) returns jsonb language plpgsql as $$
declare t bigint:=extract(epoch from clock_timestamp())::bigint; n uuid:=gen_random_uuid(); s text;
begin
 s:=encode(extensions.hmac(convert_to(action||E'\n'||t::text||E'\n'||n::text||E'\n'||auth.uid()::text||E'\n'||request_id::text||E'\n'||encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),'UTF8'),decode(repeat('05',32),'hex'),'sha256'),'hex');
 return jsonb_build_object('p_action',action,'p_timestamp',t,'p_nonce',n,'p_idempotency_key',request_id,'p_payload_text',payload::text,'p_signature',s);
end $$;
