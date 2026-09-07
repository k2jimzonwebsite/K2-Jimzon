set role authenticated;
select set_config('request.jwt.claim.sub','6a88b5f9-8be6-4f4d-a504-173c96f40df1',false);
select set_config('request.jwt.claims','{"aal":"aal2"}',false);
select set_config('intake.test_session',:'session_id',false);
do $$ begin
 begin
 perform public.intake_test_call('claim',jsonb_build_object('sessionId',current_setting('intake.test_session'),'kind','content','confirmation','CONFIRM_PAID_INTAKE','version','k2.intake-ai.2026-09-06'));
 perform pg_sleep(0.3);
 exception when others then if sqlerrm not like '%AI_BUDGET_BLOCKED%' then raise; end if; end;
end $$;
