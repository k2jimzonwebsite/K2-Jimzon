// MAP-018 / IDEA-20261009-08. Offline qualification artifacts only: no network or credentials.
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRef = 'pixplcjqivlfflickobf';
const variants = { success: 'success01', inside_failure: 'inside01', after_commit_failure: 'after01' };
const sha = value => createHash('sha256').update(value).digest('hex');
const literal = value => `'${value.replaceAll("'", "''")}'`;

export function prepareTransportProbe(variant, target = projectRef) {
  if (target !== projectRef) throw Error('FIXED_K2_PROBE_REQUIRED');
  if (!Object.hasOwn(variants, variant)) throw Error('PROBE_VARIANT_REQUIRED');
  const suffix = variants[variant];
  const schema = `k2tq_20261012_${suffix}`;
  const name = `k2_map018_transport_20261012_${suffix}`;
  const functionBody = `
DECLARE n bigint; v text; x text;
BEGIN
  SELECT count(*), min(version::text), min(xmin::text) INTO n,v,x
    FROM supabase_migrations.schema_migrations WHERE name=${literal(name)};
  IF n<>1 OR x::numeric<>mod(pg_current_xact_id()::text::numeric,4294967296)
     OR NEW.marker_xid<>pg_current_xact_id() THEN
    RAISE EXCEPTION 'K2_TRANSPORT_HISTORY_NOT_SAME_TOP_TRANSACTION';
  END IF;
  UPDATE ${schema}.probe SET witnessed=true,history_version=v,history_xmin=x::xid
    WHERE id=NEW.id AND probe_name=NEW.probe_name AND marker_xid=NEW.marker_xid;
  IF NOT FOUND THEN RAISE EXCEPTION 'K2_TRANSPORT_MARKER_MISSING'; END IF;
  RETURN NEW;
END;
`;
  const doBody = `DO $probe$
BEGIN
  IF current_user<>'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) THEN
    RAISE EXCEPTION 'K2_TRANSPORT_CAPTURED_ROLE_REQUIRED';
  END IF;
  IF to_regnamespace('${schema}') IS NOT NULL OR EXISTS(
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE name=${literal(name)}) THEN
    RAISE EXCEPTION 'K2_TRANSPORT_FRESH_NAMES_REQUIRED';
  END IF;
  CREATE SCHEMA ${schema} AUTHORIZATION postgres;
  REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC,anon,authenticated,service_role;
  CREATE TABLE ${schema}.probe (
    id integer PRIMARY KEY CHECK(id=1), probe_name text NOT NULL,
    marker_xid xid8 NOT NULL, witnessed boolean NOT NULL,
    history_version text, history_xmin xid
  );
  REVOKE ALL ON ${schema}.probe FROM PUBLIC,anon,authenticated,service_role;
  CREATE FUNCTION ${schema}.commit_witness() RETURNS trigger LANGUAGE plpgsql
    SECURITY INVOKER SET search_path=pg_catalog AS $witness$${functionBody}$witness$;
  REVOKE ALL ON FUNCTION ${schema}.commit_witness() FROM PUBLIC,anon,authenticated,service_role;
  CREATE CONSTRAINT TRIGGER history_commit_witness AFTER INSERT ON ${schema}.probe
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ${schema}.commit_witness();
  INSERT INTO ${schema}.probe VALUES(1,${literal(name)},pg_current_xact_id(),false,NULL,NULL);
  ${variant === 'inside_failure' ? "RAISE EXCEPTION 'K2_TRANSPORT_INSIDE_FAILURE';" : ''}
END;
$probe$;`;
  let query = `BEGIN;\nSET LOCAL lock_timeout='2s';\nSET LOCAL statement_timeout='10s';\n${doBody}\nCOMMIT;\n`;
  if (variant === 'after_commit_failure') query += "DO $failure$ BEGIN RAISE EXCEPTION 'K2_TRANSPORT_AFTER_COMMIT_FAILURE'; END; $failure$;\n";
  if (variant === 'success') {
    const emptyBody = JSON.stringify({ name, query: query.replace('\nCOMMIT;', '\n/**/\nCOMMIT;') });
    const padding = 'x'.repeat(9214478 - Buffer.byteLength(emptyBody));
    query = query.replace('\nCOMMIT;', `\n/*${padding}*/\nCOMMIT;`);
  }
  const cleanupQuery = `BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
LOCK TABLE ${schema}.probe IN ACCESS EXCLUSIVE MODE;
DO $cleanup$
DECLARE ns oid; rel oid; fn oid; owner_id oid;
BEGIN
  SELECT oid INTO owner_id FROM pg_roles WHERE rolname='postgres' AND NOT rolsuper;
  IF current_user<>'postgres' OR owner_id IS NULL THEN RAISE EXCEPTION 'K2_TRANSPORT_CLEANUP_ROLE'; END IF;
  SELECT oid INTO ns FROM pg_namespace WHERE nspname='${schema}' AND nspowner=owner_id;
  SELECT oid INTO rel FROM pg_class WHERE relnamespace=ns AND relname='probe' AND relkind='r'
    AND relowner=owner_id AND NOT relrowsecurity AND NOT relforcerowsecurity;
  SELECT oid INTO fn FROM pg_proc WHERE pronamespace=ns AND proname='commit_witness'
    AND proowner=owner_id AND pronargs=0 AND prorettype='trigger'::regtype
    AND NOT prosecdef AND NOT proisstrict AND provolatile='v' AND proparallel='u'
    AND proconfig=ARRAY['search_path=pg_catalog'] AND prosrc=${literal(functionBody)};
  IF ns IS NULL OR rel IS NULL OR fn IS NULL THEN RAISE EXCEPTION 'K2_TRANSPORT_CLEANUP_IDENTITY'; END IF;
  IF (SELECT jsonb_agg(jsonb_build_array(relname,relkind) ORDER BY relname) FROM pg_class WHERE relnamespace=ns)
      <> '[ ["probe","r"], ["probe_pkey","i"] ]'::jsonb
    OR (SELECT count(*) FROM pg_proc WHERE pronamespace=ns)<>1
    OR (SELECT count(*) FROM pg_type WHERE typnamespace=ns)<>2
    OR (SELECT count(*) FROM pg_attrdef WHERE adrelid=rel)<>0
    OR (SELECT jsonb_agg(jsonb_build_array(attname,atttypid::regtype::text,attnotnull) ORDER BY attnum)
      FROM pg_attribute WHERE attrelid=rel AND attnum>0 AND NOT attisdropped)
      <> '[ ["id","integer",true], ["probe_name","text",true], ["marker_xid","xid8",true], ["witnessed","boolean",true], ["history_version","text",false], ["history_xmin","xid",false] ]'::jsonb
    THEN RAISE EXCEPTION 'K2_TRANSPORT_CLEANUP_OBJECTS'; END IF;
  IF EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.oid=ns AND a.grantee<>owner_id)
    OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=rel AND a.grantee<>owner_id)
    OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=fn AND a.grantee<>owner_id)
    THEN RAISE EXCEPTION 'K2_TRANSPORT_CLEANUP_ACL'; END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel)<>1 OR NOT EXISTS(
    SELECT 1 FROM pg_trigger WHERE tgrelid=rel AND tgname='history_commit_witness' AND tgfoid=fn
      AND tgtype=5 AND tgenabled='O' AND NOT tgisinternal AND tgdeferrable AND tginitdeferred
      AND tgnargs=0 AND tgqual IS NULL AND octet_length(tgargs)=0)
    OR (SELECT count(*) FROM pg_constraint WHERE conrelid=rel)<>3
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=rel AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (id)')
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=rel AND contype='c' AND pg_get_constraintdef(oid)='CHECK ((id = 1))')
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=rel AND contype='t' AND condeferrable AND condeferred)
    THEN RAISE EXCEPTION 'K2_TRANSPORT_CLEANUP_TRIGGER'; END IF;
  IF (SELECT count(*) FROM ${schema}.probe)<>1 OR NOT EXISTS(
    SELECT 1 FROM ${schema}.probe p JOIN supabase_migrations.schema_migrations h
      ON h.name=p.probe_name AND h.version::text=p.history_version AND h.xmin=p.history_xmin
    WHERE p.id=1 AND p.probe_name=${literal(name)} AND p.witnessed
      AND p.history_xmin::text::numeric=mod(p.marker_xid::text::numeric,4294967296))
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE name=${literal(name)})<>1
    THEN RAISE EXCEPTION 'K2_TRANSPORT_CLEANUP_MARKER'; END IF;
  DROP TRIGGER history_commit_witness ON ${schema}.probe;
  DROP TABLE ${schema}.probe RESTRICT;
  DROP FUNCTION ${schema}.commit_witness() RESTRICT;
  DROP SCHEMA ${schema} RESTRICT;
END;
$cleanup$;
COMMIT;
`;
  const readbackQuery = `SELECT jsonb_build_object(
  'schemaExists',to_regnamespace('${schema}') IS NOT NULL,
  'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner)) ORDER BY c.relname),'[]'::jsonb) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='${schema}'),
  'history',(SELECT coalesce(jsonb_agg(jsonb_build_object('version',version,'name',name,'xmin',xmin::text,'statementCount',cardinality(statements),'statementPins',(SELECT jsonb_agg(jsonb_build_object('ordinal',ordinal,'bytes',octet_length(convert_to(statement,'UTF8')),'sha256',encode(sha256(convert_to(statement,'UTF8')),'hex')) ORDER BY ordinal) FROM unnest(statements) WITH ORDINALITY s(statement,ordinal))) ORDER BY version),'[]'::jsonb) FROM supabase_migrations.schema_migrations WHERE name=${literal(name)})
) AS transport_readback;`;
  const body = JSON.stringify({ name, query });
  const cleanupName = `${name}_cleanup`;
  const cleanupBody = JSON.stringify({ name: cleanupName, query: cleanupQuery });
  // Run only after the first readback establishes the marker table exists; absence/error is not success.
  const markerReadbackQuery = `SELECT to_jsonb(p) AS transport_marker FROM ${schema}.probe p ORDER BY id;`;
  return Object.freeze({ projectRef, endpoint: `https://api.supabase.com/v1/projects/${projectRef}/database/migrations`,
    variant, name, schema, query, doBody, body, bodySha256: sha(body), querySha256: sha(query),
    cleanupName, cleanupBody, cleanupBodySha256: sha(cleanupBody),
    cleanupQuery, cleanupSha256: sha(cleanupQuery), readbackQuery, readbackSha256: sha(readbackQuery),
    markerReadbackQuery, markerReadbackSha256: sha(markerReadbackQuery),
    authorized: false, dispatched: false, automaticRetryAllowed: false });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw Error('NO_DISPATCH_OR_TARGET_ARGUMENTS_ALLOWED');
  const destination = fileURLToPath(new URL('../.tools/map018-transport-20261012-02/', import.meta.url));
  await fs.mkdir(destination); // Existing cases refuse rather than overwrite immutable artifacts.
  const pins = [];
  for (const variant of Object.keys(variants)) {
    const probe = prepareTransportProbe(variant);
    for (const [suffix, text] of [['request.json', probe.body], ['probe.sql', probe.query], ['cleanup.request.json', probe.cleanupBody], ['cleanup.sql', probe.cleanupQuery], ['readback.sql', probe.readbackQuery], ['marker-readback.sql', probe.markerReadbackQuery]]) {
      const file = `${variant}.${suffix}`;
      await fs.writeFile(path.join(destination, file), text, { flag: 'wx' });
      pins.push({ file, bytes: Buffer.byteLength(text), sha256: sha(text) });
    }
  }
  await fs.writeFile(path.join(destination, 'manifest.json'), JSON.stringify({ owningMap: 'MAP-018', idea: 'IDEA-20261009-08',
    projectRef, authorized: false, dispatched: false, providerAcceptance: false, automaticRetryAllowed: false, pins }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ destination, artifacts: pins.length, dispatched: false }));
}
