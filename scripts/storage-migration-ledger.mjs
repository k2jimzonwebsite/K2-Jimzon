import assert from 'node:assert/strict'
// Read only migration IDs/names/hashes; never export surrounding captured data.
export function parseStorageMigrationLedger(dump) {
  const header = 'COPY storage.migrations (id, name, hash, executed_at) FROM stdin;\n'
  assert.equal(dump.split(header).length, 2, 'Exactly one captured Storage ledger required')
  const body = dump.split(header)[1].split('\n\\.\n')[0]
  assert.ok(dump.split(header)[1].includes('\n\\.\n'), 'COPY terminator required')
  const rows = body.split('\n').map(line => {
    const fields = line.split('\t')
    assert.equal(fields.length, 4)
    assert.match(fields[0], /^(0|[1-9]\d*)$/)
    assert.match(fields[1], /^[a-z0-9_-]+$/)
    assert.match(fields[2], /^[a-f0-9]{40}$/)
    return { id: Number(fields[0]), name: fields[1], hash: fields[2] }
  }).sort((a,b) => a.id-b.id)
  rows.forEach((row,index) => assert.equal(row.id,index,'Complete consecutive migration ledger required'))
  return rows
}
export function qualifyStorageMigrationBoundary(captured, intended, freezeAt) {
  assert.ok(captured.length > 0)
  assert.equal(freezeAt,captured.at(-1).name,'Freeze must cover the complete captured ledger')
  assert.ok(intended.length >= captured.length,'Every captured migration must be available')
  intended.forEach((row,index) => assert.equal(row.id,index))
  captured.forEach((row,index) => {
    assert.equal(row.id,index)
    assert.equal(intended[index].name,row.name,'Historical migration name changed')
    assert.equal(intended[index].hash,row.hash,'Historical migration hash changed')
  })
  return {freezeAt,capturedCount:captured.length,pending:intended.slice(captured.length).map(({id,name})=>({id,name}))}
}
