// IDEA-20261009-08 / MAP-018: actual BEFORE witness plus explicitly synthetic controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const module = await import('./provider-reconciliation-decision.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
assert.equal(typeof module.classifyProviderReadback, 'function', 'Missing offline full-witness classifier');
const { classifyProviderReadback } = module;
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc';
const read = file => fs.readFileSync(`${root}/${file}`, 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
const raw = read('provider-reconciliation-readback-20261012-01.json');
assert.equal(sha(raw), '3f5b17309a0520bb0c6b1f983c9cf5e9d174600381bca5bfa9dd57e36ae422fb');
const input = {
  packageText: read('oci-imported77/guarded-package.json'),
  beforeCatalogText: read('oci-imported77/execution01/before-catalog.json'),
  afterCatalogText: read('oci-imported77/execution01/after-catalog.json'),
  observation: JSON.parse(raw),
};
let checks = 0;
function check(name, mutate, expected) {
  const copy = structuredClone(input);
  mutate(copy);
  const result = classifyProviderReadback(copy);
  assert.equal(result.outcome, 'UNKNOWN', name);
  assert.equal(result.automaticRetryAllowed, false, name);
  assert.equal(Object.isFrozen(result), true, name);
  for (const [key, value] of Object.entries(expected)) assert.equal(result[key], value, `${name}: ${key}`);
  checks++;
}
const witness = copy => copy.observation.response[0].fresh_provider_readback;
const pkg = JSON.parse(input.packageText);
check('Actual K2 BEFORE is current state, never proof of historical non-application', () => {}, { snapshot: 'BEFORE', history: 'ABSENT' });
check('Synthetic full AFTER without receipt remains uncertain', copy => {
  witness(copy).catalog = JSON.parse(copy.afterCatalogText);
}, { snapshot: 'AFTER', history: 'ABSENT' });
const exactReceipt = () => ({
  name: 'k2_category_operating_full_cutover', version: 'synthetic-only', idempotencyKey: null,
  statementCount: 1, statementArraySha256: 'a'.repeat(64),
  statementPins: [{ ordinal: 1, bytes: 8278524, sha256: pkg.sqlSha256 }],
});
check('Synthetic AFTER and exact stored statement do not prove atomic installation', copy => {
  witness(copy).catalog = JSON.parse(copy.afterCatalogText);
  witness(copy).migrationReceipts = [exactReceipt()];
}, { snapshot: 'AFTER', history: 'EXACT_REQUEST_STATEMENT' });
check('Synthetic BEFORE with exact stored statement is contradictory', copy => {
  witness(copy).migrationReceipts = [exactReceipt()];
}, { snapshot: 'BEFORE', history: 'EXACT_REQUEST_STATEMENT' });
check('Same relation/function counts cannot hide catalog drift', copy => {
  witness(copy).catalog.relations[0].owner = 'synthetic_changed_owner';
}, { snapshot: 'DRIFT', history: 'ABSENT' });
check('Global authority drift is detected', copy => {
  witness(copy).globalAuthority.roles[0].name = 'synthetic_changed_role';
}, { snapshot: 'DRIFT' });
check('Managed setting drift is detected', copy => {
  witness(copy).managedAuthority.sessionPreloadLibraries = '';
}, { snapshot: 'DRIFT' });
check('Missing global authority is unreadable', copy => {
  delete witness(copy).globalAuthority;
}, { snapshot: 'UNREADABLE' });
check('Missing catalog is unreadable', copy => {
  delete witness(copy).catalog;
}, { snapshot: 'UNREADABLE' });
check('Missing history is unreadable, never absent', copy => {
  delete witness(copy).migrationReceipts;
}, { snapshot: 'UNREADABLE', history: 'UNREADABLE' });
check('Empty response remains unreadable', copy => {
  copy.observation.response = [];
}, { snapshot: 'UNREADABLE' });
check('Wrong project observation cannot classify K2', copy => {
  copy.observation.projectObservation.id = 'out-of-scope';
}, { snapshot: 'UNBOUND' });
check('Wrong version cannot classify accepted package', copy => {
  copy.observation.projectObservation.version = 'unreviewed';
}, { snapshot: 'UNBOUND' });
check('Write-capable observation is not accepted as reviewed read-only witness', copy => {
  copy.observation.readOnly = false;
}, { snapshot: 'UNBOUND' });
check('Altered query is not accepted', copy => {
  copy.observation.querySha256 = '0'.repeat(64);
}, { snapshot: 'UNBOUND' });
check('Failed HTTP response is unreadable', copy => {
  copy.observation.httpStatus = 500;
}, { snapshot: 'UNREADABLE' });
check('Two targeted history rows are ambiguous even if one matches', copy => {
  witness(copy).migrationReceipts = [exactReceipt(), exactReceipt()];
}, { history: 'AMBIGUOUS' });
check('Array hash is never compared directly with raw request hash', copy => {
  const receipt = exactReceipt();
  receipt.statementArraySha256 = pkg.sqlSha256;
  receipt.statementPins[0].sha256 = 'b'.repeat(64);
  witness(copy).migrationReceipts = [receipt];
}, { history: 'OTHER_STATEMENTS' });
check('Changed statement byte count is not exact correspondence', copy => {
  const receipt = exactReceipt(); receipt.statementPins[0].bytes--;
  witness(copy).migrationReceipts = [receipt];
}, { history: 'OTHER_STATEMENTS' });
check('Missing statement pins cannot establish correspondence', copy => {
  const receipt = exactReceipt(); delete receipt.statementPins;
  witness(copy).migrationReceipts = [receipt];
}, { history: 'UNREADABLE' });
check('Mismatched statement cardinality cannot establish correspondence', copy => {
  const receipt = exactReceipt(); receipt.statementCount = 2;
  witness(copy).migrationReceipts = [receipt];
}, { history: 'UNREADABLE' });
check('Wrong ordinal cannot establish correspondence', copy => {
  const receipt = exactReceipt(); receipt.statementPins[0].ordinal = 2;
  witness(copy).migrationReceipts = [receipt];
}, { history: 'UNREADABLE' });
for (const field of ['beforeCatalogText', 'afterCatalogText']) {
  const copy = structuredClone(input); copy[field] += ' ';
  assert.throws(() => classifyProviderReadback(copy), /REVIEWED_CATALOG_BYTES_REQUIRED/);
  checks++;
}
const copy = structuredClone(input); const altered = JSON.parse(copy.packageText); altered.sql += ' ';
copy.packageText = JSON.stringify(altered);
assert.throws(() => classifyProviderReadback(copy), /REVIEWED_SQL_BYTES_REQUIRED/);
checks++;
const authorityCopy = structuredClone(input); const authorityPackage = JSON.parse(authorityCopy.packageText);
authorityPackage.authority.roles[0].name = 'synthetic_forged_expected_role';
authorityCopy.packageText = JSON.stringify(authorityPackage);
assert.throws(() => classifyProviderReadback(authorityCopy), /REVIEWED_PACKAGE_BYTES_REQUIRED/);
checks++;
console.log(JSON.stringify({ checks, actualBeforeWitness: true, syntheticAfterAndHistoryOnly: true, providerWrites: false, networkRequests: 0, allOutcomesUnknown: true }));
