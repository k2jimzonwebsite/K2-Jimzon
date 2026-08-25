const ALLOWED_BROWSER_ENV = new Set([
  'BASE_URL', 'DEV', 'MODE', 'PROD', 'SSR',
  'VITE_ADMIN_BFF_ENABLED',
  'VITE_CUSTOMER_ACCOUNT_ENABLED',
  'VITE_GUEST_BFF_ENABLED',
  'VITE_IS_ADMIN_DEPLOYMENT',
  'VITE_STOREFRONT_URL',
  'VITE_SUPABASE_PUBLIC_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_TURNSTILE_SITE_KEY',
])

const SECRET_SHAPED = /^VITE_.*(?:SECRET|SERVICE_ROLE|TOKEN|PASSWORD|PRIVATE|PARTNER_KEY|APP_SECRET)/i

export function inspectBrowserSource(text, file = '') {
  const findings = []
  if (/\bprocess\.env\b/.test(text)) findings.push({ file, rule: 'node-env-in-browser-source' })
  if (/import\.meta\.env\s*\[/.test(text)) findings.push({ file, rule: 'dynamic-browser-env-access' })

  const expression = /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g
  for (const match of text.matchAll(expression)) {
    const name = match[1]
    if (SECRET_SHAPED.test(name)) findings.push({ file, rule: 'secret-shaped-browser-env', name })
    if (!ALLOWED_BROWSER_ENV.has(name)) findings.push({ file, rule: 'unapproved-browser-env', name })
  }
  return findings
}

export function inspectServerSource(text, file = '') {
  return /import\.meta\.env/.test(text)
    ? [{ file, rule: 'browser-env-api-in-server-source' }]
    : []
}
