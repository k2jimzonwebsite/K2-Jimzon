-- Isolated restored-schema assertions. Never execute this fixture on production.
create function pg_temp.profile_portfolio(payload jsonb) returns jsonb language plpgsql as $$
declare ts bigint:=extract(epoch from clock_timestamp())::bigint; nonce uuid:=gen_random_uuid();
 bytes text:=payload::text; ip text:=repeat('b',64); signature text; secret bytea;
begin
 select request_secret into secret from k2_private.guest_bff_secrets where singleton;
 signature:=encode(extensions.hmac(convert_to('account_read'||E'\n'||ts||E'\n'||nonce||E'\n'||encode(extensions.digest(convert_to(bytes,'UTF8'),'sha256'),'hex')||E'\n'||ip,'UTF8'),secret,'sha256'),'hex');
 return public.read_customer_portfolio_v1(ts,nonce,bytes,ip,signature);
end $$;
do $$
declare actor uuid:=gen_random_uuid(); customer uuid:=gen_random_uuid(); contact uuid:=gen_random_uuid(); result jsonb;
 email text:='profile-release-'||actor||'@example.invalid';
begin
 perform set_config('request.jwt.claim.sub','',true);
 result:=pg_temp.profile_portfolio('{"operation":"list","cursor":null}');
 if result->>'error_code'<>'ACCOUNT_AUTH_REQUIRED' then raise exception 'PROFILE_ANONYMOUS_READ_ACCEPTED'; end if;
 insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,aud,role,raw_app_meta_data,raw_user_meta_data)
  values(actor,email,now(),now(),now(),'authenticated','authenticated','{}','{}');
 perform set_config('request.jwt.claim.sub',actor::text,true);
 result:=pg_temp.profile_portfolio('{"operation":"list","cursor":null}');
 if result->>'error_code'<>'ACCOUNT_NOT_LINKED' then raise exception 'PROFILE_UNLINKED_READ_ACCEPTED'; end if;
 insert into public.customers(id,display_name,created_source) values(customer,'Synthetic profile release','website_account');
 insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
  values(contact,customer,'email',email,extensions.digest(convert_to('email:'||email,'UTF8'),'sha256'),'verified',now(),'website_account');
 insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values(actor,customer,contact);
 result:=pg_temp.profile_portfolio('{"operation":"list","cursor":null}');
 if result->>'ok'<>'true' or result#>>'{summary,orderCount}'<>'0' or result->'orders'<>'[]' then raise exception 'PROFILE_EMPTY_OWNER_SCOPE_FAILED'; end if;
 result:=pg_temp.profile_portfolio(jsonb_build_object('operation','list','cursor',null,'customerId',gen_random_uuid()));
 if result->>'error_code'<>'REQUEST_INVALID' then raise exception 'PROFILE_CUSTOMER_SELECTOR_ACCEPTED'; end if;
 result:=pg_temp.profile_portfolio(jsonb_build_object('operation','proof','orderReference','WEB-FOREIGN','proofId',gen_random_uuid()));
 if result->>'error_code'<>'CONVERSATION_NOT_AVAILABLE' then raise exception 'PROFILE_FOREIGN_PROOF_ACCEPTED'; end if;
 if has_function_privilege('anon','public.read_customer_portfolio_v1(bigint,uuid,text,text,text)','EXECUTE')
  or not has_function_privilege('authenticated','public.read_customer_portfolio_v1(bigint,uuid,text,text,text)','EXECUTE')
  or to_regprocedure('public.customer_privacy_command_v1(bigint,uuid,text,text,text)') is not null
  or to_regclass('k2_private.customer_privacy_requests') is not null then raise exception 'PROFILE_RELEASE_PRIVILEGE_OR_DELETION_BOUNDARY_FAILED'; end if;
end $$;
select 'CUSTOMER_PROFILE_RELEASE_ASSERTIONS_PASSED';
