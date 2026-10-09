-- IDEA-20261002-05 / MAP-018. Synthetic owned-clone fixture; entire caller transaction rolls back.
create temporary table category_foundation_checks(name text,passed boolean not null);
create function pg_temp.category_check(p_name text,p_passed boolean) returns void
language sql as $$insert into pg_temp.category_foundation_checks values(p_name,coalesce(p_passed,false))$$;
insert into public.categories(id,name,parent_id) values
 ('20000000-0000-4000-8000-000000000001','SYNTHETIC SAME NAME',null),
 ('20000000-0000-4000-8000-000000000002','SYNTHETIC SAME NAME','20000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000003','SYNTHETIC SAME NAME',null);
select pg_temp.category_check('unconfigured root defaults90',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000001',1)=90);
select pg_temp.category_check('unconfigured leaf defaults90',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000002',2)=90);
select pg_temp.category_check('NULL category refuses',k2_private.effective_category_minimum_v1(null,2) is null);
select pg_temp.category_check('missing category refuses',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000099',2) is null);
select pg_temp.category_check('NULL depth refuses',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000001',null) is null);
select pg_temp.category_check('zero depth refuses',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000001',0) is null);
select pg_temp.category_check('negative depth refuses',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000001',-1) is null);
select pg_temp.category_check('traversal at exact bound succeeds',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000002',2)=90);
select pg_temp.category_check('traversal past bound fails closed',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000002',1) is null);
insert into k2_private.category_shelf_life_policy(category_id,minimum_days,version,actor_id,reason) values
 ('20000000-0000-4000-8000-000000000001',150,1,'20000000-0000-4000-8000-000000000010','Synthetic parent decision'),
 ('20000000-0000-4000-8000-000000000002',120,1,'20000000-0000-4000-8000-000000000010','Synthetic leaf decision');
select pg_temp.category_check('highest parent150 overrides leaf120',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000002',2)=150);
select pg_temp.category_check('duplicate names do not select unrelated policy',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000003',1)=90);
update k2_private.category_shelf_life_policy set minimum_days=100,version=2 where category_id='20000000-0000-4000-8000-000000000001';
select pg_temp.category_check('stricter descendant survives ancestor decrease',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000002',2)=120);
update k2_private.category_shelf_life_policy set minimum_days=150,version=3 where category_id='20000000-0000-4000-8000-000000000001';
update k2_private.category_shelf_life_policy set minimum_days=null,version=2 where category_id='20000000-0000-4000-8000-000000000002';
select pg_temp.category_check('clear retains inherited150',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000002',2)=150);
select pg_temp.category_check('clear retains row and advances version',exists(select 1 from k2_private.category_shelf_life_policy where category_id='20000000-0000-4000-8000-000000000002' and minimum_days is null and version=2));
update public.categories set parent_id='20000000-0000-4000-8000-000000000002' where id='20000000-0000-4000-8000-000000000001';
select pg_temp.category_check('cycle refuses instead of defaulting',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000002',10) is null);
update public.categories set parent_id=null where id='20000000-0000-4000-8000-000000000001';
alter table public.categories drop constraint categories_parent_id_fkey;
update public.categories set parent_id='20000000-0000-4000-8000-000000000099' where id='20000000-0000-4000-8000-000000000003';
select pg_temp.category_check('dangling parent refuses',k2_private.effective_category_minimum_v1('20000000-0000-4000-8000-000000000003',10) is null);
do $checks$
declare refused boolean;
begin
 refused:=false;
 begin update k2_private.category_shelf_life_policy set minimum_days=89,version=4 where category_id='20000000-0000-4000-8000-000000000001'; exception when check_violation then refused:=true; end;
 perform pg_temp.category_check('below90 override refuses',refused);
 refused:=false;
 begin update k2_private.category_shelf_life_policy set version=1 where category_id='20000000-0000-4000-8000-000000000001'; exception when check_violation then refused:=true; end;
 perform pg_temp.category_check('version reset refuses',refused);
 refused:=false;
 begin delete from k2_private.category_shelf_life_policy where category_id='20000000-0000-4000-8000-000000000001'; exception when check_violation then refused:=true; end;
 perform pg_temp.category_check('policy deletion refuses ABA reset',refused);
 refused:=false;
 begin truncate k2_private.category_shelf_life_policy; exception when check_violation then refused:=true; end;
 perform pg_temp.category_check('policy truncate refuses',refused);
end $checks$;
insert into k2_private.category_shelf_life_events(category_id,version,before_minimum_days,after_minimum_days,actor_id,reason) values
 ('20000000-0000-4000-8000-000000000001',1,null,150,'20000000-0000-4000-8000-000000000010','Synthetic history');
do $checks$
declare refused boolean;
begin
 refused:=false;
 begin update k2_private.category_shelf_life_events set reason='Rewrite'; exception when check_violation then refused:=true; end;
 perform pg_temp.category_check('event rewrite refuses',refused);
 refused:=false;
 begin delete from k2_private.category_shelf_life_events; exception when check_violation then refused:=true; end;
 perform pg_temp.category_check('event deletion refuses',refused);
 refused:=false;
 begin truncate k2_private.category_shelf_life_events; exception when check_violation then refused:=true; end;
 perform pg_temp.category_check('event truncate refuses',refused);
end $checks$;
select pg_temp.category_check('anon cannot execute private resolver',not has_function_privilege('anon','k2_private.effective_category_minimum_v1(uuid,integer)','execute'));
select pg_temp.category_check('authenticated cannot execute private resolver',not has_function_privilege('authenticated','k2_private.effective_category_minimum_v1(uuid,integer)','execute'));
select pg_temp.category_check('service_role cannot directly mutate policy',not has_table_privilege('service_role','k2_private.category_shelf_life_policy','insert,update,delete,truncate'));
select pg_temp.category_check('authenticated cannot directly mutate events',not has_table_privilege('authenticated','k2_private.category_shelf_life_events','insert,update,delete,truncate'));
select pg_temp.category_check('service_role cannot execute resolver',not has_function_privilege('service_role','k2_private.effective_category_minimum_v1(uuid,integer)','execute'));
select pg_temp.category_check('anon cannot read private policy',not has_table_privilege('anon','k2_private.category_shelf_life_policy','select'));
select pg_temp.category_check('authenticated cannot read private events',not has_table_privilege('authenticated','k2_private.category_shelf_life_events','select'));
do $checks$
declare refused boolean;
begin
 refused:=false;
 begin update k2_private.category_shelf_life_policy set reason='  ',version=4 where category_id='20000000-0000-4000-8000-000000000001'; exception when check_violation then refused:=true; end;
 perform pg_temp.category_check('blank decision reason refuses',refused);
 refused:=false;
 begin update k2_private.category_shelf_life_policy set actor_id=null,version=4 where category_id='20000000-0000-4000-8000-000000000001'; exception when not_null_violation then refused:=true; end;
 perform pg_temp.category_check('missing decision actor refuses',refused);
 refused:=false;
 begin insert into k2_private.category_shelf_life_events(category_id,version,after_minimum_days,actor_id,reason) values('20000000-0000-4000-8000-000000000001',1,150,'20000000-0000-4000-8000-000000000010','Duplicate synthetic history'); exception when unique_violation then refused:=true; end;
 perform pg_temp.category_check('duplicate category event version refuses',refused);
 refused:=false;
 begin delete from public.categories where id='20000000-0000-4000-8000-000000000001'; exception when foreign_key_violation then refused:=true; end;
 perform pg_temp.category_check('taxonomy deletion cannot erase policy history',refused);
end $checks$;
-- Synthetic access-path evidence only: no real cardinality/production latency claim.
create temporary table category_foundation_plan(plan jsonb);
do $plan$
declare v_plan jsonb;
begin
 execute $query$explain (format json,costs true) select c.parent_id,p.minimum_days from public.categories c
 left join k2_private.category_shelf_life_policy p on p.category_id=c.id
 where c.id='20000000-0000-4000-8000-000000000002'$query$ into v_plan;
 insert into pg_temp.category_foundation_plan values(v_plan);
end $plan$;
select jsonb_build_object('cases',(select jsonb_agg(jsonb_build_object('name',name,'passed',passed) order by name) from pg_temp.category_foundation_checks),'syntheticPlan',(select plan from pg_temp.category_foundation_plan))::text;
