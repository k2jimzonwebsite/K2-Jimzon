set request.actor = '20000000-0000-4000-8000-000000000001';
set request.aal = 'aal2';
insert into products values (
  '30000000-0000-4000-8000-000000000001', 'Under Review', 'Fixture pasta',
  '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
  100, 100, '/fixture.jpg', true, now()
);
insert into product_intake_sessions values (
  '60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
  auth.uid(), '[{"slot":"PRIMARY","upload_status":"uploaded"}]', 'publication_review', 'active', null
);
do $$
declare
  session_id uuid := '60000000-0000-4000-8000-000000000001';
  result jsonb;
  audit_count integer;
  completion timestamptz;
begin
  if has_function_privilege('authenticated', 'public.transition_product_publication_server(uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.transition_product_publication_server(uuid,text)', 'execute') then
    raise exception 'Correction reopened direct RPC permission';
  end if;
  perform transition_product_publication_server(session_id, 'live');
  perform transition_product_publication_server(session_id, 'unlisted');
  result := transition_product_publication_server(session_id, 'live');
  if result->>'status' <> 'Live' then raise exception 'Relisting failed'; end if;
  select count(*) into audit_count from audit_logs;
  select completed_at into completion from product_intake_sessions;
  perform transition_product_publication_server(session_id, 'live');
  if (select count(*) from audit_logs) <> audit_count then raise exception 'Replay wrote duplicate audit'; end if;
  if (select completed_at from product_intake_sessions) is distinct from completion then raise exception 'Replay changed completion'; end if;
  perform transition_product_publication_server(session_id, 'unlisted');
  update products set is_human_reviewed = false;
  begin
    perform transition_product_publication_server(session_id, 'live');
    raise exception 'Unreviewed product was relisted';
  exception when check_violation then
    if sqlerrm <> 'K2_PUBLICATION_NOT_READY' then raise; end if;
  end;
  update products set is_human_reviewed = true, primary_image_url = '';
  begin
    perform transition_product_publication_server(session_id, 'live');
    raise exception 'Product without image was relisted';
  exception when check_violation then
    if sqlerrm <> 'K2_PUBLICATION_NOT_READY' then raise; end if;
  end;
  update products set primary_image_url = '/fixture.jpg', srp = 0;
  begin
    perform transition_product_publication_server(session_id, 'live');
    raise exception 'Unpriced product was relisted';
  exception when check_violation then
    if sqlerrm <> 'K2_PUBLICATION_NOT_READY' then raise; end if;
  end;
  update products set srp = 100, status = 'Draft';
  begin
    perform transition_product_publication_server(session_id, 'live');
    raise exception 'Draft bypassed review';
  exception when check_violation then null;
  end;
  update products set status = 'Discontinued';
  begin
    perform transition_product_publication_server(session_id, 'live');
    raise exception 'Discontinued product was relisted';
  exception when check_violation then null;
  end;
  perform set_config('request.aal', 'aal1', true);
  begin
    perform transition_product_publication_server(session_id, 'discontinued');
    raise exception 'Replay bypassed MFA';
  exception when insufficient_privilege then
    if sqlerrm <> 'K2_AAL2_REQUIRED' then raise; end if;
  end;
end $$;
