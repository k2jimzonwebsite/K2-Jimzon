\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('11000000-0000-4000-8000-000000000001','admin1@example.test',now()),
 ('11000000-0000-4000-8000-000000000002','admin2@example.test',now()),
 ('11000000-0000-4000-8000-000000000003','staff@example.test',now());
insert into public.user_profiles(id,role) values
 ('11000000-0000-4000-8000-000000000001','Admin'),
 ('11000000-0000-4000-8000-000000000002','Admin'),
 ('11000000-0000-4000-8000-000000000003','Staff');
insert into auth.users(id,email,email_confirmed_at) values('12000000-0000-4000-8000-000000000004','prehold@example.test',now());
insert into public.customers(id,display_name,created_source) values('22000000-0000-4000-8000-000000000004','Pre-hold customer','website_guest');
insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
 values('32000000-0000-4000-8000-000000000004','22000000-0000-4000-8000-000000000004','email','prehold@example.test',extensions.digest('prehold','sha256'),'verified',now(),'website_guest');
insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values('12000000-0000-4000-8000-000000000004','22000000-0000-4000-8000-000000000004','32000000-0000-4000-8000-000000000004');
insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at,reasons) values
 ('61000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','email',extensions.digest('private capability','sha256'),'held',now(),array['open_order_or_payment']),
 ('61000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','email',extensions.digest('private capability2','sha256'),'held',now(),array['active_hold']);
create function k2_test.admin_privacy(action text,payload jsonb,key uuid default gen_random_uuid()) returns jsonb language plpgsql as $$
declare ts bigint:=extract(epoch from clock_timestamp())::bigint; nonce uuid:=gen_random_uuid(); txt text:=payload::text; sig text;
begin
 select encode(extensions.hmac(convert_to(action||E'\n'||ts||E'\n'||nonce||E'\n'||auth.uid()||E'\n'||key||E'\n'||encode(extensions.digest(convert_to(txt,'UTF8'),'sha256'),'hex'),'UTF8'),request_secret,'sha256'),'hex')
 into sig from k2_private.admin_bff_secrets where singleton=true;
 if action='customer_privacy_read' then return public.read_admin_customer_privacy_v1(action,ts,nonce,key,txt,sig); end if;
 return public.review_admin_customer_privacy_v1(action,ts,nonce,key,txt,sig);
end $$;
select set_config('request.jwt.claims','{"role":"authenticated","is_staff":true,"is_admin":true,"aal":"aal2"}',true);
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
-- The modified signer must preserve existing actions and reject unknown ones.
do $$
declare ts bigint:=extract(epoch from clock_timestamp())::bigint; nonce uuid:=gen_random_uuid();
 key uuid:=gen_random_uuid(); txt text:='{}'; sig text; action text:='wholesale_inquiry_review'; ok boolean;
begin
 select encode(extensions.hmac(convert_to(action||E'\n'||ts||E'\n'||nonce||E'\n'||auth.uid()||E'\n'||key||E'\n'||encode(extensions.digest(convert_to(txt,'UTF8'),'sha256'),'hex'),'UTF8'),request_secret,'sha256'),'hex') into sig from k2_private.admin_bff_secrets where singleton=true;
 ok:=k2_private.verify_admin_bff_request(action,ts,nonce,key,txt,sig);
 if not ok then raise exception 'EXISTING_ADMIN_ACTION_REJECTED'; end if;
 if k2_private.verify_admin_bff_request(action,ts,nonce,key,txt,sig) then raise exception 'ADMIN_NONCE_REPLAY_ALLOWED'; end if;
 begin
   perform k2_private.verify_admin_bff_request('unknown_action',ts,gen_random_uuid(),key,txt,sig);
   raise exception 'UNKNOWN_ADMIN_ACTION_ALLOWED';
 exception when invalid_parameter_value then null; end;
end $$;
-- A hold recorded before any request blocks the first eligible confirmation.
-- Once the request is verified, resolving the hold requires its assignee.
do $$ declare customer text:='22000000-0000-4000-8000-000000000004'; req text:='62000000-0000-4000-8000-000000000004'; held uuid; response jsonb; begin
 response:=k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('customerId',customer,'action','add_customer_hold','kind','security','reason','Investigation already underway'));
 held:=(response->>'holdId')::uuid;
 response:=k2_test.admin_privacy('customer_privacy_read',jsonb_build_object('scope','customer','cursor',null,'customerId',customer));
 if jsonb_array_length(response->'customerHolds')<>1 then raise exception 'PRE_REQUEST_HOLD_NOT_VISIBLE'; end if;
 insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at)
 values(req::uuid,'12000000-0000-4000-8000-000000000004',customer::uuid,'email',extensions.digest('prehold-receipt','sha256'),'pending',now());
 perform k2_private.process_customer_privacy(req::uuid);
 if (select state from k2_private.customer_privacy_requests where id=req::uuid)<>'held' then raise exception 'PRE_REQUEST_HOLD_IGNORED'; end if;
 begin
  perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('customerId',customer,'action','resolve_customer_hold','holdId',held,'reason','Premature resolution'));
  raise exception 'ASSIGNEE_BYPASS_ALLOWED';
 exception when raise_exception then if sqlerrm<>'K2_PRIVACY_ASSIGNMENT_REQUIRED' then raise; end if; end;
 begin
  perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('customerId',customer,'action','add_customer_hold','kind','legal','reason','Attempt to bypass assignment'));
  raise exception 'ADD_ASSIGNEE_BYPASS_ALLOWED';
 exception when raise_exception then if sqlerrm<>'K2_PRIVACY_ASSIGNMENT_REQUIRED' then raise; end if; end;
 perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('requestId',req,'action','assign','reason','Take responsibility'));
 perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('requestId',req,'action','resolve_hold','holdId',held,'reason','Investigation completed'));
 perform k2_private.process_customer_privacy(req::uuid);
 if (select state from k2_private.customer_privacy_requests where id=req::uuid)<>'closed' then raise exception 'PRE_REQUEST_HOLD_DID_NOT_RESUME'; end if;
