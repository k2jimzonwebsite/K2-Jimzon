// MAP-018 / IDEA-20261009-08: full-source offline envelope contracts.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
const module=await import('./prepare-controlled-migration.mjs').catch(error=>{
  if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;
  return {prepareControlledMigration:()=>{throw Error('CONTROLLED_CONSTRUCTOR_NOT_IMPLEMENTED');},receiptLiteral:()=>{throw Error('CONTROLLED_CONSTRUCTOR_NOT_IMPLEMENTED');}};
});
const original=JSON.parse(await fs.readFile('D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc/provider-management-request-20261012-01.json','utf8')).query;
const capture=await fs.readFile('.tools/map018-controlled-ledger-20261012-01/provider-capture.json','utf8');
const captureSql=await fs.readFile('.tools/map018-controlled-ledger-20261012-01/capture.sql','utf8');
const sha=v=>createHash('sha256').update(v).digest('hex');
test('full reviewed body remains byte-exact inside a separately pinned single transaction',()=>{
  const p=module.prepareControlledMigration(original,capture,captureSql);
  const start=original.indexOf('begin;')+6;const end=original.lastIndexOf('\ncommit;');
  assert.equal(p.body,original.slice(start,end));
  assert.equal(p.sourceSha256,'8ca8e22fedcae9fa63eaba682b897b2dcfaa0b817f3f1c7a010204314fa5dc99');
  assert.equal(p.bodySha256,sha(p.body));assert.equal(p.envelopeSha256,sha(p.envelope));
  assert.equal(p.envelope.split(p.body).length,3); // Executed body and the inert complete-source receipt.
  assert(p.envelope.indexOf('K2_CONTROLLED_RECEIPT_COLLISION')<p.envelope.indexOf(p.body));
  assert(p.envelope.lastIndexOf('INSERT INTO supabase_migrations.schema_migrations')>p.envelope.indexOf(p.body));
  assert(p.envelope.endsWith('\nCOMMIT;\n'));
  assert(p.envelope.includes(module.receiptLiteral(original)));
  assert.equal(p.authorized,false);assert.equal(p.dispatched,false);assert.equal(p.automaticRetryAllowed,false);
});
test('altered source, ledger capture and metadata query refuse before preparation',()=>{
  assert.throws(()=>module.prepareControlledMigration(original+'\n',capture,captureSql),/SOURCE_PIN_REQUIRED/);
  assert.throws(()=>module.prepareControlledMigration(original,capture+'\n',captureSql),/LEDGER_CAPTURE_PIN_REQUIRED/);
  assert.throws(()=>module.prepareControlledMigration(original,capture,captureSql+'\n'),/LEDGER_QUERY_PIN_REQUIRED/);
});
test('receipt serialization preserves quotes, backslashes, delimiters and Unicode as data',()=>{
  const sample="SELECT 'O''Brien', E'\\\\'; $$ semi; \n木😀\t\r";
  const literal=module.receiptLiteral(sample);const delimiter='$k2_map018_receipt_8ca8e22f$';
  assert.equal(literal,delimiter+sample+delimiter);
});
test('receipt literal refuses delimiter collision and unsupported control characters',()=>{
  assert.throws(()=>module.receiptLiteral('$k2_map018_receipt_8ca8e22f$'),/RECEIPT_LITERAL_REFUSED/);
  for(const value of ['\0','\x01','\x7f','\ud800'])assert.throws(()=>module.receiptLiteral(value),/RECEIPT_LITERAL_REFUSED/);
});
