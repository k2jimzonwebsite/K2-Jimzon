-- Prepared MAP-022 private, signed, redacted security-event boundary.
-- Apply only with the Admin BFF signing secret and protected review route.

begin;

do $preflight$
begin
  if to_regclass('k2_private.admin_bff_secrets') is null
     or to_regprocedure('public.is_admin()') is null then
    raise exception 'Admin BFF secret foundation and role helpers must be applied first';
  end if;
end
$preflight$;

create table if not exists k2_private.security_event_nonces (
  nonce uuid primary key,
  used_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists k2_private.security_events (
  event_id bigint generated always as identity primary key,
  correlation_id uuid not null unique,
  event_type text not null check(event_type in (
    'authentication','mfa','password_reset','session','authorization','rls',
    'rate_limit','bot_challenge','suspicious_upload','webhook_failure',
    'credential_change','admin_change','destructive_operation','data_export',
    'browser_error','application_error','retention_completed'
  )),
  source text not null check(source in (
    'admin_bff','storefront_bff','edge_function','database','admin_browser'
  )),
  severity text not null check(severity in ('info','warning','critical')),
  outcome text not null check(outcome in ('succeeded','denied','failed','flagged')),
  actor_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  route_key text not null check(route_key ~ '^[a-z0-9_./:-]{1,120}$'),
  reason_code text not null check(reason_code ~ '^[A-Z0-9_]{3,80}$'),
  subject_kind text check(subject_kind is null or subject_kind ~ '^[a-z0-9_.:-]{1,60}$'),
  subject_id text check(subject_id is null or subject_id~'^[A-Za-z0-9_.:/-]{1,120}$'),
  occurred_at timestamptz not null default clock_timestamp()
);

create table if not exists k2_private.security_event_noise_buckets (
  bucket_start timestamptz not null,
  source text not null check(source in (
    'admin_bff','storefront_bff','edge_function','database','admin_browser'
  )),
  event_type text not null check(event_type in (
    'authentication','mfa','session','authorization','rls','rate_limit',
    'bot_challenge','browser_error','application_error'
  )),
  severity text not null check(severity in ('info','warning','critical')),
  outcome text not null check(outcome in ('succeeded','denied','failed','flagged')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_key uuid generated always as (
    coalesce(actor_id,'00000000-0000-0000-0000-000000000000'::uuid)
  ) stored,
  route_key text not null check(route_key ~ '^[a-z0-9_./:-]{1,120}$'),
  reason_code text not null check(reason_code ~ '^[A-Z0-9_]{3,80}$'),
  occurrence_count integer not null default 1 check(occurrence_count between 1 and 1000000),
  first_occurred_at timestamptz not null default clock_timestamp(),
  last_occurred_at timestamptz not null default clock_timestamp(),
  primary key(bucket_start,source,event_type,route_key,reason_code,actor_key)
);

create index if not exists security_events_time_idx
  on k2_private.security_events(occurred_at desc);
create index if not exists security_events_actor_time_idx
  on k2_private.security_events(actor_id,occurred_at desc) where actor_id is not null;
create index if not exists security_noise_last_idx
  on k2_private.security_event_noise_buckets(last_occurred_at desc);

alter table k2_private.security_event_nonces enable row level security;
alter table k2_private.security_event_nonces force row level security;
alter table k2_private.security_events enable row level security;
alter table k2_private.security_events force row level security;
alter table k2_private.security_event_noise_buckets enable row level security;
alter table k2_private.security_event_noise_buckets force row level security;
revoke all on table k2_private.security_event_nonces from public,anon,authenticated;
revoke all on table k2_private.security_events from public,anon,authenticated;
revoke all on table k2_private.security_event_noise_buckets from public,anon,authenticated;

create or replace function public.record_security_event_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_correlation_id uuid,
  p_event_type text,
  p_source text,
  p_severity text,
  p_outcome text,
  p_session_id uuid,
  p_route_key text,
  p_reason_code text,
  p_subject_kind text,
  p_subject_id text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_secret bytea;
  v_expected text;
  v_message text;
  v_inserted integer;
  v_bucket timestamptz;
begin
  if abs(extract(epoch from clock_timestamp())::bigint-p_timestamp)>300
     or p_signature!~'^[0-9a-f]{64}$'
     or p_event_type not in (
       'authentication','mfa','password_reset','session','authorization','rls',
       'rate_limit','bot_challenge','suspicious_upload','webhook_failure',
       'credential_change','admin_change','destructive_operation','data_export',
       'browser_error','application_error'
     )
     or p_source not in ('admin_bff','storefront_bff','edge_function','database','admin_browser')
     or p_severity not in ('info','warning','critical')
     or p_outcome not in ('succeeded','denied','failed','flagged')
     or p_route_key!~'^[a-z0-9_./:-]{1,120}$'
     or p_reason_code!~'^[A-Z0-9_]{3,80}$'
     or (p_subject_kind is not null and p_subject_kind!~'^[a-z0-9_.:-]{1,60}$')
     or (p_subject_id is not null and p_subject_id!~'^[A-Za-z0-9_.:/-]{1,120}$') then
    raise exception using errcode='22023',message='K2_SECURITY_EVENT_INVALID';
  end if;

  select request_secret into v_secret
  from k2_private.admin_bff_secrets where singleton=true;
  if v_secret is null then
    raise exception using errcode='55000',message='K2_SECURITY_EVENT_BOUNDARY_NOT_CONFIGURED';
  end if;
  v_message:=p_timestamp::text||E'\n'||p_nonce::text||E'\n'||p_correlation_id::text
    ||E'\n'||p_event_type||E'\n'||p_source||E'\n'||p_severity||E'\n'||p_outcome
    ||E'\n'||coalesce(p_session_id::text,'')||E'\n'||p_route_key||E'\n'||p_reason_code
    ||E'\n'||coalesce(p_subject_kind,'')||E'\n'||coalesce(p_subject_id,'');
  v_expected:=encode(extensions.hmac(convert_to(v_message,'UTF8'),v_secret,'sha256'),'hex');
  if extensions.digest(convert_to(v_expected,'UTF8'),'sha256')
     <>extensions.digest(convert_to(p_signature,'UTF8'),'sha256') then
    raise exception using errcode='28000',message='K2_SECURITY_EVENT_SIGNATURE_INVALID';
  end if;

  delete from k2_private.security_event_nonces where expires_at<=now();
  insert into k2_private.security_event_nonces(nonce,expires_at)
  values(p_nonce,now()+interval '10 minutes') on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted<>1 then
    raise exception using errcode='28000',message='K2_SECURITY_EVENT_REPLAYED';
  end if;

  if p_event_type in (
    'authentication','mfa','session','authorization','rls','rate_limit',
    'bot_challenge','browser_error','application_error'
  ) then
    v_bucket:=date_bin(interval '5 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00+00');
    insert into k2_private.security_event_noise_buckets(
      bucket_start,source,event_type,severity,outcome,actor_id,route_key,reason_code,
      first_occurred_at,last_occurred_at
    ) values(
      v_bucket,p_source,p_event_type,p_severity,p_outcome,v_actor,p_route_key,p_reason_code,
      clock_timestamp(),clock_timestamp()
    ) on conflict(bucket_start,source,event_type,route_key,reason_code,actor_key)
      do update set occurrence_count=k2_private.security_event_noise_buckets.occurrence_count+1,
        last_occurred_at=excluded.last_occurred_at,
        severity=case
          when k2_private.security_event_noise_buckets.severity='critical' then 'critical'
          when excluded.severity='critical' then 'critical'
          when k2_private.security_event_noise_buckets.severity='warning' then 'warning'
          else excluded.severity end;
  else
    insert into k2_private.security_events(
      correlation_id,event_type,source,severity,outcome,actor_id,session_id,
      route_key,reason_code,subject_kind,subject_id
    ) values(
      p_correlation_id,p_event_type,p_source,p_severity,p_outcome,v_actor,p_session_id,
      p_route_key,p_reason_code,p_subject_kind,p_subject_id
    );
  end if;
  return jsonb_build_object('recorded',true,'correlationId',p_correlation_id);
end;
$$;

revoke all on function public.record_security_event_v1(
  bigint,uuid,uuid,text,text,text,text,uuid,text,text,text,text,text
) from public,anon,authenticated;
grant execute on function public.record_security_event_v1(
  bigint,uuid,uuid,text,text,text,text,uuid,text,text,text,text,text
) to anon,authenticated;

create or replace function public.read_admin_security_review_v1(p_hours integer default 24)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_since timestamptz;
  v_events jsonb;
  v_summary jsonb;
  v_attention jsonb;
  v_total bigint;
begin
  if auth.uid() is null or not public.is_admin()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_AAL2_ADMIN_REQUIRED';
  end if;
  if p_hours not between 1 and 168 then
    raise exception using errcode='22023',message='K2_SECURITY_REVIEW_RANGE_INVALID';
  end if;
  v_since:=clock_timestamp()-make_interval(hours=>p_hours);

  with combined as (
    select occurred_at,event_type,source,severity,outcome,route_key,reason_code,
      subject_kind,subject_id,1::bigint as occurrence_count
    from k2_private.security_events where occurred_at>=v_since
    union all
    select last_occurred_at,event_type,source,severity,outcome,route_key,reason_code,
      null::text,null::text,occurrence_count::bigint
    from k2_private.security_event_noise_buckets where last_occurred_at>=v_since
  ), limited as (
    select * from combined order by occurred_at desc limit 100
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'occurredAt',occurred_at,'eventType',event_type,'source',source,
    'severity',severity,'outcome',outcome,'routeKey',route_key,
    'reasonCode',reason_code,'subjectKind',subject_kind,'subjectId',subject_id,
    'occurrenceCount',occurrence_count
  ) order by occurred_at desc),'[]'::jsonb) into v_events from limited;

  with combined as (
    select event_type,severity,1::bigint as occurrence_count
    from k2_private.security_events where occurred_at>=v_since
    union all
    select event_type,severity,occurrence_count::bigint
    from k2_private.security_event_noise_buckets where last_occurred_at>=v_since
  ), grouped as (
    select event_type,severity,sum(occurrence_count)::bigint as occurrence_count
    from combined group by event_type,severity
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'eventType',event_type,'severity',severity,'occurrenceCount',occurrence_count
  ) order by severity,event_type),'[]'::jsonb),coalesce(sum(occurrence_count),0)
  into v_summary,v_total from grouped;

  with combined as (
    select event_type,severity,outcome,route_key,reason_code,1::bigint as occurrence_count
    from k2_private.security_events where occurred_at>=v_since
    union all
    select event_type,severity,outcome,route_key,reason_code,occurrence_count::bigint
    from k2_private.security_event_noise_buckets where last_occurred_at>=v_since
  ), grouped as (
    select event_type,severity,outcome,route_key,reason_code,
      sum(occurrence_count)::bigint as occurrence_count
    from combined group by event_type,severity,outcome,route_key,reason_code
  ), classified as (
    select *,case
      when severity='critical' then 'CRITICAL_EVENT_REVIEW'
      when event_type in (
        'credential_change','admin_change','destructive_operation','data_export',
        'suspicious_upload','webhook_failure'
      ) then 'HIGH_VALUE_EVENT_REVIEW'
      when event_type in ('rate_limit','bot_challenge') and occurrence_count>=25
        then 'ABUSE_THRESHOLD_REVIEW'
      when event_type in ('authentication','mfa','authorization','rls')
        and outcome in ('denied','failed') and occurrence_count>=10
        then 'ACCESS_DENIAL_THRESHOLD_REVIEW'
      when event_type in ('browser_error','application_error') and occurrence_count>=10
        then 'REPEATED_FAILURE_REVIEW'
      else null end as attention_code
    from grouped
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'attentionCode',attention_code,'eventType',event_type,'severity',severity,
    'outcome',outcome,'routeKey',route_key,'reasonCode',reason_code,
    'occurrenceCount',occurrence_count
  ) order by case severity when 'critical' then 0 when 'warning' then 1 else 2 end,
    occurrence_count desc,event_type),'[]'::jsonb)
  into v_attention from classified where attention_code is not null;

  return jsonb_build_object(
    'windowHours',p_hours,'generatedAt',clock_timestamp(),
    'totalOccurrences',v_total,'summary',v_summary,'attention',v_attention,'events',v_events,
    'truncated',jsonb_array_length(v_events)=100
  );
