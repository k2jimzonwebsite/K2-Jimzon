import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = process.cwd().replaceAll('\\', '/')
const BROWSER_ENV_KEYS = [
  'VITE_ADMIN_BFF_ENABLED',
  'VITE_CUSTOMER_ACCOUNT_ENABLED',
  'VITE_GUEST_BFF_ENABLED',
  'VITE_IS_ADMIN_DEPLOYMENT',
  'VITE_STOREFRONT_URL',
  'VITE_SUPABASE_PUBLIC_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_TURNSTILE_SITE_KEY',
]
const VITE_CONFIG_ENV_KEYS = [
  'K2_DEPLOYMENT_TARGET',
  'SUPABASE_PUBLISHABLE_KEY',
  ...BROWSER_ENV_KEYS,
]
// Supabase publishable keys are browser identifiers, not secrets. Keep the
// project key as a safe production fallback so a missing Vercel env cannot
// silently fall back to the disabled legacy anon JWT and break OAuth callbacks.
const K2_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OCZx7JiRFTXZ43v0ZxVduQ_KAGCH_Z9'

// Each target gets its own web app manifest. A single shared `public/manifest.json`
// used to hold the Admin BOS identity and its internal `/admin-portal-k2-secure`
// start URL, and `public/` is copied verbatim into both builds — so the public
// storefront artifact shipped the admin manifest. Emitting per target keeps the
// two identities separate by construction rather than by review.
// Icons are declared raster-first (MAP-028 B7). Every `src` below exists in
// `public/`; referencing a missing icon is worse than declaring none.
const WEB_APP_MANIFESTS = {
  storefront: {
    short_name: 'K2 Jimzon',
    name: 'K2 Jimzon — Italian imports, direct to the Philippines',
    start_url: '/',
    background_color: '#FAF7F2',
    theme_color: '#FAF7F2',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      // Raster first. Chrome accepts `sizes: 'any'` on an SVG, but several
      // Android installers still require concrete 192 and 512 raster entries,
      // and an SVG-only manifest fails their installability check.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  },
  admin: {
    short_name: 'K2 Jimzon BOS',
    name: 'K2 Jimzon Business Operating System',
    start_url: '/admin-portal-k2-secure',
    background_color: '#05080f',
    theme_color: '#0A101D',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      // Raster first. Chrome accepts `sizes: 'any'` on an SVG, but several
      // Android installers still require concrete 192 and 512 raster entries,
      // and an SVG-only manifest fails their installability check.
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
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
  // Never use an empty prefix here. It imports every server secret from
  // `.env.local` into Vite's resolved config, where `vite --debug` prints it.
  const env = loadEnv(mode, projectRoot, VITE_CONFIG_ENV_KEYS)
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
        // Vite's default `VITE_` prefix is too broad for a mixed browser/server
        // environment file. Expose only the public names the source inventory
        // permits; secret-shaped VITE_ mistakes stay outside the client config.
        envPrefix: BROWSER_ENV_KEYS,
        // Admin and storefront dev servers run together on this workstation. Vite's
    // default shared optimizer cache lets one mode invalidate the other's
    // pre-bundled Three.js dependencies, producing 504 "Outdated Optimize Dep"
    // responses and a blank storefront. Keep each deployment cache isolated.
    cacheDir: `${projectRoot}/node_modules/.vite-${target}`,
    plugins: [react(), tailwindcss(), deploymentBoundaryPlugin(target)],
    resolve: {
      alias: {
        '@k2-app-entry': `${projectRoot}/${entryFile}`,
        '@k2-lazy-supabase-client': target === 'admin'
          ? `${projectRoot}/src/lib/disabledLazySupabaseClient.js`
          : `${projectRoot}/src/lib/supabaseClient.js`,
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
      rollupOptions: {
        output: {
          // Split only the vendors the entry already loads eagerly, so app-code
          // deploys stop invalidating ~130 kB of unchanged framework bytes in
          // returning visitors' caches.
          //
          // Deliberately narrow: anything not named here — three, @react-three,
          // html5-qrcode, papaparse — keeps Rollup's natural code-splitting and
          // stays inside the dynamic chunk that imports it. Naming three here
          // would fold the 904 kB Globe into an eagerly loaded chunk and undo
          // the IntersectionObserver deferral.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            const path = id.replace(/\\/g, '/')
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(path)) return 'vendor-react'
            if (path.includes('/node_modules/@supabase/')) return 'vendor-supabase'
            if (/\/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(path)) return 'vendor-motion'
            return undefined
          },
        },
      },
    },
  }
})
