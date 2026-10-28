-- Catalog metadata only on the owned restored database. No row/contact values.
with selected as (
 select c.oid,n.nspname as schema,c.relname as name,c.relrowsecurity as rls,c.relforcerowsecurity as forced_rls
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind in ('r','p') and n.nspname in ('auth','public','k2_private')
), relations as (
 select s.*,coalesce((select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
   'notNull',a.attnotnull) order by a.attnum) from pg_attribute a where a.attrelid=s.oid and a.attnum>0 and not a.attisdropped),'[]'::jsonb) as columns,
 coalesce((select jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid),
   'enabled',t.tgenabled,'function',t.tgfoid::regprocedure::text,'sourceMd5',md5(p.prosrc)) order by t.tgname)
   from pg_trigger t join pg_proc p on p.oid=t.tgfoid where t.tgrelid=s.oid and not t.tgisinternal),'[]'::jsonb) as triggers,
 coalesce((select jsonb_agg(jsonb_build_object('name',con.conname,'definition',pg_get_constraintdef(con.oid),
   'references',con.confrelid::regclass::text,
   'sourceColumns',(select jsonb_agg(a.attname order by k.ord) from unnest(con.conkey) with ordinality k(num,ord)
     join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.num),
   'targetColumns',(select jsonb_agg(a.attname order by k.ord) from unnest(con.confkey) with ordinality k(num,ord)
     join pg_attribute a on a.attrelid=con.confrelid and a.attnum=k.num)) order by con.conname) from pg_constraint con
   where con.conrelid=s.oid and con.contype='f'),'[]'::jsonb) as foreign_keys,
 coalesce((select jsonb_agg(a.attname order by k.ord) from pg_constraint con,
   unnest(con.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=s.oid and a.attnum=k.num
   where con.conrelid=s.oid and con.contype='p'),'[]'::jsonb) as primary_key,
 coalesce((select jsonb_agg(jsonb_build_object('role',r.rolname,'insert',has_table_privilege(r.oid,s.oid,'INSERT'),
   'update',has_table_privilege(r.oid,s.oid,'UPDATE'),'delete',has_table_privilege(r.oid,s.oid,'DELETE')) order by r.rolname)
   from pg_roles r where r.rolname in ('anon','authenticated','service_role','supabase_auth_admin','supabase_storage_admin')),'[]'::jsonb) as role_capabilities,
 coalesce((select jsonb_agg(jsonb_build_object('name',pol.polname,'command',pol.polcmd,
   'using',pg_get_expr(pol.polqual,pol.polrelid),'check',pg_get_expr(pol.polwithcheck,pol.polrelid)) order by pol.polname)
   from pg_policy pol where pol.polrelid=s.oid),'[]'::jsonb) as policies,
 coalesce((select jsonb_agg(jsonb_build_object('relation',con.conrelid::regclass::text,'name',con.conname,
   'definition',pg_get_constraintdef(con.oid)) order by con.conrelid::regclass::text,con.conname) from pg_constraint con
   where con.confrelid=s.oid and con.contype='f'),'[]'::jsonb) as referenced_by
 from selected s
), routines as (
 select n.nspname as schema,p.proname as name,p.oid::regprocedure::text as signature,l.lanname as language,
   p.prosecdef as security_definer,md5(p.prosrc) as source_md5,
   has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
   has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
   has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute,
   (select jsonb_agg(s.schema||'.'||s.name order by s.schema,s.name) from selected s
     where lower(p.prosrc) ~ ('\m'||s.name||'\M')) as referenced_selected_names,
   lower(p.prosrc) ~ '\m(insert|update|delete|truncate)\M' as lexical_write_candidate,
   lower(p.prosrc) ~ '\mexecute\M' as dynamic_sql_candidate
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
 where p.prokind='f' and n.nspname in ('public','k2_private','auth')
   and exists(select 1 from selected s where lower(p.prosrc) ~ ('\m'||s.name||'\M'))
)
select jsonb_build_object(
 'scope','owned restored schema metadata after prepared migrations, not live privileges or a complete writer proof',
 'catalogRelations',(select jsonb_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where c.relkind in ('r','p') and n.nspname in ('auth','public','k2_private')),
 'excludedRelations',(select coalesce(jsonb_agg(n.nspname||'.'||c.relname order by n.nspname,c.relname),'[]'::jsonb)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p')
     and n.nspname not in ('auth','public','k2_private','pg_catalog','information_schema') and n.nspname !~ '^pg_toast'),
 'relations',(select jsonb_agg(to_jsonb(r)-'oid' order by schema,name) from relations r),
 'routines',(select jsonb_agg(to_jsonb(r) order by schema,name,signature) from routines r),
 'limits',jsonb_build_array('Original owners and ACLs excluded by restore; role capabilities are local only.',
 'Lexical routine-name matches include readers and can miss dynamic SQL, wrappers, extensions and provider writers.',
 'No source body, row, contact, credential or payment value is emitted.','A listed trigger is not proof of an all-writer freeze barrier.')
);
