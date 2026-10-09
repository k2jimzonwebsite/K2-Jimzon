import test from 'node:test'
import assert from 'node:assert/strict'
import * as foundation from '../scripts/rehearse-intake-foundation.mjs'
const args={marker:'12345678-1234-4234-8234-123456789abc',dataDirectory:process.cwd().replaceAll('\\','/')+'/.tools/current-restore-20260929-pg-data'}
test('restored storage guard validates exact owned target without DDL',()=>{const sql=foundation.buildIntakeRestoredStorageGuard(args);for(const s of ['current_database()','inet_server_addr()','inet_server_port()','data_directory','k2_stock_fixture.owner','INTAKE_RESTORED_STORAGE_MISSING'])assert.ok(sql.includes(s));assert.ok(!/\b(create|alter|drop|insert|update|delete|grant|revoke)\b/i.test(sql))})
for(const changed of [{marker:null},{marker:'unsafe'},{dataDirectory:'C:/other'}])test('restored guard refuses invalid input '+JSON.stringify(changed),()=>assert.throws(()=>foundation.buildIntakeRestoredStorageGuard({...args,...changed}),/INTAKE_REFERENCE_TARGET_INVALID/))