end $$;
do $$
declare p jsonb; a jsonb; replay jsonb; b jsonb; hold_id uuid; foreign_hold uuid;
  rid text:='61000000-0000-4000-8000-000000000001'; key uuid:='91000000-0000-4000-8000-000000000001';
begin
 a:=k2_test.admin_privacy('customer_privacy_read','{"cursor":null,"scope":"current"}');
 if jsonb_array_length(a->'requests')<>2 or a::text like '%receipt_hash%' or a::text like '%private capability%' or a::text like '%contact_hash%' then raise exception 'PRIVATE_READ_INVALID: %',a; end if;
 p:=jsonb_build_object('requestId',rid,'action','assign','reason','I will follow up');
 a:=k2_test.admin_privacy('customer_privacy_review',p,key);
 if a->>'assignedTo'<>auth.uid()::text then raise exception 'ASSIGNMENT_FAILED'; end if;
 b:=k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('requestId',rid,'action','add_hold','kind','legal','reason','Await legal review'));
 hold_id:=(b->>'holdId')::uuid;
 insert into k2_private.customer_privacy_holds(customer_id,kind,reason,created_by) values('20000000-0000-4000-8000-000000000002','refund','Other customer',auth.uid()) returning id into foreign_hold;
 begin
   perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('requestId',rid,'action','resolve_hold','holdId',foreign_hold,'reason','Attempt foreign hold'));
   raise exception 'FOREIGN_HOLD_RESOLVED';
 exception when raise_exception then if sqlerrm<>'K2_PRIVACY_HOLD_NOT_FOUND' then raise; end if; end;
 perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
 perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('requestId',rid,'action','assign','reason','Covering for colleague'));
 perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
 replay:=k2_test.admin_privacy('customer_privacy_review',p,key);
 if replay<>a then raise exception 'ORIGINAL_RECEIPT_CHANGED_AFTER_TAKEOVER'; end if;
 begin
   perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('requestId',rid,'action','resolve_hold','holdId',hold_id,'reason','No longer assigned'));
   raise exception 'FORMER_ASSIGNEE_RESOLVED_HOLD';
 exception when raise_exception then if sqlerrm<>'K2_PRIVACY_ASSIGNMENT_REQUIRED' then raise; end if; end;
 begin
   perform k2_test.admin_privacy('customer_privacy_review',p||'{"reason":"Different reason"}'::jsonb,key);
   raise exception 'IDEMPOTENCY_CONFLICT_NOT_CAUGHT';
 exception when raise_exception then if sqlerrm<>'K2_ADMIN_IDEMPOTENCY_CONFLICT' then raise; end if; end;
 perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
 perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('requestId',rid,'action','resolve_hold','holdId',hold_id,'reason','Legal review finished'));
 if exists(select 1 from k2_private.customer_privacy_holds where id=hold_id and resolved_at is null) then raise exception 'HOLD_NOT_RESOLVED'; end if;
 update k2_private.customer_privacy_requests set state='cancelled' where id=rid::uuid;
 b:=k2_test.admin_privacy('customer_privacy_read','{"cursor":null,"scope":"history"}');
 if not exists(select 1 from jsonb_array_elements(b->'requests') e where e->>'id'=rid and e->>'state'='cancelled' and jsonb_array_length(e->'recentActions')>=3)
   or not exists(select 1 from jsonb_array_elements(b->'requests') e where e->>'id'='62000000-0000-4000-8000-000000000004' and e->>'state'='closed' and e->>'providerState'='pending') then raise exception 'HISTORY_RECONCILIATION_MISSING: %',b; end if;
 begin
   perform k2_test.admin_privacy('customer_privacy_review',jsonb_build_object('requestId',rid,'action','assign','reason','Cancelled request'));
   raise exception 'CANCELLED_REQUEST_CHANGED';
 exception when raise_exception then if sqlerrm<>'K2_PRIVACY_STATE_CONFLICT' then raise; end if; end;
 perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000003',true);
 begin
   perform k2_test.admin_privacy('customer_privacy_read','{"cursor":null,"scope":"current"}');
   raise exception 'STAFF_READ_ALLOWED';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
 perform set_config('request.jwt.claims','{"role":"authenticated","is_staff":true,"aal":"aal1"}',true);
 begin
   perform k2_test.admin_privacy('customer_privacy_read','{"cursor":null,"scope":"current"}');
   raise exception 'AAL1_READ_ALLOWED';
 exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'CUSTOMER_PRIVACY_ADMIN_ASSERTIONS_PASSED';
