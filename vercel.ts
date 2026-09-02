import { selectVercelDeploymentConfig } from './scripts/map024-evidence/select-vercel-deployment-config.mjs'
import storefrontConfig from './vercel.storefront.json' with { type: 'json' }
import adminConfig from './vercel.admin.json' with { type: 'json' }

export const config = selectVercelDeploymentConfig({
  target: process.env.K2_DEPLOYMENT_TARGET,
  projectId: process.env.VERCEL_PROJECT_ID,
  projectIds: {
    storefront: 'prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL',
    admin: 'prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x',
  },
  configs: {
    storefront: storefrontConfig,
    admin: adminConfig,
  },
})
