import assert from 'node:assert/strict'
import test from 'node:test'

const K2_URL = 'https://pixplcjqivlfflickobf.supabase.co'
const SCOUTIT_URL = 'https://yyixsuaimdzyiocswcgc.supabase.co'

async function verify(options) {
  const { verifyK2SupabaseProject } = await import('../scripts/verify-k2-supabase-project.mjs')
  return verifyK2SupabaseProject(options)
}

test('accepts the exact K2 URL only when the management token sees K2', async () => {
  let requests = 0
  const result = await verify({
    accessToken: 'fixture-token',
    supabaseUrl: K2_URL,
    fetchImpl: async (url, options) => {
      requests += 1
      assert.equal(url, 'https://api.supabase.com/v1/projects')
      assert.equal(options.headers.Authorization, 'Bearer fixture-token')
      return Response.json([{ id: 'pixplcjqivlfflickobf', name: 'K2jimzon' }])
    },
  })
  assert.deepEqual(result, { projectRef: 'pixplcjqivlfflickobf' })
  assert.equal(requests, 1)
})

test('rejects a ScoutIT-only management token', async () => {
  await assert.rejects(
    verify({
      accessToken: 'fixture-token',
      supabaseUrl: K2_URL,
      fetchImpl: async () => Response.json([{ id: 'yyixsuaimdzyiocswcgc', name: 'ScoutIT' }]),
    }),
    /K2_PROJECT_IDENTITY_REFUSAL: token cannot access K2 project/,
  )
})

test('rejects a ScoutIT URL before sending the token', async () => {
  let requests = 0
  await assert.rejects(
    verify({
      accessToken: 'fixture-token',
      supabaseUrl: SCOUTIT_URL,
      fetchImpl: async () => { requests += 1; throw new Error('must not request') },
    }),
    /K2_PROJECT_IDENTITY_REFUSAL: Supabase URL is not K2/,
  )
  assert.equal(requests, 0)
})

test('rejects missing token and management access failure without logging secrets', async () => {
  await assert.rejects(
    verify({ accessToken: '', supabaseUrl: K2_URL }),
    /K2_PROJECT_IDENTITY_REFUSAL: management token missing/,
  )
  await assert.rejects(
    verify({
      accessToken: 'fixture-token',
      supabaseUrl: K2_URL,
      fetchImpl: async () => new Response(null, { status: 403 }),
    }),
    /K2_PROJECT_IDENTITY_REFUSAL: project list HTTP 403/,
  )
})
