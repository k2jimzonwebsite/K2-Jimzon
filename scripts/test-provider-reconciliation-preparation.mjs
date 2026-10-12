import fs from 'node:fs'
import assert from 'node:assert/strict'
import { providerManagedAuthoritySql } from '../docs/evidence/20261004-category-shelf-life/operating-replay-package.mjs'
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const query = fs.readFileSync('docs/evidence/20261009-workspace-maintenance/provider-reconciliation.sql', 'utf8')
const prior = fs.readFileSync(root + '/provider-request-baseline-20261012-01/provider-reconciliation.sql', 'utf8')
const terminal = ') as category_operating_contract) select jsonb_build_object('
assert.equal(prior.split(terminal).length, 2)
assert.equal(query.split(terminal).length, 2)
assert.equal(query.split(terminal)[0], prior.split(terminal)[0], 'Complete accepted catalog capture must remain byte-identical')
assert.ok(query.includes("'catalog',category_operating_contract"), 'Return complete catalog, not only its hash/counts')
const full = fs.readFileSync(root + '/oci-imported77/staging/k2/full-contents.sql', 'utf8')
const anchor = "select 'K2_FULL_AUTHORITY_BEGIN';\n"
assert.equal(full.split(anchor).length, 2)
const authority = full.split(anchor)[1].split(';')[0]
assert.ok(authority.startsWith("select jsonb_build_object('roles',"))
assert.ok(query.includes("'globalAuthority',(" + authority + ')'), 'Reuse complete accepted roles/memberships/event query')
assert.ok(query.includes("'managedAuthority',(" + providerManagedAuthoritySql + ')'), 'Reuse all eight accepted managed settings')
const history = fs.readFileSync(root + '/provider-request-baseline-20261012-01/provider-history-readback.sql', 'utf8')
const historyPins = history.slice(history.indexOf(' (select jsonb_agg(') + 1, history.indexOf(' as statement_pins'))
assert.ok(historyPins.startsWith('(select jsonb_agg('))
assert.ok(query.includes("'statementPins'," + historyPins), 'Keep ordered byte/hash evidence without equating array hashes to request SQL')
assert.ok(query.startsWith("begin transaction read only; set local search_path=''; set local lock_timeout='2s'; set local statement_timeout='10s';"))
assert.ok(query.trimEnd().endsWith('rollback;'))
assert.ok(query.includes("where name='k2_category_operating_full_cutover'"))
console.log(JSON.stringify({ passed: true, catalogCaptureUnchanged: true, completeAuthorityQueriesReused: true,
  orderedStatementPins: true, preparationOnly: true, providerWrites: false }))
