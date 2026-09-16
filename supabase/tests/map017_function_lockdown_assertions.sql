do $$
declare signature text; role_name text; denied integer := 0;
begin
  foreach signature in array array[
    'public.reject_event_mutation()', 'public.sync_product_compat_columns()',
    'public.sync_product_batch_compat_columns()', 'public.prevent_conversation_event_mutation()',
    'public.touch_staff_allocations()', 'public.receive_po(uuid)', 'public.receive_po_scanned(uuid,jsonb)'
  ] loop
    foreach role_name in array array['anon','authenticated'] loop
      if has_function_privilege(role_name,signature,'execute') then
        raise exception 'MAP017_FUNCTION_BROWSER_EXECUTE_REMAINS: % %',role_name,signature;
      end if;
    end loop;
    if exists(select 1 from pg_proc p, lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where p.oid=signature::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') then
      raise exception 'MAP017_FUNCTION_PUBLIC_EXECUTE_REMAINS: %',signature;
    end if;
  end loop;
  if exists(select 1 from lockdown_definitions where pg_get_functiondef(oid)<>definition) then
    raise exception 'MAP017_FUNCTION_BODY_CHANGED';
  end if;
  if to_regprocedure('public.sync_product_publication_status()') is not null
     or to_regprocedure('public.touch_product_intake_session()') is not null then
    raise exception 'MAP017_FIXTURE_MUST_OMIT_FUTURE_FUNCTIONS';
  end if;
  foreach role_name in array array['anon','authenticated'] loop
    foreach signature in array array[
      'public.receive_po(''00000000-0000-0000-0000-000000000017''::uuid)',
      'public.receive_po_scanned(''00000000-0000-0000-0000-000000000017''::uuid,''[]''::jsonb)'
    ] loop
      begin
        execute format('set local role %I',role_name);
        execute 'select ' || signature;
        reset role;
      exception when insufficient_privilege then denied := denied+1;
      end;
    end loop;
  end loop;
  reset role;
  if denied<>4 then raise exception 'MAP017_RECEIVING_BROWSER_DENIAL_FAILED'; end if;

  -- Entry reaches the real domain rejection; no physical stock is written.
  foreach signature in array array[
    'public.receive_po(''00000000-0000-0000-0000-000000000017''::uuid)',
    'public.receive_po_scanned(''00000000-0000-0000-0000-000000000017''::uuid,''[]''::jsonb)'
  ] loop
    begin
      set local role service_role;
      execute 'select ' || signature;
      reset role;
      raise exception 'MAP017_RECEIVING_DOMAIN_GUARD_MISSING';
    exception when raise_exception then
      if sqlerrm<>'PO is already received.' then raise; end if;
    end;
  end loop;
  reset role;
end $$;

set local role authenticated;
do $$ begin
  begin
    update lockdown_events set value='changed';
    raise exception 'EVENT_GUARD_MISSING';
  exception when raise_exception then
    if sqlerrm<>'Event history is append-only' then raise; end if;
  end;
  begin
    delete from lockdown_conversations;
    raise exception 'CONVERSATION_GUARD_MISSING';
  exception when raise_exception then
    if sqlerrm<>'Conversation event history is append-only' then raise; end if;
  end;
  update lockdown_staff set updated_at='2001-01-01';
  if not exists(select 1 from lockdown_staff where updated_at=now()) then
    raise exception 'STAFF_TOUCH_FAILED';
  end if;
  insert into lockdown_products(sku,srp) values ('ACL-TEST',12);
  if not exists(select 1 from lockdown_products where name='ACL-TEST' and retail_price=12 and stock_available=0) then
    raise exception 'PRODUCT_SYNC_FAILED';
  end if;
  insert into lockdown_batches(batch_code,quantity,best_before_date) values ('LOT-TEST',2,current_date+120);
  if not exists(select 1 from lockdown_batches where box_code='LOT-TEST' and quantity_available=2 and expiry_date=current_date+120) then
    raise exception 'BATCH_SYNC_FAILED';
  end if;
end $$;
reset role;
select 'MAP017_FUNCTION_LOCKDOWN_PASSED';
