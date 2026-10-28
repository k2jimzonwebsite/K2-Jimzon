\set ON_ERROR_STOP on
begin;
create or replace function k2_test.privacy(payload jsonb) returns jsonb language plpgsql as $$
declare ts bigint:=extract(epoch from clock_timestamp())::bigint; nonce uuid:=gen_random_uuid(); txt text:=payload::text;r jsonb;
begin r:=public.customer_privacy_command_v1(ts,nonce,txt,repeat('a',64),k2_test.signature('account_settings_write',ts,nonce,txt,repeat('a',64)));
 if payload->>'operation'='confirm' and r->'receipt'->>'state'='pending' then
   payload:=payload-'proofVerified'-'contactHash'||'{"operation":"process"}'::jsonb;txt:=payload::text;nonce:=gen_random_uuid();
   r:=public.customer_privacy_command_v1(ts,nonce,txt,repeat('a',64),k2_test.signature('account_settings_write',ts,nonce,txt,repeat('a',64)));
 end if;return r;end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ declare r jsonb; p jsonb; begin
 p:=jsonb_build_object('operation','begin','requestId','60000000-0000-4000-8000-000000000001',
 'receiptHash',repeat('b',64),'channel','email','contactHash',encode(extensions.digest('email:a@example.test','sha256'),'hex'));
 r:=k2_test.privacy(p);
 if r->'receipt'->>'state'<>'verification_pending' then raise exception 'CHALLENGE_NOT_DURABLE: %',r; end if;
 p:=(p-'channel'-'contactHash')||'{"operation":"confirm","proofVerified":false}'::jsonb;
 r:=k2_test.privacy(p); if r->>'ok'<>'false' then raise exception 'UNVERIFIED_CLOSURE_ALLOWED'; end if;
 p:=(p-'proofVerified')||'{"operation":"attempt"}'::jsonb; r:=k2_test.privacy(p);
 if r->>'error_code'<>'PRIVACY_PROOF_REQUIRED' then raise exception 'ATTEMPT_BEFORE_CODE_DELIVERY_ALLOWED'; end if;
 r:=k2_test.privacy(p||'{"operation":"send"}'::jsonb);r:=k2_test.privacy(p||'{"operation":"sent"}'::jsonb);r:=k2_test.privacy(p);
 p:=p||jsonb_build_object('operation','confirm','proofVerified',true,'contactHash',encode(extensions.digest('email:a@example.test','sha256'),'hex'));
 update public.order_requests set status='submitted' where public_reference='WEB-TEST-001';
 r:=k2_test.privacy(p);
 if r->'receipt'->>'state'<>'held' or (select status from public.customer_accounts where user_id=auth.uid())<>'active' then raise exception 'OPEN_ORDER_DID_NOT_HOLD_ACCESS: %',r; end if;
 -- Cancellation is possible while held; repeating exact cancellation is harmless.
 insert into k2_private.customer_privacy_worker_cooldowns(request_id,retry_after) values((p->>'requestId')::uuid,now()+interval '5 minutes');
 r:=k2_test.privacy((p-'proofVerified'-'contactHash')||'{"operation":"cancel"}'::jsonb);
 if r->'receipt'->>'state'<>'cancelled' or exists(select 1 from k2_private.customer_privacy_worker_cooldowns where request_id=(p->>'requestId')::uuid) then raise exception 'PENDING_CANCELLATION_FAILED'; end if;
 -- A fresh verified request automatically resumes once an open order resolves.
 p:=jsonb_build_object('operation','begin','requestId','60000000-0000-4000-8000-000000000002','receiptHash',repeat('d',64),
 'channel','email','contactHash',encode(extensions.digest('email:a@example.test','sha256'),'hex'));
 r:=k2_test.privacy(p);p:=(p-'channel'-'contactHash')||'{"operation":"attempt"}'::jsonb;r:=k2_test.privacy(p||'{"operation":"send"}'::jsonb);r:=k2_test.privacy(p||'{"operation":"sent"}'::jsonb);r:=k2_test.privacy(p);
 r:=k2_test.privacy(p||jsonb_build_object('operation','confirm','proofVerified',true,'contactHash',encode(extensions.digest('email:a@example.test','sha256'),'hex')));
 update public.order_requests set status='fulfilled' where public_reference='WEB-TEST-001';
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.user_profiles(id,role) values('10000000-0000-4000-8000-000000000001','Staff');
 r:=public.customer_privacy_worker_v1('tick','{}');
 if (select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-000000000002')<>'held' then raise exception 'PROMOTED_STAFF_ACCOUNT_AUTO_CLOSED'; end if;
 update public.user_profiles set role='Customer' where id='10000000-0000-4000-8000-000000000001';
 r:=public.customer_privacy_worker_v1('tick','{}');
 if (select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-000000000002')<>'closed' then raise exception 'AUTO_RESUME_FAILED'; end if;
 r:=public.get_order_conversation_v1('40000000-0000-4000-8000-000000000001',repeat('k',64));
 if r->>'error'<>'ORDER_ACCESS_REQUIRED' then raise exception 'STALE_CHECKOUT_KEY_READ_ALLOWED: %',r; end if;
 r:=public.submit_order_message_v1('40000000-0000-4000-8000-000000000001',repeat('k',64),'forbidden',gen_random_uuid());
 if r->>'error'<>'ORDER_ACCESS_REQUIRED' then raise exception 'STALE_CHECKOUT_KEY_REPLY_ALLOWED'; end if;
 r:=public.submit_order_payment_receipt_v1('40000000-0000-4000-8000-000000000001',repeat('k',64),'forbidden','application/pdf','eA==',gen_random_uuid());
 if r->>'error'<>'ORDER_ACCESS_REQUIRED' then raise exception 'STALE_CHECKOUT_KEY_PROOF_ALLOWED'; end if;
 begin
   update public.order_requests set payment_status='refunded' where public_reference='WEB-TEST-001';
   raise exception 'UNAUTHORIZED_CLOSED_REFUND_ALLOWED';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"role":"authenticated","is_staff":true,"aal":"aal2"}',true);
 update public.order_requests set payment_status='refunded',updated_at=clock_timestamp() where public_reference='WEB-TEST-001';
 begin
   update public.order_requests set payment_status='refunded',total_amount=999 where public_reference='WEB-TEST-002';
   raise exception 'CLOSED_REFUND_CHANGED_CANONICAL_AMOUNT';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{}',true);
 begin
   insert into public.order_requests(public_reference,customer_id,status,payment_status) values('WEB-CLOSED-NEW','20000000-0000-4000-8000-000000000001','submitted','not_requested');
   raise exception 'CLOSED_CUSTOMER_NEW_ORDER_ALLOWED';
 exception when insufficient_privilege then null;end;
 begin
   insert into public.guest_access_grants(customer_id,token_hash,expires_at) values('20000000-0000-4000-8000-000000000001',extensions.digest('new-forbidden','sha256'),now()+interval '1 day');
   raise exception 'CLOSED_CUSTOMER_NEW_GRANT_ALLOWED';
 exception when insufficient_privilege then null;end;
end $$;
-- No order/payment customer: eligible inquiry content is minimized automatically.
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000003','c@example.test',now());
insert into public.customers(id,display_name,created_source) values('20000000-0000-4000-8000-000000000003','Private Inquiry','website_guest');
insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
 values('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','email','c@example.test',extensions.digest('c','sha256'),'verified',now(),'website_guest');
insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values
 ('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003');
insert into public.guest_access_grants(customer_id,token_hash,expires_at) values('20000000-0000-4000-8000-000000000003',extensions.digest('private-grant','sha256'),now()+interval '1 day');
insert into public.conversations(id,customer_id,customer_name,platform,status,source_kind)
 values('70000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','Private Inquiry','Website','Open','website_message');
insert into public.messages(conversation_id,sender_type,content,delivery_status) values('70000000-0000-4000-8000-000000000003','Customer','private body','received');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ declare r jsonb; p jsonb; ts bigint; n uuid; begin
 p:=jsonb_build_object('operation','begin','requestId','60000000-0000-4000-8000-000000000003','receiptHash',repeat('c',64),
 'channel','email','contactHash',encode(extensions.digest('email:c@example.test','sha256'),'hex'));
 r:=k2_test.privacy(p); p:=(p-'channel'-'contactHash')||'{"operation":"attempt"}'::jsonb;r:=k2_test.privacy(p||'{"operation":"send"}'::jsonb);r:=k2_test.privacy(p||'{"operation":"sent"}'::jsonb);r:=k2_test.privacy(p);
 r:=k2_test.privacy(p||jsonb_build_object('operation','confirm','proofVerified',true,'contactHash',encode(extensions.digest('email:c@example.test','sha256'),'hex')));
 if r->'receipt'->>'state'<>'closed' or r->'receipt'->>'externalPending'<>'true' then raise exception 'ELIGIBLE_CLOSURE_FAILED: %',r; end if;
 if exists(select 1 from public.guest_access_grants where customer_id='20000000-0000-4000-8000-000000000003' and status='active')
 or exists(select 1 from public.customer_accounts where user_id=auth.uid() and status='active')
 or exists(select 1 from public.messages where conversation_id='70000000-0000-4000-8000-000000000003' and content='private body') then raise exception 'ACCESS_OR_CONTENT_SURVIVED'; end if;
 if (select status from public.conversations where id='70000000-0000-4000-8000-000000000003')<>'Resolved' then raise exception 'CLOSED_INQUIRY_STRANDED_IN_OPEN_INBOX'; end if;
 if not exists(select 1 from public.conversation_events where conversation_id='70000000-0000-4000-8000-000000000003' and event_type='privacy_closed') then raise exception 'LOCAL_INBOX_CLOSURE_NOT_AUDITED'; end if;
 ts:=extract(epoch from clock_timestamp())::bigint;n:=gen_random_uuid();
 r:=public.read_customer_account_settings_v1(ts,n,'{}',repeat('a',64),k2_test.signature('account_settings_read',ts,n,'{}',repeat('a',64)));
 if r->>'ok'<>'false' then raise exception 'STALE_JWT_SETTINGS_ALLOWED'; end if;
 -- Recovery remains possible after Auth/session is gone; receipt is minimal.
 perform set_config('request.jwt.claim.sub','',true);
 r:=k2_test.privacy((p-'channel'-'contactHash')||'{"operation":"status"}'::jsonb);
 if r->'receipt'->>'state'<>'closed' or r::text like '%example.test%' or r::text like '%Private Inquiry%' then raise exception 'CLOSED_RECEIPT_RECOVERY_FAILED: %',r; end if;
end $$;
-- A newly verified identity with the same contact may claim a new guest record,
-- but the closed account's revoked grant and historical data stay inaccessible.
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000004','c@example.test',now());
insert into public.customers(id,display_name,created_source) values('20000000-0000-4000-8000-000000000004','New guest record','website_guest');
insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,source)
 select '30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','email','c@example.test',extensions.hmac(convert_to('email:c@example.test','UTF8'),contact_secret,'sha256'),'website_guest'
 from k2_private.guest_bff_secrets where singleton=true;
