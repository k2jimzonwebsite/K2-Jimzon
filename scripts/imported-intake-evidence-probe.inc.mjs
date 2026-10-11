// MAP-018 / IDEA-20261009-11. Disposable local fixture only; no provider credentials.
import assert from 'node:assert/strict'
import { randomUUID, createHash, createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { decodeEvidenceImage } from '../server/admin-bff/product-intake.js'
import { readActiveSession } from '../server/admin-bff/security.js'
import { createServerSupabase, restoreAuthSession } from '../server/admin-bff/supabase.js'

export async function intakeEvidenceProbe(uid, report, credentials, request, jar) {
  assert.equal(process.env.SUPABASE_URL, 'http://127.0.0.1:54395')
  const requestId = randomUUID(), key = randomUUID(), paths = []
  const good = (stage, reply) => {
    report.intakeStage = stage
    if (reply.error) report.intakeFailure = { code: reply.error.code || null, status: reply.error.status || null }
    assert.equal(reply.error, null, stage)
    return reply.data
  }
  const expect = (stage, reply, status = 200) => {
    report.intakeStage = stage
    report.intakeReply = { status: reply.status, code: reply.data.error?.code || reply.data.code || 'success' }
    assert.equal(reply.status, status, stage)
    return reply.data
  }
  // Prior logout proof revokes the old provider and registry sessions.
  expect('fresh_intake_login', await request('auth/login', 'POST', {
    email: credentials.email, password: credentials.password, botToken: 'local-unconfigured-fixture-token',
  }), 202)
  const identity = expect('fresh_intake_mfa', await request('auth/mfa', 'POST', { code: credentials.totp() })).user
  assert.equal(identity.userId, uid)
  assert.equal(identity.role, 'Admin')
  const session = readActiveSession({ headers: { cookie: [...jar].map(([k, v]) => k + '=' + v).join('; ') } })
  const client = createServerSupabase()
  assert.equal((await restoreAuthSession(client, session)).user.id, uid)
  assert.equal(good('current_intake_aal2', await client.auth.mfa.getAuthenticatorAssuranceLevel()).currentLevel, 'aal2')
  // Publicly known, owned fixture signer; it never comes from .env.local.
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = encoded({ alg: 'HS256', typ: 'JWT' }) + '.' + encoded({ role: 'service_role', iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })
  const jwt = unsigned + '.' + createHmac('sha256', 'synthetic-local-startup-only-secret-20261010').update(unsigned).digest('base64url')
  const cleanup = createClient(process.env.SUPABASE_URL, jwt, { auth: { persistSession: false, autoRefreshToken: false } })
  const bucket = client.storage.from('product-intake-evidence')
  const body = { requestId, barcode: null, scannedIdentity: 'MAP018 synthetic packaging evidence' }
  const headers = { 'x-k2-idempotency-key': key }
  let sessionId
  try {
    const before = good('synthetic_session_absent', await cleanup.from('product_intake_sessions').select('id').eq('created_by', uid).eq('request_id', requestId))
    assert.deepEqual(before, [])
    const created = expect('intake_session_create', await request('product-intake/session', 'POST', body, { headers })).result
    sessionId = created.sessionId
    assert.match(sessionId, /^[0-9a-f-]{36}$/i)
    assert.equal(created.requestId, requestId)
    assert.deepEqual(expect('intake_session_replay', await request('product-intake/session', 'POST', body, { headers })).result, created)
    report.intakeEvidence = { sessionId, requestId, created: true, sessionReplay: true, images: [] }
    for (const [index, slot] of ['PRIMARY', 'BACK', 'BARCODE'].entries()) {
      const bytes = await sharp({ create: { width: 160, height: 120, channels: 3, background: { r: 23 + index, g: 115, b: 201 } } }).png().toBuffer()
      const decoded = await decodeEvidenceImage(bytes, 'image/png')
      const imageKey = randomUUID(), fileName = slot.toLowerCase() + '.png'
      const objectPath = `${uid}/${sessionId}/${slot.toLowerCase()}-${imageKey}-${decoded.sha256.slice(0, 16)}.${decoded.extension}`
      paths.push(objectPath) // Known before dispatch, including an unknown reply.
      const imageHeaders = { 'content-type': 'image/png', 'x-k2-idempotency-key': imageKey,
        'x-k2-intake-session': sessionId, 'x-k2-evidence-slot': slot, 'x-k2-file-name': fileName }
      const result = expect(slot + '_register', await request('product-intake/evidence', 'POST', bytes, { headers: imageHeaders })).result
      const expected = { sessionId, slot, path: objectPath, size: decoded.buffer.length, type: decoded.type,
        width: decoded.width, height: decoded.height, sha256: decoded.sha256, uploadStatus: 'uploaded' }
      assert.deepEqual(result, expected)
      assert.deepEqual(expect(slot + '_replay', await request('product-intake/evidence', 'POST', bytes, { headers: imageHeaders })).result, expected)
      const conflict = expect(slot + '_filename_conflict', await request('product-intake/evidence', 'POST', bytes,
        { headers: { ...imageHeaders, 'x-k2-file-name': 'changed.png' } }), 409)
      assert.equal(conflict.error.code, 'IDEMPOTENCY_CONFLICT')
      const blob = good(slot + '_retained_download', await bucket.download(objectPath))
      const downloaded = Buffer.from(await blob.arrayBuffer())
      assert.equal(createHash('sha256').update(downloaded).digest('hex'), decoded.sha256)
      assert.deepEqual(downloaded, decoded.buffer)
      report.intakeEvidence.images.push({ ...expected, fileName, exactReplay: true, filenameConflict: true, retainedDownload: true })
    }
    const saved = expect('intake_session_readback', await request('product-intake/session?sessionId=' + sessionId)).data.session
    assert.equal(saved.created_by, uid)
    assert.equal(saved.request_id, requestId)
    assert.equal(saved.packaging_images.length, 3)
    for (const image of report.intakeEvidence.images) {
      const row = saved.packaging_images.find(r => r.slot === image.slot)
      for (const field of ['path', 'size', 'type', 'width', 'height', 'sha256']) assert.equal(row[field], image[field])
      assert.equal(row.name, image.fileName)
      assert.equal(row.upload_status, 'uploaded')
    }
    report.intakeEvidence.protectedReadback = true
  } finally {
    // Delete only this fixture actor/request before its Auth FK is hard-deleted.
    const removed = good('synthetic_session_cleanup', await cleanup.from('product_intake_sessions').delete().eq('created_by', uid).eq('request_id', requestId).select('id'))
    if (sessionId) assert.deepEqual(removed, [{ id: sessionId }])
    assert.deepEqual(good('synthetic_session_cleanup_readback', await cleanup.from('product_intake_sessions').select('id').eq('created_by', uid).eq('request_id', requestId)), [])
    if (paths.length) {
      good('synthetic_media_cleanup', await bucket.remove(paths))
      for (const objectPath of paths) assert.ok((await bucket.download(objectPath)).error)
    }
    if (report.intakeEvidence) report.intakeEvidence.disposableCleanup = true
  }
  report.checks.push('genuine_bff_intake_three_binary_images_replay_conflict_retention_readback_cleanup')
}
