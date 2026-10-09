// IDEA-20261003-02: empty local dependency reference, never a provider installer.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const captureDirectory=path.join(root,'docs/evidence/20261003-catalog-current-chain/foundation-01')
const pins={
 'provider-schema-capture.json':'c1b2d38e30f1c36aa6fca2c886ecbf8fd96f1203c782dfcc0f914bffbc720307',
 'provider-trigger-capture.json':'9140de6c2ec337cfff85475b58a217132c8b7b7c094f314ec44fb753c0974918',
 'provider-index-capture.json':'c2a70e581549597e88be16f292aa1ad98c6f617d864c2ce8dafa42ea4f3b53f2',
 'provider-modes-capture.json':'7584520682e4e1a438029d96493bb74bf454be5304424b59f57faf72adf4da3b'
}
export function verifyIntakeReferenceSource(file,bytes){
 if(!pins[file]||createHash('sha256').update(bytes).digest('hex')!==pins[file])throw Error('INTAKE_REFERENCE_CAPTURE_CHANGED')
 return JSON.parse(bytes.toString('utf8'))
}
const read=file=>verifyIntakeReferenceSource(file,fs.readFileSync(path.join(captureDirectory,file)))
const identifier=s=>'"'+s.replaceAll('"','""')+'"'
const qualified=s=>s.split('.').map(identifier).join('.')
const literal=s=>"'"+s.replaceAll("'","''")+"'"
export function buildIntakeStorageReference({marker,dataDirectory}={}){
 const expected=path.join(root,'.tools/current-restore-20260929-pg-data').replaceAll('\\','/')
 if(typeof marker!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(marker)||dataDirectory!==expected)throw Error('INTAKE_REFERENCE_TARGET_INVALID')
 const schema=read('provider-schema-capture.json'),triggers=read('provider-trigger-capture.json'),metadata=read('provider-index-capture.json'),modes=read('provider-modes-capture.json')
 const sql=[`-- Captured metadata only. Local postgres ownership; no hosted Storage API or object data equivalence.
BEGIN;
DO $guard$ BEGIN
 IF current_database() IS DISTINCT FROM 'k2_website_stock_locks_20261001'
 OR inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet
 OR inet_server_port() IS DISTINCT FROM 54388
 OR replace(current_setting('data_directory'),chr(92),'/') IS DISTINCT FROM ${literal(expected)}
 THEN RAISE EXCEPTION 'INTAKE_REFERENCE_TARGET_INVALID'; END IF;
 IF (SELECT marker FROM k2_stock_fixture.owner) IS DISTINCT FROM ${literal(marker)}::uuid
 THEN RAISE EXCEPTION 'INTAKE_REFERENCE_OWNER_INVALID'; END IF;
 IF to_regnamespace('storage') IS NOT NULL THEN RAISE EXCEPTION 'INTAKE_REFERENCE_STORAGE_ALREADY_EXISTS'; END IF;
END $guard$;
CREATE SCHEMA storage;
SET LOCAL search_path = public, storage, pg_catalog;`]
 for(const e of schema.enums)sql.push(`CREATE TYPE ${qualified(e.name)} AS ENUM (${e.values.map(literal).join(',')});`)
 for(const t of schema.relations){
  const columns=t.columns.map(c=>{
   if(c.identity||!['','s'].includes(c.generated))throw Error('INTAKE_REFERENCE_COLUMN_UNSUPPORTED')
   return `${identifier(c.name)} ${c.type}${c.generated?` GENERATED ALWAYS AS (${c.default}) STORED`:c.default?` DEFAULT ${c.default}`:''}${c.notNull?' NOT NULL':''}`
  })
  sql.push(`CREATE TABLE ${qualified(t.name)} (${columns.join(',\n')});`)
 }
 for(const c of metadata.constraints)sql.push(`ALTER TABLE ${qualified(c.table)} ADD CONSTRAINT ${identifier(c.name)} ${c.definition};`)
 for(const i of metadata.indexes.filter(i=>!i.constraint))sql.push(i.definition+';')
 for(const f of [...schema.functions,...triggers])sql.push(f.definition+';')
 for(const t of schema.relations){
  for(const trigger of t.triggers){
   sql.push(trigger.definition+';')
   const name=trigger.definition.match(/^CREATE TRIGGER ([a-z_]+) /)?.[1]
   const mode=modes.triggers.find(m=>m.table===t.name&&m.name===name)?.enabled
   if(!['O','D','R','A'].includes(mode))throw Error('INTAKE_REFERENCE_TRIGGER_MODE_UNSUPPORTED')
   sql.push(`ALTER TABLE ${qualified(t.name)} ${ {O:'ENABLE',D:'DISABLE',R:'ENABLE REPLICA',A:'ENABLE ALWAYS'}[mode]} TRIGGER ${identifier(name)};`)
  }
  if(t.rls)sql.push(`ALTER TABLE ${qualified(t.name)} ENABLE ROW LEVEL SECURITY;`)
  if(t.forceRls)sql.push(`ALTER TABLE ${qualified(t.name)} FORCE ROW LEVEL SECURITY;`)
  for(const p of t.policies){
   const command={r:'SELECT',a:'INSERT',w:'UPDATE',d:'DELETE','*':'ALL'}[p.command]
   const roles=p.roles.map(oid=>oid==='0'?'PUBLIC':metadata.roles[oid]?identifier(metadata.roles[oid]):null)
   if(!command||roles.some(r=>!r))throw Error('INTAKE_REFERENCE_POLICY_UNSUPPORTED')
   const permissive=modes.policies.find(m=>m.table===t.name&&m.name===p.name)?.permissive
   if(typeof permissive!=='boolean')throw Error('INTAKE_REFERENCE_POLICY_MODE_UNSUPPORTED')
   sql.push(`CREATE POLICY ${identifier(p.name)} ON ${qualified(t.name)} AS ${permissive?'PERMISSIVE':'RESTRICTIVE'} FOR ${command} TO ${roles.join(',')}${p.qual?` USING (${p.qual})`:''}${p.check?` WITH CHECK (${p.check})`:''};`)
  }
  sql.push(`GRANT ALL ON TABLE ${qualified(t.name)} TO anon, authenticated, service_role;`)
 }
 sql.push('GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;','COMMIT;')
 return sql.join('\n')+'\n'
}

