-- =============================================================================
-- Migration: 20260917_live_p2p_storefront_chat.sql
-- Description: MAP-027 / IDEA-20260917-05 Live 2-Way Storefront to Admin P2P Chat
--
-- Authoritative operating rules:
-- 1. Storefront customers can start or reply to a chat conversation without
--    requiring external bot proxies or serverless middleware.
-- 2. Messages are persisted to canonical public.conversations and public.messages.
-- 3. Staff in Admin BOS receive Realtime change events on public.messages and
--    public.conversations immediately.
-- 4. Staff can send customer-visible replies using append_website_customer_reply_v1.
-- 5. Storefront chat polls get_storefront_chat_v1 so replies appear automatically.
-- =============================================================================

begin;

-- Preflight check
do $preflight$
begin
  if to_regclass('public.conversations') is null or to_regclass('public.messages') is null then
    raise exception 'PREFLIGHT_FAILED: conversations or messages table is missing';
  end if;
end
$preflight$;

-- -----------------------------------------------------------------------------
-- 1. Function: public.append_website_customer_reply_v1 (Staff Admin to Customer)
-- -----------------------------------------------------------------------------
create or replace function public.append_website_customer_reply_v1(
  p_conversation_id uuid,
  p_content text
)
returns public.messages
language plpgsql
security definer
set search_path = public
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
  if v_conversation.source_kind not in ('website_message','virtual_store_message')
     and v_conversation.platform::text not in ('Website', 'Virtual Store') then
    raise exception using errcode='22023', message='K2_WEBSITE_REPLY_SOURCE_INVALID';
  end if;

  insert into public.messages(
    conversation_id,sender_type,content,is_draft,delivery_status,sent_at,
    created_by,direction
  ) values (
    v_conversation.id,'Admin'::public.message_sender,trim(p_content),false,'sent',now(),auth.uid(),'outbound'
  ) returning * into v_message;

  update public.conversations set
    status='Pending',last_message_at=v_message.created_at,updated_at=now()
  where id=v_conversation.id;

  if to_regclass('public.conversation_events') is not null then
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
  end if;

  return v_message;
end;
$$;

revoke all on function public.append_website_customer_reply_v1(uuid,text) from public, anon;
grant execute on function public.append_website_customer_reply_v1(uuid,text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Function: public.website_reply_capability_v1 (Staff Admin Capability Check)
-- -----------------------------------------------------------------------------
create or replace function public.website_reply_capability_v1()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.is_staff(); $$;

revoke all on function public.website_reply_capability_v1() from public, anon;
grant execute on function public.website_reply_capability_v1() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Function: public.submit_storefront_chat_v1 (Customer to Storefront)
-- -----------------------------------------------------------------------------
create or replace function public.submit_storefront_chat_v1(
  p_customer_name text,
  p_customer_contact text,
  p_message text,
  p_conversation_id uuid default null,
  p_origin text default 'storefront'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid := p_conversation_id;
  v_conversation public.conversations;
  v_message public.messages;
  v_name text := trim(coalesce(p_customer_name, 'Website Customer'));
  v_contact text := trim(coalesce(p_customer_contact, ''));
  v_email text := null;
  v_phone text := null;
  v_origin text := coalesce(p_origin, 'storefront');
  v_platform public.chat_platform := 'Website'::public.chat_platform;
  v_source_kind text := case when v_origin = 'virtual_store' then 'virtual_store_message' else 'website_message' end;
begin
  if length(trim(coalesce(p_message, ''))) < 1 then
    raise exception 'Message cannot be empty';
  end if;

  if position('@' in v_contact) > 0 then
    v_email := v_contact;
  elsif v_contact <> '' then
    v_phone := v_contact;
  end if;

  if v_name = '' then
    v_name := 'Website Customer';
  end if;

  if v_conv_id is not null then
    select * into v_conversation from public.conversations where id = v_conv_id for update;
  end if;

  if v_conversation.id is null then
    insert into public.conversations (
      customer_name, customer_email, customer_phone,
      platform, source_kind, status, priority,
      unread_count, last_message_at, last_inbound_at, response_due_at
    ) values (
      v_name, v_email, v_phone,
      v_platform, v_source_kind, 'Open', 'normal',
      1, now(), now(), now() + interval '4 hours'
    )
    returning * into v_conversation;
    v_conv_id := v_conversation.id;
  else
    update public.conversations
    set unread_count = coalesce(unread_count, 0) + 1,
        status = 'Open',
        last_message_at = now(),
        last_inbound_at = now(),
        response_due_at = now() + interval '4 hours',
        updated_at = now(),
        customer_name = case when customer_name = 'Website Customer' and v_name <> 'Website Customer' then v_name else customer_name end,
        customer_email = coalesce(customer_email, v_email),
        customer_phone = coalesce(customer_phone, v_phone)
    where id = v_conv_id
    returning * into v_conversation;
  end if;

  insert into public.messages (
    conversation_id, sender_type, content, is_draft,
    delivery_status, direction, sent_at, created_at
  ) values (
    v_conv_id, 'Customer'::public.message_sender, trim(p_message), false,
    'received', 'inbound', now(), now()
  )
  returning * into v_message;

  return jsonb_build_object(
    'ok', true,
    'conversation_id', v_conv_id,
    'message_id', v_message.id,
    'content', v_message.content,
    'created_at', v_message.created_at,
    'direction', 'inbound',
    'delivery_status', 'received'
  );
end;
$$;

revoke all on function public.submit_storefront_chat_v1(text, text, text, uuid, text) from public;
grant execute on function public.submit_storefront_chat_v1(text, text, text, uuid, text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. Function: public.get_storefront_chat_v1 (Customer reads their chat thread)
-- -----------------------------------------------------------------------------
create or replace function public.get_storefront_chat_v1(
  p_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.conversations;
  v_messages jsonb;
begin
  select * into v_conv from public.conversations where id = p_conversation_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Conversation not found');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'sender_type', m.sender_type,
      'content', m.content,
      'delivery_status', m.delivery_status,
      'direction', coalesce(m.direction, case when m.sender_type = 'Customer' then 'inbound' else 'outbound' end),
      'created_at', m.created_at
    ) order by m.created_at asc
  ), '[]'::jsonb)
  into v_messages
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.delivery_status <> 'internal_only'
    and (m.direction is null or m.direction <> 'internal');

  return jsonb_build_object(
    'ok', true,
    'conversation_id', v_conv.id,
    'status', v_conv.status,
    'customer_name', v_conv.customer_name,
    'messages', v_messages
  );
end;
$$;

revoke all on function public.get_storefront_chat_v1(uuid) from public;
grant execute on function public.get_storefront_chat_v1(uuid) to anon, authenticated, service_role;

commit;
