// MAP-018 / IDEA-20261010-06. Owned captured local fixture; no provider access.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const caseName = process.argv.find(value => value.startsWith('--case='))?.slice(7)
assert.match(caseName || '', /^oci-reference-workflow\d{2}$/)
assert.ok(!fs.existsSync(path.join(root, caseName)), 'Fresh fixture required')
const receipt = JSON.parse(fs.readFileSync('docs/acceptance/LOCAL_BROWSER_AUTH_20261010.json'))
const baseCase = receipt.cases.find(value => value.case === 'oci-browser-auth03')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const pinned = file => {
  const bytes = fs.readFileSync(path.join(root, baseCase.case, file))
  assert.equal(sha(bytes), baseCase.hashes[file], file)
  return bytes.toString()
}
const replaceOnce = (source, before, after) => {
  assert.equal(source.split(before).length, 2, before.slice(0, 100))
  return source.replace(before, () => after)
}
let source = pinned('executed-source.mjs').replaceAll('oci-browser-auth03', caseName)
let helper = pinned('bff-helper.mjs')
let driver = pinned('host-driver.mjs')
const workflowScope = 'Genuine local full Admin password/MFA, protected reference recovery and paired Product Master Save with captured PostgreSQL/Auth/PostgREST; public test widget and explicit unconfigured local bot fixture; full restoration required; no provider or hosted acceptance'
driver = driver.replace(/scope:'[^']*'/, () => 'scope:'+JSON.stringify(workflowScope))
source = source.replace(/prep.scope='[^']*'/, () => 'prep.scope='+JSON.stringify(workflowScope))
source = replaceOnce(source, "postgres://authenticator@127.0.0.1:5432/postgres?sslmode=disable", "postgres://authenticator@127.0.0.1:5432/postgres?sslmode=disable&options=-clock_timeout%3D2000%20-cstatement_timeout%3D10000")
helper = replaceOnce(helper, 'res.writeHead(reply.statusCode,reply.headers);reply.pipe(res)', "res.writeHead(reply.statusCode,reply.headers);if(isRest&&req.url.startsWith('/rest/v1/rpc/execute_admin_reference_command_v1')){const chunks=[];reply.on('data',chunk=>chunks.push(chunk));reply.on('end',()=>{const bytes=Buffer.concat(chunks);if(reply.statusCode>=400){try{const data=JSON.parse(bytes);report.referenceRpcFailure={status:reply.statusCode,code:data.code,reason:data.message?.match(/K2_[A-Z0-9_]+/)?.[0]||'unclassified'};}catch{report.referenceRpcFailure={status:reply.statusCode,reason:'unparseable'}}}res.end(bytes)});}else reply.pipe(res)")
driver = replaceOnce(driver, 'await taxonomy(verified.access_token,uid,report)', "report.checks.push('prior_taxonomy_diagnostic_not_repeated_under_protected_creation')")
helper = replaceOnce(helper, "req.body=Buffer.concat(chunks).toString('utf8');", "req.body=Buffer.concat(chunks).toString('utf8');req.query=Object.fromEntries(new URL(req.url,'http://127.0.0.1:54396').searchParams);")
const browserAt = helper.indexOf('async function browserProbe(')
assert.ok(browserAt > 0)
helper = helper.slice(0, browserAt) + fs.readFileSync('scripts/reference-workflow-browser-probe.inc.mjs', 'utf8')
fs.writeFileSync('.tools/probe-local-reference-workflow.mjs', helper)
fs.writeFileSync('.tools/drive-local-reference-workflow.mjs', driver)
source = source.replaceAll('.tools/probe-local-browser-boundary.mjs', '.tools/probe-local-reference-workflow.mjs')
  .replaceAll('.tools/drive-local-browser-auth.mjs', '.tools/drive-local-reference-workflow.mjs')

