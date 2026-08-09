-- K2 Jimzon Phase 2: database-backed unified inbox operations.
--
-- This migration does not connect or impersonate any external messaging API.
-- It adds the operational controls staff can use now and preserves truthful
-- delivery states for future channel connectors.

begin;

alter type public.chat_platform add value if not exists 'Instagram';
alter type public.chat_platform add value if not exists 'TikTok';
alter type public.chat_platform add value if not exists 'Shopee';
alter type public.chat_platform add value if not exists 'Lazada';
alter type public.chat_platform add value if not exists 'Website';
alter type public.chat_platform add value if not exists 'Pasabuy';

-- PostgreSQL requires newly-added enum values to be committed before rows can
-- use them. The remaining work is still idempotent and runs in its own block.
commit;
begin;

alter table public.conversations
  add column if not exists assigned_to uuid,
  add column if not exists source_kind text,
  add column if not exists source_id uuid,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists priority text not null default 'normal',
  add column if not exists unread_count integer not null default 0,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_read_at timestamptz,
  add column if not exists first_response_at timestamptz,
  add column if not exists response_due_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists last_staff_activity_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_assigned_to_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_assigned_to_fkey
      foreign key (assigned_to) references public.user_profiles(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_priority_check'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_priority_check
      check (priority in ('normal', 'high', 'urgent'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_unread_count_check'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_unread_count_check
      check (unread_count >= 0);
  end if;
end
$$;

alter table public.messages
  add column if not exists delivery_status text not null default 'internal_only',
  add column if not exists external_message_id text,
  add column if not exists sent_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists created_by uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_delivery_status_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_delivery_status_check
      check (delivery_status in ('received', 'internal_only', 'queued', 'sent', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_created_by_fkey'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;
end
$$;

update public.messages
set delivery_status = case
  when sender_type::text = 'Customer' then 'received'
  else 'internal_only'
end
where delivery_status is null
   or (sender_type::text = 'Customer' and delivery_status = 'internal_only');

with message_rollup as (
  select
    c.id,
    max(m.created_at) filter (where m.sender_type::text = 'Customer') as last_inbound_at,
    max(m.created_at) filter (where m.sender_type::text <> 'Customer') as last_staff_activity_at,
    count(*) filter (
      where m.sender_type::text = 'Customer'
        and m.created_at > coalesce((
          select max(a.created_at)
          from public.messages a
          where a.conversation_id = c.id
            and a.sender_type::text <> 'Customer'
        ), '-infinity'::timestamptz)
    )::integer as unread_count
  from public.conversations c
  left join public.messages m on m.conversation_id = c.id
  group by c.id
)
update public.conversations c
set last_inbound_at = coalesce(c.last_inbound_at, r.last_inbound_at),
    last_staff_activity_at = coalesce(c.last_staff_activity_at, r.last_staff_activity_at),
    unread_count = greatest(c.unread_count, r.unread_count),
    response_due_at = case
      when c.response_due_at is null and c.status = 'Open' and r.last_inbound_at is not null
        then r.last_inbound_at + interval '4 hours'
      else c.response_due_at
    end,
    resolved_at = case
      when c.status = 'Resolved' then coalesce(c.resolved_at, c.last_message_at, now())
      else null
    end,
    updated_at = now()
from message_rollup r
where r.id = c.id;

create table if not exists public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversations_queue_idx
  on public.conversations (status, priority, response_due_at, last_message_at desc);
create index if not exists conversations_assigned_queue_idx
  on public.conversations (assigned_to, status, response_due_at);
create index if not exists conversation_events_timeline_idx
  on public.conversation_events (conversation_id, created_at desc);
create unique index if not exists messages_external_message_id_uniq
  on public.messages (external_message_id)
  where external_message_id is not null;
create unique index if not exists conversations_source_uniq
  on public.conversations (source_kind, source_id)
  where source_kind is not null and source_id is not null;

-- Pasabuy is already a real first-party channel, so its persisted submissions
-- can enter the Inbox without an external API. This links records; it does not
-- replace the Pasabuy request lifecycle or claim that a message was delivered.
insert into public.conversations (
  customer_name, customer_email, customer_phone, platform, status,
  last_message_at, source_kind, source_id, priority, unread_count,
  last_inbound_at, response_due_at, resolved_at, created_at, updated_at
)
select
  p.customer_name,
  p.customer_email,
  p.customer_phone,
  'Pasabuy'::public.chat_platform,
  case when p.status in ('delivered', 'expired', 'cancelled') then 'Resolved' else 'Open' end,
  p.created_at,
  'pasabuy_request',
  p.id,
  'normal',
  case when p.status in ('delivered', 'expired', 'cancelled') then 0 else 1 end,
  p.created_at,
  case when p.status in ('delivered', 'expired', 'cancelled') then null else p.created_at + interval '4 hours' end,
  case when p.status in ('delivered', 'expired', 'cancelled') then p.updated_at else null end,
  p.created_at,
  p.updated_at
from public.pasabuy_requests p
where not exists (
  select 1 from public.conversations c
  where c.source_kind = 'pasabuy_request' and c.source_id = p.id
);

insert into public.messages (
  conversation_id, sender_type, content, is_draft, delivery_status,
  external_message_id, created_at
)
select
  c.id,
  'Customer'::public.message_sender,
  format(
    'Pasabuy request %s: %s × %s. Shipping preference: %s.%s',
    p.public_reference,
    p.quantity,
    p.item_title,
    p.shipping_preference,
    case
      when nullif(trim(coalesce(p.customer_notes, '')), '') is null then ''
      else E'\nCustomer note: ' || trim(p.customer_notes)
    end
  ),
  false,
  'received',
  'pasabuy:' || p.id::text,
  p.created_at
from public.pasabuy_requests p
join public.conversations c
  on c.source_kind = 'pasabuy_request' and c.source_id = p.id
where not exists (
  select 1 from public.messages m
  where m.external_message_id = 'pasabuy:' || p.id::text
);

insert into public.conversation_events (
  conversation_id, event_type, actor_id, reason, metadata, created_at
)
select
  c.id,
  'conversation_created',
  null,
  null,
  jsonb_build_object(
    'source_kind', 'pasabuy_request',
    'source_id', p.id,
    'public_reference', p.public_reference
  ),
  p.created_at
from public.pasabuy_requests p
join public.conversations c
  on c.source_kind = 'pasabuy_request' and c.source_id = p.id
where not exists (
  select 1 from public.conversation_events e
  where e.conversation_id = c.id
    and e.event_type = 'conversation_created'
    and e.metadata->>'source_kind' = 'pasabuy_request'
);

create or replace function public.route_pasabuy_request_to_inbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_message_id uuid;
begin
  insert into public.conversations (
    customer_name, customer_email, customer_phone, platform, status,
    last_message_at, source_kind, source_id, priority, unread_count,
    last_inbound_at, response_due_at, created_at, updated_at
  )
  values (
    new.customer_name,
    new.customer_email,
    new.customer_phone,
    'Pasabuy'::public.chat_platform,
    'Open',
    new.created_at,
    'pasabuy_request',
    new.id,
    'normal',
    1,
    new.created_at,
    new.created_at + interval '4 hours',
    new.created_at,
    new.updated_at
  )
  returning id into v_conversation_id;

  insert into public.messages (
    conversation_id, sender_type, content, is_draft, delivery_status,
    external_message_id, created_at
  )
  values (
    v_conversation_id,
    'Customer'::public.message_sender,
    format(
      'Pasabuy request %s: %s × %s. Shipping preference: %s.%s',
      new.public_reference,
      new.quantity,
      new.item_title,
      new.shipping_preference,
      case
        when nullif(trim(coalesce(new.customer_notes, '')), '') is null then ''
        else E'\nCustomer note: ' || trim(new.customer_notes)
      end
    ),
    false,
    'received',
    'pasabuy:' || new.id::text,
    new.created_at
  )
  returning id into v_message_id;

  insert into public.conversation_events (
    conversation_id, event_type, actor_id, reason, metadata, created_at
  )
  values (
    v_conversation_id,
    'conversation_created',
    null,
    null,
    jsonb_build_object(
      'source_kind', 'pasabuy_request',
      'source_id', new.id,
      'public_reference', new.public_reference,
      'message_id', v_message_id
    ),
    new.created_at
  );

  return new;
exception
  when unique_violation then
    return new;
end;
$$;

drop trigger if exists pasabuy_request_inbox_route on public.pasabuy_requests;
create trigger pasabuy_request_inbox_route
after insert on public.pasabuy_requests
for each row execute function public.route_pasabuy_request_to_inbox();

revoke all on function public.route_pasabuy_request_to_inbox() from public, anon, authenticated;

create or replace function public.prevent_conversation_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Conversation event history is append-only';
end;
$$;

drop trigger if exists conversation_events_immutable on public.conversation_events;
create trigger conversation_events_immutable
before update or delete on public.conversation_events
for each row execute function public.prevent_conversation_event_mutation();

create or replace function public.append_internal_message(
  p_conversation_id uuid,
  p_content text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.messages;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_content, '')), '') is null then raise exception 'Message content is required'; end if;
  if char_length(trim(p_content)) > 5000 then raise exception 'Internal note cannot exceed 5000 characters'; end if;

  perform 1 from public.conversations where id = p_conversation_id for update;
  if not found then raise exception 'Conversation not found'; end if;

  insert into public.messages (
    conversation_id, sender_type, content, is_draft, delivery_status, created_by
  )
  values (
    p_conversation_id, 'Admin'::public.message_sender, trim(p_content), false,
    'internal_only', auth.uid()
  )
  returning * into v_message;

  update public.conversations
  set last_message_at = now(),
      last_staff_activity_at = now(),
      updated_at = now()
  where id = p_conversation_id;

  insert into public.conversation_events (
    conversation_id, event_type, actor_id, reason, metadata
  )
  values (
    p_conversation_id,
    'internal_note_added',
    auth.uid(),
    null,
    jsonb_build_object(
      'message_id', v_message.id,
      'delivery_status', 'internal_only'
    )
  );

  return v_message;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;

  update public.conversations
  set unread_count = 0,
      last_read_at = now(),
      updated_at = now()
  where id = p_conversation_id
  returning * into v_conversation;

  if not found then raise exception 'Conversation not found'; end if;
  return v_conversation;
end;
$$;

create or replace function public.update_conversation_workflow(
  p_conversation_id uuid,
  p_status text,
  p_priority text,
  p_assigned_to uuid,
  p_response_due_at timestamptz,
  p_reason text default null
)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.conversations;
  v_after public.conversations;
  v_status text := initcap(lower(trim(coalesce(p_status, ''))));
  v_priority text := lower(trim(coalesce(p_priority, '')));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if v_status not in ('Open', 'Pending', 'Resolved') then raise exception 'Invalid conversation status'; end if;
  if v_priority not in ('normal', 'high', 'urgent') then raise exception 'Invalid conversation priority'; end if;

  select * into v_before
  from public.conversations
  where id = p_conversation_id
  for update;
  if not found then raise exception 'Conversation not found'; end if;

  if p_assigned_to is not null and not exists (
    select 1
    from public.user_profiles
    where id = p_assigned_to
      and role::text in ('Admin', 'Staff', 'SuperAdmin')
  ) then
    raise exception 'Assignee must be an active staff profile';
  end if;

  if v_status is distinct from v_before.status
     and (v_status = 'Resolved' or v_before.status = 'Resolved')
     and v_reason is null then
    raise exception 'A reason is required when resolving or reopening a conversation';
  end if;

  update public.conversations
  set status = v_status,
      priority = v_priority,
      assigned_to = p_assigned_to,
      response_due_at = p_response_due_at,
      resolved_at = case
        when v_status = 'Resolved' then coalesce(resolved_at, now())
        else null
      end,
      updated_at = now()
  where id = p_conversation_id
  returning * into v_after;

  if v_before.status is distinct from v_after.status
     or v_before.priority is distinct from v_after.priority
     or v_before.assigned_to is distinct from v_after.assigned_to
     or v_before.response_due_at is distinct from v_after.response_due_at then
    insert into public.conversation_events (
      conversation_id, event_type, actor_id, reason, metadata
    )
    values (
      p_conversation_id,
      'workflow_updated',
      auth.uid(),
      v_reason,
      jsonb_build_object(
        'before', jsonb_build_object(
          'status', v_before.status,
          'priority', v_before.priority,
          'assigned_to', v_before.assigned_to,
          'response_due_at', v_before.response_due_at
        ),
        'after', jsonb_build_object(
          'status', v_after.status,
          'priority', v_after.priority,
          'assigned_to', v_after.assigned_to,
          'response_due_at', v_after.response_due_at
        )
      )
    );
  end if;

  return v_after;
end;
$$;

alter table public.conversation_events enable row level security;
drop policy if exists conversation_events_staff_read on public.conversation_events;
create policy conversation_events_staff_read on public.conversation_events
for select to authenticated using (public.is_staff());

revoke all on public.conversation_events from anon, authenticated;
grant select on public.conversation_events to authenticated;

revoke all on function public.append_internal_message(uuid,text) from public, anon, authenticated;
revoke all on function public.mark_conversation_read(uuid) from public, anon, authenticated;
revoke all on function public.update_conversation_workflow(uuid,text,text,uuid,timestamptz,text) from public, anon, authenticated;
grant execute on function public.append_internal_message(uuid,text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.update_conversation_workflow(uuid,text,text,uuid,timestamptz,text) to authenticated;

insert into public.channel_connections (channel, display_name, status, note)
values
  ('meta', 'Meta Messenger and Instagram', 'not_connected', 'No Meta webhook or send credentials are configured'),
  ('whatsapp', 'WhatsApp Business', 'not_connected', 'No WhatsApp Business connector is configured'),
  ('viber', 'Viber Business Messages', 'not_connected', 'No Viber connector is configured')
on conflict (channel) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
    ) then
      alter publication supabase_realtime add table public.conversations;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_events'
    ) then
      alter publication supabase_realtime add table public.conversation_events;
    end if;
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
