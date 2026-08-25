import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = process.cwd().replaceAll('\\', '/')
// Supabase publishable keys are browser identifiers, not secrets. Keep the
// project key as a safe production fallback so a missing Vercel env cannot
// silently fall back to the disabled legacy anon JWT and break OAuth callbacks.
const K2_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OCZx7JiRFTXZ43v0ZxVduQ_KAGCH_Z9'

// Each target gets its own web app manifest. A single shared `public/manifest.json`
// used to hold the Admin BOS identity and its internal `/admin-portal-k2-secure`
// start URL, and `public/` is copied verbatim into both builds — so the public
// storefront artifact shipped the admin manifest. Emitting per target keeps the
// two identities separate by construction rather than by review.
// No `icons` entry is declared: the previous manifest pointed at `/favicon.ico`,
// which does not exist in the repository. Referencing a missing icon is worse
// than declaring none. Add icons here once real assets are committed.
const WEB_APP_MANIFESTS = {
  storefront: {
    short_name: 'K2 Jimzon',
    name: 'K2 Jimzon — Italian imports, direct to the Philippines',
    start_url: '/',
    background_color: '#FAF7F2',
    theme_color: '#FAF7F2',
    display: 'standalone',
    orientation: 'portrait',
  },
  admin: {
    short_name: 'K2 Jimzon BOS',
    name: 'K2 Jimzon Business Operating System',
    start_url: '/admin-portal-k2-secure',
    background_color: '#05080f',
    theme_color: '#0A101D',
    display: 'standalone',
    orientation: 'portrait',
  },
}

function deploymentBoundaryPlugin(target) {
  return {
    name: 'k2-deployment-boundary',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'k2-build-target.json',
        source: `${JSON.stringify({ target }, null, 2)}\n`,
      })
      const webAppManifest = WEB_APP_MANIFESTS[target]
      if (webAppManifest) {
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: `${JSON.stringify(webAppManifest, null, 2)}\n`,
        })
      }
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const configuredTarget = process.env.K2_DEPLOYMENT_TARGET || env.K2_DEPLOYMENT_TARGET
  const legacyAdminFlag = process.env.VITE_IS_ADMIN_DEPLOYMENT || env.VITE_IS_ADMIN_DEPLOYMENT
  const vercelDeploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || ''
  const vercelTarget = vercelDeploymentHost.toLowerCase().includes('admin') ? 'admin' : ''
  const modeTarget = mode === 'admin' ? 'admin' : mode === 'storefront' ? 'storefront' : ''
  const target = configuredTarget || (legacyAdminFlag === 'true' ? 'admin' : '') || vercelTarget || modeTarget || (command === 'serve' ? 'combined' : 'storefront')
  // Supabase's modern publishable key is intentionally browser-safe. Prefer it
  // over the legacy anon JWT so disabling legacy API keys cannot lock staff out.
  const supabasePublicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.SUPABASE_PUBLISHABLE_KEY
    || K2_SUPABASE_PUBLISHABLE_KEY

  if (!['storefront', 'admin', 'combined'].includes(target)) {
    throw new Error(`Invalid K2_DEPLOYMENT_TARGET "${target}". Use storefront or admin.`)
  }

  const entryFile = {
    storefront: 'src/StorefrontApp.jsx',
    admin: 'src/AdminApp.jsx',
    combined: 'src/App.jsx',
  }[target]

  return {
    // Admin and storefront dev servers run together on this workstation. Vite's
    // default shared optimizer cache lets one mode invalidate the other's
    // pre-bundled Three.js dependencies, producing 504 "Outdated Optimize Dep"
    // responses and a blank storefront. Keep each deployment cache isolated.
    cacheDir: `${projectRoot}/node_modules/.vite-${target}`,
    plugins: [react(), tailwindcss(), deploymentBoundaryPlugin(target)],
    resolve: {
      alias: {
        '@k2-app-entry': `${projectRoot}/${entryFile}`,
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_PUBLIC_KEY': JSON.stringify(supabasePublicKey || ''),
      // This compile-time constant lets Rollup remove Admin-only telemetry
      // transport (including its route string) from the Storefront artifact.
      __K2_ADMIN_BUILD__: JSON.stringify(target !== 'storefront'),
    },
    build: {
      manifest: true,
      sourcemap: false,
    },
  }
})
