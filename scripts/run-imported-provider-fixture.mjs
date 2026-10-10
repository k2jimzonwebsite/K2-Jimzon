// MAP-018: retained captured-authority runner, owned native fixture only.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const root = 'D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc'
const caseName = process.argv.find(a => a.startsWith('--case='))?.slice(7)
assert.match(caseName || '', /^oci-imported\d{2}$/)
const guest = path.join(root, caseName)
const composition = JSON.parse(fs.readFileSync(path.join(guest, 'imported-composition.json')))
assert.equal(composition.providerWrites, false)
assert.equal(composition.owningMap, 'MAP-018')
assert.ok(!fs.existsSync(path.join(guest, 'execution01')))
const source = fs.readFileSync(path.join(root, 'run-oci-envelope12.mjs'), 'utf8')
assert.equal(createHash('sha256').update(source).digest('hex'), '26e4d5ec612536fe67559f7c0ef1ebe7921e1cc111b51ed7b9e22025b9d9794c')
const generated = path.join(root, 'run-' + caseName + '.mjs')
const derived = source.replaceAll('oci-envelope12', caseName)
if (fs.existsSync(generated)) assert.equal(fs.readFileSync(generated, 'utf8'), derived)
else fs.writeFileSync(generated, derived, { flag:'wx' })
fs.copyFileSync(generated, path.join(guest, 'runner-source.mjs'), fs.constants.COPYFILE_EXCL)
await import(pathToFileURL(generated).href)
