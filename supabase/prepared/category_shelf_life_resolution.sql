-- IDEA-20261002-05 / MAP-018/023/026. PREPARED FRAGMENT ONLY, not an activation migration.
-- Execute only within the owned rehearsal transaction. No operating overrides are seeded.
-- Signed mutation/event attribution, policy-lock entry and all operational writers remain required.
-- Caller must select and validate a finite depth against reviewed actual taxonomy before activation.
do $preflight$
begin
 if current_user <> 'postgres' or to_regnamespace('k2_private') is null
    or to_regclass('public.categories') is null then
  raise exception 'K2_CATEGORY_FOUNDATION_TARGET_INVALID';
 end if;
 if to_regclass('k2_private.category_shelf_life_policy') is not null
    or to_regclass('k2_private.category_shelf_life_events') is not null
    or to_regprocedure('k2_private.effective_category_minimum_v1(uuid,integer)') is not null
    or to_regprocedure('k2_private.guard_category_policy_history_v1()') is not null then
  raise exception 'K2_CATEGORY_FOUNDATION_ALREADY_PRESENT';
 end if;
 if (select count(*) from pg_catalog.pg_attribute
     where attrelid='public.categories'::regclass and attname in ('id','parent_id')
       and atttypid='uuid'::regtype and not attisdropped) <> 2 then
  raise exception 'K2_CATEGORY_IDENTITY_SCHEMA_INVALID';
 end if;
end $preflight$;

create table k2_private.category_shelf_life_policy (
 category_id uuid primary key references public.categories(id) on delete restrict,
 minimum_days integer check(minimum_days >= 90),
 version bigint not null check(version > 0),
 actor_id uuid not null,
 reason text not null check(nullif(pg_catalog.btrim(reason),'') is not null),
 changed_at timestamptz not null default pg_catalog.clock_timestamp()
);
create table k2_private.category_shelf_life_events (
 id uuid primary key default gen_random_uuid(),
 category_id uuid not null references public.categories(id) on delete restrict,
 version bigint not null check(version > 0),
 before_minimum_days integer check(before_minimum_days >= 90),
 after_minimum_days integer check(after_minimum_days >= 90),
 actor_id uuid not null,
 reason text not null check(nullif(pg_catalog.btrim(reason),'') is not null),
 created_at timestamptz not null default pg_catalog.clock_timestamp(),
 unique(category_id,version)
);
alter table k2_private.category_shelf_life_policy enable row level security;
alter table k2_private.category_shelf_life_events enable row level security;
revoke all on k2_private.category_shelf_life_policy,k2_private.category_shelf_life_events
 from public,anon,authenticated,service_role;

create function k2_private.guard_category_policy_history_v1() returns trigger
language plpgsql set search_path='' as $guard$
begin
 if tg_table_name='category_shelf_life_policy' and tg_op='UPDATE' then
  if new.category_id is distinct from old.category_id
     or old.version=9223372036854775807
     or new.version is distinct from old.version+1 then
   raise exception using errcode='23514',message='K2_CATEGORY_POLICY_VERSION_INVALID';
  end if;
  return new;
 end if;
 raise exception using errcode='23514',message='K2_CATEGORY_POLICY_HISTORY_RETAINED';
end $guard$;
revoke all on function k2_private.guard_category_policy_history_v1() from public,anon,authenticated,service_role;
create trigger category_policy_retention before update or delete on k2_private.category_shelf_life_policy
 for each row execute function k2_private.guard_category_policy_history_v1();
create trigger category_policy_no_truncate before truncate on k2_private.category_shelf_life_policy
 for each statement execute function k2_private.guard_category_policy_history_v1();
create trigger category_event_immutable before update or delete on k2_private.category_shelf_life_events
 for each row execute function k2_private.guard_category_policy_history_v1();
create trigger category_event_no_truncate before truncate on k2_private.category_shelf_life_events
 for each statement execute function k2_private.guard_category_policy_history_v1();

create function k2_private.effective_category_minimum_v1(p_category_id uuid,p_max_depth integer)
returns integer language plpgsql stable security definer set search_path='' as $resolve$
declare
 v_current uuid:=p_category_id;
 v_parent uuid;
 v_override integer;
 v_visited uuid[]:='{}';
 v_minimum integer:=90;
begin
 if p_category_id is null or p_max_depth is null or p_max_depth < 1 then return null; end if;
 while v_current is not null loop
  if v_current=any(v_visited) or pg_catalog.cardinality(v_visited)>=p_max_depth then return null; end if;
  select c.parent_id,p.minimum_days into v_parent,v_override
   from public.categories c left join k2_private.category_shelf_life_policy p on p.category_id=c.id
   where c.id=v_current;
  if not found then return null; end if;
  if v_override is not null and v_override < 90 then return null; end if;
  v_minimum:=greatest(v_minimum,coalesce(v_override,90));
  v_visited:=pg_catalog.array_append(v_visited,v_current);
  v_current:=v_parent;
 end loop;
 return v_minimum;
end $resolve$;
revoke all on function k2_private.effective_category_minimum_v1(uuid,integer)
 from public,anon,authenticated,service_role;
