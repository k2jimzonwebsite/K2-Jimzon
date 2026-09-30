import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { generateGuestInstallDeactivation } from '../scripts/guest-install-recovery.mjs'

const scope = JSON.parse(fs.readFileSync('docs/evidence/20260930-guest-continuity-rehearsal/guest-install-scope.json','utf8'))
const before = { database:'isolated_fixture',systemIdentifier:'1234',functions:[],tables:[],triggers:[] }
const after = { ...before,
  functions:scope.functions.map(name=>({name,signature:`${name}()`,definition:`CREATE OR REPLACE FUNCTION ${name}() RETURNS void LANGUAGE sql AS 'SELECT';`,owner:'postgres',acl:null})),
  tables:scope.tables.map(name=>({name,owner:'postgres',acl:null,rls:true,forceRls:true,columns:[],constraints:[],policies:[]})),
  triggers:scope.triggers.map(t=>({...t,definition:`CREATE TRIGGER ${t.name}`,enabled:'O'})),
}

test('guest install recovery deactivates only new access and notification hooks while retaining records', () => {
  const sql=generateGuestInstallDeactivation(before,after)
  expect(sql).toContain('GUEST_INSTALL_LATER_CHANGE_REFUSED')
  expect(sql).toContain('revoke all on function')
  expect(sql).toContain('revoke all on table')
  expect(sql).toContain('drop trigger')
  expect(sql).not.toMatch(/^\s*(?:drop table|truncate\s+(?:table\s+)?[a-z_]|delete from|update public\.)/im)
})

test('guest install recovery requires complete same-target captures and refuses partial preinstallation', () => {
  expect(()=>generateGuestInstallDeactivation(null,after)).toThrow('GUEST_INSTALL_DATABASE_MISMATCH')
  expect(()=>generateGuestInstallDeactivation({...before,database:'other'},after)).toThrow('GUEST_INSTALL_DATABASE_MISMATCH')
  expect(()=>generateGuestInstallDeactivation({...before,systemIdentifier:'other'},after)).toThrow('GUEST_INSTALL_CLUSTER_MISMATCH')
  expect(()=>generateGuestInstallDeactivation(before,{...after,functions:[]})).toThrow('GUEST_INSTALL_CAPTURE_INCOMPLETE')
  expect(()=>generateGuestInstallDeactivation(before,{...after,tables:[]})).toThrow('GUEST_INSTALL_CAPTURE_INCOMPLETE')
  expect(()=>generateGuestInstallDeactivation({...before,tables:[after.tables[0]]},after)).toThrow('GUEST_INSTALL_PARTIAL_PREINSTALLATION')
})
