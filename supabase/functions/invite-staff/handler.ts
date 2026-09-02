const MAX_REQUEST_BYTES = 4096
const MAX_REDIRECT_LENGTH = 2048
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const LOCAL_ORIGINS = [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
  'http://localhost:5180', 'http://127.0.0.1:5180',
]

class InviteStaffError extends Error {
  constructor(public code: string, public status: number) {
    super(code)
  }
}

function jsonResponse(body: Record<string, unknown>, status: number, origin = '', correlationId = '') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }
  if (correlationId) headers['X-Correlation-ID'] = correlationId
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers.Vary = 'Origin'
  }
  return new Response(JSON.stringify(body), { status, headers })
}

function corsHeaders(origin: string, correlationId: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'X-Correlation-ID': correlationId,
    'Vary': 'Origin',
  }
}

export function resolveAllowedOrigins(env: Record<string, string | undefined>) {
  const configured = (env.K2_ADMIN_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
  const origins = new Set<string>()
  for (const value of configured) {
    try {
      const parsed = new URL(value)
      if (parsed.origin !== value || !['https:', 'http:'].includes(parsed.protocol)) return null
      origins.add(parsed.origin)
    } catch {
      return null
    }
  }
  if (env.K2_EDGE_ALLOW_LOCALHOST === 'true') LOCAL_ORIGINS.forEach((origin) => origins.add(origin))
  return origins.size > 0 ? origins : null
}

// Reads the `aal` claim from an access token that has ALREADY been validated by
// auth.getUser(). This never establishes trust on its own; it only reads a claim
// from a token whose signature and expiry the auth server just confirmed.
export function readAssuranceClaim(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
    const claim = JSON.parse(json)?.aal
    return typeof claim === 'string' ? claim : null
  } catch {
    return null
  }
}

async function payloadHash(payload: Record<string, unknown>) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function parseBody(req: Request) {
  const declaredLength = Number(req.headers.get('Content-Length') || '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new InviteStaffError('REQUEST_TOO_LARGE', 413)
  }
  const raw = await req.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
    throw new InviteStaffError('REQUEST_TOO_LARGE', 413)
  }
  let body: unknown
  try { body = JSON.parse(raw) } catch { throw new InviteStaffError('INVALID_JSON', 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new InviteStaffError('INVALID_REQUEST_BODY', 400)
  }
  const record = body as Record<string, unknown>
  const allowedFields = new Set(['email', 'role', 'reason', 'redirectTo'])
  if (Object.keys(record).some((key) => !allowedFields.has(key))) {
    throw new InviteStaffError('UNKNOWN_REQUEST_FIELD', 400)
  }
  return record
}

async function findAuthUserByEmail(adminClient: any, email: string) {
  const perPage = 1000
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw new InviteStaffError('IDENTITY_LOOKUP_FAILED', 502)
    const users = Array.isArray(data?.users) ? data.users : []
    const match = users.find((user: any) => user?.email?.trim().toLowerCase() === email)
    if (match?.id) return match
    if (users.length < perPage || !data?.nextPage) return null
  }
  throw new InviteStaffError('IDENTITY_LOOKUP_LIMIT', 503)
}

function isExistingUserError(error: any) {
  const code = String(error?.code ?? '').toLowerCase()
  const message = String(error?.message ?? '').toLowerCase()
  return ['email_exists', 'user_already_exists'].includes(code) || /already.+(registered|exists)/.test(message)
}

