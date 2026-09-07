import { createHash } from 'node:crypto'
import { decodeEvidenceImage } from './product-intake.js'
import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { generateIntakeContent, generateIntakeImage, intakeAiReadiness, INTAKE_AI_VERSION } from './intake-ai-provider.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RPC = 'execute_admin_intake_ai_v1'
const ERROR_CODES = new Set(['AI_NOT_CONFIGURED', 'AI_BUDGET_BLOCKED', 'AI_EVIDENCE_REQUIRED', 'AI_REVIEW_REQUIRED', 'AI_JOB_CONFLICT', 'AI_JOB_UNAVAILABLE', 'AI_PROVIDER_REFUSED', 'AI_PROVIDER_REJECTED', 'AI_PROVIDER_TIMEOUT', 'AI_PROVIDER_UNCERTAIN', 'AI_OUTPUT_INVALID', 'AI_IMAGE_INPUT_INVALID'])
function safeCode(error) {
  return [...ERROR_CODES].find(code => String(error?.message || '').includes(code)) || 'AI_JOB_UNAVAILABLE'
}
async function command(client, actor, requestId, action, payload, sign = signedAdminCommandArguments) {
  const response = await client.rpc(RPC, sign(`intake_ai_${action}`, actor, requestId, payload))
  if (response.error || !response.data) throw new Error(safeCode(response.error))
  return response.data
}

export async function attachIntakeAiCandidate({ client, identity, requestId, input }) {
  const state = await command(client, identity.userId, requestId, 'read', { sessionId: input.sessionId })
  const job = (await command(client, identity.userId, requestId, 'candidate', { sessionId: input.sessionId, jobId: input.jobId })).job
  if (!job || job.decision !== 'accepted' || !job.result?.image || !state.productId) throw new Error('AI_REVIEW_REQUIRED')
  if (job.attachment_result) return job
  const decoded = await decodeEvidenceImage(Buffer.from(job.result.image, 'base64'), 'image/png')
  const path = `${identity.userId}/product-media/${job.id}-${decoded.sha256.slice(0, 16)}.png`
  const bucket = client.storage.from('product-images')
  const uploaded = await bucket.upload(path, decoded.buffer, { contentType: 'image/png', upsert: true, cacheControl: '31536000' })
  if (uploaded.error) throw new Error('AI_JOB_UNAVAILABLE')
  const registered = await client.rpc('execute_admin_product_media_command_v1', signedAdminCommandArguments('product_media_upload', identity.userId, job.id, {
    objectPath: path, contentType: 'image/png', size: decoded.buffer.length, width: decoded.width, height: decoded.height, sha256: decoded.sha256,
  }))
  if (registered.error) throw new Error('AI_JOB_UNAVAILABLE')
  const product = await client.from('products').select('sku,primary_image_url,lifestyle_images,secondary_images').eq('id', state.productId).single()
  if (product.error || !product.data) throw new Error('AI_JOB_UNAVAILABLE')
  const current = product.data
  const url = bucket.getPublicUrl(path).data?.publicUrl
  if (!url?.startsWith('https://')) throw new Error('AI_JOB_UNAVAILABLE')
  const existing = value => ({ url: value, objectPath: null })
  const assignment = {
    sku: current.sku,
    primary: job.kind === 'PRIMARY' ? { url, objectPath: path } : current.primary_image_url ? existing(current.primary_image_url) : null,
    lifestyle: job.kind === 'AFTER' ? [{ url, objectPath: path }] : (current.lifestyle_images || []).map(existing),
    secondary: (current.secondary_images || []).map(existing),
    reason: `Reviewed intake ${job.id}: ${job.review_reason}`.slice(0, 500),
  }
  const signedAssignment = signedAdminCommandArguments('product_media_assign', identity.userId, job.id, assignment)
  return (await command(client, identity.userId, requestId, 'attach', { sessionId: input.sessionId, jobId: job.id, before: current, assignment: signedAssignment })).job
}

