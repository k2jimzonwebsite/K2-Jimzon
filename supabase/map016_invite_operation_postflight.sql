-- MAP-016 production-safe behavioral postflight.
-- All fabricated receipts are rolled back; this script leaves no data behind.
begin;

do $$
declare
  v_actor constant uuid := '00000000-0000-4000-8000-000000000016';
  v_key constant uuid := '00000000-0000-4000-8000-000000000001';
  v_stale_key constant uuid := '00000000-0000-4000-8000-000000000002';
  v_hash constant text := repeat('a', 64);
  v_other_hash constant text := repeat('b', 64);
  v_result jsonb;
begin
  v_result := public.claim_staff_invitation_operation(v_actor, v_key, v_hash);
  if v_result->>'state' <> 'claimed' then raise exception 'MAP016_INITIAL_CLAIM_FAILED'; end if;

  v_result := public.claim_staff_invitation_operation(v_actor, v_key, v_hash);
  if v_result->>'state' <> 'in_progress' then raise exception 'MAP016_REPLAY_LOCK_FAILED'; end if;

  perform public.complete_staff_invitation_operation(
    v_actor, v_key, v_hash, '{"ok":true,"roleAssigned":true}'::jsonb
  );
  v_result := public.claim_staff_invitation_operation(v_actor, v_key, v_hash);
  if v_result->>'state' <> 'completed' or (v_result->'result'->>'ok')::boolean is not true then
    raise exception 'MAP016_COMPLETED_REPLAY_FAILED';
  end if;

  v_result := public.claim_staff_invitation_operation(v_actor, v_key, v_other_hash);
  if v_result->>'state' <> 'conflict' then raise exception 'MAP016_CONFLICT_FAILED'; end if;

  insert into k2_private.staff_invitation_operations(
    actor_id, idempotency_key, payload_hash, state, attempt_count, last_attempt_at
  ) values (v_actor, v_stale_key, v_hash, 'pending', 1, now() - interval '6 minutes');
  v_result := public.claim_staff_invitation_operation(v_actor, v_stale_key, v_hash);
  if v_result->>'state' <> 'claimed' then raise exception 'MAP016_STALE_RECOVERY_FAILED'; end if;
end
$$;

select 'MAP016_POSTFLIGHT_PASSED' as result;
rollback;
