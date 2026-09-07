import { test, expect } from '@playwright/test'
import sharp from 'sharp'
import { PRODUCT_RESEARCH_TEMPLATE } from '../src/views/admin/productResearchContract.js'
import { generateIntakeContent, generateIntakeImage, intakeAiReadiness, AI_MODEL_SNAPSHOT } from '../server/admin-bff/intake-ai-provider.js'
const configured = { K2_INTAKE_AI_ENABLED: 'true', OPENAI_API_KEY: 'fixture-only', K2_AI_CONTENT_MODEL: 'gpt-4.1-mini-2025-04-14', K2_AI_IMAGE_MODEL: 'gpt-image-1', K2_AI_RETENTION_REVIEWED: 'true', K2_AI_PRICING_REVIEWED: 'true' }
const png = (width = 64, height = 64) => sharp({ create: { width, height, channels: 3, background: 'white' } }).png().toBuffer()
const evidence = async (slot = 'PRIMARY') => ({ slot, mime: 'image/png', data: await png() })
function contentFixture() {
  const value = structuredClone(PRODUCT_RESEARCH_TEMPLATE)
  Object.assign(value.product, { name: 'Test Pasta 500g', short_name: 'Pasta', brand_name: 'Test', variant: '500g', category: 'Pasta', subcategory: 'Dry Pasta' })
  Object.assign(value.copy, { card_description: 'Pasta package.', full_description: 'Dry pasta in the supplied package.', key_highlights: ['Dry pasta', '500g package'], why_buy: 'Packaged pasta.' })
  Object.assign(value.seo, { seo_title: 'Pasta', meta_description: 'Dry pasta.', page_heading: 'Pasta', supporting_heading: 'Dry pasta package', search_keywords: ['dry pasta', 'pasta 500g', 'test pasta'] })
  Object.assign(value.media, { primary_alt_text: 'Package', primary_composition: 'Exact package', after_alt_text: 'Prepared pasta', after_scene: 'Cooked pasta' })
  value.usage.use_cases = []; value.usage.instructions = []
  return value
}
const response = (value = contentFixture()) => new Response(JSON.stringify({ id: 'resp_fixture', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 } }))
const opts = fetchImpl => ({ env: configured, fetchImpl })

test('readiness requires key and reviewed configuration without leaking credentials', async () => {
  expect(intakeAiReadiness(configured).ready).toBe(true)
  expect(AI_MODEL_SNAPSHOT.length).toBeLessThanOrEqual(160)
  for (const key of Object.keys(configured)) expect(intakeAiReadiness({ ...configured, [key]: '' }).ready).toBe(false)
  expect(JSON.stringify(intakeAiReadiness(configured))).not.toContain('fixture-only')
  let calls = 0
  await expect(generateIntakeContent({ images: [] }, { env: {}, fetchImpl: () => calls++ })).rejects.toThrow('AI_NOT_CONFIGURED')
  expect(calls).toBe(0)
})

test('structured output uses fixed endpoint, bounded normalized evidence and no tools', async () => {
  const image = { ...await evidence(), data: await png(3000, 2200) }
  const result = await generateIntakeContent({ images: [image] }, opts(async (url, options) => {
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(options.redirect).toBe('error')
    const body = JSON.parse(options.body)
    expect(body.store).toBe(false); expect(body.tools).toBeUndefined()
    expect(body.max_output_tokens).toBe(6000); expect(body.text.format.strict).toBe(true)
    const encoded = body.input[0].content[1].image_url.split(',')[1]
    const meta = await sharp(Buffer.from(encoded, 'base64')).metadata()
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(2048)
    return response()
  }))
  expect(result.content.product.name).toBe('Test Pasta 500g')
  expect(result.providerId).toBe('resp_fixture'); expect(result.usage.total_tokens).toBe(300)
})

test('invalid evidence fails before dispatch', async () => {
  const image = await evidence(); let calls = 0
  const cases = [[], [null], [{ ...image, slot: 'AFTER' }], [image, image], [{ ...image, slot: 'BACK' }], [{ ...image, mime: 'image/jpeg' }], [{ ...image, data: Buffer.from('bad') }], [{ ...image, data: Buffer.alloc(4 * 1024 * 1024 + 1) }], [{ ...image, data: await png(12001, 1) }]]
  for (const images of cases) await expect(generateIntakeContent({ images }, opts(() => { calls++; return response() }))).rejects.toThrow('AI_EVIDENCE_REQUIRED')
  expect(calls).toBe(0)
})

