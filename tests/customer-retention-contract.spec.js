import { expect, test } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STOREFRONT_BFF_ROUTES } from '../server/storefront-bff/router.js'

const root=fileURLToPath(new URL('..',import.meta.url))

async function sqlFiles(directory){
  const entries=await readdir(directory,{withFileTypes:true})
  return (await Promise.all(entries.map(async entry=>{
    const target=path.join(directory,entry.name)
    if(entry.isDirectory()) return sqlFiles(target)
    return entry.isFile()&&entry.name.endsWith('.sql')?[target]:[]
  }))).flat()
}

test('customer deletion remains fail-closed until retention policy and audited execution exist',async()=>{
  const [identity,runbook,map,owners]=await Promise.all([
    readFile(path.join(root,'supabase/migrations/20260812_guest_account_identity_and_messaging.sql'),'utf8'),
    readFile(path.join(root,'docs/runbooks/CUSTOMER_DATA_RETENTION_AND_DELETION_RUNBOOK.md'),'utf8'),
    readFile(path.join(root,'MASTER_ACTION_PLAN.md'),'utf8'),
    readFile(path.join(root,'K2 Jimzon - Brain/OWNER_QUESTIONS.md'),'utf8'),
  ])
  for(const relation of ['customer_contact_points','customer_accounts','guest_access_grants','customer_claim_requests']){
    expect(identity).toMatch(new RegExp(`create table if not exists public\\.${relation}[\\s\\S]*?references public\\.customers\\(id\\) on delete restrict`,'i'))
  }
  for(const relation of ['order_requests','pasabuy_requests']){
    expect(identity).toMatch(new RegExp(`alter table public\\.${relation}[\\s\\S]{0,180}references public\\.customers\\(id\\) on delete restrict`,'i'))
  }
  expect(identity).toMatch(/conversations_customer_id_fkey[\s\S]{0,180}references public\.customers\(id\) on delete restrict/i)
  const migrations=await sqlFiles(path.join(root,'supabase/migrations'))
  const allSql=(await Promise.all(migrations.map(file=>readFile(file,'utf8')))).join('\n')
  expect(allSql).not.toMatch(/references\s+public\.customers\s*\(id\)\s+on\s+delete\s+cascade/i)
  expect(allSql).not.toMatch(/delete\s+from\s+public\.customers\b/i)
  expect(STOREFRONT_BFF_ROUTES).not.toContain('account/delete')
  for(const evidence of ['Tier 0','BLOCKED by `OWNER-006`','must never solve retention by cascading deletion','Return `received` only after durable storage']) expect(runbook).toContain(evidence)
  expect(map).toContain('CUSTOMER_DATA_RETENTION_AND_DELETION_RUNBOOK.md')
  expect(owners).toContain('OWNER-006')
})
