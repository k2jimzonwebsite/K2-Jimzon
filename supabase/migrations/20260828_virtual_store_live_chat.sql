-- MAP-027 / IDEA-20260828-06 — customer-visible website replies from Admin.
--
-- Storefront and Virtual Store conversations already share the canonical
-- conversations/messages tables and scoped guest-grant reader. This migration
-- adds the missing staff-to-customer half for those two website sources only.
-- Marketplace rows remain internal-note/copy workflows until their own reviewed
-- connectors exist.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null
     or to_regclass('public.conversation_events') is null then
    raise exception 'Admin inbox BFF foundation must be applied first';
  end if;
end
$preflight$;

create or replace function public.append_website_customer_reply_v1(
  p_conversation_id uuid,
  p_content text
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
  v_message public.messages;
begin
  if not public.is_staff() then
    raise exception using errcode='28000', message='K2_STAFF_ACCESS_REQUIRED';
  end if;
  if length(trim(coalesce(p_content,''))) not between 1 and 5000 then
    raise exception using errcode='22023', message='K2_WEBSITE_REPLY_INVALID';
  end if;

  select * into v_conversation from public.conversations
  where id=p_conversation_id for update;
  if not found then
    raise exception using errcode='P0002', message='K2_CONVERSATION_NOT_FOUND';
  end if;
  if v_conversation.source_kind not in ('website_message','virtual_store_message') then
    raise exception using errcode='22023', message='K2_WEBSITE_REPLY_SOURCE_INVALID';
  end if;

  insert into public.messages(
    conversation_id,sender_type,content,is_draft,delivery_status,sent_at,
    created_by,direction
  ) values (
    v_conversation.id,'Admin',trim(p_content),false,'sent',now(),auth.uid(),'outbound'
  ) returning * into v_message;

  update public.conversations set
    status='Pending',last_message_at=v_message.created_at,updated_at=now()
  where id=v_conversation.id;

  insert into public.conversation_events(
    conversation_id,event_type,actor_id,reason,metadata
  ) values (
    v_conversation.id,'customer_reply_sent',auth.uid(),null,
    jsonb_build_object(
      'message_id',v_message.id,
      'delivery_status','sent',
      'source_kind',v_conversation.source_kind,
      'surface','website_chat'
    )
  );

  return v_message;
end;
$$;

revoke all on function public.append_website_customer_reply_v1(uuid,text)
  from public,anon,authenticated;
grant execute on function public.append_website_customer_reply_v1(uuid,text)
  to authenticated;

create or replace function public.website_reply_capability_v1()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select public.is_staff(); $$;

revoke all on function public.website_reply_capability_v1()
  from public,anon,authenticated;
grant execute on function public.website_reply_capability_v1()
  to authenticated;

create or replace function public.execute_admin_website_reply_v1(
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
  v_message public.messages;
  v_result jsonb;
  v_count integer;
  v_inserted integer;
begin
  if p_action <> 'inbox_send_reply'
     or not k2_private.verify_admin_bff_request(
       p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
     ) then
    raise exception using errcode='28000', message='K2_ADMIN_REQUEST_REPLAYED';
  end if;

  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object'
     or (v_payload-array['conversationId','content']) <> '{}'::jsonb
     or length(trim(coalesce(v_payload->>'content',''))) not between 1 and 5000 then
    raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash := encode(
    extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex'
  );

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

  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count >= 60 then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  insert into k2_private.admin_command_receipts(
    actor_id,action,idempotency_key,payload_hash
  ) values (v_actor,p_action,p_idempotency_key,v_payload_hash)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.result;
  end if;

  select * into v_message from public.append_website_customer_reply_v1(
    (v_payload->>'conversationId')::uuid,v_payload->>'content'
  );
  v_result := jsonb_build_object(
    'messageId',v_message.id,
    'conversationId',v_message.conversation_id,
    'deliveryStatus',v_message.delivery_status,
    'createdAt',v_message.created_at
  );

  update k2_private.admin_command_receipts
  set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_website_reply_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_website_reply_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

notify pgrst,'reload schema';
commit;
