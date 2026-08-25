import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createInviteStaffHandler, resolveAllowedOrigins } from '../supabase/functions/invite-staff/handler.ts'
import { parseModernKeyMap } from '../supabase/functions/_shared/service-role.ts'

const ORIGIN = 'https://admin.example.test'
const ACTOR = '10000000-0000-4000-8000-000000000001'
const TARGET = '20000000-0000-4000-8000-000000000002'
const KEY = '30000000-0000-4000-8000-000000000003'

// Builds a structurally real (unsigned) access token so the handler exercises the
// same claim-reading path it uses in production. Signature validity is irrelevant
// here because the handler only reads claims from a token auth.getUser() accepted.
function token(aal = 'aal2') {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'ES256', typ: 'JWT' })}.${b64({ sub: ACTOR, aal })}.fabricated-test-signature`
}

function request(body = {
  email: 'staff@example.test', role: 'Staff', reason: 'Add a warehouse operator for daily receiving.',
  redirectTo: `${ORIGIN}/admin`,
}, options = {}) {
  const headers = {
    Origin: options.origin ?? ORIGIN,
    Authorization: options.authorization ?? `Bearer ${token(options.aal ?? 'aal2')}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': options.key ?? KEY,
    ...options.headers,
  }
  if (options.noOrigin) delete headers.Origin
  if (options.noAuthorization) delete headers.Authorization
  if (options.noKey) delete headers['X-Idempotency-Key']
  return new Request('https://edge.example.test/invite-staff', {
    method: options.method ?? 'POST', headers,
    body: ['GET', 'OPTIONS'].includes(options.method) ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  })
}

function memoryOperationStore() {
  const operations = new Map()
  return {
    operations,
    async claim(actor, key, hash, reason) {
      const id = `${actor}:${key}`
      const existing = operations.get(id)
      if (!existing) { operations.set(id, { hash, reason, result: null }); return { state: 'claimed' } }
      if (existing.hash !== hash) return { state: 'conflict' }
      return existing.result ? { state: 'completed', result: existing.result } : { state: 'in_progress' }
    },
    async complete(actor, key, hash, result) {
      const existing = operations.get(`${actor}:${key}`)
      if (!existing || existing.hash !== hash) throw new Error('not pending')
      existing.result = result
    },
    async release(actor, key, hash) {
      const id = `${actor}:${key}`
      const existing = operations.get(id)
      if (existing?.hash === hash && !existing.result) operations.delete(id)
    },
  }
}

function harness(overrides = {}) {
  const calls = { invite: 0, list: 0, upsert: 0, logs: [] }
  const operationStore = overrides.operationStore ?? memoryOperationStore()
  const existingUser = overrides.existingUser
  const adminClient = {
    auth: { admin: {
      async listUsers({ page }) {
        calls.list += 1
        if (overrides.listError) return { data: null, error: { code: 'provider_error' } }
        if (overrides.pages) return overrides.pages[page - 1] ?? { data: { users: [], nextPage: null }, error: null }
        return { data: { users: existingUser ? [existingUser] : [], nextPage: null }, error: null }
      },
      async inviteUserByEmail() {
        calls.invite += 1
        if (overrides.inviteGate) await overrides.inviteGate
        if (overrides.inviteError) return { data: null, error: overrides.inviteError }
        return { data: { user: overrides.inviteWithoutId ? {} : { id: TARGET, email: 'staff@example.test' } }, error: null }
      },
    } },
    from(table) {
      expect(table).toBe('user_profiles')
      return {
        select() {
          return { eq() { return { async single() {
            return overrides.profileError
              ? { data: null, error: { code: 'profile_error' } }
              : { data: { role: overrides.profileRole ?? 'Admin' }, error: null }
          } } } }
        },
        upsert(value) {
          calls.upsert += 1
          calls.upsertValue = value
          return { select() { return { async single() {
            if (overrides.upsertError) return { data: null, error: { code: 'write_failed' } }
            return { data: { id: value.id, role: value.role }, error: null }
          } } } }
        },
      }
    },
  }
  const handler = createInviteStaffHandler({
    env: overrides.env ?? { K2_ADMIN_ORIGINS: ORIGIN },
    configured: overrides.configured ?? true,
    // Mirrors @supabase/auth-js: getAuthenticatorAssuranceLevel() reports
    // currentLevel null unless it is handed the access token, because a
    // header-only client has no persisted session to fall back on. A mock that
    // always returns 'aal2' hides a defect that blocks every real caller.
    createCallerClient: () => ({ auth: {
      async getUser(jwt) {
        if (overrides.userError) return { data: null, error: {} }
        return { data: { user: { id: ACTOR } }, error: jwt ? null : {} }
      },
      mfa: { async getAuthenticatorAssuranceLevel(jwt) {
        if (overrides.aalError) return { data: null, error: {} }
        if (!jwt) return { data: { currentLevel: null, nextLevel: null }, error: null }
        const claim = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).aal ?? null
        return { data: { currentLevel: claim, nextLevel: claim }, error: null }
      } },
    } }),
    createAdminClient: () => adminClient,
    operationStore,
    logger: { error: (event, detail) => calls.logs.push({ event, detail }) },
    randomUUID: () => '40000000-0000-4000-8000-000000000004',
  })
  return { handler, calls, operationStore }
}

