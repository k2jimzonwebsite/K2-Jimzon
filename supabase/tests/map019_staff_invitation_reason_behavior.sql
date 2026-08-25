\set ON_ERROR_STOP on

do $$
declare v jsonb;
begin
  if has_function_privilege('anon','public.claim_staff_invitation_operation_v2(uuid,uuid,text,text)','execute')
     or has_function_privilege('authenticated','public.claim_staff_invitation_operation_v2(uuid,uuid,text,text)','execute')
     or not has_function_privilege('service_role','public.claim_staff_invitation_operation_v2(uuid,uuid,text,text)','execute') then
    raise exception 'staff invitation v2 privileges are unsafe';
  end if;

  set local role service_role;
  v := public.claim_staff_invitation_operation_v2(
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',repeat('a',64),
    'Add a warehouse operator for daily receiving.'
  );
  if v->>'state' <> 'claimed' then raise exception 'first claim was not retained'; end if;
end $$;

do $$
declare v jsonb; stored_reason text;
begin
  select reason into stored_reason from k2_private.staff_invitation_operations
  where actor_id='10000000-0000-4000-8000-000000000001'
    and idempotency_key='30000000-0000-4000-8000-000000000003';
  if stored_reason <> 'Add a warehouse operator for daily receiving.' then
    raise exception 'normalized reason was not retained';
  end if;

  set local role service_role;
  v := public.claim_staff_invitation_operation_v2(
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',repeat('a',64),
    'Changed operational reason.'
  );
  if v->>'state' <> 'conflict' then raise exception 'changed reason did not conflict'; end if;
end $$;

update k2_private.staff_invitation_operations
set state='completed',result='{"ok":true,"email":"staff@example.test","role":"Staff","invited":true,"roleAssigned":true}'::jsonb,
    completed_at=now()
where actor_id='10000000-0000-4000-8000-000000000001'
  and idempotency_key='30000000-0000-4000-8000-000000000003';

do $$
declare v jsonb;
begin
  set local role service_role;
  v := public.claim_staff_invitation_operation_v2(
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',repeat('a',64),
    'Add a warehouse operator for daily receiving.'
  );
  if v->>'state' <> 'completed' or v#>>'{result,email}' <> 'staff@example.test' then
    raise exception 'completed replay was not safe';
  end if;
end $$;
