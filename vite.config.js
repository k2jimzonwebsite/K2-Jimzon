import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = process.cwd().replaceAll('\\', '/')

function deploymentBoundaryPlugin(target) {
  return {
    name: 'k2-deployment-boundary',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'k2-build-target.json',
        source: `${JSON.stringify({ target }, null, 2)}\n`,
      })
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
  const supabasePublicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_ANON_KEY

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
    },
    build: {
      manifest: true,
    },
  }
})