insert into public.guest_access_grants(customer_id,token_hash,expires_at) values('20000000-0000-4000-8000-000000000004',decode(repeat('f',64),'hex'),now()+interval '1 hour');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$
declare ts bigint; nonce uuid; result record; history record; payload text:='{"contactKind":"email","idempotencyKey":"90000000-0000-4000-8000-000000000004"}'; ip text:=repeat('a',64);
begin
 ts:=extract(epoch from clock_timestamp())::bigint;nonce:=gen_random_uuid();
 select * into result from public.claim_guest_customer_account_v1(ts,nonce,payload,ip,k2_test.signature('account_claim',ts,nonce,payload,ip),encode(extensions.digest('private-grant','sha256'),'hex'));
 if result.ok or result.error_code<>'GUEST_ACCESS_EXPIRED' then raise exception 'OLD_GRANT_RECLAIMED: %',result.error_code; end if;
 ts:=extract(epoch from clock_timestamp())::bigint;nonce:=gen_random_uuid();
 select * into result from public.claim_guest_customer_account_v1(ts,nonce,payload,ip,k2_test.signature('account_claim',ts,nonce,payload,ip),repeat('f',64));
 if not result.ok or not result.claimed then raise exception 'NEW_IDENTITY_CLAIM_FAILED: %',result.error_code; end if;
 if not exists(select 1 from public.customer_accounts where user_id=auth.uid() and customer_id='20000000-0000-4000-8000-000000000004' and status='active') then raise exception 'NEW_ACCOUNT_WRONG_CUSTOMER'; end if;
 ts:=extract(epoch from clock_timestamp())::bigint;nonce:=gen_random_uuid();
 select * into history from public.list_customer_account_history_v1(ts,nonce,'{}',ip,k2_test.signature('account_read',ts,nonce,'{}',ip));
 if not history.ok or history.conversations::text like '%private body%' or jsonb_array_length(history.conversations)<>0 then raise exception 'CLOSED_HISTORY_RESURRECTED'; end if;
end $$;
-- A real processing error must not erase the verified request or block the
-- whole worker forever; expose only a safe review category to the Admin queue.
insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at)
 values('60000000-0000-4000-8000-000000000099','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','email',extensions.digest('failure-fixture','sha256'),'pending',now());
create function k2_test.fail_closure() returns trigger language plpgsql as $$ begin raise exception 'PRIVATE_FIXTURE_FAILURE'; end $$;
create trigger fixture_fail_closure before update of status on public.customers for each row when (new.status='deleted') execute function k2_test.fail_closure();
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare result jsonb; begin
 result:=public.customer_privacy_worker_v1('tick','{}');
 if (select state from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-000000000099')<>'held'
    or (select reasons from k2_private.customer_privacy_requests where id='60000000-0000-4000-8000-000000000099')<>array['processing_review'] then raise exception 'PROCESSING_EXCEPTION_NOT_REVIEWABLE'; end if;
 if result::text like '%PRIVATE_FIXTURE_FAILURE%' then raise exception 'PROCESSING_EXCEPTION_LEAKED'; end if;
end $$;
rollback;
select 'CUSTOMER_PRIVACY_ASSERTIONS_PASSED';
