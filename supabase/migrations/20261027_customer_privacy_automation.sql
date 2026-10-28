-- MAP-019 / IDEA-20261027-02. Prepared only; exact provider/release approval required.
-- Apply LAST after identity/settings, current payment/receipt/delivery functions.
begin;
create table if not exists k2_private.customer_privacy_requests (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete restrict,
 customer_id uuid references public.customers(id) on delete restrict,
 channel text not null check(channel in ('email','phone')), contact_hash bytea,
 receipt_hash bytea not null check(octet_length(receipt_hash)=32),
 state text not null default 'verification_pending' check(state in ('verification_pending','pending','held','closed','cancelled','expired')),
 created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null default clock_timestamp()+interval '15 minutes',
 verified_at timestamptz, closed_at timestamptz, updated_at timestamptz not null default clock_timestamp(),
 attempts integer not null default 0, deliveries integer not null default 0, last_sent_at timestamptz,last_attempt_at timestamptz,
 delivered_at timestamptz,
 reasons text[] not null default '{}', retained_categories text[] not null default '{}', minimized_counts jsonb not null default '{}',
 provider_state text not null default 'not_started' check(provider_state in ('not_started','pending','running','complete','retry')),
 provider_lease uuid,provider_lease_until timestamptz,provider_attempts integer not null default 0,
 provider_retry_at timestamptz, external_pending boolean not null default true
);
alter table k2_private.customer_privacy_requests add column if not exists delivered_at timestamptz;
create unique index if not exists customer_privacy_one_open_idx on k2_private.customer_privacy_requests(user_id)
 where state in ('verification_pending','pending','held');
create index if not exists customer_privacy_worker_idx on k2_private.customer_privacy_requests(state,provider_state,provider_retry_at);
create table if not exists k2_private.customer_privacy_tombstones (
 user_id uuid primary key references auth.users(id) on delete restrict,
 customer_id uuid references public.customers(id) on delete restrict,
 request_id uuid not null unique references k2_private.customer_privacy_requests(id) on delete restrict,
 closed_at timestamptz not null default clock_timestamp()
);
create table if not exists k2_private.customer_privacy_holds (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete restrict,
 kind text not null check(kind in ('legal','refund','dispute','security')),reason text not null check(length(trim(reason)) between 3 and 1000),
 created_at timestamptz not null default clock_timestamp(),resolved_at timestamptz,
 created_by uuid not null references auth.users(id) on delete restrict,resolved_by uuid references auth.users(id) on delete restrict
);
create index if not exists customer_privacy_holds_open_idx on k2_private.customer_privacy_holds(customer_id) where resolved_at is null;
-- Kept independent of request-row locks so a busy request cannot block queue
-- fairness. This table contains no customer contact or message data.
create table if not exists k2_private.customer_privacy_worker_cooldowns (
 request_id uuid primary key, retry_after timestamptz not null,last_attempted timestamptz not null default clock_timestamp()
);
alter table k2_private.customer_privacy_worker_cooldowns add column if not exists last_attempted timestamptz not null default clock_timestamp();
revoke all on k2_private.customer_privacy_requests,k2_private.customer_privacy_tombstones,k2_private.customer_privacy_holds,k2_private.customer_privacy_worker_cooldowns from public,anon,authenticated;

-- Preserve the installed signer and wrap only its closed-actor boundary. This
-- migration must follow every signer replacement; source/ACL capture precedes apply.
do $$ begin
 if to_regprocedure('k2_private.verify_guest_bff_without_privacy_v1(text,bigint,uuid,text,text,text)') is null then
   alter function k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text) rename to verify_guest_bff_without_privacy_v1;
 end if;
end $$;
revoke all on function k2_private.verify_guest_bff_without_privacy_v1(text,bigint,uuid,text,text,text) from public,anon,authenticated;
create or replace function k2_private.verify_guest_bff_request(p_action text,p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text)
returns boolean language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is not null then
   perform pg_advisory_xact_lock(hashtextextended('account-claim-user:'||auth.uid()::text,0));
   if exists(select 1 from k2_private.customer_privacy_tombstones where user_id=auth.uid()) then return false; end if;
 end if;
 return k2_private.verify_guest_bff_without_privacy_v1(p_action,p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature);
