// Owned fixture observation only. SQL, authority and timer semantics are retained.
import assert from 'node:assert/strict'

export function instrumentInstallerTimingProbe(probe) {
  const command = "su postgres -s /bin/sh -c 'psql -X -q -t -A -P pager=off -h /tmp -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/full-contents.sql'"
  assert.equal(probe.split(command).length, 2, 'UNIQUE_FULL_INSTALL_COMMAND_REQUIRED')
  const resource = "/bin/busybox date +%s\n/bin/busybox grep -E '^(MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree):' /proc/meminfo\n/bin/busybox head -n 1 /proc/stat"
  const diagnostic = 'echo K2_INSTALL_TIMING_BEFORE\n' + resource + '\nset +e\n'
    + command.replace('-f /tmp/full-contents.sql', '-v VERBOSITY=terse -f /tmp/full-contents.sql')
    + ' > /tmp/k2-install-timing.log 2>&1\ninstall_timing_status=$?\nset -e\n'
    + 'echo K2_INSTALL_TIMING_AFTER\n' + resource + '\n'
    + 'echo K2_INSTALL_TIMING_STATUS_$install_timing_status\n/bin/busybox cat /tmp/k2-install-timing.log\n'
    + '[ "$install_timing_status" -eq 0 ]'
  return probe.replace(command, () => diagnostic)
}

export function instrumentInstallerTimingRunner(runner) {
  const start = 'try{const child=spawn(', end = 'finally{fs.closeSync(log);'
  assert.ok(!runner.includes('hostResourceTimer'), 'UNIQUE_RUNNER_ANCHORS_REQUIRED')
  assert.equal(runner.split(start).length, 2, 'UNIQUE_RUNNER_ANCHORS_REQUIRED')
  assert.equal(runner.split(end).length, 2, 'UNIQUE_RUNNER_ANCHORS_REQUIRED')
  assert.equal(runner.split('report.moduleGucs=').length, 2, 'UNIQUE_RUNNER_ANCHORS_REQUIRED')
  const observation = `const hostResources=[];let lastHostCpu=null;
const sampleHostResource=()=>{try{const cpus=os.cpus();const total=cpus.reduce((s,c)=>s+Object.values(c.times).reduce((a,b)=>a+b,0),0),idle=cpus.reduce((s,c)=>s+c.times.idle,0);const delta=lastHostCpu?total-lastHostCpu.total:0;hostResources.push({at:Date.now(),freeMemory:os.freemem(),totalMemory:os.totalmem(),cpuCount:cpus.length,cpuBusyPercent:delta>0?100*(1-(idle-lastHostCpu.idle)/delta):null});lastHostCpu={total,idle};}catch(error){hostResources.push({at:Date.now(),telemetryError:error.message});}};
sampleHostResource();const hostResourceTimer=setInterval(sampleHostResource,1000);
`
  return "import os from 'node:os';\n" + runner.replace(start, () => observation + start)
    .replace('report.moduleGucs=', "report.moduleGucs=stdout.includes('K2_INSTALL_TIMING_STATUS_0')&&")
    .replace(end, () => "finally{clearInterval(hostResourceTimer);sampleHostResource();fs.writeFileSync(path.join(out,'host-resource.json'),JSON.stringify(hostResources,null,2),{flag:'wx'});fs.closeSync(log);")
}