end;
$$;

revoke all on function public.read_admin_security_review_v1(integer)
  from public,anon,authenticated;
grant execute on function public.read_admin_security_review_v1(integer) to authenticated;

create or replace function public.prune_security_events_v1(p_before timestamptz)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_events integer; v_buckets integer;
begin
  if p_before is null or p_before>clock_timestamp()-interval '30 days'
     or p_before<clock_timestamp()-interval '180 days' then
    raise exception using errcode='22023',message='K2_SECURITY_RETENTION_RANGE_INVALID';
  end if;
  delete from k2_private.security_events where occurred_at<p_before;
  get diagnostics v_events=row_count;
  delete from k2_private.security_event_noise_buckets where last_occurred_at<p_before;
  get diagnostics v_buckets=row_count;
  insert into k2_private.security_events(
    correlation_id,event_type,source,severity,outcome,route_key,reason_code,
    subject_kind,subject_id
  ) values(
    extensions.gen_random_uuid(),'retention_completed','database','info','succeeded',
    'security.retention','RETENTION_POLICY_APPLIED','security_events',
    v_events::text||':'||v_buckets::text
  );
  return jsonb_build_object('eventsDeleted',v_events,'bucketsDeleted',v_buckets);
end;
$$;

revoke all on function public.prune_security_events_v1(timestamptz)
  from public,anon,authenticated;
grant execute on function public.prune_security_events_v1(timestamptz) to service_role;

notify pgrst,'reload schema';
commit;
