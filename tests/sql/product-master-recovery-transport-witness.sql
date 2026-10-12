-- Owned RAM-only fixture witness. No provider or application callable function.
do $owned$ begin
 if current_database()<>'postgres' or current_user<>'supabase_admin'
 or current_setting('data_directory')<>'/tmp/k2-managed-data' or inet_server_addr() is not null then
 raise exception 'OWNED_RAM_RECOVERY_WITNESS_REQUIRED'; end if;
end $owned$;
do $witness$
declare keys uuid[]:=array['a1200000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000002','a1200000-0000-4000-8000-000000000003','a1200000-0000-4000-8000-000000000004','a1200000-0000-4000-8000-000000000005']::uuid[]; k uuid; r record;
begin
 if (select count(*) from k2_private.admin_command_receipts where action='product_master_update' and idempotency_key=any(keys))<>4
 or (select count(*) from k2_private.product_master_events where action='product_master_update' and request_id=any(keys))<>4 then raise exception 'RECOVERY_EXACT_RECEIPT_EVENT_COUNT';end if;
 if exists(select 1 from k2_private.admin_command_receipts where idempotency_key=keys[3])
 or exists(select 1 from k2_private.product_master_events where request_id=keys[3]) then raise exception 'NON_APPLIED_RECOVERY_HAS_EVIDENCE';end if;
 foreach k in array array[keys[1],keys[2],keys[4],keys[5]] loop
  if (select count(*) from k2_private.admin_command_receipts where action='product_master_update' and idempotency_key=k and result is not null and completed_at is not null)<>1
  or (select count(*) from k2_private.product_master_events where action='product_master_update' and request_id=k)<>1 then raise exception 'RECOVERY_COMMAND_NOT_EXACTLY_ONCE';end if;
 end loop;
 if (select count(distinct actor_id) from k2_private.product_master_events where request_id=any(keys))<>1
 or (select count(distinct sku) from k2_private.product_master_events where request_id=any(keys))<>1 then raise exception 'RECOVERY_ACTOR_PRODUCT_IDENTITY';end if;
 if (select count(*) from k2_private.product_master_events e join k2_private.admin_command_receipts c on c.actor_id=e.actor_id and c.action=e.action and c.idempotency_key=e.request_id where e.request_id=any(keys))<>4 then raise exception 'RECOVERY_RECEIPT_EVENT_JOIN';end if;
 for r in select e.*,c.result from k2_private.product_master_events e join k2_private.admin_command_receipts c on c.actor_id=e.actor_id and c.action=e.action and c.idempotency_key=e.request_id where e.request_id=any(keys) loop
  if r.result->>'sku' is distinct from r.sku or r.result->>'status' is distinct from r.after_state->>'status'
  or (r.result->>'updatedAt')::timestamptz is distinct from (r.after_state->>'updated_at')::timestamptz
  or r.before_state->>'status' is distinct from r.after_state->>'status'
  or r.before_state->>'published' is distinct from r.after_state->>'published'
  or (r.after_state->>'is_human_reviewed')::boolean is distinct from (r.request_id in (keys[1],keys[5]))
  or (r.after_state->>'srp')::numeric is distinct from (case r.request_id when keys[2] then 110 when keys[4] then 120 else 100 end) then raise exception 'RECOVERY_RECEIPT_EVENT_STATE_MISMATCH';end if;
 end loop;
end $witness$;
select 'K2_PRODUCT_RECOVERY_RECEIPT_WITNESS_OK';
