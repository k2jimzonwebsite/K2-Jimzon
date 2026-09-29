import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const work = path.join(root, '.tools', 'vercel-build-output-test')

test('the Storefront sitemap dependency imports in Node ESM', async () => {
  const { buildProductStructuredData } = await import('../src/lib/productStructuredData.js')
  assert.equal(typeof buildProductStructuredData, 'function')
})

test('Build Output candidate isolates each API and preserves static/security routes', async () => {
  const { buildTargetArtifact } = await import('../scripts/build-vercel-output.mjs')
  fs.mkdirSync(work, { recursive: true })
  for (const [target, other, duration] of [
      ['admin', 'storefront', 180],
      ['storefront', 'admin', 10],
    ]) {
      const dist = path.join(work, `${target}-dist`)
      const output = path.join(work, `${target}-output`)
      fs.mkdirSync(path.join(dist, 'assets'), { recursive: true })
      fs.writeFileSync(path.join(dist, 'index.html'), `<title>${target}</title>`)
      fs.writeFileSync(path.join(dist, 'assets', 'app.js'), 'export default 1')
      await buildTargetArtifact({ target, distDir: dist, outputDir: output })

      const functions = fs.readdirSync(path.join(output, 'functions', 'api'))
      assert.deepEqual(functions, [`${target}.func`])
      const func = path.join(output, 'functions', 'api', `${target}.func`)
      const functionConfig = JSON.parse(fs.readFileSync(path.join(func, '.vc-config.json')))
      assert.equal(functionConfig.maxDuration, duration)
      assert.equal(functionConfig.runtime, 'nodejs24.x')
      assert.equal(functionConfig.handler, 'index.mjs')
      assert.equal(fs.readFileSync(path.join(output, 'static', 'index.html'), 'utf8'), `<title>${target}</title>`)
      assert.equal(fs.readFileSync(path.join(output, 'static', 'assets', 'app.js'), 'utf8'), 'export default 1')

      const routes = JSON.parse(fs.readFileSync(path.join(output, 'config.json'))).routes
      assert.ok(routes.some((route) => route.dest === `/api/${target}?route=$1`))
      assert.ok(routes.some((route) => route.src?.includes(`/api/${other}`) && route.status === 404))
      assert.ok(routes.some((route) => route.headers?.['Content-Security-Policy-Report-Only']))
      assert.ok(routes.some((route) => route.src?.includes('/assets') && route.headers?.['Cache-Control']?.includes('immutable')))
      assert.equal(fs.existsSync(path.join(output, 'functions', 'api', `${other}.func`)), false)

      const requireFromFunction = createRequire(path.join(func, 'index.mjs'))
      if (target === 'admin') {
        assert.ok(requireFromFunction.resolve('sharp').startsWith(path.join(func, 'node_modules')))
        const sharp = requireFromFunction('sharp')
        const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer()
        assert.equal(png.subarray(1, 4).toString(), 'PNG')
      }

      const handler = (await import(`file://${path.join(func, 'index.mjs').replaceAll('\\', '/')}`)).default
      const response = { statusCode: 200, setHeader() {}, end(body) { this.body = body } }
      await handler({ method: 'GET', url: `/api/${target}/session`, headers: {} }, response)
      assert.equal(response.statusCode, 404)
      assert.match(response.body, /NOT_FOUND/)
  }
})

test('Build Output refuses to replace its own static source', async () => {
  const { buildTargetArtifact } = await import('../scripts/build-vercel-output.mjs')
  fs.mkdirSync(work, { recursive: true })
  await assert.rejects(
    buildTargetArtifact({ target: 'admin', distDir: work, outputDir: work }),
    /Static source cannot be inside/,
  )
  assert.ok(fs.existsSync(work))
})
