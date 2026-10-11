import assert from 'node:assert/strict'
export async function mediaTransportProbe(uid, report, credentials) {
  const { createClient } = await import('@supabase/supabase-js')
  const { randomUUID, createHash } = await import('node:crypto')
  const sharp = (await import('sharp')).default
  const client = createClient('http://127.0.0.1:54395', process.env.SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } })
  const good = (stage, reply) => {
    report.mediaStage = stage
    if (reply.error) report.mediaFailure = {
      status: reply.error.statusCode || reply.error.status || null,
      name: /^[A-Za-z_]{1,80}$/.test(reply.error.name || '') ? reply.error.name : null,
      code: /^[A-Za-z_0-9]{1,80}$/.test(reply.error.code || reply.error.error || '') ? reply.error.code || reply.error.error : null,
    }
    assert.equal(reply.error, null, stage)
    return reply.data
  }
  // The prerequisite logout witness revokes all prior provider sessions.
  const password = good('fresh_media_password', await client.auth.signInWithPassword({ email: credentials.email, password: credentials.password }))
  assert.equal(password.user.id, uid)
  const factor = password.user.factors.find(f => f.factor_type === 'totp' && f.status === 'verified')
  assert.ok(factor)
  const challenge = good('fresh_media_mfa_challenge', await client.auth.mfa.challenge({ factorId: factor.id }))
  good('fresh_media_mfa_verify', await client.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: credentials.totp() }))
  const assurance = good('fresh_media_aal2', await client.auth.mfa.getAuthenticatorAssuranceLevel())
  assert.equal(assurance.currentLevel, 'aal2')
  const bytes = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 23, g: 115, b: 201 } } }).png().toBuffer()
  const hash = data => createHash('sha256').update(data).digest('hex')
  const objectPath = uid + '/' + randomUUID() + '/primary-' + randomUUID() + '.png'
  const bucket = client.storage.from('product-intake-evidence')
  let stored = false
  try {
    report.mediaStage = 'storage_upload'
    good('storage_upload', await bucket.upload(objectPath, bytes, { contentType: 'image/png', upsert: false }))
    stored = true
    const download = good('storage_download', await bucket.download(objectPath))
    const returned = Buffer.from(await download.arrayBuffer())
    assert.equal(hash(returned), hash(bytes))
    const metadata = await sharp(returned).metadata()
    assert.equal(metadata.width, 64)
    assert.equal(metadata.height, 48)
    report.mediaTransport = { uploaded: true, downloaded: true, sha256: hash(bytes), size: bytes.length,
      width: metadata.width, height: metadata.height, scope: 'Genuine local Auth/MFA JWT to actual Storage through unified proxy; no intake registration or browser acceptance' }
  } finally {
    if (stored) {
      const removed = good('storage_remove', await bucket.remove([objectPath]))
      assert.equal(removed.length, 1)
      assert.equal(removed[0].name, objectPath)
      const after = await bucket.download(objectPath)
      assert.ok(after.error, 'removed synthetic object must be unavailable')
      if (report.mediaTransport) report.mediaTransport.removed = true
    }
  }
  report.checks.push('genuine_mfa_actual_storage_image_upload_download_byte_equality_remove')
}