export async function runIntakeAiJob({ client, identity, requestId, input }, dependencies = {}) {
  const sign = dependencies.sign || signedAdminCommandArguments
  const claim = await command(client, identity.userId, requestId, 'claim', { ...input, version: INTAKE_AI_VERSION }, sign)
  if (!claim.dispatch) return claim.job
  // This claim is committed before crossing the paid boundary. No recovery path
  // re-dispatches an existing job, including one whose completion was lost.
  const started = Date.now()
  let result
  let failure = null
  try {
    const images = []
    for (const evidence of claim.evidence) {
      if (!['PRIMARY', 'BACK', 'BARCODE'].includes(evidence.slot)
          || !evidence.path.startsWith(`${identity.userId}/${input.sessionId}/`)
          || !/^[a-f0-9]{64}$/.test(evidence.sha256)) throw new Error('AI_EVIDENCE_REQUIRED')
      const download = await client.storage.from('product-intake-evidence').download(evidence.path)
      if (download.error || !download.data || download.data.size > 4 * 1024 * 1024) throw new Error('AI_EVIDENCE_REQUIRED')
      const data = Buffer.from(await download.data.arrayBuffer())
      if (createHash('sha256').update(data).digest('hex') !== evidence.sha256) throw new Error('AI_EVIDENCE_REQUIRED')
      images.push({ data, slot: evidence.slot, mime: evidence.type })
    }
    if (input.kind === 'content') {
      result = await (dependencies.generateContent || generateIntakeContent)({ images })
    } else {
      const image = await (dependencies.generateImage || generateIntakeImage)({ image: images.find(item => item.slot === 'PRIMARY'), slot: input.kind, brief: claim.job.brief })
      result = { image: image.data.toString('base64'), usage: image.usage }
    }
  } catch (error) { failure = safeCode(error) }
  // Completion retries are safe, but deliberately never retry the provider.
  const completion = { sessionId: input.sessionId, jobId: claim.job.id, result: result || null, failure, latencyMs: Date.now() - started }
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return (await command(client, identity.userId, requestId, 'complete', completion, sign)).job } catch { /* recover by reading the durable job */ }
  }
  throw new Error('AI_JOB_UNAVAILABLE')
}

export async function handleIntakeAi(req, res) {
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  const requestId = String(req.headers['x-k2-idempotency-key'] || '')
  if (!UUID.test(requestId)) return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
  try {
    const input = await readJson(req)
    if (!input || Array.isArray(input) || !UUID.test(input.sessionId)
        || Object.keys(input).some(key => !['sessionId', 'action', 'kind', 'confirmation', 'brief', 'jobId', 'decision', 'reason'].includes(key))) throw new Error('REQUEST_INVALID')
    if (input.action === 'read') {
      const state = await command(authorized.client, authorized.identity.userId, requestId, 'read', { sessionId: input.sessionId })
      const readiness = intakeAiReadiness()
      if (!state.budget.ready) { readiness.ready = false; readiness.missing.push('Owner budget/model approval is missing or the spending cap is reached.') }
      return safeJson(res, 200, { ok: true, data: { ...state, readiness } })
    }
    if (input.action === 'start') {
      if (!intakeAiReadiness().ready) throw new Error('AI_NOT_CONFIGURED')
      if (!['content', 'PRIMARY', 'AFTER'].includes(input.kind) || input.confirmation !== 'CONFIRM_PAID_INTAKE') throw new Error('REQUEST_INVALID')
      const job = await runIntakeAiJob({ ...authorized, requestId, input: { sessionId: input.sessionId, kind: input.kind, confirmation: input.confirmation, brief: input.brief || '' } })
      return safeJson(res, 200, { ok: true, data: { job } })
    }
    if (input.action === 'review') {
      if (!UUID.test(input.jobId) || !['accepted', 'rejected'].includes(input.decision) || typeof input.reason !== 'string' || input.reason.trim().length < 8 || input.reason.length > 500) throw new Error('REQUEST_INVALID')
      const result = await command(authorized.client, authorized.identity.userId, requestId, 'review', { sessionId: input.sessionId, jobId: input.jobId, decision: input.decision, reason: input.reason.trim() })
      return safeJson(res, 200, { ok: true, data: result })
    }
    if (input.action === 'candidate' && UUID.test(input.jobId)) {
      const data = await command(authorized.client, authorized.identity.userId, requestId, 'candidate', { sessionId: input.sessionId, jobId: input.jobId })
      return safeJson(res, 200, { ok: true, data })
    }
    if (input.action === 'attach' && UUID.test(input.jobId)) {
      const job = await attachIntakeAiCandidate({ ...authorized, requestId, input })
      return safeJson(res, 200, { ok: true, data: { job } })
    }
    throw new Error('REQUEST_INVALID')
  } catch (error) {
    const invalid = ['REQUEST_INVALID', 'BODY_TOO_LARGE', 'INVALID_JSON', 'JSON_REQUIRED'].includes(error?.message)
    return safeJson(res, invalid ? 400 : 503, { error: { code: invalid ? 'REQUEST_INVALID' : safeCode(error) } })
  }
}
