-- IDEA-20261003-02 / MAP-017/018/020. Read-only metadata; no private row values.
-- Run as the authorized database owner in one repeatable-read transaction.
-- This is a comparison capture, not a faithful DDL recovery generator.
-- Keep exact-target captures private: definitions disclose internal contracts.
with scoped_schemas as (
 select * from pg_namespace where nspname in ('public','k2_private','storage')
), scoped_relations as (
 select c.*,n.nspname from pg_class c join scoped_schemas n on n.oid=c.relnamespace
 where c.relkind in ('r','p','v','m','S','f')
)
select jsonb_build_object(
 'contract','k2-current-install-metadata-v1',
 'database',current_database(),
 'systemIdentifier',(select system_identifier::text from pg_control_system()),
 'serverVersion',current_setting('server_version_num'),
 'schemas',coalesce((select jsonb_agg(jsonb_build_object(
   'name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl,
   'catalog',to_jsonb(n)-'oid') order by nspname) from scoped_schemas n),'[]'::jsonb),
 'defaultPrivileges',coalesce((select jsonb_agg(jsonb_build_object(
   'owner',pg_get_userbyid(d.defaclrole),'schema',n.nspname,
   'catalog',to_jsonb(d)-'oid') order by d.defaclrole,d.defaclnamespace,d.defaclobjtype)
   from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
   where d.defaclnamespace=0 or n.nspname in ('public','k2_private','storage')),'[]'::jsonb),
 'functions',coalesce((select jsonb_agg(jsonb_build_object(
   'signature',format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)),
   'owner',pg_get_userbyid(p.proowner),'catalog',to_jsonb(p)-'oid',
   'definition',case when p.prokind<>'a' then pg_get_functiondef(p.oid) end,
   'aggregate',(select to_jsonb(a)-'aggfnoid' from pg_aggregate a where a.aggfnoid=p.oid)
 ) order by n.nspname,p.proname,oidvectortypes(p.proargtypes))
 from pg_proc p join scoped_schemas n on n.oid=p.pronamespace),'[]'::jsonb),
 'types',coalesce((select jsonb_agg(jsonb_build_object(
   'name',format('%I.%I',n.nspname,t.typname),'owner',pg_get_userbyid(t.typowner),
   'catalog',to_jsonb(t)-'oid',
   'enum',(select coalesce(jsonb_agg(jsonb_build_object('label',e.enumlabel,'order',e.enumsortorder)
     order by e.enumsortorder),'[]'::jsonb) from pg_enum e where e.enumtypid=t.oid),
   'range',(select to_jsonb(r)-'rngtypid' from pg_range r where r.rngtypid=t.oid),
   'constraints',(select coalesce(jsonb_agg(jsonb_build_object(
     'name',k.conname,'catalog',to_jsonb(k)-array['oid','contypid'],
     'definition',pg_get_constraintdef(k.oid)
   ) order by k.conname),'[]'::jsonb) from pg_constraint k where k.contypid=t.oid)
 ) order by n.nspname,t.typname) from pg_type t
 join scoped_schemas n on n.oid=t.typnamespace),'[]'::jsonb),
 'roles',coalesce((select jsonb_agg(to_jsonb(r)-array['oid','rolpassword']
   order by r.rolname) from pg_roles r),'[]'::jsonb),
 'relations',coalesce((select jsonb_agg(jsonb_build_object(
   'name',format('%I.%I',c.nspname,c.relname),'owner',pg_get_userbyid(c.relowner),
   -- Exclude identity/physical placement and volatile planner/vacuum counters only.
   'catalog',to_jsonb(c)-array['nspname','oid','relfilenode','reltype',
     'relpages','reltuples','relallvisible','relallfrozen','relfrozenxid','relminmxid'],
   'columns',(select coalesce(jsonb_agg(jsonb_build_object(
     'name',a.attname,'catalog',to_jsonb(a)-'attrelid',
     'type',format_type(a.atttypid,a.atttypmod),'default',pg_get_expr(d.adbin,d.adrelid)
   ) order by a.attnum),'[]'::jsonb)
     from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
     where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
   'constraints',(select coalesce(jsonb_agg(jsonb_build_object(
     'name',k.conname,'catalog',to_jsonb(k)-array['oid','conrelid'],
     'definition',pg_get_constraintdef(k.oid)
   ) order by k.conname),'[]'::jsonb) from pg_constraint k where k.conrelid=c.oid),
   'indexes',(select coalesce(jsonb_agg(jsonb_build_object(
     'definition',pg_get_indexdef(i.indexrelid),'catalog',to_jsonb(i)-array['indexrelid','indrelid'],
     'relationCatalog',to_jsonb(ic)-array['oid','relfilenode','reltype','relpages',
       'reltuples','relallvisible','relallfrozen','relfrozenxid','relminmxid']
   ) order by pg_get_indexdef(i.indexrelid)),'[]'::jsonb)
     from pg_index i join pg_class ic on ic.oid=i.indexrelid where i.indrelid=c.oid),
   'triggers',(select coalesce(jsonb_agg(jsonb_build_object(
     'name',t.tgname,'catalog',to_jsonb(t)-array['oid','tgrelid'],
     'definition',pg_get_triggerdef(t.oid)
   ) order by t.tgname),'[]'::jsonb) from pg_trigger t where t.tgrelid=c.oid),
   'policies',(select coalesce(jsonb_agg(jsonb_build_object(
     'name',p.polname,'catalog',to_jsonb(p)-array['oid','polrelid'],
     'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)
   ) order by p.polname),'[]'::jsonb) from pg_policy p where p.polrelid=c.oid),
   'view',case when c.relkind in ('v','m') then pg_get_viewdef(c.oid) end,
   'sequence',(select to_jsonb(s)-'seqrelid' from pg_sequence s where s.seqrelid=c.oid),
   'foreignTable',(select to_jsonb(f)-'ftrelid' from pg_foreign_table f where f.ftrelid=c.oid)
 ) order by c.nspname,c.relname) from scoped_relations c),'[]'::jsonb),
 'publications',coalesce((select jsonb_agg(jsonb_build_object(
   'name',p.pubname,'owner',pg_get_userbyid(p.pubowner),'catalog',to_jsonb(p)-'oid'
 ) order by p.pubname) from pg_publication p),'[]'::jsonb),
 'publicationTables',coalesce((select jsonb_agg(to_jsonb(p)
   order by p.pubname,p.schemaname,p.tablename) from pg_publication_tables p),'[]'::jsonb),
 'publicationSchemas',coalesce((select jsonb_agg(jsonb_build_object(
   'publication',p.pubname,'schema',n.nspname,'catalog',to_jsonb(m)-'oid'
 ) order by p.pubname,n.nspname) from pg_publication_namespace m
   join pg_publication p on p.oid=m.pnpubid
   join pg_namespace n on n.oid=m.pnnspid),'[]'::jsonb),
 'roleMemberships',coalesce((select jsonb_agg(jsonb_build_object(
   'role',pg_get_userbyid(m.roleid),'member',pg_get_userbyid(m.member),
   'grantor',pg_get_userbyid(m.grantor),'catalog',to_jsonb(m)-'oid'
 ) order by m.roleid,m.member,m.grantor) from pg_auth_members m),'[]'::jsonb)
) as current_install_capture;