const setup = `
BEGIN;
SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='2s';
COPY (SELECT pg_get_functiondef('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure)) TO '/tmp/reference-original-verifier.copy';
COPY (SELECT pg_get_functiondef('public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure)) TO '/tmp/reference-original-master.copy';
COPY k2_private.product_master_events TO '/tmp/reference-master-before.rows';
COPY k2_private.category_policy_command_config TO '/tmp/reference-policy-config-before.rows';
SET ROLE postgres;
INSERT INTO k2_private.category_policy_command_config(singleton,maximum_depth) VALUES(true,10) ON CONFLICT(singleton) DO UPDATE SET maximum_depth=excluded.maximum_depth;
CREATE FUNCTION public.k2_reference_fixture_deadlines() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER AS 'SELECT jsonb_build_object(''role'',current_user,''lock'',current_setting(''lock_timeout''),''statement'',current_setting(''statement_timeout''))';
REVOKE ALL ON FUNCTION public.k2_reference_fixture_deadlines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.k2_reference_fixture_deadlines() TO authenticated;
DO $fixture$ BEGIN IF EXISTS(SELECT 1 FROM public.products WHERE sku='MAP018-REFERENCE-WORKFLOW-01') OR EXISTS(SELECT 1 FROM k2_private.product_master_events WHERE sku='MAP018-REFERENCE-WORKFLOW-01') THEN RAISE EXCEPTION 'K2_REFERENCE_WORKFLOW_ALREADY_PRESENT'; END IF; END $fixture$;
${fs.readFileSync('supabase/prepared/protected_reference_normalization.sql', 'utf8')}
${fs.readFileSync('supabase/prepared/protected_reference_creation.sql', 'utf8')}
${fs.readFileSync('supabase/prepared/product_master_version_conflict_transport.sql', 'utf8')}
INSERT INTO public.products(sku,name,status,published,is_human_reviewed,srp,primary_image_url,brand_id,category_id,stock_available,total_stock)
VALUES('MAP018-REFERENCE-WORKFLOW-01','MAP018 genuine synthetic reference workflow','Draft',false,false,1,'https://example.invalid/synthetic.webp',null,null,0,0);
COMMIT;
SELECT 'K2_REFERENCE_WORKFLOW_READY';
`
const cleanup = `
BEGIN;
SELECT jsonb_build_object('referenceWorkflowAudit',jsonb_build_object(
 'events',(SELECT count(*) FROM k2_private.reference_events),
 'receipts',(SELECT count(*) FROM k2_private.admin_command_receipts WHERE action='reference_create'),
 'context',(SELECT count(*) FROM k2_private.reference_command_context),
 'productEvents',(SELECT count(*) FROM k2_private.product_master_events WHERE sku='MAP018-REFERENCE-WORKFLOW-01'),
 'productReceipts',(SELECT count(*) FROM k2_private.admin_command_receipts WHERE action='product_master_update' AND result->>'sku'='MAP018-REFERENCE-WORKFLOW-01'),
 'referenceReceiptsMatch',(SELECT coalesce(bool_and(r.result=e.result),false) FROM k2_private.reference_events e JOIN k2_private.admin_command_receipts r ON r.actor_id=e.actor_id AND r.action=e.action AND r.idempotency_key=e.request_id),
 'pairedCanonicalIds',(SELECT coalesce(bool_and(e.before_state->>'brand_id' IS NULL AND e.before_state->>'category_id' IS NULL AND e.after_state->>'brand_id'=p.brand_id::text AND e.after_state->>'category_id'=p.category_id::text AND EXISTS(SELECT 1 FROM k2_private.reference_events re WHERE re.reference_id=p.brand_id AND re.kind='brand') AND EXISTS(SELECT 1 FROM k2_private.reference_events re WHERE re.reference_id=p.category_id AND re.kind='category')),false) FROM k2_private.product_master_events e JOIN public.products p USING(sku) WHERE sku='MAP018-REFERENCE-WORKFLOW-01')
));
-- Preserve the verdict before cleanup; final success requires it after full recovery.
COPY (SELECT CASE WHEN
 (SELECT count(*) FROM k2_private.reference_events)=2
 AND (SELECT count(*) FROM k2_private.reference_events WHERE kind='brand')=1
 AND (SELECT count(*) FROM k2_private.reference_events WHERE kind='category')=1
 AND (SELECT count(DISTINCT actor_id) FROM k2_private.reference_events)=1
 AND (SELECT count(*) FROM k2_private.admin_command_receipts WHERE action='reference_create')=2
 AND (SELECT count(*) FROM k2_private.reference_command_context)=0
 AND (SELECT count(*) FROM k2_private.reference_events e LEFT JOIN k2_private.admin_command_receipts r ON r.actor_id=e.actor_id AND r.action=e.action AND r.idempotency_key=e.request_id WHERE r.result=e.result AND r.completed_at IS NOT NULL)=2
 AND (SELECT count(*) FROM k2_private.product_master_events WHERE sku='MAP018-REFERENCE-WORKFLOW-01')=1
 AND (SELECT count(*) FROM k2_private.admin_command_receipts WHERE action='product_master_update' AND result->>'sku'='MAP018-REFERENCE-WORKFLOW-01')=1
 AND (SELECT count(*) FROM k2_private.product_master_events e JOIN public.products p USING(sku)
 LEFT JOIN k2_private.admin_command_receipts r ON r.actor_id=e.actor_id AND r.action=e.action AND r.idempotency_key=e.request_id
 WHERE e.sku='MAP018-REFERENCE-WORKFLOW-01' AND e.reason='Synthetic genuine paired reference assignment'
 AND e.before_state->>'brand_id' IS NULL AND e.before_state->>'category_id' IS NULL
 AND e.after_state->>'brand_id'=p.brand_id::text AND e.after_state->>'category_id'=p.category_id::text
 AND r.result->>'sku'=p.sku AND r.completed_at IS NOT NULL
 AND EXISTS(SELECT 1 FROM k2_private.reference_events re WHERE re.actor_id=e.actor_id AND re.reference_id=p.brand_id AND re.kind='brand')
 AND EXISTS(SELECT 1 FROM k2_private.reference_events re WHERE re.actor_id=e.actor_id AND re.reference_id=p.category_id AND re.kind='category'))=1
 THEN 'K2_REFERENCE_WORKFLOW_AUDIT_OK' ELSE 'K2_REFERENCE_WORKFLOW_AUDIT_FAILED' END) TO '/tmp/reference-audit-verdict';
CREATE TEMP TABLE reference_workflow_ids AS SELECT kind,reference_id FROM k2_private.reference_events;
DROP FUNCTION public.k2_reference_fixture_deadlines();
DROP TRIGGER brands_reference_signed_insert ON public.brands;
DROP TRIGGER categories_reference_signed_insert ON public.categories;
DROP TRIGGER categories_reference_statement_entry ON public.categories;
DROP FUNCTION public.execute_admin_reference_command_v1(text,bigint,uuid,uuid,text,text);
DROP FUNCTION k2_private.guard_reference_insert_v1();
DROP FUNCTION k2_private.guard_category_reference_entry_v1();
DROP TABLE k2_private.reference_command_context;
DROP TABLE k2_private.reference_events;
DROP FUNCTION k2_private.guard_reference_context_clear_v1();
DROP FUNCTION k2_private.guard_reference_event_immutable_v1();
DELETE FROM k2_private.product_master_events WHERE sku='MAP018-REFERENCE-WORKFLOW-01';
DELETE FROM public.products WHERE sku='MAP018-REFERENCE-WORKFLOW-01';
DELETE FROM public.categories WHERE id IN(SELECT reference_id FROM reference_workflow_ids WHERE kind='category');
DELETE FROM public.brands WHERE id IN(SELECT reference_id FROM reference_workflow_ids WHERE kind='brand');
DROP INDEX public.brands_reference_name_key_v1;
DROP INDEX public.categories_reference_name_parent_key_v1;
DROP FUNCTION k2_private.reference_name_key_v1(text);
DROP FUNCTION k2_private.clean_reference_name_v1(text);
COPY k2_private.product_master_events TO '/tmp/reference-master-after.rows';
TRUNCATE k2_private.category_policy_command_config;
COPY k2_private.category_policy_command_config FROM '/tmp/reference-policy-config-before.rows';
COPY k2_private.category_policy_command_config TO '/tmp/reference-policy-config-after.rows';
CREATE TEMP TABLE reference_original_verifier(definition text);
CREATE TEMP TABLE reference_original_master(definition text);
COPY reference_original_verifier FROM '/tmp/reference-original-verifier.copy';
COPY reference_original_master FROM '/tmp/reference-original-master.copy';
DO $restore$ BEGIN EXECUTE(SELECT definition FROM reference_original_verifier); EXECUTE(SELECT definition FROM reference_original_master); END $restore$;
COMMIT;
`
const injection = `
fs.writeFileSync(path.join(k2,'reference-before.sql'),${JSON.stringify(setup)},{flag:'wx'});
fs.writeFileSync(path.join(k2,'reference-recovery.sql'),${JSON.stringify(cleanup)},{flag:'wx'});
const authStart=probe.indexOf('export GOTRUE_API_HOST=');assert.ok(authStart>0);
probe=probe.slice(0,authStart)+psql('supabase_admin','reference-before.sql')+'\\n'+probe.slice(authStart);
const recoverAt=probe.indexOf("su postgres -s /bin/sh -c 'psql -X -q -h /tmp -U supabase_admin -d postgres -v ON_ERROR_STOP=1' <<'BFFRECOVERY'");assert.ok(recoverAt>0);
probe=probe.slice(0,recoverAt)+psql('supabase_admin','reference-recovery.sql')+'\\ncmp -s /tmp/reference-master-before.rows /tmp/reference-master-after.rows\\ncmp -s /tmp/reference-policy-config-before.rows /tmp/reference-policy-config-after.rows\\nsha256sum /tmp/reference-master-before.rows /tmp/reference-master-after.rows /tmp/reference-policy-config-before.rows /tmp/reference-policy-config-after.rows\\necho K2_REFERENCE_WORKFLOW_RECOVERY_OK\\n'+probe.slice(recoverAt);
`
source = replaceOnce(source, "fs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})", injection + "\nfs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})")
source = replaceOnce(source, "fs.copyFileSync(path.join(process.cwd(),'.tools/prepare-auth-bff-probe.mjs'),path.join(out,'executed-derivation.mjs'),fs.constants.COPYFILE_EXCL)", "fs.copyFileSync(path.join(process.cwd(),'scripts/prepare-reference-workflow-fixture.mjs'),path.join(out,'executed-derivation.mjs'),fs.constants.COPYFILE_EXCL)")
source = source.replace("stdout.includes('K2_BFF_PRIVATE_RECOVERY_OK')&&", "stdout.includes('K2_REFERENCE_WORKFLOW_RECOVERY_OK')&&stdout.includes('K2_BFF_PRIVATE_RECOVERY_OK')&&")
source = replaceOnce(source, "const run='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh';", "extraction+='/bin/busybox cp /k2/reference-before.sql /k2root/tmp/reference-before.sql\\n/bin/busybox cp /k2/reference-recovery.sql /k2root/tmp/reference-recovery.sql\\n';\nconst run='/bin/busybox chroot /k2root /bin/sh /tmp/k2-image-probe.sh';")
source = replaceOnce(source, "fs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})", "probe+='cat /tmp/reference-audit-verdict\\ngrep -q \"^K2_REFERENCE_WORKFLOW_AUDIT_OK$\" /tmp/reference-audit-verdict\\n';\nfs.writeFileSync(path.join(k2,'image-probe.sh'),probe,{flag:'wx'})")
source = source.replace("stdout.includes('K2_REFERENCE_WORKFLOW_RECOVERY_OK')&&", "stdout.includes('K2_REFERENCE_WORKFLOW_AUDIT_OK')&&stdout.includes('K2_REFERENCE_WORKFLOW_RECOVERY_OK')&&")
const pins = Object.fromEntries(['scripts/prepare-reference-workflow-fixture.mjs','scripts/reference-workflow-browser-probe.inc.mjs','supabase/prepared/protected_reference_normalization.sql','supabase/prepared/protected_reference_creation.sql','supabase/prepared/product_master_version_conflict_transport.sql'].map(file => [file, sha(fs.readFileSync(file))]))
source = replaceOnce(source, "const prep=JSON.parse", `fs.writeFileSync(path.join(out,'workflow-source-pins.json'),${JSON.stringify(JSON.stringify(pins,null,2))},{flag:'wx'});\nconst prep=JSON.parse`)
const prepared = '.tools/derived-reference-workflow.mjs'
fs.writeFileSync(prepared, source)
if (!process.argv.includes('--prepare-only')) await import(pathToFileURL(path.join(process.cwd(), prepared)).href)
