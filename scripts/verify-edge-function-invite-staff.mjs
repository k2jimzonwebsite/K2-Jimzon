import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sharedSource = await readFile(new URL('../supabase/functions/_shared/service-role.ts', import.meta.url), 'utf8')
const sharedAuthSource = await readFile(new URL('../supabase/functions/_shared/auth.ts', import.meta.url), 'utf8')
const entrySource = await readFile(new URL('../supabase/functions/invite-staff/index.ts', import.meta.url), 'utf8')
const handlerSource = await readFile(new URL('../supabase/functions/invite-staff/handler.ts', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20260814_invite_staff_operation_boundary.sql', import.meta.url), 'utf8')

for (const source of [sharedSource, sharedAuthSource, entrySource, handlerSource]) {
  assert.doesNotMatch(source, /SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY/, 'Legacy API keys must not be consumed')
  assert.doesNotMatch(source, /Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/, 'Wildcard CORS is forbidden')
}
assert.match(sharedSource, /parseModernKeyMap/, 'Modern named key maps must be parsed')
assert.match(sharedSource, /sb_secret_/, 'Secret key type must be validated')
assert.match(sharedSource, /sb_publishable_/, 'Publishable key type must be validated')
assert.match(handlerSource, /currentLevel !== 'aal2'/, 'The real handler must require AAL2')
assert.match(handlerSource, /UNKNOWN_REQUEST_FIELD/, 'The real handler must reject unknown fields')
assert.match(handlerSource, /REQUEST_TOO_LARGE/, 'The real handler must bound request bytes')
assert.match(handlerSource, /profile\?\.role !== 'Admin'/, 'The real handler must require exact Admin role')
assert.match(handlerSource, /TARGET_IDENTITY_NOT_FOUND/, 'Missing target identity must fail')
assert.match(handlerSource, /roleAssigned: true/, 'Success must explicitly follow role persistence')
assert.doesNotMatch(handlerSource, /Referer/, 'Referer must not substitute for Origin')
assert.doesNotMatch(handlerSource, /console\.error/, 'The core handler must use injected redacted logging')
assert.match(migration, /staff_invitation_operations/, 'Durable operation receipts must be prepared')
assert.match(migration, /pg_advisory_xact_lock/, 'Actor claims must serialize')

console.log('✓ Supplemental invite-staff source guards passed; runtime behavior is covered by the handler contract tests.')
