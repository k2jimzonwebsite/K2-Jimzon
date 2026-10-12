// MAP-018 / IDEA-20261009-08: credential-free probe preparation contracts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

const module = await import('./prepare-provider-transport-probe.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return { prepareTransportProbe: () => { throw Error('TRANSPORT_PROBE_NOT_IMPLEMENTED'); } };
});
const sha = value => createHash('sha256').update(value).digest('hex');

test('success preparation freezes the full-size credential-free K2 wire body', () => {
  const probe = module.prepareTransportProbe('success');
  assert.equal(probe.projectRef, 'pixplcjqivlfflickobf');
  assert.equal(probe.endpoint, 'https://api.supabase.com/v1/projects/pixplcjqivlfflickobf/database/migrations');
  assert.deepEqual(Object.keys(JSON.parse(probe.body)), ['name', 'query']);
  assert.equal(Buffer.byteLength(probe.body), 9214478);
  assert.equal(probe.bodySha256, sha(probe.body));
  assert.equal(probe.querySha256, sha(JSON.parse(probe.body).query));
  assert.equal(probe.dispatched, false);
  assert.equal(probe.authorized, false);
  assert.equal(probe.automaticRetryAllowed, false);
});

test('deliberate failures are distinct frozen requests, never the installer request', () => {
  const success = module.prepareTransportProbe('success');
  const inside = module.prepareTransportProbe('inside_failure');
  const after = module.prepareTransportProbe('after_commit_failure');
  assert.equal(new Set([success.name, inside.name, after.name]).size, 3);
  assert.equal(new Set([success.schema, inside.schema, after.schema]).size, 3);
  assert.match(inside.query, /K2_TRANSPORT_INSIDE_FAILURE/);
  assert.match(after.query, /COMMIT;\s*DO \$failure\$/);
  for (const probe of [success, inside, after]) {
    assert.notEqual(probe.name, 'k2_category_operating_full_cutover');
    assert.equal(probe.cleanupSha256, sha(probe.cleanupQuery));
    assert.deepEqual(JSON.parse(probe.cleanupBody), { name: `${probe.name}_cleanup`, query: probe.cleanupQuery });
    assert.equal(probe.cleanupBodySha256, sha(probe.cleanupBody));
    assert.equal(probe.readbackSha256, sha(probe.readbackQuery));
  }
});

test('unknown variants and attempts to select another target are refused', () => {
  assert.throws(() => module.prepareTransportProbe('unknown'), /PROBE_VARIANT_REQUIRED/);
  assert.throws(() => module.prepareTransportProbe('success', 'another-project'), /FIXED_K2_PROBE_REQUIRED/);
});
