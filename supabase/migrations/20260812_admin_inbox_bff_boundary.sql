-- K2 Jimzon Admin BOS: signed universal-inbox staff command boundary.
-- Depends on 20260812_admin_fulfillment_bff_boundary.sql for the private
-- request secret, nonce verifier, and durable command receipt table.
-- Internal notes remain internal_only; this migration does not claim external
-- marketplace or customer delivery.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'Admin BFF foundation must be applied first';
  end if;
  if to_regprocedure('public.append_internal_message(uuid,text)') is null
     or to_regprocedure('public.mark_conversation_read(uuid)') is null
     or to_regprocedure('public.update_conversation_workflow(uuid,text,text,uuid,timestamp with time zone,text)') is null then
    raise exception 'Live inbox workflow functions are incomplete';
  end if;
end
$preflight$;

create or replace function public.execute_admin_inbox_command_v1(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payload jsonb;
  v_payload_hash text;
  v_existing k2_private.admin_command_receipts;
  v_conversation public.conversations;
  v_message public.messages;
  v_result jsonb;
  v_count integer;
  v_inserted integer;
  v_limit integer;
begin
  if not k2_private.verify_admin_bff_request(
    p_action, p_timestamp, p_nonce, p_idempotency_key, p_payload_text, p_signature
  ) then
    raise exception using errcode='28000', message='K2_ADMIN_REQUEST_REPLAYED';
  end if;

  if p_action not in ('inbox_internal_note','inbox_mark_read','inbox_workflow') then
    raise exception using errcode='22023', message='K2_ADMIN_ACTION_INVALID';
  end if;
  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  v_limit := case when p_action='inbox_mark_read' then 240 else 60 end;
  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at > now()-interval '1 minute';
  if v_count >= v_limit then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.result;
  end if;

  if p_action='inbox_internal_note' then
    if (v_payload-array['conversationId','content']) <> '{}'::jsonb
       or length(trim(coalesce(v_payload->>'content',''))) not between 1 and 5000 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_message from public.append_internal_message(
      (v_payload->>'conversationId')::uuid,v_payload->>'content'
    );
    v_result := jsonb_build_object(
      'messageId',v_message.id,'conversationId',v_message.conversation_id,
      'deliveryStatus',v_message.delivery_status,'createdAt',v_message.created_at
    );
  elsif p_action='inbox_mark_read' then
    if (v_payload-array['conversationId']) <> '{}'::jsonb then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_conversation from public.mark_conversation_read(
      (v_payload->>'conversationId')::uuid
    );
    v_result := jsonb_build_object(
      'conversationId',v_conversation.id,'unreadCount',v_conversation.unread_count,
      'lastReadAt',v_conversation.last_read_at
    );
  else
    if (v_payload-array['conversationId','status','priority','assignedTo','responseDueAt','reason']) <> '{}'::jsonb
       or coalesce(v_payload->>'status','') not in ('Open','Pending','Resolved')
       or coalesce(v_payload->>'priority','') not in ('normal','high','urgent')
       or length(coalesce(v_payload->>'reason','')) > 500 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_conversation from public.update_conversation_workflow(
      (v_payload->>'conversationId')::uuid,v_payload->>'status',v_payload->>'priority',
      nullif(v_payload->>'assignedTo','')::uuid,
      nullif(v_payload->>'responseDueAt','')::timestamptz,
      nullif(v_payload->>'reason','')
    );
    v_result := jsonb_build_object(
      'conversationId',v_conversation.id,'status',v_conversation.status,
      'priority',v_conversation.priority,'assignedTo',v_conversation.assigned_to,
      'responseDueAt',v_conversation.response_due_at,'resolvedAt',v_conversation.resolved_at
    );
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_inbox_command_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_inbox_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

notify pgrst,'reload schema';
commit;