const canonical=x=>JSON.stringify(x)
export function extractPublicFunctionBodies(sql){
 return [...sql.matchAll(/create or replace function public\.([a-z_][a-z_0-9]*)\([\s\S]*?as \$\$([\s\S]*?)\$\$;/gi)].map(m=>({name:m[1],md5:createHash('md5').update(m[2].replaceAll('\r','')).digest('hex')}))
}
export function equalIntakeCapturedObjects(a,b){
 const normalize=x=>JSON.stringify(Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='roles'&&Array.isArray(v)?[...v].sort():v]).sort(([a],[b])=>a.localeCompare(b))))
 return a?.length===b.length&&a.map(normalize).sort().join('\n')===b.map(normalize).sort().join('\n')
}
export function buildIntakeRestoredStorageGuard(args){
 // Validate target input and capture pins, but never execute the empty-reference DDL.
 buildIntakeStorageReference(args)
 return `DO $guard$ BEGIN
 IF current_database() IS DISTINCT FROM 'k2_website_stock_locks_20261001'
 OR current_user IS DISTINCT FROM 'postgres'
 OR inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet
 OR inet_server_port() IS DISTINCT FROM 54388
 OR replace(current_setting('data_directory'),chr(92),'/') IS DISTINCT FROM ${literal(args.dataDirectory)}
 THEN RAISE EXCEPTION 'INTAKE_REFERENCE_TARGET_INVALID'; END IF;
 IF (SELECT marker FROM k2_stock_fixture.owner) IS DISTINCT FROM ${literal(args.marker)}::uuid
 THEN RAISE EXCEPTION 'INTAKE_REFERENCE_OWNER_INVALID'; END IF;
 IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL
 THEN RAISE EXCEPTION 'INTAKE_RESTORED_STORAGE_MISSING'; END IF;
END $guard$;\n`
}
export function buildCatalogReadRestoreParity(args){
 const capture=fs.readFileSync(path.join(root,'docs/evidence/20261003-catalog-current-chain/foundation-05/provider-products-read-result.json'))
 if(createHash('sha256').update(capture).digest('hex')!=='16b7a8636a9550a68edd6fdcd9f67f7fd8caaff6f7dd0e8d51fd6297b643cc1a')throw Error('CATALOG_READ_CAPTURE_CHANGED')
 return 'BEGIN;\n'+buildIntakeRestoredStorageGuard(args)+'GRANT SELECT ON TABLE public.products TO authenticated;\nCOMMIT;\n'
}
export function foundationPreservesExistingRows(before,after){
 const equalRows=(a,b)=>a.length===b.length&&a.map(canonical).sort().join('\n')===b.map(canonical).sort().join('\n')
 if(Object.keys(after).some(t=>!(t in before)&&t!=='public.product_intake_sessions'))return false
 if(after['public.product_intake_sessions']&&!('public.product_intake_sessions' in before)&&after['public.product_intake_sessions'].length)return false
 return Object.entries(before).every(([table,rows])=>{
  if(!Array.isArray(after[table]))return false
  let current=after[table]
  if(table==='storage.buckets')current=current.filter(p=>p.id!=='product-intake-evidence'||rows.some(r=>r.id===p.id))
  if(table==='public.product_batches')current=current.map(p=>Object.fromEntries(Object.entries(p).filter(([k,v])=>!(['unit_cost','owner_code','source_type'].includes(k)&&v===null&&rows.every(r=>!(k in r))))))
  return equalRows(rows,current)
 })
}