end $$;
revoke all on function k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text) from public,anon,authenticated;

create or replace function k2_private.privacy_receipt(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('requestId',id,'state',state,'createdAt',created_at,'verifiedAt',verified_at,'closedAt',closed_at,
   'reasons',reasons,'retainedCategories',retained_categories,'providerState',provider_state,'externalPending',external_pending,
   'canCancel',state in ('verification_pending','pending','held'),'expiresAt',case when state='verification_pending' then expires_at else null end)
 from k2_private.customer_privacy_requests where id=p_id
$$;
revoke all on function k2_private.privacy_receipt(uuid) from public,anon,authenticated;

create or replace function k2_private.process_customer_privacy(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r k2_private.customer_privacy_requests; c public.customers; v_reasons text[]:='{}'; retained text[]:=array['excel_review','backup_review'];
 transactions boolean; count_messages integer:=0; current_customer uuid;
begin
 select * into r from k2_private.customer_privacy_requests where id=p_id;
 if not found or r.state not in ('pending','held') or r.verified_at is null then return; end if;
 perform set_config('lock_timeout','1500ms',true);
 perform pg_advisory_xact_lock(hashtextextended('account-claim-user:'||r.user_id::text,0));
 select customer_id into current_customer from public.customer_accounts where user_id=r.user_id and status='active';
 r.customer_id:=coalesce(r.customer_id,current_customer);
 if r.customer_id is not null then select * into c from public.customers where id=r.customer_id for update; end if;
 select * into r from k2_private.customer_privacy_requests where id=p_id for update;
 if r.state not in ('pending','held') then return; end if;
 if r.customer_id is null and current_customer is not null then
   update k2_private.customer_privacy_requests set customer_id=current_customer where id=r.id returning * into r;
 end if;
 if exists(select 1 from public.user_profiles where id=r.user_id and role::text in ('Admin','Staff','SuperAdmin')) then
   v_reasons:=array_append(v_reasons,'account_role_review'); end if;
 if r.customer_id is not null and (current_customer is distinct from r.customer_id or c.status is distinct from 'active') then
   v_reasons:=array_append(v_reasons,'identity_review'); end if;
 if exists(select 1 from public.order_requests where customer_id=r.customer_id and
   (status not in ('fulfilled','cancelled') or payment_status='evidence_submitted'
     or (status='cancelled' and payment_status='verified'))) then v_reasons:=array_append(v_reasons,'open_order_or_payment'); end if;
 if exists(select 1 from public.pasabuy_requests where customer_id=r.customer_id and status not in ('delivered','expired','cancelled')) then v_reasons:=array_append(v_reasons,'open_pasabuy'); end if;
 if exists(select 1 from public.wholesale_inquiries where customer_id=r.customer_id and status<>'closed') then v_reasons:=array_append(v_reasons,'open_wholesale'); end if;
 if exists(select 1 from k2_private.customer_privacy_holds where customer_id=r.customer_id and resolved_at is null) then v_reasons:=array_append(v_reasons,'active_hold'); end if;
 if exists(select 1 from public.conversations cv where cv.customer_id=r.customer_id and cv.status<>'Resolved' and
   (cv.source_kind in ('refund','dispute','chargeback','legal_hold') or exists(select 1 from public.conversation_events e
     where e.conversation_id=cv.id and (e.event_type in ('refund_opened','dispute_opened','legal_hold')
       or coalesce(e.reason,'') ~* '(refund|dispute|chargeback|legal hold)')))) then v_reasons:=array_append(v_reasons,'case_review'); end if;
 if cardinality(v_reasons)>0 then
   update k2_private.customer_privacy_requests set state='held',reasons=v_reasons,updated_at=clock_timestamp() where id=p_id;
   return;
 end if;
 -- Preserve operational, financial and historical free-text truth while OWNER-006
 -- record-specific schedules remain unapproved. Independent profile data can close.
 transactions:=exists(select 1 from public.order_requests where customer_id=r.customer_id)
   or exists(select 1 from public.pasabuy_requests where customer_id=r.customer_id)
   or exists(select 1 from public.wholesale_inquiries where customer_id=r.customer_id)
   or exists(select 1 from k2_private.customer_privacy_holds where customer_id=r.customer_id)
   or exists(select 1 from public.conversations cv where cv.customer_id=r.customer_id and
     (cv.source_kind in ('refund','dispute','chargeback','legal_hold') or exists(select 1 from public.conversation_events e where e.conversation_id=cv.id
       and (e.event_type in ('refund_opened','dispute_opened','legal_hold') or coalesce(e.reason,'') ~* '(refund|dispute|chargeback|legal hold)'))));
 if transactions then retained:=array_append(retained,'transaction_retention_review');
 elsif r.customer_id is not null then
   update public.messages m set content='[Removed after verified account closure]',provider_event_key=null,external_message_id=null,failure_reason=null
     from public.conversations cv where m.conversation_id=cv.id and cv.customer_id=r.customer_id and cv.platform::text='Website';
   get diagnostics count_messages=row_count;
   update public.conversations set customer_name='Closed customer',customer_email=null,customer_phone=null,updated_at=clock_timestamp()
     where customer_id=r.customer_id and platform::text='Website';
   if exists(select 1 from public.conversation_events e join public.conversations cv on cv.id=e.conversation_id where cv.customer_id=r.customer_id) then
     retained:=array_append(retained,'conversation_audit_review'); end if;
 end if;
 if exists(select 1 from public.conversations where customer_id=r.customer_id and platform::text<>'Website')
   or exists(select 1 from public.channel_identities where customer_id=r.customer_id) then retained:=array_append(retained,'external_channel_review'); end if;
 -- Complete the local inbox lifecycle while the customer is still active and
 -- locked. This records no external-channel delivery or remote deletion.
 insert into public.conversation_events(conversation_id,event_type,actor_id,reason,metadata)
   select id,'privacy_closed',auth.uid(),'Verified account closure',jsonb_build_object('request_id',r.id)
   from public.conversations where customer_id=r.customer_id and status<>'Resolved';
 update public.conversations set status='Resolved',resolved_at=coalesce(resolved_at,clock_timestamp()),unread_count=0,updated_at=clock_timestamp()
   where customer_id=r.customer_id and status<>'Resolved';
 -- Mapping first: the existing validation trigger still requires the verified contact.
 update public.customer_accounts set status='revoked',revoked_at=clock_timestamp() where user_id=r.user_id;
 update public.guest_access_grants set status='revoked',revoked_at=clock_timestamp(),revoke_reason='verified_account_closure'
   where customer_id=r.customer_id and status<>'revoked';
 update public.customer_claim_requests set status='cancelled' where customer_id=r.customer_id and status='pending';
 delete from k2_private.customer_account_settings where user_id=r.user_id;
 delete from k2_private.customer_account_notifications where user_id=r.user_id;
 -- Keep Auth UUID/FKs; provider worker obfuscates contact and destroys sessions.
 update public.user_profiles set email=null,full_name=null,updated_at=clock_timestamp() where id=r.user_id;
 update public.customer_contact_points set verification_status='revoked',revoked_at=clock_timestamp(),
   contact_value='closed:'||id::text,normalized_hash=extensions.digest(convert_to(r.id::text||':'||id::text,'UTF8'),'sha256'),updated_at=clock_timestamp()
   where customer_id=r.customer_id;
 update public.channel_identities set link_status='revoked',updated_at=clock_timestamp() where customer_id=r.customer_id;
 update public.customers set display_name='Closed customer',status='deleted',updated_at=clock_timestamp() where id=r.customer_id;
 insert into k2_private.customer_privacy_tombstones(user_id,customer_id,request_id) values(r.user_id,r.customer_id,r.id) on conflict(user_id) do nothing;
 update k2_private.customer_privacy_requests set state='closed',closed_at=clock_timestamp(),updated_at=clock_timestamp(),contact_hash=null,
   reasons='{}',retained_categories=retained,minimized_counts=jsonb_build_object('messages',count_messages),provider_state='pending' where id=r.id;
 delete from k2_private.customer_privacy_worker_cooldowns where request_id=r.id;
end $$;
revoke all on function k2_private.process_customer_privacy(uuid) from public,anon,authenticated;

create or replace function public.customer_privacy_command_v1(
 p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;r k2_private.customer_privacy_requests;kind text;contact_value text;contact_digest bytea;cust uuid;budget record;
begin
 if p_timestamp is null or p_nonce is null or p_payload_text is null or p_ip_hash is null or p_signature is null
   or p_ip_hash !~ '^[0-9a-f]{64}$' or p_signature !~ '^[0-9a-f]{64}$'
   or not k2_private.verify_guest_bff_without_privacy_v1('account_settings_write',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then
   return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
 begin p:=p_payload_text::jsonb;
 exception when data_exception then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end;
 if jsonb_typeof(p)<>'object' or coalesce(p->>'operation','') not in ('begin','status','send','sent','attempt','confirm','cancel','process')
   or coalesce(p->>'requestId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   or coalesce(p->>'receiptHash','') !~ '^[0-9a-f]{64}$' or exists(select 1 from jsonb_object_keys(p)k where k not in ('operation','requestId','receiptHash','channel','contactHash','proofVerified')) then
   return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
 select * into budget from k2_private.consume_guest_rate('customer_privacy','ip',decode(p_ip_hash,'hex'),300,60);
 if not budget.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',budget.retry_after_seconds); end if;
 if p->>'operation'<>'status' then
   if auth.uid() is null or exists(select 1 from public.user_profiles where id=auth.uid() and role::text in ('Admin','Staff','SuperAdmin')) then
     return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
   perform pg_advisory_xact_lock(hashtextextended('account-claim-user:'||auth.uid()::text,0));
 end if;
 if p->>'operation'='begin' then
   if exists(select 1 from k2_private.customer_privacy_tombstones where user_id=auth.uid()) then return jsonb_build_object('ok',false,'error_code','ACCOUNT_CLOSED'); end if;
   kind:=p->>'channel';
   select case when kind='email' and email_confirmed_at is not null then lower(trim(email))
     when kind='phone' and phone_confirmed_at is not null then regexp_replace(phone,'[^0-9+]','','g') end into contact_value from auth.users where id=auth.uid();
   if kind not in ('email','phone') or contact_value is null or p->>'contactHash' is distinct from encode(extensions.digest(convert_to(kind||':'||contact_value,'UTF8'),'sha256'),'hex') then
     return jsonb_build_object('ok',false,'error_code','ACCOUNT_CONTACT_NOT_VERIFIED'); end if;
   update k2_private.customer_privacy_requests set state='expired',contact_hash=null,updated_at=clock_timestamp() where user_id=auth.uid() and state='verification_pending' and expires_at<clock_timestamp();
   select customer_id into cust from public.customer_accounts where user_id=auth.uid() and status='active';
   if cust is not null then perform 1 from public.customers where id=cust and status='active' for update;
     if not found then return jsonb_build_object('ok',false,'error_code','ACCOUNT_CLOSED'); end if; end if;
   if exists(select 1 from k2_private.customer_privacy_requests where user_id=auth.uid() and state in ('verification_pending','pending','held') and id<>(p->>'requestId')::uuid) then
     return jsonb_build_object('ok',false,'error_code','PRIVACY_REQUEST_EXISTS'); end if;
   insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,contact_hash,receipt_hash)
     values((p->>'requestId')::uuid,auth.uid(),cust,kind,decode(p->>'contactHash','hex'),decode(p->>'receiptHash','hex')) on conflict(id) do nothing;
 end if;
 -- Consistent lock order for confirmation/worker/cancellation: actor, customer, request.
 select * into r from k2_private.customer_privacy_requests where id=(p->>'requestId')::uuid and receipt_hash=decode(p->>'receiptHash','hex');
 if not found or (p->>'operation'<>'status' and r.user_id is distinct from auth.uid()) then
   return jsonb_build_object('ok',false,'error_code','PRIVACY_REQUEST_NOT_FOUND'); end if;
 if p->>'operation'='status' then return jsonb_build_object('ok',true,'receipt',k2_private.privacy_receipt(r.id)); end if;
 if r.customer_id is not null then perform 1 from public.customers where id=r.customer_id for update; end if;
 select * into r from k2_private.customer_privacy_requests where id=r.id for update;
 if p->>'operation'='cancel' then
   if r.state in ('verification_pending','pending','held') then
     update k2_private.customer_privacy_requests set state='cancelled',contact_hash=null,updated_at=clock_timestamp() where id=r.id;
     delete from k2_private.customer_privacy_worker_cooldowns where request_id=r.id;
   elsif r.state<>'cancelled' then return jsonb_build_object('ok',false,'error_code','PRIVACY_PROCESSING_STARTED'); end if;
 elsif p->>'operation'='process' then
   begin perform k2_private.process_customer_privacy(r.id);
   exception when lock_not_available or deadlock_detected then null;end;
 elsif p->>'operation' in ('send','sent','attempt','confirm') and r.state='verification_pending' then
   if r.expires_at<clock_timestamp() then update k2_private.customer_privacy_requests set state='expired',contact_hash=null where id=r.id;
     return jsonb_build_object('ok',false,'error_code','PRIVACY_PROOF_EXPIRED'); end if;
   select case when r.channel='email' and email_confirmed_at is not null then lower(trim(email))
     when r.channel='phone' and phone_confirmed_at is not null then regexp_replace(phone,'[^0-9+]','','g') end into contact_value from auth.users where id=r.user_id;
   contact_digest:=extensions.digest(convert_to(r.channel||':'||contact_value,'UTF8'),'sha256');
   if contact_value is null or contact_digest is distinct from r.contact_hash then return jsonb_build_object('ok',false,'error_code','PRIVACY_CONTACT_CHANGED'); end if;
   if p->>'operation'='send' then
     if r.deliveries>=3 or r.last_sent_at>clock_timestamp()-interval '60 seconds' then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',60); end if;
     update k2_private.customer_privacy_requests set deliveries=deliveries+1,last_sent_at=clock_timestamp(),delivered_at=null,last_attempt_at=null where id=r.id;
   elsif p->>'operation'='sent' then
     if r.last_sent_at is null or r.last_sent_at<r.created_at then return jsonb_build_object('ok',false,'error_code','PRIVACY_PROOF_REQUIRED'); end if;
     update k2_private.customer_privacy_requests set delivered_at=clock_timestamp() where id=r.id;
   elsif p->>'operation'='attempt' then
     if r.delivered_at is null or r.delivered_at<r.last_sent_at then return jsonb_build_object('ok',false,'error_code','PRIVACY_PROOF_REQUIRED'); end if;
     if r.attempts>=5 then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',900); end if;
     update k2_private.customer_privacy_requests set attempts=attempts+1,last_attempt_at=clock_timestamp() where id=r.id;
   else
     if p->'proofVerified' is distinct from 'true'::jsonb or p->>'contactHash' is distinct from encode(r.contact_hash,'hex')
       or r.delivered_at is null or r.last_attempt_at is null or r.last_attempt_at<r.delivered_at or r.last_attempt_at<clock_timestamp()-interval '60 seconds' then return jsonb_build_object('ok',false,'error_code','PRIVACY_PROOF_REQUIRED'); end if;
     -- A deliberately linked guest identity may have appeared since challenge creation.
     select customer_id into cust from public.customer_accounts where user_id=r.user_id and status='active';
     if r.customer_id is not null and cust is distinct from r.customer_id then return jsonb_build_object('ok',false,'error_code','ACCOUNT_IDENTITY_CONFLICT'); end if;
     update k2_private.customer_privacy_requests set state='pending',customer_id=coalesce(customer_id,cust),verified_at=clock_timestamp(),updated_at=clock_timestamp() where id=r.id;
   end if;
 end if;
 return jsonb_build_object('ok',true,'receipt',k2_private.privacy_receipt(r.id),
   'verification',case when p->>'operation' in ('send','attempt') and r.state='verification_pending' then jsonb_build_object('channel',r.channel) else null end);
end $$;
revoke all on function public.customer_privacy_command_v1(bigint,uuid,text,text,text) from public,anon,authenticated;
-- Anonymous use is ONLY the signed, high-entropy minimal receipt recovery path.
grant execute on function public.customer_privacy_command_v1(bigint,uuid,text,text,text) to anon,authenticated;

-- Serialize every new association/operation with closure's customer-row lock.
create or replace function k2_private.enforce_open_customer() returns trigger language plpgsql security definer set search_path='' as $$
declare cid uuid;current_status text;
begin
 if tg_table_name in ('messages','conversation_events') then select customer_id into cid from public.conversations where id=new.conversation_id;
 else cid:=new.customer_id; end if;
 if cid is null then return new; end if;
 if tg_table_name in ('guest_access_grants','customer_accounts') and to_jsonb(new)->>'status'<>'active' then return new; end if;
 select status into current_status from public.customers where id=cid for update;
 -- Retained terminal financial records still permit the existing authorized
 -- verified-to-refunded reconciliation, without reintroducing customer PII.
 if current_status='deleted' and tg_table_name='order_requests' and tg_op='UPDATE'
   and auth.uid() is not null and public.is_staff() and coalesce(auth.jwt()->>'aal','')='aal2'
   and to_jsonb(new)->>'payment_status'='refunded' and to_jsonb(old)->>'payment_status'='verified'
   and to_jsonb(new)->>'status' in ('fulfilled','cancelled')
   and to_jsonb(new)-array['payment_status','updated_at']=to_jsonb(old)-array['payment_status','updated_at'] then return new; end if;
 if current_status is distinct from 'active' then raise exception using errcode='42501',message='K2_CUSTOMER_CLOSED'; end if;
 return new;
end $$;
revoke all on function k2_private.enforce_open_customer() from public,anon,authenticated;
do $$ declare tbl text;begin
 foreach tbl in array array['pasabuy_requests','wholesale_inquiries','customer_accounts','guest_access_grants'] loop
   execute format('drop trigger if exists privacy_open_customer on public.%I',tbl);
   execute format('create trigger privacy_open_customer before insert or update of customer_id,status on public.%I for each row execute function k2_private.enforce_open_customer()',tbl);
 end loop;
 foreach tbl in array array['customer_contact_points'] loop
   execute format('drop trigger if exists privacy_open_customer on public.%I',tbl);
   execute format('create trigger privacy_open_customer before insert or update of customer_id on public.%I for each row execute function k2_private.enforce_open_customer()',tbl);
 end loop;
end $$;
drop trigger if exists privacy_open_customer on public.order_requests;
create trigger privacy_open_customer before insert or update of customer_id,status,payment_status on public.order_requests for each row execute function k2_private.enforce_open_customer();
drop trigger if exists privacy_open_customer on public.conversations;
create trigger privacy_open_customer before insert or update of customer_id,status,source_kind on public.conversations for each row execute function k2_private.enforce_open_customer();
drop trigger if exists privacy_open_customer on public.conversation_events;
create trigger privacy_open_customer before insert on public.conversation_events for each row execute function k2_private.enforce_open_customer();
drop trigger if exists privacy_open_customer on k2_private.customer_privacy_holds;
create trigger privacy_open_customer before insert or update of customer_id,resolved_at on k2_private.customer_privacy_holds for each row execute function k2_private.enforce_open_customer();
drop trigger if exists privacy_open_customer on public.messages;
create trigger privacy_open_customer before insert on public.messages for each row execute function k2_private.enforce_open_customer();

-- Retain source/role evidence and the original implementation, with no client
-- execute grant on originals. Wrappers preserve each existing caller role.
create table if not exists k2_private.customer_privacy_legacy_guards (
 name text primary key,signature text not null,source_md5 text not null,
 anon_execute boolean not null,authenticated_execute boolean not null
);
revoke all on k2_private.customer_privacy_legacy_guards from public,anon,authenticated;
do $$ declare name text;args text;oid oid;begin
 foreach name in array array['get_order_conversation_v1','submit_order_message_v1','submit_order_payment_receipt_v1'] loop
   args:=case name when 'get_order_conversation_v1' then 'uuid,text' when 'submit_order_message_v1' then 'uuid,text,text,uuid' else 'uuid,text,text,text,text,uuid' end;
   oid:=to_regprocedure('public.'||name||'('||args||')');
   if oid is null then raise exception 'K2_PRIVACY_LEGACY_DEPENDENCY_MISSING: %',name; end if;
   if to_regprocedure('public.'||name||'_before_privacy('||args||')') is null then
     insert into k2_private.customer_privacy_legacy_guards values(name,args,md5(pg_get_functiondef(oid)),
       has_function_privilege('anon',oid,'EXECUTE'),has_function_privilege('authenticated',oid,'EXECUTE')) on conflict on constraint customer_privacy_legacy_guards_pkey do nothing;
     execute format('alter function public.%I(%s) rename to %I',name,args,name||'_before_privacy');
   end if;
   execute format('revoke all on function public.%I(%s) from public,anon,authenticated',name||'_before_privacy',args);
 end loop;
end $$;
create or replace function k2_private.order_customer_access_open(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$ declare cid uuid;v_state text;begin
 select customer_id into cid from public.order_requests where id=p_id;
 if not found then return false; end if;
 if cid is null then return true; end if;
 select status into v_state from public.customers where id=cid for update;
 return coalesce(v_state='active',false);
end $$;
revoke all on function k2_private.order_customer_access_open(uuid) from public,anon,authenticated;
create or replace function public.get_order_conversation_v1(p_order_id uuid,p_order_key text) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
 if not k2_private.order_customer_access_open(p_order_id) then return jsonb_build_object('ok',false,'error','ORDER_ACCESS_REQUIRED'); end if;
 return public.get_order_conversation_v1_before_privacy(p_order_id,p_order_key);
end $$;
create or replace function public.submit_order_message_v1(p_order_id uuid,p_order_key text,p_message text,p_request_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
 if not k2_private.order_customer_access_open(p_order_id) then return jsonb_build_object('ok',false,'error','ORDER_ACCESS_REQUIRED'); end if;
 return public.submit_order_message_v1_before_privacy(p_order_id,p_order_key,p_message,p_request_key);
end $$;
create or replace function public.submit_order_payment_receipt_v1(p_order_id uuid,p_order_key text,p_payment_reference text,p_media_type text,p_base64 text,p_request_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
 if not k2_private.order_customer_access_open(p_order_id) then return jsonb_build_object('ok',false,'error','ORDER_ACCESS_REQUIRED'); end if;
 return public.submit_order_payment_receipt_v1_before_privacy(p_order_id,p_order_key,p_payment_reference,p_media_type,p_base64,p_request_key);
end $$;
do $$ declare f record;begin
 for f in select * from k2_private.customer_privacy_legacy_guards loop
   execute format('revoke all on function public.%I(%s) from public,anon,authenticated',f.name,f.signature);
   if f.anon_execute then execute format('grant execute on function public.%I(%s) to anon',f.name,f.signature); end if;
   if f.authenticated_execute then execute format('grant execute on function public.%I(%s) to authenticated',f.name,f.signature); end if;
 end loop;
end $$;

create or replace function public.customer_privacy_worker_v1(p_operation text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r k2_private.customer_privacy_requests; candidate record;n integer:=0;lease uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception using errcode='42501',message='K2_PRIVACY_WORKER_REQUIRED'; end if;
 if p_operation='tick' and p_payload='{}'::jsonb then
   -- The Storefront function has a short execution budget. Bound each tick so
   -- a locked customer cannot consume the whole invocation and strand leases.
   if not pg_try_advisory_xact_lock(hashtextextended('customer-privacy-worker-tick',0)) then return jsonb_build_object('ok',true,'checked',0); end if;
   for candidate in select request_row.id from k2_private.customer_privacy_requests request_row
     left join k2_private.customer_privacy_worker_cooldowns cooldown on cooldown.request_id=request_row.id
     where request_row.state in ('pending','held') and (cooldown.retry_after is null or cooldown.retry_after<=clock_timestamp())
     order by coalesce(cooldown.last_attempted,request_row.updated_at),request_row.id limit 1 loop
     begin
       perform k2_private.process_customer_privacy(candidate.id);
       delete from k2_private.customer_privacy_worker_cooldowns where request_id=candidate.id;
     exception when lock_not_available or deadlock_detected then
       insert into k2_private.customer_privacy_worker_cooldowns(request_id,retry_after,last_attempted) values(candidate.id,clock_timestamp()+interval '5 minutes',clock_timestamp())
         on conflict(request_id) do update set retry_after=excluded.retry_after,last_attempted=excluded.last_attempted;
       when others then
         -- Preserve the verified request for Admin review without exposing
         -- database error text or claiming that closure completed.
         delete from k2_private.customer_privacy_worker_cooldowns where request_id=candidate.id;
         update k2_private.customer_privacy_requests set state='held',reasons=array['processing_review'],updated_at=clock_timestamp()
           where id=candidate.id and state in ('pending','held') and verified_at is not null;
     end;
     n:=n+1;
   end loop;
   return jsonb_build_object('ok',true,'checked',n);
 elsif p_operation='lease' and p_payload='{}'::jsonb then
   select * into r from k2_private.customer_privacy_requests where state='closed'
     and (provider_state in ('pending','retry') or (provider_state='running' and provider_lease_until<clock_timestamp()))
     and (provider_retry_at is null or provider_retry_at<=clock_timestamp()) order by updated_at,id for update skip locked limit 1;
   if not found then return jsonb_build_object('ok',true,'task',null); end if;
   lease:=gen_random_uuid();
   update k2_private.customer_privacy_requests set provider_state='running',provider_lease=lease,
     provider_lease_until=clock_timestamp()+interval '2 minutes',provider_attempts=provider_attempts+1 where id=r.id;
   return jsonb_build_object('ok',true,'task',jsonb_build_object('requestId',r.id,'userId',r.user_id,'lease',lease));
 elsif p_operation in ('complete','retry') and jsonb_typeof(p_payload)='object'
   and (select count(*) from jsonb_object_keys(p_payload))=2 and p_payload ?& array['requestId','lease'] then
   select * into r from k2_private.customer_privacy_requests where id::text=p_payload->>'requestId' for update;
   if not found or r.state<>'closed' or r.provider_lease::text is distinct from p_payload->>'lease' then
     return jsonb_build_object('ok',false,'error_code','PRIVACY_LEASE_STALE'); end if;
   if r.provider_state='complete' then return jsonb_build_object('ok',true,'alreadyComplete',true); end if;
   update k2_private.customer_privacy_requests set provider_state=case when p_operation='complete' then 'complete' else 'retry' end,
     provider_lease_until=null,updated_at=clock_timestamp(),provider_retry_at=case when p_operation='retry' then
       clock_timestamp()+make_interval(secs=>least(3600,15*power(2,least(r.provider_attempts,8)))::integer) else null end where id=r.id;
   return jsonb_build_object('ok',true);
 end if;
 return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID');
end $$;
revoke all on function public.customer_privacy_worker_v1(text,jsonb) from public,anon,authenticated;
grant execute on function public.customer_privacy_worker_v1(text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
