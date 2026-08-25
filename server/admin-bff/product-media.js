import { authorizeAdminRequest } from './authorize.js'
import { decodeEvidenceImage, readImageBody } from './product-intake.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const HTTPS_URL = /^https:\/\/[^\s\u0000-\u001f\u007f]+$/

function validateMediaItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)
      || Object.keys(item).some((key) => !['url', 'objectPath'].includes(key))) {
    throw new Error('REQUEST_INVALID')
  }
  const url = String(item.url || '')
  const objectPath = item.objectPath === null ? null : String(item.objectPath || '')
  if (!HTTPS_URL.test(url) || url.length > 2048 || (objectPath !== null && objectPath.length > 256)) {
    throw new Error('REQUEST_INVALID')
  }
  return { url, objectPath }
}

export function validateProductMediaAssignment(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !['sku', 'primary', 'lifestyle', 'secondary', 'reason'].includes(key))) {
    throw new Error('REQUEST_INVALID')
  }
  const sku = String(body.sku || '').trim()
  const reason = String(body.reason || '').trim()
  if (!SKU.test(sku) || reason.length < 3 || reason.length > 500
      || !Array.isArray(body.lifestyle) || body.lifestyle.length > 1
      || !Array.isArray(body.secondary) || body.secondary.length > 5) {
    throw new Error('REQUEST_INVALID')
  }
  return {
    sku,
    primary: body.primary === null ? null : validateMediaItem(body.primary),
    lifestyle: body.lifestyle.map(validateMediaItem),
    secondary: body.secondary.map(validateMediaItem),
    reason,
  }
}

export function validateProductMediaOrphanCleanup(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !['objectPaths', 'reason'].includes(key))
      || !Array.isArray(body.objectPaths) || body.objectPaths.length < 1 || body.objectPaths.length > 25) {
    throw new Error('REQUEST_INVALID')
  }
  const reason = String(body.reason || '').trim()
  const objectPaths = body.objectPaths.map((path) => String(path || ''))
  if (reason.length < 3 || reason.length > 500 || new Set(objectPaths).size !== objectPaths.length
      || objectPaths.some((path) => path.length > 256 || !/^[0-9a-f-]{36}\/product-media\/[0-9a-f-]{36}-[0-9a-f]{16}\.(jpg|png|webp)$/i.test(path))) {
    throw new Error('REQUEST_INVALID')
  }
  return { objectPaths: [...objectPaths].sort(), reason }
}

function validateOwnedObjectUrls(client, actorId, payload) {
  for (const item of [payload.primary, ...payload.lifestyle, ...payload.secondary].filter(Boolean)) {
    if (item.objectPath === null) continue
    const expectedPrefix = `${actorId}/product-media/`
    if (!item.objectPath.startsWith(expectedPrefix)) throw new Error('REQUEST_INVALID')
    const { data } = client.storage.from('product-images').getPublicUrl(item.objectPath)
    if (!data?.publicUrl || data.publicUrl !== item.url) throw new Error('REQUEST_INVALID')
  }
}

