\set ON_ERROR_STOP on
create table k2_private.admin_request_rate_buckets(
  scope text not null, subject text not null, bucket_start timestamptz not null,
  hit_count integer not null, primary key(scope,subject,bucket_start)
);
alter table public.messages drop constraint messages_conversation_id_fkey;
alter table public.messages add constraint messages_conversation_id_fkey
  foreign key(conversation_id) references public.conversations(id) on delete cascade;
create table public.conversation_events(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade
);
create function public.prevent_conversation_event_mutation()
returns trigger language plpgsql as $$ begin
  raise exception 'Conversation event history is append-only';
end $$;
create trigger conversation_events_append_only before update or delete
  on public.conversation_events for each row execute function public.prevent_conversation_event_mutation();
create function public.submit_storefront_chat_v1(text,text,text,uuid,text)
returns jsonb language sql as $$ select '{}'::jsonb $$;
grant execute on function public.submit_storefront_chat_v1(text,text,text,uuid,text) to anon,authenticated;
create function public.start_guest_conversation_v1(bigint,uuid,text,text,text,text)
returns table(ok boolean,error_code text,retry_after_seconds integer,conversation_reference text,status text,created_at timestamptz,guest_grant_token text)
language sql as $$ select false,null::text,0,null::text,null::text,null::timestamptz,null::text $$;
create function public.append_guest_message_v1(bigint,uuid,text,text,text,text)
returns table(ok boolean,error_code text,retry_after_seconds integer,message_status text,created_at timestamptz)
language sql as $$ select false,null::text,0,null::text,null::timestamptz $$;
grant execute on function public.start_guest_conversation_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.append_guest_message_v1(bigint,uuid,text,text,text,text) to anon;
