-- IDEA-20261002-05 / MAP-018. Private fresh-only preparation, outside activation migrations.
-- No public/signed/BFF caller exists yet. The future boundary must verify action/signature,
-- nonce, rate, durable replay and request deadlines before calling this closed helper.
do $preflight$
begin
 if current_user<>'postgres'
    or to_regclass('k2_private.category_shelf_life_policy') is null
    or to_regclass('k2_private.category_shelf_life_events') is null
    or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null
    or to_regprocedure('k2_private.effective_category_minimum_v1(uuid,integer)') is null then
  raise exception 'K2_CATEGORY_MUTATION_TARGET_INVALID';
 end if;
 if to_regprocedure('k2_private.mutate_category_policy_v1(uuid,text,integer,bigint,text,integer)') is not null then
  raise exception 'K2_CATEGORY_MUTATION_ALREADY_PRESENT';
 end if;
end $preflight$;

create function k2_private.mutate_category_policy_v1(
 p_category_id uuid,p_action text,p_minimum_days integer,p_expected_version bigint,
 p_reason text,p_max_depth integer
) returns jsonb language plpgsql volatile security definer set search_path='' as $mutation$
declare
 v_actor uuid:=auth.uid();
 v_reason text:=pg_catalog.btrim(p_reason);
 v_before integer;
 v_version bigint;
 v_effective integer;
 v_instant timestamptz;
begin
 if v_actor is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception using errcode='42501',message='K2_CATEGORY_POLICY_ADMIN_REQUIRED';
 end if;
 if p_category_id is null or p_action is null or p_action not in ('set','clear')
    or p_expected_version is null or p_expected_version<0
    or v_reason is null or length(v_reason) not between 8 and 500
    or p_max_depth is null or p_max_depth<1
    or (p_action='set' and (p_minimum_days is null or p_minimum_days<90))
    or (p_action='clear' and p_minimum_days is not null) then
  raise exception using errcode='22023',message='K2_CATEGORY_POLICY_INPUT_INVALID';
 end if;
 -- Strongest mode precedes category/policy rows. No nested shared-to-exclusive upgrade.
 perform k2_private.lock_category_policy_v1(true);
 perform 1 from public.categories where id=p_category_id for update;
 if not found then
  raise exception using errcode='23514',message='K2_CATEGORY_POLICY_TAXONOMY_INVALID';
 end if;
 -- Fresh internal statement after entry lock; caller hierarchy limit remains unactivated.
 v_effective:=k2_private.effective_category_minimum_v1(p_category_id,p_max_depth);
 if v_effective is null then
  raise exception using errcode='23514',message='K2_CATEGORY_POLICY_TAXONOMY_INVALID';
 end if;
 select minimum_days,version into v_before,v_version
  from k2_private.category_shelf_life_policy where category_id=p_category_id for update;
 if not found then v_version:=0;v_before:=null;end if;
 if v_version<>p_expected_version then
  raise exception using errcode='40001',message='K2_CATEGORY_POLICY_VERSION_CONFLICT';
 end if;
 if v_version=9223372036854775807 then
  raise exception using errcode='55000',message='K2_CATEGORY_POLICY_VERSION_EXHAUSTED';
 end if;
 v_instant:=pg_catalog.clock_timestamp();
 if v_version=0 then
  insert into k2_private.category_shelf_life_policy(category_id,minimum_days,version,actor_id,reason,changed_at)
   values(p_category_id,p_minimum_days,1,v_actor,v_reason,v_instant);
 else
  update k2_private.category_shelf_life_policy set minimum_days=p_minimum_days,
   version=v_version+1,actor_id=v_actor,reason=v_reason,changed_at=v_instant where category_id=p_category_id;
 end if;
 insert into k2_private.category_shelf_life_events(category_id,version,before_minimum_days,after_minimum_days,actor_id,reason,created_at)
  values(p_category_id,v_version+1,v_before,p_minimum_days,v_actor,v_reason,v_instant);
 v_effective:=k2_private.effective_category_minimum_v1(p_category_id,p_max_depth);
 if v_effective is null then
  raise exception using errcode='23514',message='K2_CATEGORY_POLICY_TAXONOMY_INVALID';
 end if;
 return jsonb_build_object('categoryId',p_category_id,'localMinimum',p_minimum_days,
  'version',v_version+1,'effectiveMinimum',v_effective);
end $mutation$;
revoke all on function k2_private.mutate_category_policy_v1(uuid,text,integer,bigint,text,integer)
 from public,anon,authenticated,service_role;