async function result(response) { return { status: response.status, body: await response.json() } }

test.describe('invite-staff real handler', () => {
  test('uses typed modern keys and explicit origin configuration', async () => {
    expect(parseModernKeyMap('{"default":"sb_secret_test"}', 'sb_secret_')).toBe('sb_secret_test')
    expect(parseModernKeyMap('{"default":"sb_publishable_test"}', 'sb_publishable_')).toBe('sb_publishable_test')
    expect(parseModernKeyMap('{"default":"wrong"}', 'sb_secret_')).toBe('')
    expect(parseModernKeyMap('{broken', 'sb_secret_')).toBe('')
    expect(resolveAllowedOrigins({ K2_ADMIN_ORIGINS: ORIGIN })).toEqual(new Set([ORIGIN]))
    expect(resolveAllowedOrigins({})).toBeNull()
    expect(resolveAllowedOrigins({ K2_EDGE_ALLOW_LOCALHOST: 'true' })).toContain('http://localhost:5173')
  })

  test('fails closed for missing config/origin and handles preflight/method', async () => {
    expect((await result(await harness({ env: {} }).handler(request()))).body.error).toBe('SERVER_CONFIGURATION_ERROR')
    expect((await result(await harness({ configured: false }).handler(request()))).body.error).toBe('SERVER_CONFIGURATION_ERROR')
    expect((await result(await harness().handler(request(undefined, { noOrigin: true, headers: { Referer: `${ORIGIN}/admin` } })))).body.error).toBe('FORBIDDEN_ORIGIN')
    expect((await harness().handler(request(undefined, { method: 'OPTIONS' }))).status).toBe(204)
    expect((await result(await harness().handler(request(undefined, { method: 'GET' })))).body.error).toBe('METHOD_NOT_ALLOWED')
  })

  test('requires a verified AAL2 Admin and a bounded UUID operation key', async () => {
    expect((await result(await harness().handler(request(undefined, { noAuthorization: true })))).body.error).toBe('NOT_AUTHENTICATED')
    expect((await result(await harness({ userError: true }).handler(request()))).body.error).toBe('INVALID_SESSION')
    expect((await result(await harness().handler(request(undefined, { aal: 'aal1' })))).body.error).toBe('AAL2_REQUIRED')
    // Regression: a genuine AAL2 caller must be accepted. This failed in
    // production because the handler asked for the assurance level without
    // supplying the access token, so every caller looked like currentLevel null.
    expect((await result(await harness().handler(request(undefined, { aal: 'aal2' })))).status).toBe(200)
    expect((await result(await harness({ aalError: true }).handler(request()))).body.error).toBe('AAL2_REQUIRED')
    expect((await result(await harness({ profileRole: 'Staff' }).handler(request()))).body.error).toBe('FORBIDDEN_ROLE')
    expect((await result(await harness().handler(request(undefined, { key: 'too-long-or-invalid' })))).body.error).toBe('INVALID_IDEMPOTENCY_KEY')
  })

  test('rejects malformed, unknown, oversized, and unsafe input', async () => {
    expect((await result(await harness().handler(request('{bad')))).body.error).toBe('INVALID_JSON')
    expect((await result(await harness().handler(request({ email: 'staff@example.test', reason: 'Operational need.', surprise: true })))).body.error).toBe('UNKNOWN_REQUEST_FIELD')
    expect((await result(await harness().handler(request({ email: 'bad', reason: 'Operational need.' })))).body.error).toBe('INVALID_EMAIL')
    expect((await result(await harness().handler(request({ email: 'staff@example.test', role: 'Owner', reason: 'Operational need.' })))).body.error).toBe('INVALID_ROLE')
    expect((await result(await harness().handler(request({ email: 'staff@example.test', role: 'Staff' })))).body.error).toBe('INVALID_REASON')
    expect((await result(await harness().handler(request({ email: 'staff@example.test', role: 'Staff', reason: 'x' })))).body.error).toBe('INVALID_REASON')
    expect((await result(await harness().handler(request({ email: 'staff@example.test', role: 'Staff', reason: 'x'.repeat(501) })))).body.error).toBe('INVALID_REASON')
    expect((await result(await harness().handler(request({ email: 'staff@example.test', reason: 'Operational need.', redirectTo: 'https://attacker.test' })))).body.error).toBe('INVALID_REDIRECT_ORIGIN')
    expect((await result(await harness().handler(request(' '.repeat(4097))))).body.error).toBe('REQUEST_TOO_LARGE')
  })

  test('returns success only after a new identity and role are persisted', async () => {
    const { handler, calls, operationStore } = harness()
    const response = await result(await handler(request()))
    expect(response).toEqual({ status: 200, body: {
      ok: true, email: 'staff@example.test', role: 'Staff', invited: true, roleAssigned: true,
    } })
    expect(calls.invite).toBe(1)
    expect(calls.upsert).toBe(1)
    expect(calls.upsertValue).toMatchObject({ id: TARGET, role: 'Staff' })
    expect([...operationStore.operations.values()][0].reason).toBe('Add a warehouse operator for daily receiving.')
  })

  test('recovers an existing user without sending another invite', async () => {
    const { handler, calls } = harness({ existingUser: { id: TARGET, email: 'STAFF@example.test' } })
    const response = await result(await handler(request()))
    expect(response.body).toMatchObject({ ok: true, invited: false, roleAssigned: true })
    expect(calls.invite).toBe(0)
    expect(calls.upsert).toBe(1)
  })

  test('never reports success for lookup, identity, invite, or role-write failure', async () => {
    expect((await result(await harness({ listError: true }).handler(request()))).body.error).toBe('IDENTITY_LOOKUP_FAILED')
    expect((await result(await harness({ inviteError: { code: 'provider_down' } }).handler(request()))).body.error).toBe('INVITATION_FAILED')
    expect((await result(await harness({ inviteWithoutId: true }).handler(request()))).body.error).toBe('TARGET_IDENTITY_NOT_FOUND')
    expect((await result(await harness({ upsertError: true }).handler(request()))).body.error).toBe('ROLE_ASSIGNMENT_FAILED')
  })

  test('replays completed results and denies changed-payload, in-progress, and rate-limited claims', async () => {
    const sharedStore = memoryOperationStore()
    const first = harness({ operationStore: sharedStore })
    expect((await result(await first.handler(request()))).body.ok).toBe(true)
    const replay = harness({ operationStore: sharedStore })
    expect((await result(await replay.handler(request()))).body.ok).toBe(true)
    expect(replay.calls.invite).toBe(0)

    const conflict = harness({ operationStore: sharedStore })
    expect((await result(await conflict.handler(request({ email: 'other@example.test', role: 'Staff', reason: 'Add a second receiving operator.' })))).body.error).toBe('IDEMPOTENCY_CONFLICT')

    const fixedStore = (state) => ({ claim: async () => ({ state }), complete: async () => {}, release: async () => {} })
    expect((await result(await harness({ operationStore: fixedStore('in_progress') }).handler(request()))).body.error).toBe('OPERATION_IN_PROGRESS')
    expect((await result(await harness({ operationStore: fixedStore('rate_limited') }).handler(request()))).body.error).toBe('RATE_LIMITED')
  })

  test('concurrent workers cannot execute the same operation twice', async () => {
    const store = memoryOperationStore()
    let releaseInvite
    const inviteGate = new Promise((resolve) => { releaseInvite = resolve })
    const first = harness({ operationStore: store, inviteGate })
    const firstResponse = first.handler(request())
    while (first.calls.invite === 0) await new Promise((resolve) => setTimeout(resolve, 0))
    const second = harness({ operationStore: store })
    expect((await result(await second.handler(request()))).body.error).toBe('OPERATION_IN_PROGRESS')
    expect(second.calls.invite).toBe(0)
    releaseInvite()
    expect((await result(await firstResponse)).body.ok).toBe(true)
  })

  test('releases failed operations so the same key can recover safely', async () => {
    const store = memoryOperationStore()
    expect((await result(await harness({ operationStore: store, upsertError: true }).handler(request()))).body.error).toBe('ROLE_ASSIGNMENT_FAILED')
    expect(store.operations.size).toBe(0)
    expect((await result(await harness({ operationStore: store, existingUser: { id: TARGET, email: 'staff@example.test' } }).handler(request()))).body.ok).toBe(true)
  })

  test('prepared SQL provides a durable serialized receipt and AAL2 role boundary', async () => {
    const [sql, reasonSql] = await Promise.all([
      readFile(new URL('../supabase/migrations/20260814_invite_staff_operation_boundary.sql', import.meta.url), 'utf8'),
      readFile(new URL('../supabase/migrations/20260824_admin_staff_invitation_reason_boundary.sql', import.meta.url), 'utf8'),
    ])
    expect(sql).toContain('k2_private.staff_invitation_operations')
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain("last_attempt_at > now()-interval '5 minutes'")
    expect(sql).toContain("last_attempt_at > now()-interval '10 minutes'")
    expect(sql).toContain("coalesce(auth.jwt()->>'aal', '') <> 'aal2'")
    expect(sql).toContain('p_role::public.user_role')
    expect(sql).not.toContain('set search_path = public')
    expect(sql).toContain('grant execute on function public.claim_staff_invitation_operation')
    expect(sql).not.toContain('grant execute on function public.claim_staff_invitation_operation(uuid,uuid,text) to authenticated')
    expect(reasonSql).toContain('add column if not exists reason text')
    expect(reasonSql).toContain('claim_staff_invitation_operation_v2')
    expect(reasonSql).toContain('char_length(reason) between 3 and 500')
    expect(reasonSql).toMatch(/grant execute on function public\.claim_staff_invitation_operation_v2[\s\S]*to service_role/i)
    expect(reasonSql).not.toMatch(/claim_staff_invitation_operation_v2[\s\S]*to authenticated/i)
  })
})
