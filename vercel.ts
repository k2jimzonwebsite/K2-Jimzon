import { readFileSync } from 'node:fs'
import { selectVercelDeploymentConfig } from './scripts/map024-evidence/select-vercel-deployment-config.mjs'

const readConfig = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'))

export const config = selectVercelDeploymentConfig({
  target: process.env.K2_DEPLOYMENT_TARGET,
  projectId: process.env.VERCEL_PROJECT_ID,
  projectIds: {
    storefront: 'prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL',
    admin: 'prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x',
  },
  configs: {
    storefront: readConfig('./vercel.storefront.json'),
    admin: readConfig('./vercel.admin.json'),
  },
})
