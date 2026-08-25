\set ON_ERROR_STOP on

do $$
begin
  if has_function_privilege('anon','public.record_admin_mfa_replacement_event_v1(text,bigint,uuid,uuid,text,text)','execute')
     or not has_function_privilege('authenticated','public.record_admin_mfa_replacement_event_v1(text,bigint,uuid,uuid,text,text)','execute') then
    raise exception 'MFA replacement receipt privileges are unsafe';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","aal":"aal2"}',false);

do $$
declare v jsonb;
begin
  v:=public.record_admin_mfa_replacement_event_v1(
    'admin_mfa_replacement_requested',extract(epoch from now())::bigint,
    '20000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000005',
    '{"reason":"Moving Admin MFA to the company-managed phone.","previousFactorHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
    repeat('b',64)
  );
  if v<>jsonb_build_object('recorded',true,'replayed',false,'phase','requested') then
    raise exception 'requested receipt was not recorded';
  end if;
end $$;

do $$
declare v jsonb;
begin
  v:=public.record_admin_mfa_replacement_event_v1(
    'admin_mfa_replacement_completed',extract(epoch from now())::bigint,
    '30000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000005',
    '{"reason":"Moving Admin MFA to the company-managed phone.","previousFactorHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","factorHash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}',
    repeat('d',64)
  );
  if v->>'phase'<>'completed' or v->>'recorded'<>'true' then
    raise exception 'completed receipt was not recorded';
  end if;
end $$;

do $$
declare v jsonb;
begin
  v:=public.record_admin_mfa_replacement_event_v1(
    'admin_mfa_replacement_completed',extract(epoch from now())::bigint,
    '40000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000005',
    '{"reason":"Moving Admin MFA to the company-managed phone.","previousFactorHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","factorHash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}',
    repeat('e',64)
  );
  if v->>'replayed'<>'true' then raise exception 'completed replay was not idempotent'; end if;
end $$;

reset role;

do $$
declare event_count integer; stored_reason text;
begin
  select count(*)::integer,min(reason) into event_count,stored_reason
  from k2_private.admin_mfa_replacement_events
  where actor_id='10000000-0000-4000-8000-000000000001'
    and replacement_id='50000000-0000-4000-8000-000000000005';
  if event_count<>2 or stored_reason<>'Moving Admin MFA to the company-managed phone.' then
    raise exception 'private requested/completed reason evidence is incomplete';
  end if;
end $$;