export function foundationPreservesExistingSchema(before,after,step){
 const same=(a,b)=>canonical(a)===canonical(b),intake=step==='intake'
 if(after.some(t=>!before.some(b=>b.table===t.table)&&!(intake&&t.table==='public.product_intake_sessions')))return false
 return before.every(b=>{
  const a=after.find(t=>t.table===b.table);if(!a)return false
  if(!['relowner','relacl','relrowsecurity','relforcerowsecurity'].every(k=>same(b.catalog[k],a.catalog[k])))return false
  const addedColumn=c=>intake&&b.table==='public.product_batches'&&['unit_cost','owner_code','source_type'].includes(c.name)&&!(b.columns||[]).some(old=>old.name===c.name)&&c.default===null&&c.notNull===false&&c.generated===''&&c.type===(c.name==='unit_cost'?'numeric':'text')
  if(!same(b.columns,a.columns.filter(c=>!addedColumn(c)))||!same(b.indexes,a.indexes))return false
  const permittedConstraint=c=>intake&&(b.table==='public.products'&&c.name==='products_status_check'||b.table==='public.product_batches'&&['product_batches_unit_cost_check','product_batches_source_type_check'].includes(c.name)&&!(b.constraints||[]).some(old=>old.name===c.name))
  if(!same((b.constraints||[]).filter(c=>!permittedConstraint(c)),(a.constraints||[]).filter(c=>!permittedConstraint(c))))return false
  const permittedTrigger=t=>intake&&b.table==='public.products'&&t.definition.startsWith('CREATE TRIGGER trg_sync_product_publication_status ')
  if(!same((b.triggers||[]).filter(t=>!permittedTrigger(t)),(a.triggers||[]).filter(t=>!permittedTrigger(t))))return false
  const permittedPolicy=p=>intake&&b.table==='storage.objects'&&['product_intake_evidence_staff_read','product_intake_evidence_owner_insert','product_intake_evidence_owner_update','product_intake_evidence_owner_delete'].includes(p.name)&&!(b.policies||[]).some(old=>old.name===p.name)
  return same(b.policies||[],(a.policies||[]).filter(p=>!permittedPolicy(p)))
 })
}