export function createInviteStaffHandler(dependencies: {
  env: Record<string, string | undefined>
  createCallerClient: (authorization: string) => any
  createAdminClient: () => any
  operationStore: {
    claim: (actorId: string, key: string, hash: string, reason: string) => Promise<any>
    complete: (actorId: string, key: string, hash: string, result: Record<string, unknown>) => Promise<void>
    release: (actorId: string, key: string, hash: string) => Promise<void>
  }
  logger?: { error: (event: string, detail: Record<string, unknown>) => void }
  randomUUID?: () => string
  configured?: boolean
}) {
  const logger = dependencies.logger ?? { error: () => undefined }
  const randomUUID = dependencies.randomUUID ?? (() => crypto.randomUUID())

  return async function inviteStaffHandler(req: Request) {
    const correlationId = randomUUID()
    const origin = (req.headers.get('Origin') ?? '').trim()
    const allowedOrigins = resolveAllowedOrigins(dependencies.env)
    if (!allowedOrigins) {
      logger.error('invite_staff_configuration_error', { correlationId, code: 'ADMIN_ORIGINS_MISSING' })
      return jsonResponse({ ok: false, error: 'SERVER_CONFIGURATION_ERROR', correlationId }, 500, '', correlationId)
    }
    if (dependencies.configured === false) {
      logger.error('invite_staff_configuration_error', { correlationId, code: 'SUPABASE_KEYS_MISSING' })
      return jsonResponse({ ok: false, error: 'SERVER_CONFIGURATION_ERROR', correlationId }, 500, '', correlationId)
    }
    if (!origin || !allowedOrigins.has(origin)) {
      return req.method === 'OPTIONS'
        ? new Response(null, { status: 403, headers: { 'X-Correlation-ID': correlationId } })
        : jsonResponse({ ok: false, error: 'FORBIDDEN_ORIGIN', correlationId }, 403, '', correlationId)
    }
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin, correlationId) })
    if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED', correlationId }, 405, origin, correlationId)

    const authorization = req.headers.get('Authorization') ?? ''
    if (!authorization.startsWith('Bearer ')) {
      return jsonResponse({ ok: false, error: 'NOT_AUTHENTICATED', correlationId }, 401, origin, correlationId)
    }
    const operationKey = (req.headers.get('X-Idempotency-Key') ?? '').trim()
    if (!UUID_PATTERN.test(operationKey)) {
      return jsonResponse({ ok: false, error: 'INVALID_IDEMPOTENCY_KEY', correlationId }, 400, origin, correlationId)
    }

    let actorId = ''
    let operationHash = ''
    let operationClaimed = false
    try {
      const accessToken = authorization.slice('Bearer '.length).trim()
      const callerClient = dependencies.createCallerClient(authorization)
      const { data: userData, error: userError } = await callerClient.auth.getUser(accessToken)
      actorId = userData?.user?.id ?? ''
      if (userError || !actorId) throw new InviteStaffError('INVALID_SESSION', 401)

      // The caller client carries the session only as a request header; it has no
      // persisted session. getAuthenticatorAssuranceLevel() must therefore be given
      // the access token explicitly, otherwise it falls back to getSession(), finds
      // nothing, and reports currentLevel null for every caller — including a real
      // AAL2 admin. The token's own aal claim is the authoritative gate because
      // getUser() above already validated this exact token against the auth server.
      const claimedAal = readAssuranceClaim(accessToken)
      const { data: assurance, error: assuranceError } = await callerClient.auth.mfa
        .getAuthenticatorAssuranceLevel(accessToken)
      if (assuranceError) throw new InviteStaffError('AAL2_REQUIRED', 403)
      if (claimedAal !== 'aal2') throw new InviteStaffError('AAL2_REQUIRED', 403)
      const reportedAal = assurance?.currentLevel ?? null
      if (reportedAal !== null && reportedAal !== 'aal2') throw new InviteStaffError('AAL2_REQUIRED', 403)

      const adminClient = dependencies.createAdminClient()
      const { data: profile, error: profileError } = await adminClient.from('user_profiles').select('role').eq('id', actorId).single()
      if (profileError || !['Admin', 'SuperAdmin'].includes(profile?.role)) throw new InviteStaffError('FORBIDDEN_ROLE', 403)

      const body = await parseBody(req)
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) throw new InviteStaffError('INVALID_EMAIL', 400)
      const role = typeof body.role === 'string' ? body.role : 'Staff'
      if (!['Admin', 'Staff', 'Customer'].includes(role)) throw new InviteStaffError('INVALID_ROLE', 400)
      const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
      if (reason.length < 3 || reason.length > 500) throw new InviteStaffError('INVALID_REASON', 400)

      let redirectTo: string | undefined
      if (body.redirectTo !== undefined) {
        if (typeof body.redirectTo !== 'string' || body.redirectTo.length > MAX_REDIRECT_LENGTH) {
          throw new InviteStaffError('INVALID_REDIRECT_URL', 400)
        }
        let parsed: URL
        try { parsed = new URL(body.redirectTo) } catch { throw new InviteStaffError('INVALID_REDIRECT_URL', 400) }
        if (!allowedOrigins.has(parsed.origin)) throw new InviteStaffError('INVALID_REDIRECT_ORIGIN', 400)
        redirectTo = parsed.toString()
      }

      operationHash = await payloadHash({ email, role, reason, redirectTo: redirectTo ?? null })
      let claim: any
      try {
        claim = await dependencies.operationStore.claim(actorId, operationKey, operationHash, reason)
      } catch {
        throw new InviteStaffError('OPERATION_STORE_FAILED', 503)
      }
      if (claim?.state === 'completed') return jsonResponse(claim.result, 200, origin, correlationId)
      if (claim?.state === 'conflict') throw new InviteStaffError('IDEMPOTENCY_CONFLICT', 409)
      if (claim?.state === 'in_progress') throw new InviteStaffError('OPERATION_IN_PROGRESS', 409)
      if (claim?.state === 'rate_limited') throw new InviteStaffError('RATE_LIMITED', 429)
      if (claim?.state !== 'claimed') throw new InviteStaffError('OPERATION_STORE_FAILED', 503)
      operationClaimed = true

      let target = await findAuthUserByEmail(adminClient, email)
      let invited = false
      if (!target) {
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo })
        if (inviteError && !isExistingUserError(inviteError)) throw new InviteStaffError('INVITATION_FAILED', 502)
        invited = !inviteError
        target = inviteData?.user?.id ? inviteData.user : await findAuthUserByEmail(adminClient, email)
      }
      if (!target?.id) throw new InviteStaffError('TARGET_IDENTITY_NOT_FOUND', 502)

      const { data: assignedProfile, error: roleError } = await adminClient.from('user_profiles').upsert(
        { id: target.id, email, role }, { onConflict: 'id' },
      ).select('id,role').single()
      if (roleError || assignedProfile?.id !== target.id || assignedProfile?.role !== role) {
        throw new InviteStaffError('ROLE_ASSIGNMENT_FAILED', 500)
      }

      const result = { ok: true, email, role, invited, roleAssigned: true }
      try {
        await dependencies.operationStore.complete(actorId, operationKey, operationHash, result)
      } catch {
        await dependencies.operationStore.release(actorId, operationKey, operationHash).catch(() => undefined)
        throw new InviteStaffError('OPERATION_STORE_FAILED', 503)
      }
      return jsonResponse(result, 200, origin, correlationId)
    } catch (error) {
      if (operationClaimed) {
        await dependencies.operationStore.release(actorId, operationKey, operationHash).catch(() => undefined)
      }
      const known = error instanceof InviteStaffError ? error : new InviteStaffError('INTERNAL_ERROR', 500)
      logger.error('invite_staff_request_failed', { correlationId, code: known.code, status: known.status })
      return jsonResponse({ ok: false, error: known.code, correlationId }, known.status, origin, correlationId)
    }
  }
}
