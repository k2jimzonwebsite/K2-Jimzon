#!/usr/bin/env node
// Rewrite the shared index.html discovery tags for the Admin artifact.
//
// Both targets build from one root index.html that carries Storefront
// canonical/Open Graph/Twitter tags. The Admin host already sends
// X-Robots-Tag: noindex, nofollow, but serving storefront discovery tags
// from the Admin document is a conflicting signal and advertises the public
// site from the staff surface. This step runs at the end of build:admin and
// replaces them with Admin-appropriate tags. Fail-closed: if any expected
// Storefront tag is absent (index.html changed), the build fails loudly
// instead of shipping a half-rewritten head.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ADMIN_CANONICAL = 'https://admin.k2jimzon.com/admin-portal-k2-secure'

const REPLACEMENTS = [
  [/<title>.*?<\/title>/s, '<title>K2 Jimzon Admin</title>'],
  [/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${ADMIN_CANONICAL}" />`],
  [/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${ADMIN_CANONICAL}" />`],
  [/<meta property="og:title" content="[^"]*" \/>/, '<meta property="og:title" content="K2 Jimzon Admin" />'],
  [/<meta property="og:description" content="[^"]*" \/>/, '<meta property="og:description" content="Staff operations. Sign-in required." />'],
  [/<meta property="og:image" content="[^"]*" \/>\n/, ''],
  [/<meta property="og:image:width" content="[^"]*" \/>\n/, ''],
  [/<meta property="og:image:height" content="[^"]*" \/>\n/, ''],
  [/<meta property="og:image:type" content="[^"]*" \/>\n/, ''],
  [/<meta property="og:image:alt" content="[^"]*" \/>\n/, ''],
  [/<meta name="twitter:card" content="[^"]*" \/>/, '<meta name="twitter:card" content="summary" />'],
  [/<meta name="twitter:title" content="[^"]*" \/>/, '<meta name="twitter:title" content="K2 Jimzon Admin" />'],
  [/<meta name="twitter:description" content="[^"]*" \/>/, '<meta name="twitter:description" content="Staff operations. Sign-in required." />'],
  [/<meta name="twitter:image" content="[^"]*" \/>\n/, ''],
  [/<meta name="twitter:image:alt" content="[^"]*" \/>\n/, ''],
]

export function rewriteAdminHead(html) {
  let result = html
  for (const [pattern, replacement] of REPLACEMENTS) {
    if (!pattern.test(result)) {
      throw new Error(`emit-admin-head: expected Storefront tag not found: ${pattern}`)
    }
    result = result.replace(pattern, replacement)
  }
  if (result.includes('www.k2jimzon.com')) {
    throw new Error('emit-admin-head: storefront origin survives in the Admin head')
  }
  return result
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const rootDir = fileURLToPath(new URL('..', import.meta.url))
  const target = process.argv[2] || process.env.K2_DEPLOYMENT_TARGET || ''
  if (target !== 'admin') {
    console.log(`emit-admin-head: target is '${target || 'unset'}', nothing to rewrite.`)
  } else {
    const file = path.join(rootDir, 'dist', 'index.html')
    writeFileSync(file, rewriteAdminHead(readFileSync(file, 'utf8')))
    console.log('emit-admin-head: Admin discovery tags written to dist/index.html.')
  }
}