export async function handleProductMediaUpload(req, res) {
  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  }
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  const declaredType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
  if (!UUID.test(idempotencyKey) || !['image/jpeg', 'image/png', 'image/webp'].includes(declaredType)) {
    return safeJson(res, 400, { error: { code: 'PRODUCT_MEDIA_FILE_INVALID' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined

  try {
    const decoded = await decodeEvidenceImage(await readImageBody(req), declaredType)
    const path = `${authorized.identity.userId}/product-media/${idempotencyKey}-${decoded.sha256.slice(0, 16)}.${decoded.extension}`
    const upload = await authorized.client.storage.from('product-images').upload(path, decoded.buffer, {
      contentType: decoded.type,
      cacheControl: '31536000',
      upsert: true,
    })
    if (upload.error) {
      return safeJson(res, 503, { error: { code: 'PRODUCT_MEDIA_UPLOAD_UNAVAILABLE' } })
    }
    const payload = {
      objectPath: path,
      contentType: decoded.type,
      size: decoded.buffer.length,
      width: decoded.width,
      height: decoded.height,
      sha256: decoded.sha256,
    }
    const signed = signedAdminCommandArguments(
      'product_media_upload', authorized.identity.userId, idempotencyKey, payload,
    )
    const command = await authorized.client.rpc('execute_admin_product_media_command_v1', signed)
    if (command.error) {
      const providerCode = String(command.error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) {
        return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      }
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) {
        await authorized.client.storage.from('product-images').remove([path])
        return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      }
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) {
        return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      }
      return safeJson(res, 503, { error: { code: 'PRODUCT_MEDIA_REGISTER_UNAVAILABLE' } })
    }
    const { data: publicData } = authorized.client.storage.from('product-images').getPublicUrl(path)
    if (!publicData?.publicUrl) {
      return safeJson(res, 503, { error: { code: 'PRODUCT_MEDIA_REGISTER_UNAVAILABLE' } })
    }
    return safeJson(res, 200, {
      ok: true,
      media: { ...command.data, publicUrl: publicData.publicUrl },
    })
  } catch (error) {
    const invalid = error?.message === 'EVIDENCE_FILE_INVALID'
      || /corrupt|invalid|unsupported|decode|Input buffer/i.test(String(error?.message || ''))
    return safeJson(res, invalid ? 400 : 503, {
      error: { code: invalid ? 'PRODUCT_MEDIA_FILE_INVALID' : 'PRODUCT_MEDIA_UPLOAD_UNAVAILABLE' },
    })
  }
}

export async function handleProductMediaAssignment(req, res) {
  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  }
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateProductMediaAssignment(await readJson(req))
    validateOwnedObjectUrls(authorized.client, authorized.identity.userId, payload)
    const signed = signedAdminCommandArguments(
      'product_media_assign', authorized.identity.userId, idempotencyKey, payload,
    )
    const command = await authorized.client.rpc('execute_admin_product_media_assignment_v1', signed)
    if (command.error) {
      const code = String(command.error.message || '')
      if (code.includes('K2_ADMIN_RATE_LIMITED')) {
        return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      }
      if (code.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) {
        return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      }
      if (code.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) {
        return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      }
      if (code.includes('K2_ADMIN_PRODUCT_NOT_FOUND')) {
        return safeJson(res, 404, { error: { code: 'PRODUCT_NOT_FOUND' } })
      }
      if (code.includes('K2_ADMIN_MEDIA_PRIMARY_REQUIRED')) {
        return safeJson(res, 409, { error: { code: 'PRODUCT_MEDIA_PRIMARY_REQUIRED' } })
      }
      if (code.includes('K2_ADMIN_MEDIA_UNREGISTERED') || code.includes('K2_ADMIN_MEDIA_ASSIGNMENT_INVALID')) {
        return safeJson(res, 400, { error: { code: 'PRODUCT_MEDIA_ASSIGNMENT_INVALID' } })
      }
      return safeJson(res, 503, { error: { code: 'PRODUCT_MEDIA_ASSIGNMENT_UNAVAILABLE' } })
    }
    const cleanupPaths = Array.isArray(command.data?.cleanupPaths)
      ? command.data.cleanupPaths.filter((path) => typeof path === 'string' && path.length <= 256)
      : []
    let cleanupPending = cleanupPaths.length > 0
    if (cleanupPending) {
      const removal = await authorized.client.storage.from('product-images').remove(cleanupPaths)
      if (!removal.error) {
        const cleanupPayload = { assignmentRequestId: idempotencyKey, objectPaths: [...cleanupPaths].sort() }
        const cleanupSigned = signedAdminCommandArguments(
          'product_media_cleanup_complete', authorized.identity.userId, idempotencyKey, cleanupPayload,
        )
        const completion = await authorized.client.rpc('complete_admin_product_media_cleanup_v1', cleanupSigned)
        cleanupPending = Boolean(completion.error)
      }
    }
    return safeJson(res, 200, {
      ok: true,
      result: command.data,
      cleanupPending,
    })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'PRODUCT_MEDIA_ASSIGNMENT_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'PRODUCT_MEDIA_ASSIGNMENT_UNAVAILABLE' } })
  }
}

export async function handleProductMediaOrphans(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  }
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (req.method === 'POST' && !UUID.test(idempotencyKey)) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (authorized.identity.role !== 'Admin') {
    return safeJson(res, 403, { error: { code: 'PRODUCT_MEDIA_ADMIN_REQUIRED' } })
  }
  if (req.method === 'GET') {
    const rawAge = Array.isArray(req.query?.minimumAgeMinutes)
      ? req.query.minimumAgeMinutes[0] : req.query?.minimumAgeMinutes
    const minimumAgeMinutes = rawAge === undefined ? 60 : Number(rawAge)
    if (!Number.isInteger(minimumAgeMinutes) || minimumAgeMinutes < 60 || minimumAgeMinutes > 10080) {
      return safeJson(res, 400, { error: { code: 'PRODUCT_MEDIA_ORPHAN_RANGE_INVALID' } })
    }
    const result = await authorized.client.rpc('read_admin_product_media_orphans_v1', {
      p_minimum_age_minutes: minimumAgeMinutes,
    })
    if (result.error || !result.data) {
      return safeJson(res, 503, { error: { code: 'PRODUCT_MEDIA_ORPHAN_REVIEW_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, review: result.data })
  }
  try {
    const payload = validateProductMediaOrphanCleanup(await readJson(req))
    const signed = signedAdminCommandArguments(
      'product_media_orphan_cleanup', authorized.identity.userId, idempotencyKey, payload,
    )
    const prepared = await authorized.client.rpc('prepare_admin_product_media_orphan_cleanup_v1', signed)
    if (prepared.error || !Array.isArray(prepared.data?.objectPaths)) {
      const code = String(prepared.error?.message || '')
      if (code.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (code.includes('K2_ADMIN_MEDIA_ORPHAN_INVALID')) return safeJson(res, 409, { error: { code: 'PRODUCT_MEDIA_ORPHAN_CHANGED' } })
      return safeJson(res, 503, { error: { code: 'PRODUCT_MEDIA_ORPHAN_CLEANUP_UNAVAILABLE' } })
    }
    const objectPaths = prepared.data.objectPaths
    const removal = await authorized.client.storage.from('product-images').remove(objectPaths)
    if (removal.error) return safeJson(res, 200, { ok: true, cleanupPending: true, objectPaths })
    const completionPayload = { objectPaths: [...objectPaths].sort() }
    const completion = await authorized.client.rpc(
      'complete_admin_product_media_orphan_cleanup_v1',
      signedAdminCommandArguments(
        'product_media_orphan_cleanup_complete', authorized.identity.userId, idempotencyKey, completionPayload,
      ),
    )
    return safeJson(res, 200, {
      ok: true,
      cleanupPending: Boolean(completion.error),
      objectPaths,
    })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'PRODUCT_MEDIA_ORPHAN_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'PRODUCT_MEDIA_ORPHAN_CLEANUP_UNAVAILABLE' } })
  }
}
