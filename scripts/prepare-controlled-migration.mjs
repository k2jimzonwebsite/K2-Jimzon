// MAP-018 / IDEA-20261009-08: offline construction only, no credentials or dispatch.
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const sourceSha256='8ca8e22fedcae9fa63eaba682b897b2dcfaa0b817f3f1c7a010204314fa5dc99';
const captureSha256='91a59a6933ff6f4f9697726c9a69621361fa24a866018a946ad9ef730171fd28';
const querySha256='b61ba2884f68e98a332b24c102088aba30f7fd18c323b7f66039df64410e9375';
const delimiter='$k2_map018_receipt_8ca8e22f$';
export function receiptLiteral(value){
  if(typeof value!=='string'||!value.isWellFormed()||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)||value.includes(delimiter))throw Error('RECEIPT_LITERAL_REFUSED');
  return delimiter+value+delimiter;
}
export function prepareControlledMigration(source,captureText,captureSql){
  if(typeof source!=='string'||sha(source)!==sourceSha256)throw Error('SOURCE_PIN_REQUIRED');
  if(typeof captureText!=='string'||sha(captureText)!==captureSha256)throw Error('LEDGER_CAPTURE_PIN_REQUIRED');
  if(typeof captureSql!=='string'||sha(captureSql)!==querySha256)throw Error('LEDGER_QUERY_PIN_REQUIRED');
  const capture=JSON.parse(captureText);const observed=JSON.parse(capture.responseText)[0].ledger_capture;
  if(capture.projectRef!=='pixplcjqivlfflickobf'||capture.readOnly!==true||capture.providerWrites!==false||capture.httpStatus!==201||observed.readOnly!=='on')throw Error('OBSERVED_K2_LEDGER_REQUIRED');
  const prefix='-- Execute only through reviewed Supabase project pixplcjqivlfflickobf; SQL does not establish project identity.\nbegin;';
  const suffix='\ncommit;';
  if(!source.startsWith(prefix)||!source.endsWith(suffix))throw Error('EXACT_OUTER_ENVELOPE_REQUIRED');
  const body=source.slice(prefix.length,-suffix.length);
  const name='k2_category_operating_full_cutover_controlled_20261012';
  const version='20261012140000';
  const idempotencyKey='k2-controlled-v1:sha256:'+sourceSha256;
  const tableExpression=captureSql.slice(captureSql.indexOf("'table',")+8,captureSql.indexOf(",\n 'eventTriggers'"));
  const schemaExpression=captureSql.slice(captureSql.indexOf("'schema',")+9,captureSql.indexOf(",\n 'table'"));
  const checks=`
  IF current_user<>'postgres' OR (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'K2_CONTROLLED_ROLE_REFUSED'; END IF;
  IF ${schemaExpression} IS DISTINCT FROM ${receiptLiteral(JSON.stringify(observed.schema))}::jsonb
    OR ${tableExpression} IS DISTINCT FROM ${receiptLiteral(JSON.stringify(observed.table))}::jsonb THEN
    RAISE EXCEPTION 'K2_CONTROLLED_LEDGER_DRIFT'; END IF;
  IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${version}' OR name='${name}' OR idempotency_key='${idempotencyKey}') THEN
    RAISE EXCEPTION 'K2_CONTROLLED_RECEIPT_COLLISION'; END IF;`;
  const preconditionSql=`DO $k2_controlled_precondition$ BEGIN${checks}\nEND $k2_controlled_precondition$;`;
  const receiptSql=`DO $k2_controlled_receipt$
DECLARE affected integer;
BEGIN${checks}
  INSERT INTO supabase_migrations.schema_migrations(version,name,statements,idempotency_key)
    VALUES('${version}','${name}',ARRAY[${receiptLiteral(source)}]::text[],'${idempotencyKey}');
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'K2_CONTROLLED_RECEIPT_INSERT_REFUSED'; END IF;
END $k2_controlled_receipt$;`;
  const envelope=`BEGIN;\nSET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='10s';\n${preconditionSql}\n${body}\n${receiptSql}\nCOMMIT;\n`;
  return Object.freeze({projectRef:'pixplcjqivlfflickobf',name,version,idempotencyKey,sourceSha256,
    sourceBytes:Buffer.byteLength(source),body,bodySha256:sha(body),bodyBytes:Buffer.byteLength(body),
    preconditionSql,receiptSql,envelope,envelopeSha256:sha(envelope),envelopeBytes:Buffer.byteLength(envelope),
    ledgerCaptureSha256:captureSha256,ledgerQuerySha256:querySha256,
    authorized:false,dispatched:false,automaticRetryAllowed:false,providerAcceptance:false});
}
