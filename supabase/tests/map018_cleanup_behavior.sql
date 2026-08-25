create or replace function public.map018_test_signature(
  p_action text,p_timestamp bigint,p_nonce uuid,p_actor uuid,
  p_idempotency_key uuid,p_payload_text text
) returns text language sql as $$
  select encode(extensions.hmac(
    convert_to(
      p_action||E'\n'||p_timestamp::text||E'\n'||p_nonce::text||E'\n'||p_actor::text
      ||E'\n'||p_idempotency_key::text||E'\n'
      ||encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex'),
      'UTF8'
    ),decode(repeat('05',32),'hex'),'sha256'
  ),'hex')
$$;

set role authenticated;
select set_config('request.jwt.claim.sub','6a88b5f9-8be6-4f4d-a504-173c96f40df1',false);
select set_config('request.jwt.claims','{"aal":"aal2"}',false);

do $$
declare
  v_actor constant uuid:='6a88b5f9-8be6-4f4d-a504-173c96f40df1';
  v_session constant uuid:='e74a4161-72ca-4d72-8f59-37aa690e1869';
  v_record_key constant uuid:='9c6bcb73-d41a-4217-8f60-c8dcaaf36723';
  v_retry_key uuid:='e2898343-a635-49a2-8546-a2ad33a9198a';
  v_path text:=v_actor::text||'/'||v_session::text||'/primary-'||v_record_key::text||'-6b86b273ff34fce1.png';
  v_hash text;
  v_payload text;
  v_result jsonb;
  v_cleanup uuid;
  v_now bigint:=extract(epoch from clock_timestamp())::bigint;
begin
  v_hash:=encode(extensions.digest(convert_to(v_path,'UTF8'),'sha256'),'hex');
  v_payload:=jsonb_build_object('sessionId',v_session,'objectPath',v_path,'objectPathHash',v_hash)::text;
  v_result:=public.record_admin_product_intake_evidence_cleanup_v1(
    'intake_evidence_cleanup_pending',v_now,v_record_key,v_record_key,v_payload,
    public.map018_test_signature('intake_evidence_cleanup_pending',v_now,v_record_key,v_actor,v_record_key,v_payload)
  );
  if v_result->>'status'<>'pending' or v_result ? 'objectPath' then
    raise exception 'record response is not private and pending: %',v_result;
  end if;
  v_cleanup:=(v_result->>'cleanupId')::uuid;
  v_payload:=jsonb_build_object('cleanupId',v_cleanup)::text;
  v_result:=public.claim_admin_product_intake_evidence_cleanup_v1(
    'intake_evidence_cleanup_retry',v_now,v_retry_key,v_retry_key,v_payload,
    public.map018_test_signature('intake_evidence_cleanup_retry',v_now,v_retry_key,v_actor,v_retry_key,v_payload)
  );
  if v_result->>'objectPath'<>v_path or v_result->>'objectPathHash'<>v_hash then
    raise exception 'claim did not return the server-only cleanup target: %',v_result;
  end if;
  v_payload:=jsonb_build_object('cleanupId',v_cleanup,'objectPathHash',v_hash)::text;
  v_result:=public.complete_admin_product_intake_evidence_cleanup_v1(
    'intake_evidence_cleanup_complete',v_now,v_retry_key,v_retry_key,v_payload,
    public.map018_test_signature('intake_evidence_cleanup_complete',v_now,v_retry_key,v_actor,v_retry_key,v_payload)
  );
  if v_result<>jsonb_build_object('cleanupId',v_cleanup,'status','completed') then
    raise exception 'completion response invalid: %',v_result;
  end if;

  perform set_config('request.jwt.claim.sub','5fd6d9f1-323b-4ea0-9300-ef641f804c38',false);
  v_retry_key:='1d505819-64a7-4d94-b7ea-418f5f406d20';
  v_payload:=jsonb_build_object('cleanupId',v_cleanup)::text;
  begin
    perform public.claim_admin_product_intake_evidence_cleanup_v1(
      'intake_evidence_cleanup_retry',v_now,v_retry_key,v_retry_key,v_payload,
      public.map018_test_signature(
        'intake_evidence_cleanup_retry',v_now,v_retry_key,
        '5fd6d9f1-323b-4ea0-9300-ef641f804c38',v_retry_key,v_payload
      )
    );
    raise exception 'cross-owner cleanup claim was accepted';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub',v_actor::text,false);
  perform set_config('request.jwt.claims','{"aal":"aal1"}',false);
  v_retry_key:='6ca1e4ac-a488-4736-9994-e5161242fc17';
  begin
    perform public.claim_admin_product_intake_evidence_cleanup_v1(
      'intake_evidence_cleanup_retry',v_now,v_retry_key,v_retry_key,v_payload,
      public.map018_test_signature(
        'intake_evidence_cleanup_retry',v_now,v_retry_key,v_actor,v_retry_key,v_payload
      )
    );
    raise exception 'AAL1 cleanup claim was accepted';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims','{"aal":"aal2"}',false);
end;
$$;

reset role;
do $$
begin
  if has_table_privilege('anon','k2_private.product_intake_evidence_cleanup_events','select')
     or has_table_privilege('authenticated','k2_private.product_intake_evidence_cleanup_events','select')
     or not has_function_privilege(
       'authenticated',
       'public.claim_admin_product_intake_evidence_cleanup_v1(text,bigint,uuid,uuid,text,text)',
       'execute'
     ) then
    raise exception 'MAP-018 cleanup privilege boundary failed';
  end if;
  if not exists(
    select 1 from k2_private.product_intake_evidence_cleanup_events
    where status='completed' and attempt_count=1 and completed_at is not null
  ) then
    raise exception 'MAP-018 cleanup lifecycle was not persisted';
  end if;
end;
$$;
drop function public.map018_test_signature(text,bigint,uuid,uuid,uuid,text);
