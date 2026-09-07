import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

test('accepted candidate uses existing signed media registration and attachment without provider calls', async () => {
  const { attachIntakeAiCandidate } = await import('../server/admin-bff/intake-ai-jobs.js')
  const previous = process.env.K2_ADMIN_BFF_REQUEST_SECRET
  process.env.K2_ADMIN_BFF_REQUEST_SECRET = Buffer.alloc(32, 5).toString('base64')
  try {
    const job = { id: '9dc82fd0-a075-4534-881e-929034c6f756', kind: 'PRIMARY', decision: 'accepted', review_reason: 'Package fidelity and rights checked', result: { image: (await sharp({ create: { width: 1024, height: 1024, channels: 3, background: 'white' } }).png().toBuffer()).toString('base64') } }
    const calls = []; let uploads = 0
    const client = {
      rpc: async (name, args) => {
        calls.push([name, args.p_action, JSON.parse(args.p_payload_text)])
        if (args.p_action === 'intake_ai_read') return { data: { productId: 'product', jobs: [job] } }
        if (args.p_action === 'intake_ai_candidate') return { data: { job } }
        if (args.p_action === 'product_media_upload') return { data: {} }
        if (args.p_action === 'intake_ai_attach') { job.attachment_result = { receipt: true }; return { data: { job } } }
        throw new Error('unexpected command')
      },
      storage: { from: () => ({ upload: async () => { uploads++; return {} }, getPublicUrl: path => ({ data: { publicUrl: `https://fixture.supabase.co/storage/v1/object/public/product-images/${path}` } }) }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { sku: 'K2-FIXTURE', primary_image_url: null, lifestyle_images: ['https://fixture.invalid/existing.png'], secondary_images: [] } }) }) }) }),
    }
    const args = { client, identity: { userId: 'actor' }, requestId: 'request', input: { sessionId: 'session', jobId: job.id } }
    await attachIntakeAiCandidate(args)
    await attachIntakeAiCandidate(args)
    expect(uploads).toBe(1)
    const attached = calls.find(([, action]) => action === 'intake_ai_attach')[2]
    expect(JSON.parse(attached.assignment.p_payload_text).lifestyle).toEqual([{ url: 'https://fixture.invalid/existing.png', objectPath: null }])
    expect(attached.assignment.p_action).toBe('product_media_assign')
    expect(attached.assignment.p_signature).toMatch(/^[a-f0-9]{64}$/)
  } finally {
    if (previous === undefined) delete process.env.K2_ADMIN_BFF_REQUEST_SECRET
    else process.env.K2_ADMIN_BFF_REQUEST_SECRET = previous
  }
})

test('uncertain completion retries persistence only and paid work runs once', async () => {
  const { runIntakeAiJob } = await import('../server/admin-bff/intake-ai-jobs.js')
  const data = Buffer.from('registered fixture')
  let paid = 0; let completions = 0
  const client = {
    rpc: async (name, args) => {
      if (args.action === 'intake_ai_claim') return { data: { dispatch: true, job: { id: 'job' }, evidence: [{ slot: 'PRIMARY', type: 'image/png', path: 'actor/session/front.png', sha256: createHash('sha256').update(data).digest('hex') }] } }
      completions++
      return completions === 1 ? { error: { message: 'lost write receipt' } } : { data: { job: { id: 'job', result: args.payload.result } } }
    },
    storage: { from: () => ({ download: async () => ({ data: new Blob([data]) }) }) },
  }
  const result = await runIntakeAiJob({ client, identity: { userId: 'actor' }, requestId: 'request', input: { sessionId: 'session', kind: 'content' } }, {
    sign: (action, actor, id, payload) => ({ action, payload }), generateContent: async () => { paid++; return { content: { draft: 'fixture' } } },
  })
  expect(paid).toBe(1); expect(completions).toBe(2); expect(result.result.content.draft).toBe('fixture')
})

test('tampered registered bytes are persisted as failure without calling provider', async () => {
  const { runIntakeAiJob } = await import('../server/admin-bff/intake-ai-jobs.js')
  let paid = 0
  const client = {
    rpc: async (name, args) => ({ data: args.action === 'intake_ai_claim' ? { dispatch: true, job: { id: 'job' }, evidence: [{ slot: 'PRIMARY', type: 'image/png', path: 'actor/session/front.png', sha256: 'a'.repeat(64) }] } : { job: args.payload } }),
    storage: { from: () => ({ download: async () => ({ data: new Blob(['different']) }) }) },
  }
  const result = await runIntakeAiJob({ client, identity: { userId: 'actor' }, requestId: 'request', input: { sessionId: 'session', kind: 'content' } }, { sign: (action, actor, id, payload) => ({ action, payload }), generateContent: async () => paid++ })
  expect(paid).toBe(0); expect(result.failure).toBe('AI_EVIDENCE_REQUIRED')
})

test('automatic dispatch cannot run without a durable claim', async () => {
  const { runIntakeAiJob } = await import('../server/admin-bff/intake-ai-jobs.js')
  let calls = 0
  await expect(runIntakeAiJob({ client: { rpc: async () => ({ error: { message: 'offline' } }) }, identity: { userId: 'actor' }, requestId: 'request', input: { sessionId: 'session', kind: 'content' } }, { generateContent: async () => { calls++ } })).rejects.toThrow()
  expect(calls).toBe(0)
})

test('recovered dispatched job never issues another paid request', async () => {
  const { runIntakeAiJob } = await import('../server/admin-bff/intake-ai-jobs.js')
  let calls = 0
  const job = { id: 'job', status: 'dispatched', kind: 'content' }
  const result = await runIntakeAiJob({ client: { rpc: async () => ({ data: { dispatch: false, job } }) }, identity: { userId: 'actor' }, requestId: 'request', input: { sessionId: 'session', kind: 'content' } }, { sign: () => ({}), generateContent: async () => { calls++ } })
  expect(result).toEqual(job)
  expect(calls).toBe(0)
})
