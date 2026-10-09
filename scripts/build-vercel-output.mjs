import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { getTransformedRoutes } from '@vercel/routing-utils'

const root = fileURLToPath(new URL('..', import.meta.url))
const targets = {
  admin: { duration: 180, entry: 'api/admin/index.js' },
  storefront: { duration: 10, entry: 'api/storefront/index.js' },
}

function requireWorkspaceOutput(outputDir) {
  const relative = path.relative(root, outputDir).replaceAll('\\', '/')
  if (relative !== '.vercel/output' && !relative.startsWith('.tools/vercel-build-output-')) {
    throw new Error('Build Output destination must be the K2 generated-output directory')
  }
}

function copyNativeSharp(functionDir) {
  const packages = ['sharp', 'detect-libc', 'semver', '@img']
  for (const name of packages) {
    const source = path.join(root, 'node_modules', name)
    // npm can retain a compatible dependency inside Sharp rather than hoisting
    // it. Copying Sharp already includes that nested package.
    if (!fs.existsSync(source) && fs.existsSync(path.join(root, 'node_modules', 'sharp', 'node_modules', name))) continue
    if (!fs.existsSync(source)) throw new Error(`Missing installed native dependency: ${name}`)
    fs.cpSync(source, path.join(functionDir, 'node_modules', name), { recursive: true })
  }
}

export async function buildTargetArtifact({ target, distDir, outputDir }) {
  const selected = targets[target]
  if (!selected) throw new Error(`Unknown K2 deployment target: ${target}`)
  const resolvedOutput = path.resolve(outputDir)
  requireWorkspaceOutput(resolvedOutput)
  const resolvedDist = path.resolve(distDir)
  if (resolvedDist === resolvedOutput || !path.relative(resolvedOutput, resolvedDist).startsWith('..')) {
    throw new Error('Static source cannot be inside the generated output destination')
  }
  if (!fs.statSync(resolvedDist).isDirectory()) throw new Error(`Missing static build: ${resolvedDist}`)

  const sourceConfig = JSON.parse(fs.readFileSync(path.join(root, `vercel.${target}.json`), 'utf8'))
  const ownApiPrefix = `/api/${target}`
  const otherApiPrefix = `/api/${target === 'admin' ? 'storefront' : 'admin'}`
  const transformed = getTransformedRoutes({
    redirects: sourceConfig.redirects,
    headers: sourceConfig.headers,
    rewrites: sourceConfig.rewrites,
  })
  if (transformed.error) throw transformed.error
  const routes = [...transformed.routes]
  const filesystemIndex = routes.findIndex((route) => route.handle === 'filesystem')
  if (filesystemIndex < 0) throw new Error('Vercel routing conversion omitted filesystem phase')
  routes.splice(filesystemIndex + 1, 0,
    { src: `^${ownApiPrefix}/(.+)$`, dest: `${ownApiPrefix}?route=$1`, check: true },
    { src: `^${otherApiPrefix}(?:/.*)?$`, status: 404 },
  )

  fs.rmSync(resolvedOutput, { recursive: true, force: true })
  const functionDir = path.join(resolvedOutput, 'functions', 'api', `${target}.func`)
  fs.mkdirSync(functionDir, { recursive: true })
  fs.cpSync(resolvedDist, path.join(resolvedOutput, 'static'), { recursive: true })
  const result = await build({
    absWorkingDir: root,
    entryPoints: [selected.entry],
    outfile: path.join(functionDir, 'index.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    external: ['sharp'],
    metafile: true,
    logLevel: 'warning',
  })
  if (Object.values(result.metafile.outputs).some((output) => output.imports?.some((entry) => entry.path === 'sharp'))) {
    copyNativeSharp(functionDir)
  }
  fs.writeFileSync(path.join(functionDir, '.vc-config.json'), JSON.stringify({
    runtime: 'nodejs24.x',
    handler: 'index.mjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: true,
    maxDuration: selected.duration,
  }, null, 2))
  fs.writeFileSync(path.join(resolvedOutput, 'config.json'), JSON.stringify({ version: 3, routes }, null, 2))
  return resolvedOutput
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2]
  await buildTargetArtifact({
    target,
    distDir: path.join(root, 'dist'),
    outputDir: path.join(root, '.vercel', 'output'),
  })
}
