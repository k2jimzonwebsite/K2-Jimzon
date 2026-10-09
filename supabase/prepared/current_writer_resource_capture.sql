-- IDEA-20261007-03 / MAP-017/018: read-only supplement to full05 metadata.
-- Run with empty search_path in an owned local clone, inside a bounded read-only
-- repeatable-read transaction. No application rows, secret values or invocation.
-- Privileges below are native ACL checks, not RLS/body/HTTP authorization proof.
with schemas as (
 select n.* from pg_catalog.pg_namespace n
 where n.nspname in ('public','k2_private','auth','storage','extensions')
), functions as (
 select p.*,n.nspname from pg_catalog.pg_proc p join schemas n on n.oid=p.pronamespace
), relations as (
 select c.*,n.nspname from pg_catalog.pg_class c join schemas n on n.oid=c.relnamespace
 where c.relkind in ('r','p','v','m','S','f')
), roles as (
 select r.* from pg_catalog.pg_roles r where r.rolname in ('anon','authenticated','service_role')
), objects as (
 select 'pg_catalog.pg_namespace'::regclass::oid as classid,oid as objid from schemas
 union select 'pg_catalog.pg_proc'::regclass::oid,oid from functions
 union select 'pg_catalog.pg_class'::regclass::oid,oid from relations
 union select 'pg_catalog.pg_class'::regclass::oid,i.indexrelid from pg_catalog.pg_index i join relations r on r.oid=i.indrelid
 union select 'pg_catalog.pg_type'::regclass::oid,t.oid from pg_catalog.pg_type t join schemas n on n.oid=t.typnamespace
 union select 'pg_catalog.pg_attrdef'::regclass::oid,d.oid from pg_catalog.pg_attrdef d join relations r on r.oid=d.adrelid
 union select 'pg_catalog.pg_constraint'::regclass::oid,c.oid from pg_catalog.pg_constraint c join schemas n on n.oid=c.connamespace
 union select 'pg_catalog.pg_trigger'::regclass::oid,t.oid from pg_catalog.pg_trigger t join relations r on r.oid=t.tgrelid
 union select 'pg_catalog.pg_rewrite'::regclass::oid,w.oid from pg_catalog.pg_rewrite w join relations r on r.oid=w.ev_class
 union select 'pg_catalog.pg_policy'::regclass::oid,p.oid from pg_catalog.pg_policy p join relations r on r.oid=p.polrelid
 union select 'pg_catalog.pg_event_trigger'::regclass::oid,e.oid from pg_catalog.pg_event_trigger e
 union select 'pg_catalog.pg_operator'::regclass::oid,o.oid from pg_catalog.pg_operator o join schemas n on n.oid=o.oprnamespace
 union select 'pg_catalog.pg_opclass'::regclass::oid,o.oid from pg_catalog.pg_opclass o join schemas n on n.oid=o.opcnamespace
 union select 'pg_catalog.pg_opfamily'::regclass::oid,o.oid from pg_catalog.pg_opfamily o join schemas n on n.oid=o.opfnamespace
), dependencies as (
 select d.* from pg_catalog.pg_depend d where
 exists(select 1 from objects o where o.classid=d.classid and o.objid=d.objid)
 or exists(select 1 from objects o where o.classid=d.refclassid and o.objid=d.refobjid)
), relevant_operator_families as (
 select o.oid from pg_catalog.pg_opfamily o join schemas n on n.oid=o.opfnamespace
 union select c.opcfamily from pg_catalog.pg_index i join relations r on r.oid=i.indrelid
 cross join lateral unnest(i.indclass::oid[]) k(oid) join pg_catalog.pg_opclass c on c.oid=k.oid
)
select jsonb_build_object(
 'contract','k2-current-writer-resource-metadata-v1',
 'database',current_database(),'serverVersion',current_setting('server_version_num'),
 'limits',jsonb_build_object('lock',current_setting('lock_timeout'),'statement',current_setting('statement_timeout'),
   'readOnly',current_setting('transaction_read_only'),'isolation',current_setting('transaction_isolation')),
 'roles',coalesce((select jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,'inherit',rolinherit,'bypassRLS',rolbypassrls) order by rolname) from roles),'[]'::jsonb),
 'eventTriggers',coalesce((select jsonb_agg(jsonb_build_object(
   'name',e.evtname,'event',e.evtevent,'enabled',e.evtenabled,'tags',e.evttags,
   'owner',pg_get_userbyid(e.evtowner),'function',format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
 ) order by e.evtname) from pg_catalog.pg_event_trigger e join pg_catalog.pg_proc p on p.oid=e.evtfoid join pg_catalog.pg_namespace n on n.oid=p.pronamespace),'[]'::jsonb),
 'functionPrivileges',coalesce((select jsonb_agg(jsonb_build_object(
   'identity',format('%I.%I(%s)',p.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),
   'kind',p.prokind,'owner',pg_get_userbyid(p.proowner),'securityDefiner',p.prosecdef,
   'role',r.rolname,'schemaUsage',has_schema_privilege(r.oid,p.pronamespace,'USAGE'),
   'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')
 ) order by p.nspname,p.proname,pg_get_function_identity_arguments(p.oid),r.rolname) from functions p cross join roles r),'[]'::jsonb),
 'relationPrivileges',coalesce((select jsonb_agg(jsonb_build_object(
   'name',format('%I.%I',c.nspname,c.relname),'kind',c.relkind,'role',r.rolname,
   'schemaUsage',has_schema_privilege(r.oid,c.relnamespace,'USAGE'),
   'rlsEnabled',c.relrowsecurity,'rlsForced',c.relforcerowsecurity,
   'privileges',case when c.relkind='S' then jsonb_build_object(
     'usage',has_sequence_privilege(r.oid,c.oid,'USAGE'),'select',has_sequence_privilege(r.oid,c.oid,'SELECT'),'update',has_sequence_privilege(r.oid,c.oid,'UPDATE'))
   else jsonb_build_object('select',has_table_privilege(r.oid,c.oid,'SELECT'),'insert',has_table_privilege(r.oid,c.oid,'INSERT'),
     'update',has_table_privilege(r.oid,c.oid,'UPDATE'),'delete',has_table_privilege(r.oid,c.oid,'DELETE'),
     'truncate',has_table_privilege(r.oid,c.oid,'TRUNCATE'),'references',has_table_privilege(r.oid,c.oid,'REFERENCES'),'trigger',has_table_privilege(r.oid,c.oid,'TRIGGER')) end,
   'columns',case when c.relkind='S' then '[]'::jsonb else (select coalesce(jsonb_agg(jsonb_build_object(
     'name',a.attname,'select',has_column_privilege(r.oid,c.oid,a.attnum,'SELECT'),
     'insert',has_column_privilege(r.oid,c.oid,a.attnum,'INSERT'),'update',has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE'),
     'references',has_column_privilege(r.oid,c.oid,a.attnum,'REFERENCES')) order by a.attnum),'[]'::jsonb)
     from pg_catalog.pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) end
 ) order by c.nspname,c.relname,r.rolname) from relations c cross join roles r),'[]'::jsonb),
 'indexes',coalesce((select jsonb_agg(jsonb_build_object(
   'table',format('%I.%I',r.nspname,r.relname),'definition',pg_get_indexdef(i.indexrelid),
   'expressions',pg_get_expr(i.indexprs,i.indrelid),'predicate',pg_get_expr(i.indpred,i.indrelid),
   'operatorClasses',(select jsonb_agg(format('%I.%I',n.nspname,c.opcname) order by k.ordinality)
     from unnest(i.indclass::oid[]) with ordinality k(oid,ordinality) join pg_catalog.pg_opclass c on c.oid=k.oid join pg_catalog.pg_namespace n on n.oid=c.opcnamespace)
 ) order by r.nspname,r.relname,pg_get_indexdef(i.indexrelid)) from pg_catalog.pg_index i join relations r on r.oid=i.indrelid),'[]'::jsonb),
 'operators',coalesce((select jsonb_agg(jsonb_build_object(
   'identity',pg_describe_object('pg_catalog.pg_operator'::regclass,o.oid,0),
   'implementation',o.oprcode::regprocedure::text,'restrictionEstimator',o.oprrest::regprocedure::text,'joinEstimator',o.oprjoin::regprocedure::text
 ) order by o.oid) from pg_catalog.pg_operator o where o.oprnamespace in(select oid from schemas)
 or exists(select 1 from pg_catalog.pg_amop a join relevant_operator_families f on f.oid=a.amopfamily where a.amopopr=o.oid)),'[]'::jsonb),
 'operatorSupport',coalesce((select jsonb_agg(jsonb_build_object(
   'family',pg_describe_object('pg_catalog.pg_opfamily'::regclass,a.amprocfamily,0),
   'leftType',format_type(a.amproclefttype,null),'rightType',format_type(a.amprocrighttype,null),
   'supportNumber',a.amprocnum,'function',a.amproc::regprocedure::text
 ) order by a.amprocfamily,a.amproclefttype,a.amprocrighttype,a.amprocnum) from pg_catalog.pg_amproc a join relevant_operator_families f on f.oid=a.amprocfamily),'[]'::jsonb),
 'dependencies',coalesce((select jsonb_agg(jsonb_build_object(
   'dependent',pg_describe_object(d.classid,d.objid,d.objsubid),
   'referenced',pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid),'type',d.deptype
 ) order by d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype) from dependencies d),'[]'::jsonb),
 'limitsOfEvidence',jsonb_build_array('Scoped catalogs and incident recorded dependencies only; not transitive semantic closure',
   'Native privilege predicates do not execute functions or prove body guards, RLS policy outcome or HTTP admission',
   'Dynamic SQL, runtime search paths, overload dispatch, extension native code and concurrent execution require separate classification')
);