export const intakeSchemaCaptureSql=`select jsonb_agg(jsonb_build_object('table',format('%I.%I',n.nspname,c.relname),'catalog',to_jsonb(c)-'oid'-'relfilenode'-'reltype','columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'default',pg_get_expr(d.adbin,d.adrelid),'notNull',a.attnotnull,'generated',a.attgenerated) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid)) order by x.conname) from pg_constraint x where x.conrelid=c.oid),'indexes',(select jsonb_agg(pg_get_indexdef(i.indexrelid) order by pg_get_indexdef(i.indexrelid)) from pg_index i where i.indrelid=c.oid),'triggers',(select jsonb_agg(jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) order by t.tgname) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal),'policies',(select jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'roles',p.polroles,'permissive',p.polpermissive,'qual',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid)) order by c.oid::regclass::text)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');`
export const intakeFoundationWitnessSha256=createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex')
const intakeLegacy=['create_product_draft_server(uuid,uuid,jsonb,jsonb)','create_product_first_inventory_server(uuid,uuid,text,jsonb)','transition_product_publication_server(uuid,text)']
export const intakeFoundationSteps=[['intake','20260811_product_intake_and_sku_gate.sql',['touch_product_intake_session','generate_k2_sku_internal','sync_product_publication_status','create_product_draft_server','create_product_first_inventory_server','transition_product_publication_server']],['signed','20260812_admin_product_intake_bff_boundary.sql',['execute_admin_product_intake_command_v1']],['legacy-acl',null,intakeLegacy.map(s=>s.split('(')[0])],['publication','20260905_publication_transition_consistency.sql',['transition_product_publication_server']]]
export async function rehearseIntakeFoundation({sync,value,check,literal:quote,source,evidence,marker,dataDirectory}){
 const same=(a,b)=>canonical(a)===canonical(b),report={idea:'IDEA-20261003-02',providerWrites:false,scope:'Whole genuine intake/signed boundary preserving full existing restored storage; postgres ownership, not hosted Storage API parity',steps:[]}
 const write=()=>fs.writeFileSync(path.join(evidence,'intake-foundation.json'),JSON.stringify(report,null,2)+'\n')
 const tables=()=>JSON.parse(value(`select jsonb_agg(format('%I.%I',n.nspname,c.relname) order by n.nspname,c.relname)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','k2_private','storage') and c.relkind in ('r','p');`))
 const rows=()=>JSON.parse(value(`select jsonb_object_agg(table_name,records)::text from (values ${tables().map(t=>`(${quote(t)},(select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]') from ${t} x))`).join(',')}) s(table_name,records);`))
 const functions=()=>JSON.parse(value(`select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'bodyMd5',md5(replace(p.prosrc,chr(13),'')),'catalog',to_jsonb(p)-'prosrc') order by p.oid)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','k2_private','storage');`))
 const schema=()=>JSON.parse(value(intakeSchemaCaptureSql))
 const legacy=intakeLegacy,steps=intakeFoundationSteps
 fs.writeFileSync(path.join(evidence,'executed-intake-foundation.mjs'),fs.readFileSync(fileURLToPath(import.meta.url)))
 try{
  report.executionRole=value('select current_user;');if(report.executionRole!=='postgres')throw Error('INTAKE_REFERENCE_EXECUTION_ROLE_INVALID');check('intake foundation runs as local postgres',true)
  const initialRows=rows(),initialFunctions=functions(),initialSchema=schema(),reference=buildIntakeRestoredStorageGuard({marker,dataDirectory})
  fs.writeFileSync(path.join(evidence,'intake-storage-target-guard.sql'),reference);report.reference={mode:'full-existing-restored-storage',sha256:createHash('sha256').update(reference).digest('hex'),capturePins:pins,beforeRows:initialRows,beforeFunctions:initialFunctions,beforeSchema:initialSchema}
  sync(reference);report.reference.afterRows=rows();report.reference.afterFunctions=functions();report.reference.schema=schema()
  check('restored storage guard preserves every original table row and definition',same(initialRows,report.reference.afterRows)&&foundationPreservesExistingSchema(initialSchema,report.reference.schema,'guard'))
  const captured=[...read('provider-schema-capture.json').functions,...read('provider-trigger-capture.json')]
  check('restored storage preserves all original functions and exact captured dependency bodies',same(initialFunctions,report.reference.afterFunctions)&&captured.every(f=>report.reference.afterFunctions.some(a=>a.signature===f.signature&&a.definition.replaceAll('\r','')===f.definition.replaceAll('\r',''))))
  const capturedSchema=read('provider-schema-capture.json'),capturedMetadata=read('provider-index-capture.json'),capturedModes=read('provider-modes-capture.json')
  report.reference.roleIds=JSON.parse(value("select jsonb_object_agg(rolname,oid::text)::text from pg_roles where rolname in ('anon','authenticated');"))
  check('installed reference retains captured columns/constraints/indexes/triggers/RLS/policies',capturedSchema.relations.every(t=>{
   const actual=report.reference.schema.find(a=>a.table===t.name)
   if(!actual)return false
   const expectedColumns=t.columns.map(({identity,...c})=>c)
   const equalObjects=equalIntakeCapturedObjects
   const expectedConstraints=capturedMetadata.constraints.filter(c=>c.table===t.name).map(({table,...c})=>c)
   const expectedIndexes=capturedMetadata.indexes.filter(i=>i.table===t.name).map(i=>i.definition).sort()
   const expectedTriggers=t.triggers.map(trigger=>({definition:trigger.definition,enabled:capturedModes.triggers.find(m=>m.table===t.name&&trigger.definition.startsWith('CREATE TRIGGER '+m.name+' '))?.enabled}))
   const expectedPolicies=t.policies.map(p=>({...p,roles:p.roles.map(oid=>report.reference.roleIds[capturedMetadata.roles[oid]]),permissive:capturedModes.policies.find(m=>m.table===t.name&&m.name===p.name)?.permissive}))
   return equalObjects(actual.columns,expectedColumns)&&equalObjects(actual.constraints||[],expectedConstraints)&&same(actual.indexes,expectedIndexes)&&equalObjects(actual.triggers||[],expectedTriggers)&&equalObjects(actual.policies||[],expectedPolicies)&&actual.catalog.relrowsecurity===t.rls&&actual.catalog.relforcerowsecurity===t.forceRls
  }))
  for(const [name,file,allowed] of steps){
   const sql=file?source('supabase/migrations/'+file):legacy.map(s=>`revoke all on function public.${s} from public,anon,authenticated;`).join('\n')
   const step={name,file,sha256:createHash('sha256').update(sql).digest('hex'),beforeRows:rows(),beforeFunctions:functions(),beforeSchema:schema()};report.steps.push(step);fs.writeFileSync(path.join(evidence,'intake-'+name+'.sql'),sql)
   step.expectedBodies=extractPublicFunctionBodies(sql)
   sync(sql);step.afterRows=rows();step.afterFunctions=functions();step.afterSchema=schema()
   check('whole intake '+name+' preserves complete original rows',foundationPreservesExistingRows(step.beforeRows,step.afterRows))
   check('whole intake '+name+' preserves unrelated first-install schema and grants',foundationPreservesExistingSchema(step.beforeSchema,step.afterSchema,name))
   step.changedFunctions=step.afterFunctions.filter(f=>!same(f,step.beforeFunctions.find(b=>b.signature===f.signature))).map(f=>f.signature)
   check('whole intake '+name+' changes only named function contracts',step.beforeFunctions.every(f=>step.afterFunctions.some(a=>a.signature===f.signature))&&step.afterFunctions.filter(f=>step.changedFunctions.includes(f.signature)).every(f=>allowed.includes(f.catalog.proname)))
   check('whole intake '+name+' installs exact complete candidate bodies',(!file||step.expectedBodies.length===allowed.length)&&step.expectedBodies.every(b=>step.afterFunctions.filter(f=>f.catalog.proname===b.name).length===1&&step.afterFunctions.find(f=>f.catalog.proname===b.name).bodyMd5===b.md5))
   if(name==='publication')check('latest publication preserves complete execution metadata and closed legacy ACL',step.beforeFunctions.every(b=>{const a=step.afterFunctions.find(f=>f.signature===b.signature);return a&&same(b.catalog,a.catalog)})&&step.afterFunctions.find(f=>f.catalog.proname==='transition_product_publication_server').bodyMd5==='47b5f07d104fd7a5cc8d4a93123d62bc')
   sync(sql);step.replayRows=rows();step.replayFunctions=functions();step.replaySchema=schema()
   check('whole intake '+name+' replay preserves exact rows and functions',same(step.afterRows,step.replayRows)&&same(step.afterFunctions,step.replayFunctions))
   // Trigger OIDs and pg_class physical bookkeeping may change; retained raw schemas are compared by declared definitions below.
   check('whole intake '+name+' replay preserves triggers/columns/constraints/indexes/policies/grants/RLS',foundationPreservesExistingSchema(step.afterSchema,step.replaySchema,'replay'))
  }
  report.legacyDenied=legacy.map(s=>({signature:s,anon:value(`select has_function_privilege('anon',${quote('public.'+s)},'execute');`),authenticated:value(`select has_function_privilege('authenticated',${quote('public.'+s)},'execute');`)}));check('unsigned intake entrypoints remain closed after local overlay',report.legacyDenied.every(g=>g.anon==='f'&&g.authenticated==='f'))
  report.bucket=JSON.parse(value("select to_jsonb(b)::text from storage.buckets b where id='product-intake-evidence';"));check('genuine intake creates one private evidence bucket and retains all original buckets/objects',report.bucket?.name==='product-intake-evidence'&&report.bucket.public===false&&report.bucket.file_size_limit===10485760&&same(report.bucket.allowed_mime_types,['image/jpeg','image/png','image/webp'])&&rows()['storage.buckets'].length===initialRows['storage.buckets'].length+1&&same(rows()['storage.objects'],initialRows['storage.objects']))
  report.finalRows=rows();report.finalFunctions=functions();report.finalSchema=schema()
  const readSql=buildCatalogReadRestoreParity({marker,dataDirectory})
  const privileges=()=>JSON.parse(value("select jsonb_build_object('authenticatedSelect',has_table_privilege('authenticated','public.products','SELECT'),'authenticatedInsert',has_table_privilege('authenticated','public.products','INSERT'),'authenticatedUpdate',has_table_privilege('authenticated','public.products','UPDATE'),'authenticatedDelete',has_table_privilege('authenticated','public.products','DELETE'),'anonSelect',has_table_privilege('anon','public.products','SELECT'),'columnAcl',(select jsonb_agg(jsonb_build_object('name',attname,'acl',attacl) order by attnum) from pg_attribute where attrelid='public.products'::regclass and attnum>0 and not attisdropped),'acl',(select jsonb_agg(jsonb_build_object('role',coalesce(r.rolname,'PUBLIC'),'privilege',a.privilege_type,'grantable',a.is_grantable) order by a.grantee,a.privilege_type) from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a left join pg_roles r on r.oid=a.grantee where c.oid='public.products'::regclass))::text;"))
  report.readParity={scope:'Metadata-backed local authenticated SELECT only; no provider grant parity or global RLS acceptance',sqlSha256:createHash('sha256').update(readSql).digest('hex'),before:privileges()}
  check('restored catalog read starts denied with direct writes closed',report.readParity.before.authenticatedSelect===false&&['authenticatedInsert','authenticatedUpdate','authenticatedDelete','anonSelect'].every(k=>report.readParity.before[k]===false))
  fs.writeFileSync(path.join(evidence,'catalog-read-restore-parity.sql'),readSql);sync(readSql)
  report.readParity.after=privileges();report.readParity.afterRows=rows();report.readParity.afterFunctions=functions();report.readParity.afterSchema=schema()
  check('read restoration grants authenticated SELECT only and retains column ACLs',report.readParity.after.authenticatedSelect===true&&['authenticatedInsert','authenticatedUpdate','authenticatedDelete','anonSelect'].every(k=>report.readParity.after[k]===false)&&same(report.readParity.before.columnAcl,report.readParity.after.columnAcl)&&same(report.readParity.after.acl.filter(a=>a.role!=='authenticated'),report.readParity.before.acl)&&same(report.readParity.after.acl.filter(a=>a.role==='authenticated'),[{role:'authenticated',grantable:false,privilege:'SELECT'}]))
  const withoutReadAcl=s=>s.map(t=>t.table==='public.products'?{...t,catalog:{...t.catalog,relacl:null}}:t)
  check('read restoration preserves complete rows/functions/schema/RLS/policies except its one table ACL',same(report.finalRows,report.readParity.afterRows)&&same(report.finalFunctions,report.readParity.afterFunctions)&&foundationPreservesExistingSchema(withoutReadAcl(report.finalSchema),withoutReadAcl(report.readParity.afterSchema),'read-parity'))
  sync(readSql);report.readParity.replay=privileges();report.readParity.replayRows=rows();report.readParity.replayFunctions=functions();report.readParity.replaySchema=schema()
  check('read restoration replay preserves exact privileges/rows/functions/schema',same(report.readParity.after,report.readParity.replay)&&same(report.readParity.afterRows,report.readParity.replayRows)&&same(report.readParity.afterFunctions,report.readParity.replayFunctions)&&foundationPreservesExistingSchema(report.readParity.afterSchema,report.readParity.replaySchema,'replay'))
 }finally{write()}
}

