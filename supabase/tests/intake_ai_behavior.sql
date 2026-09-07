set role authenticated;
select set_config('request.jwt.claim.sub','6a88b5f9-8be6-4f4d-a504-173c96f40df1',false);
select set_config('request.jwt.claims','{"aal":"aal2"}',false);
do $$
declare s uuid:='e74a4161-72ca-4d72-8f59-37aa690e1869'; r jsonb; j uuid; request_id uuid:=gen_random_uuid(); p jsonb;
begin
 p:=jsonb_build_object('sessionId',s,'kind','content','confirmation','CONFIRM_PAID_INTAKE','version','k2.intake-ai.2026-09-06');
 r:=public.intake_test_call('claim',p,request_id); j:=(r->'job'->>'id')::uuid;
 if r->>'dispatch'<>'true' then raise exception 'first dispatch missing'; end if;
 r:=public.intake_test_call('claim',p);
 if r->>'dispatch'<>'false' or r->'job'->>'id'<>j::text then raise exception 'duplicate paid dispatch'; end if;
 r:=public.intake_test_call('complete',jsonb_build_object('sessionId',s,'jobId',j,'failure','AI_PROVIDER_TIMEOUT','latencyMs',1),request_id);
 r:=public.intake_test_call('read',jsonb_build_object('sessionId',s));
 if r->'budget'->>'sessionReserved'<>'100000' or r->'jobs'->0->>'status'<>'failed' then raise exception 'unknown cost not retained'; end if;
 begin
   perform public.intake_test_call('claim',p||'{"kind":"PRIMARY","brief":"Reviewed exact package image"}'::jsonb);
   raise exception 'image without content review allowed';
 exception when others then if sqlerrm not like '%AI_REVIEW_REQUIRED%' then raise; end if; end;
 perform set_config('request.jwt.claim.sub','5fd6d9f1-323b-4ea0-9300-ef641f804c38',false);
 begin
   perform public.intake_test_call('read',jsonb_build_object('sessionId',s));
   raise exception 'cross-owner read allowed';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','6a88b5f9-8be6-4f4d-a504-173c96f40df1',false);
 perform set_config('request.jwt.claims','{"aal":"aal1"}',false);
 begin
   perform public.intake_test_call('read',jsonb_build_object('sessionId',s));
   raise exception 'aal1 read allowed';
 exception when insufficient_privilege then null; end;
 if has_function_privilege('anon','public.execute_admin_intake_ai_v1(text,bigint,uuid,uuid,text,text)','EXECUTE') then raise exception 'anon execute leaked'; end if;
end $$;
reset role;
do $$ begin
 if has_table_privilege('authenticated','k2_private.intake_ai_jobs','SELECT') then raise exception 'private job table leaked'; end if;
end $$;
update public.product_intake_sessions set field_decisions='{"name":"accepted"}',draft_payload='{"product":{"name":"Fixture product"}}';
set role authenticated;
select set_config('request.jwt.claims','{"aal":"aal2"}',false);
do $$
declare s uuid:='e74a4161-72ca-4d72-8f59-37aa690e1869'; key uuid:=gen_random_uuid(); j uuid; r jsonb;
begin
 r:=public.intake_test_call('claim',jsonb_build_object('sessionId',s,'kind','PRIMARY','brief','Reviewed exact package composition','confirmation','CONFIRM_PAID_INTAKE','version','k2.intake-ai.2026-09-06'),key);
 j:=(r->'job'->>'id')::uuid;
 r:=public.intake_test_call('complete',jsonb_build_object('sessionId',s,'jobId',j,'result',jsonb_build_object('image','fixture-only','usage',jsonb_build_object('input_tokens',12)),'latencyMs',50),key);
 if r->'job'->>'status'<>'completed' or r->'job'->'result' ? 'image' then raise exception 'completion summary leaked image'; end if;
 r:=public.intake_test_call('candidate',jsonb_build_object('sessionId',s,'jobId',j));
 if r->'job'->'result'->>'image'<>'fixture-only' then raise exception 'candidate recovery failed'; end if;
 r:=public.intake_test_call('review',jsonb_build_object('sessionId',s,'jobId',j,'decision','accepted','reason','Package rights and fidelity verified'));
 if r->'job'->>'decision'<>'accepted' then raise exception 'review not saved'; end if;
 begin
  perform public.intake_test_call('review',jsonb_build_object('sessionId',s,'jobId',j,'decision','rejected','reason','Changed decision'));
  raise exception 'review overwrite allowed';
 exception when others then if sqlerrm not like '%AI_JOB_CONFLICT%' then raise; end if; end;
 begin
  perform public.intake_test_call('attach',jsonb_build_object('sessionId',s,'jobId',j));
  raise exception 'attachment without canonical draft allowed';
 exception when others then if sqlerrm not like '%AI_REVIEW_REQUIRED%' then raise; end if; end;
 begin
  perform public.execute_admin_intake_ai_v1('intake_ai_read',extract(epoch from clock_timestamp())::bigint,gen_random_uuid(),gen_random_uuid(),jsonb_build_object('sessionId',s)::text,repeat('0',64));
  raise exception 'invalid signature accepted';
 exception when others then if sqlerrm not like '%AI_JOB_UNAVAILABLE%' then raise; end if; end;
end $$;
reset role;
update k2_private.ai_spend_control_config set per_product_usd_micros=1100000,per_session_usd_micros=1100000,monthly_usd_micros=1100000;
set role authenticated;
select set_config('request.jwt.claims','{"aal":"aal2"}',false);
do $$ begin
 begin
 perform public.intake_test_call('claim','{"sessionId":"e74a4161-72ca-4d72-8f59-37aa690e1869","kind":"AFTER","brief":"Reviewed package only","confirmation":"CONFIRM_PAID_INTAKE","version":"k2.intake-ai.2026-09-06"}');
 raise exception 'monthly cap bypass';
 exception when others then if sqlerrm not like '%AI_BUDGET_BLOCKED%' then raise; end if; end;
end $$;
reset role;
