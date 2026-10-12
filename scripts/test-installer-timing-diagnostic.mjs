import assert from 'node:assert/strict'
import fs from 'node:fs'
const modulePath = new URL('./installer-timing-diagnostic.mjs', import.meta.url)
assert.ok(fs.existsSync(modulePath), 'Installer timing diagnostic is not implemented')
const { instrumentInstallerTimingProbe, instrumentInstallerTimingRunner } = await import(modulePath.href)
const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const probe = fs.readFileSync(root + '/oci-imported75/staging/k2/image-probe.sh', 'utf8')
const next = instrumentInstallerTimingProbe(probe)
const command = "su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/full-contents.sql'"
const start = next.indexOf('echo K2_INSTALL_TIMING_BEFORE'), end = next.indexOf('[ "$install_timing_status" -eq 0 ]') + '[ "$install_timing_status" -eq 0 ]'.length
assert.equal(next.slice(0, start) + command + next.slice(end), probe, 'All non-diagnostic probe bytes retained')
assert.equal(next.split('/tmp/full-contents.sql').length, 2)
assert.ok(next.includes('-v VERBOSITY=terse -f /tmp/full-contents.sql'))
assert.ok(next.includes('set +e\n') && next.includes('install_timing_status=$?\nset -e'))
assert.throws(() => instrumentInstallerTimingProbe(probe.replace(command, 'omitted')), /UNIQUE_FULL_INSTALL_COMMAND/)
assert.throws(() => instrumentInstallerTimingProbe(probe + '\n' + command), /UNIQUE_FULL_INSTALL_COMMAND/)
const runner = fs.readFileSync(root + '/run-oci-imported75.mjs', 'utf8')
const observed = instrumentInstallerTimingRunner(runner)
assert.ok(observed.includes('os.freemem()') && observed.includes('host-resource.json'))
assert.ok(observed.includes('clearInterval(hostResourceTimer)'))
const expression = observed.match(/report\.moduleGucs=([^;]+);/)[1]
const evaluate = stdout => Function('stdout', 'return (' + expression + ')')(stdout)
const markers = ['K2_GUARDED_FRESH_REPLAY_OK', 'K2_GENUINE_VAULT_ROUNDTRIP_OK',
  'K2_ALL88_COMMITTED_ORIGINAL_PROJECTIONS_OK', 'K2_PROTECTED_CONCURRENT_DRIFT_REFUSED_AND_RECOVERED',
  ...Array(2).fill('K2_CAPTURED_PROVIDER_BASELINE_AND_LOCALE_OK'), ...Array(3).fill('K2_ALL88_FOUNDATION_ROWS_OK')].join('\n')
assert.equal(evaluate(markers), false, 'Original success without diagnostic execution must not qualify')
assert.equal(evaluate(markers + '\nK2_INSTALL_TIMING_STATUS_0'), true)
assert.throws(() => instrumentInstallerTimingRunner(observed), /UNIQUE_RUNNER_ANCHORS/)
console.log(JSON.stringify({ checks: 11, passed: 11, providerWrites: false }))
