// MAP-018 / IDEA-20261011-01. One prepared read extension on the admitted local
// installer. This is not a new accepted provider envelope or production apply.
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

export function extendAdminStockReadFixture(source, once) {
  const file='supabase/prepared/admin_product_stock_read.sql',sql=fs.readFileSync(file,'utf8').replaceAll('\r','')
  const body=sql.split('$stock$');assert.equal(body.length,3)
  const md5=createHash('md5').update(body[1]).digest('hex')
  const metadata=`DO $check$ DECLARE b jsonb; a jsonb; p pg_catalog.pg_proc%rowtype; BEGIN
    b:=pg_catalog.pg_read_file('/tmp/staff-stock-before.json')::jsonb;
    a:=pg_catalog.pg_read_file('/tmp/staff-stock-installed.json')::jsonb;
    IF (SELECT count(*) FROM jsonb_array_elements(a->'functions') f WHERE f->>'identity'='public.read_admin_product_stock_v1(p_skus text[])')<>1 THEN RAISE EXCEPTION 'K2_STAFF_STOCK_FUNCTION_MISSING'; END IF;
    a:=jsonb_set(a,'{functions}',(SELECT jsonb_agg(f ORDER BY n) FROM jsonb_array_elements(a->'functions') WITH ORDINALITY t(f,n) WHERE f->>'identity'<>'public.read_admin_product_stock_v1(p_skus text[])'));
    IF a IS DISTINCT FROM b THEN RAISE EXCEPTION 'K2_STAFF_STOCK_UNEXPECTED_CATALOG_CHANGE'; END IF;
    SELECT * INTO STRICT p FROM pg_catalog.pg_proc WHERE oid='public.read_admin_product_stock_v1(text[])'::regprocedure;
    IF md5(p.prosrc)<>'${md5}' OR pg_get_userbyid(p.proowner)<>'postgres' OR NOT p.prosecdef OR p.provolatile<>'s'
      OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
      OR p.proacl::text[] IS DISTINCT FROM ARRAY['postgres=X/postgres','authenticated=X/postgres']::text[] THEN RAISE EXCEPTION 'K2_STAFF_STOCK_FUNCTION_DRIFT'; END IF;
    RAISE NOTICE 'K2_STAFF_STOCK_ONLY_FUNCTION_ADDED';
  END $check$;`
  const recovery=`BEGIN; SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='2s';
    DO $check$ BEGIN IF md5((SELECT prosrc FROM pg_catalog.pg_proc WHERE oid='public.read_admin_product_stock_v1(text[])'::regprocedure))<>'${md5}' THEN RAISE EXCEPTION 'K2_STAFF_STOCK_RECOVERY_DRIFT'; END IF; END $check$;
    DROP FUNCTION public.read_admin_product_stock_v1(text[]);
    COMMIT; SELECT 'K2_STAFF_STOCK_EXTENSION_REMOVED';`
  const files={'staff-stock-read.sql':`BEGIN; SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='2s';\n${sql}\nCOMMIT;`, 'staff-stock-metadata.sql':metadata,'staff-stock-recovery.sql':recovery}
  const writes=Object.entries(files).map(([name,bytes])=>`fs.writeFileSync(path.join(k2,${JSON.stringify(name)}),${JSON.stringify(bytes)},{flag:'wx'});`).join('\n')
  source=once(source,"const overlay=path.join(out,'overlay.cpio')",writes+"\nconst overlay=path.join(out,'overlay.cpio')")
  const change=`
const stockStart='export GOTRUE_API_HOST=';
assert.equal(probe.split(stockStart).length,2);
probe=probe.replace(stockStart,()=>psql('supabase_admin','race-catalog.sql')+' > /tmp/staff-stock-before.json\\n'+psql('postgres','staff-stock-read.sql')+'\\n'+psql('supabase_admin','race-catalog.sql')+' > /tmp/staff-stock-installed.json\\n'+psql('supabase_admin','staff-stock-metadata.sql')+'\\n'+stockStart);
const stockRecovery='echo K2_BFF_PRIVATE_RECOVERY_OK\\n';
assert.equal(probe.split(stockRecovery).length,2);
probe=probe.replace(stockRecovery,()=>stockRecovery+psql('postgres','staff-stock-recovery.sql')+'\\n');
`
  source=once(source,"fs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})",change+"\nfs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})")
  const anchor='/bin/busybox cp /k2/race-install.sql /k2root/tmp/race-install.sql'
  const copies=Object.keys(files).map(name=>`/bin/busybox cp /k2/${name} /k2root/tmp/${name}`).join('\n')
  source=once(source,"fs.writeFileSync(path.join(k2,'init.sh'),init,{flag:'wx'})",`init=init.replace(${JSON.stringify(anchor)},()=>${JSON.stringify(copies+'\n'+anchor)});\nfs.writeFileSync(path.join(k2,'init.sh'),init,{flag:'wx'})`)
  source=once(source,"stdout.includes('K2_BFF_PRIVATE_RECOVERY_OK')&&","stdout.includes('K2_STAFF_STOCK_ONLY_FUNCTION_ADDED')&&stdout.includes('K2_STAFF_STOCK_EXTENSION_REMOVED')&&stdout.includes('K2_BFF_PRIVATE_RECOVERY_OK')&&")
  return source
}