for (const key of ['sku', 'stock', 'quantity', 'price', 'cost', 'expiry', 'custody', 'approval', 'publication']) test(`rejects operational field ${key}`, async () => {
  const value = contentFixture(); value.product[key] = 'forbidden'
  await expect(generateIntakeContent({ images: [await evidence()] }, opts(async () => response(value)))).rejects.toThrow('AI_OUTPUT_INVALID')
})

test('rejects malformed shapes, missing evidence, invented refs and unknown source fields', async () => {
  const cases = [null, {}, { ...contentFixture(), schema_version: 'legacy' }]
  for (const edit of [v => { v.verification.sources = [] }, v => { v.verification.sources[0].reference = 'upload:back' }, v => { v.verification.sources[0].source_type = 'manufacturer' }, v => { v.verification.sources[0].fields = ['product.price'] }, v => { v.verification.sources[0].fields = [] }]) { const value = contentFixture(); edit(value); cases.push(value) }
  for (const value of cases) await expect(generateIntakeContent({ images: [await evidence()] }, opts(async () => response(value)))).rejects.toThrow('AI_OUTPUT_INVALID')
  await expect(generateIntakeContent({ images: [await evidence()] }, opts(async () => new Response('{bad')))).rejects.toThrow('AI_OUTPUT_INVALID')
})

test('refusal, upstream errors, malformed envelopes and oversized responses redact and never retry', async () => {
  for (const [body, status, error] of [[{ output: [{ content: [{ type: 'refusal', refusal: 'secret' }] }] }, 200, 'AI_PROVIDER_REFUSED'], ['fixture-only secret', 429, 'AI_PROVIDER_REJECTED'], [{ output: {} }, 200, 'AI_OUTPUT_INVALID'], ['x'.repeat(210000), 200, 'AI_OUTPUT_INVALID']]) {
    let calls = 0
    await expect(generateIntakeContent({ images: [await evidence()] }, opts(async () => { calls++; return new Response(JSON.stringify(body), { status }) }))).rejects.toThrow(new RegExp(`^${error}$`))
    expect(calls).toBe(1)
  }
})

test('timeout bounds both fetch and stalled body reads without retries', async () => {
  for (const stalledBody of [false, true]) {
    let calls = 0
    const options = { ...opts(async (url, { signal }) => { calls++; if (stalledBody) return new Response(new ReadableStream({ start() {} }))
      return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('secret'))))
    }), timeoutMs: 20 }
    await expect(generateIntakeContent({ images: [await evidence()] }, options)).rejects.toThrow('AI_PROVIDER_TIMEOUT')
    expect(calls).toBe(1)
  }
})

for (const slot of ['PRIMARY', 'AFTER']) test(`image edit ${slot} returns one fully decoded candidate`, async () => {
  const output = await png(1024, 1024)
  const result = await generateIntakeImage({ image: await evidence(), slot, brief: 'Exact package on a plain surface.' }, opts(async (url, options) => {
    expect(url).toBe('https://api.openai.com/v1/images/edits')
    for (const [key, val] of Object.entries({ model: 'gpt-image-1', n: '1', size: '1024x1024', quality: 'medium', input_fidelity: 'high', output_format: 'png' })) expect(options.body.get(key)).toBe(val)
    expect(options.body.get('image').type).toBe('image/png')
    return new Response(JSON.stringify({ data: [{ b64_json: output.toString('base64') }], usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 } }))
  }))
  expect((await sharp(result.data).metadata()).width).toBe(1024)
})

test('image requests require reviewed brief and primary evidence before dispatch', async () => {
  let calls = 0; const image = await evidence()
  for (const changes of [{ brief: '' }, { brief: ' '.repeat(10) }, { brief: 'x'.repeat(1501) }, { slot: 'BACK' }, { image: { ...image, slot: 'BACK' } }, { image: null }]) await expect(generateIntakeImage({ image, slot: 'PRIMARY', brief: 'Package', ...changes }, opts(() => { calls++ }))).rejects.toThrow('AI_IMAGE_INPUT_INVALID')
  expect(calls).toBe(0)
})

test('image results reject malformed base64, truncated PNG, wrong dimensions and multiple candidates', async () => {
  const valid = (await png(1024, 1024)).toString('base64')
  const cases = [{ data: [{ b64_json: '!!!!' }] }, { data: [{ b64_json: Buffer.from([137,80,78,71,13,10,26,10]).toString('base64') }] }, { data: [{ b64_json: (await png()).toString('base64') }] }, { data: [{ b64_json: valid }, { b64_json: valid }] }]
  for (const result of cases) await expect(generateIntakeImage({ image: await evidence(), slot: 'PRIMARY', brief: 'Package' }, opts(async () => new Response(JSON.stringify(result))))).rejects.toThrow('AI_OUTPUT_INVALID')
})
