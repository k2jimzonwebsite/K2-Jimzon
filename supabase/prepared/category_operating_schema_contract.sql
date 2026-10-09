-- MAP-018 / IDEA-20261002-05. SELECT-only logical schema contract, no row values.
-- Caller sets empty search_path; schemas and reg* renderings stay qualified.
with ns as (
 select * from pg_catalog.pg_namespace where nspname in ('public','k2_private','storage','auth','extensions')
), relations as (
 select c.*,n.nspname from pg_catalog.pg_class c join ns n on n.oid=c.relnamespace
 where c.relkind in ('r','p','v','m','S','f','c')
)
select jsonb_build_object(
 'contract','k2-category-operating-schema-v1',
 'unsupportedAggregates',coalesce((select jsonb_agg(format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) order by n.nspname,p.proname) from pg_proc p join ns n on n.oid=p.pronamespace where p.prokind='a'),'[]'::jsonb),
 'extensions',(select jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname,'owner',pg_get_userbyid(e.extowner),'relocatable',e.extrelocatable) order by e.extname) from pg_extension e join pg_namespace n on n.oid=e.extnamespace),
 'schemas',(select jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',(select jsonb_agg(a::text order by a::text) from unnest(coalesce(nspacl,acldefault('n',nspowner))) a)) order by nspname) from ns),
 'defaults',coalesce((select jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',coalesce(n.nspname,''),'type',d.defaclobjtype,'acl',d.defaclacl) order by pg_get_userbyid(d.defaclrole),coalesce(n.nspname,''),d.defaclobjtype) from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace where d.defaclnamespace=0 or n.nspname in ('public','k2_private','storage','auth')),'[]'::jsonb),
 'functions',(select jsonb_agg(jsonb_build_object(
   'identity',format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),
   'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
   'catalog',to_jsonb(p)-array['oid','pronamespace','proowner','prolang','prorettype','proargtypes','proallargtypes','provariadic','prosupport','prosrc','prosqlbody','proargdefaults','protrftypes'],
   'definition',replace(pg_get_functiondef(p.oid),chr(13)||chr(10),chr(10)),
   'result',pg_get_function_result(p.oid),'defaults',pg_get_expr(p.proargdefaults,0),
   'variadic',case when p.provariadic<>0 then format_type(p.provariadic,null) end,
   'support',case when p.prosupport<>0 then p.prosupport::regprocedure::text end,
   'transforms',(select coalesce(jsonb_agg(format_type(t,null) order by ord),'[]'::jsonb) from unnest(p.protrftypes) with ordinality u(t,ord))
 ) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join ns n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where p.prokind<>'a'),
 'types',(select jsonb_agg(jsonb_build_object(
   'name',format('%I.%I',n.nspname,t.typname),'owner',pg_get_userbyid(t.typowner),
   'catalog',to_jsonb(t)-array['oid','typnamespace','typowner','typrelid','typelem','typarray','typbasetype','typcollation','typinput','typoutput','typreceive','typsend','typmodin','typmodout','typanalyze','typsubscript','typdefaultbin'],
   'relation',case when t.typrelid<>0 then t.typrelid::regclass::text end,
   'element',case when t.typelem<>0 then format_type(t.typelem,null) end,
   'base',case when t.typbasetype<>0 then format_type(t.typbasetype,t.typtypmod) end,
   'array',case when t.typarray<>0 then format_type(t.typarray,null) end,
   'collation',case when t.typcollation<>0 then t.typcollation::regcollation::text end,
   'io',jsonb_build_array(t.typinput::regprocedure::text,t.typoutput::regprocedure::text,t.typreceive::regprocedure::text,t.typsend::regprocedure::text,t.typmodin::regprocedure::text,t.typmodout::regprocedure::text,t.typanalyze::regprocedure::text,t.typsubscript::regprocedure::text),
   'default',pg_get_expr(t.typdefaultbin,0),
   'enum',(select coalesce(jsonb_agg(jsonb_build_object('label',e.enumlabel,'order',e.enumsortorder) order by e.enumsortorder),'[]'::jsonb) from pg_enum e where e.enumtypid=t.oid),
   'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated) order by k.conname),'[]'::jsonb) from pg_constraint k where k.contypid=t.oid),
   'range',(select jsonb_build_object('subtype',format_type(r.rngsubtype,null),'collation',r.rngcollation::regcollation::text,'canonical',r.rngcanonical::regprocedure::text,'difference',r.rngsubdiff::regprocedure::text,'multirange',format_type(r.rngmultitypid,null)) from pg_range r where r.rngtypid=t.oid)
 ) order by n.nspname,t.typname) from pg_type t join ns n on n.oid=t.typnamespace),
 'relations',(select jsonb_agg(jsonb_build_object(
   'name',format('%I.%I',c.nspname,c.relname),'owner',pg_get_userbyid(c.relowner),
   'kind',c.relkind,'persistence',c.relpersistence,'acl',(select jsonb_agg(a::text order by a::text) from unnest(coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner))) a),'options',c.reloptions,
   'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'replicaIdentity',c.relreplident,
   'partition',pg_get_expr(c.relpartbound,c.oid),
   'parents',(select coalesce(jsonb_agg(i.inhparent::regclass::text order by i.inhseqno),'[]'::jsonb) from pg_inherits i where i.inhrelid=c.oid),
   'columns',(select coalesce(jsonb_agg(jsonb_build_object('name',a.attname,
     'catalog',to_jsonb(a)-array['attrelid','atttypid','attcollation','atthasmissing','attmissingval'],
     'type',format_type(a.atttypid,a.atttypmod),'collation',case when a.attcollation<>0 then a.attcollation::regcollation::text end,
     'default',pg_get_expr(d.adbin,d.adrelid)
   ) order by a.attnum),'[]'::jsonb) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
   'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated,'local',k.conislocal,'inherit',k.coninhcount,'noInherit',k.connoinherit) order by k.conname),'[]'::jsonb) from pg_constraint k where k.conrelid=c.oid),
   'indexes',(select coalesce(jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'clustered',i.indisclustered,'replicaIdentity',i.indisreplident,'options',ic.reloptions,'owner',pg_get_userbyid(ic.relowner)) order by pg_get_indexdef(i.indexrelid)),'[]'::jsonb) from pg_index i join pg_class ic on ic.oid=i.indexrelid where i.indrelid=c.oid),
   'triggers',(select coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) order by t.tgname),'[]'::jsonb) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal),
   'internalTriggers',(select coalesce(jsonb_agg(jsonb_build_object('constraint',k.conname,'function',t.tgfoid::regprocedure::text,'type',t.tgtype,'enabled',t.tgenabled,'deferrable',t.tgdeferrable,'deferred',t.tginitdeferred) order by k.conname,t.tgtype,t.tgfoid::regprocedure::text),'[]'::jsonb) from pg_trigger t left join pg_constraint k on k.oid=t.tgconstraint where t.tgrelid=c.oid and t.tgisinternal),
   'policies',(select coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,'roles',(select jsonb_agg(case when r=0 then 'public' else pg_get_userbyid(r) end order by r) from unnest(p.polroles) r),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname),'[]'::jsonb) from pg_policy p where p.polrelid=c.oid),
   'view',case when c.relkind in ('v','m') then pg_get_viewdef(c.oid) end,
   'rules',(select coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid),'enabled',r.ev_enabled) order by r.rulename),'[]'::jsonb) from pg_rewrite r where r.ev_class=c.oid and r.rulename<>'_RETURN'),
   'sequence',(select jsonb_build_object('type',format_type(s.seqtypid,null),'start',s.seqstart::text,'increment',s.seqincrement::text,'max',s.seqmax::text,'min',s.seqmin::text,'cache',s.seqcache::text,'cycle',s.seqcycle) from pg_sequence s where s.seqrelid=c.oid)
 ) order by c.nspname,c.relname) from relations c)
) as category_operating_contract;
