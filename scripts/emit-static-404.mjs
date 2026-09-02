import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')

export function renderStatic404(target) {
  const admin = target === 'admin'
  const title = admin ? 'Admin page not found — K2 Jimzon BOS' : 'Page not found — K2 Jimzon'
  const heading = admin ? 'Admin page not found' : 'Page or product unavailable'
  const detail = admin
    ? 'This address is not part of the K2 Jimzon Admin BOS. Return to the protected staff entrance.'
    : 'This address may be outdated, or the product may no longer be published. Continue from a verified K2 page.'
  const links = admin
    ? '<a class="primary" href="/admin-portal-k2-secure">Return to staff sign-in</a>'
    : '<a class="primary" href="/catalog">Browse the catalog</a><a href="/contact">Contact K2 Jimzon</a><a href="/">Return home</a>'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="${admin ? '#0A101D' : '#FAF7F2'}">
  <title>${title}</title>
  <style>
    :root { color-scheme: ${admin ? 'dark' : 'light'}; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: ${admin ? '#05080f' : '#f5efe4'}; color: ${admin ? '#f8fafc' : '#15251d'}; }
    main { width: min(100%, 680px); border: 1px solid ${admin ? '#263348' : '#d8cab5'}; border-radius: 20px; padding: clamp(28px, 7vw, 56px); background: ${admin ? '#0a101d' : '#fffdf8'}; box-shadow: 0 24px 70px rgba(15, 23, 42, .14); }
    .eyebrow { margin: 0 0 14px; color: ${admin ? '#78a9ff' : '#9a2d36'}; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 18ch; font-family: Georgia, "Times New Roman", serif; font-size: clamp(34px, 8vw, 58px); line-height: 1.02; }
    p { margin: 20px 0 0; max-width: 56ch; color: ${admin ? '#b8c3d6' : '#506158'}; font-size: 17px; line-height: 1.7; }
    nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
    a { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid ${admin ? '#364865' : '#c9b99f'}; border-radius: 999px; padding: 10px 18px; color: inherit; font-weight: 750; text-decoration: none; }
    a:focus-visible { outline: 3px solid ${admin ? '#78a9ff' : '#9a2d36'}; outline-offset: 3px; }
    a.primary { border-color: transparent; background: ${admin ? '#2f6fed' : '#9a2d36'}; color: #fff; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; } }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">K2 Jimzon${admin ? ' Business Operating System' : ''}</p>
    <h1>${heading}</h1>
    <p>${detail}</p>
    <nav aria-label="Recovery options">${links}</nav>
  </main>
</body>
</html>
`
}

export function resolveTarget(requested = 'auto') {
  if (requested === 'storefront' || requested === 'admin') return requested
  if (requested !== 'auto') throw new Error('Static 404 target must be storefront, admin, or auto.')
  const marker = JSON.parse(readFileSync(join(dist, 'k2-build-target.json'), 'utf8'))
  if (marker.target !== 'storefront' && marker.target !== 'admin') {
    throw new Error('Build target marker is missing a supported target.')
  }
  return marker.target
}

export function emitStatic404(requested) {
  const target = resolveTarget(requested)
  const output = join(dist, '404.html')
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, renderStatic404(target), 'utf8')
  return { output, target }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = emitStatic404(process.argv[2] || 'auto')
  console.log(`Emitted ${result.target} static 404 recovery page.`)
}
