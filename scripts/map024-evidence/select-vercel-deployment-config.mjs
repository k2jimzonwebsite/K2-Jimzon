export function selectVercelDeploymentConfig({
  target,
  projectId,
  projectIds,
  configs,
}) {
  if (!target) {
    throw new Error('MAP024_VERCEL_CONFIG_REFUSAL: K2_DEPLOYMENT_TARGET is required; set it to "storefront" or "admin"')
  }
  if (target !== 'storefront' && target !== 'admin') {
    throw new Error('MAP024_VERCEL_CONFIG_REFUSAL: K2_DEPLOYMENT_TARGET must be "storefront" or "admin"')
  }
  if (!projectId) {
    throw new Error('MAP024_VERCEL_CONFIG_REFUSAL: VERCEL_PROJECT_ID is required; enable Vercel system environment variables')
  }
  if (!projectIds?.[target]) {
    throw new Error(`MAP024_VERCEL_CONFIG_REFUSAL: no reviewed Vercel project mapping exists for target "${target}"`)
  }
  if (projectIds[target] !== projectId) {
    throw new Error(`MAP024_VERCEL_CONFIG_REFUSAL: target "${target}" does not match Vercel project "${projectId}"`)
  }
  if (!configs?.[target]) {
    throw new Error(`MAP024_VERCEL_CONFIG_REFUSAL: no reviewed artifact config exists for target "${target}"`)
  }

  return configs[target]
}
