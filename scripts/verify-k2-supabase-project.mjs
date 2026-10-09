import { fileURLToPath } from 'node:url'

export const K2_SUPABASE_REF = 'pixplcjqivlfflickobf'
const K2_SUPABASE_URL = `https://${K2_SUPABASE_REF}.supabase.co`
const PROJECTS_URL = 'https://api.supabase.com/v1/projects'

export async function verifyK2SupabaseProject({ accessToken, supabaseUrl, fetchImpl = fetch }) {
  if (!accessToken) throw new Error('K2_PROJECT_IDENTITY_REFUSAL: management token missing')

  let url
  try { url = new URL(supabaseUrl) } catch { /* handled below */ }
  if (!url || url.origin !== K2_SUPABASE_URL || url.pathname !== '/'
      || url.search || url.hash || url.username || url.password) {
    throw new Error('K2_PROJECT_IDENTITY_REFUSAL: Supabase URL is not K2')
  }

  let response
  try {
    response = await fetchImpl(PROJECTS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    throw new Error('K2_PROJECT_IDENTITY_REFUSAL: project list unavailable')
  }
  if (!response.ok) {
    throw new Error(`K2_PROJECT_IDENTITY_REFUSAL: project list HTTP ${response.status}`)
  }

  let projects
  try { projects = await response.json() } catch { /* handled below */ }
  if (!Array.isArray(projects)
      || !projects.some((project) => project?.id === K2_SUPABASE_REF || project?.ref === K2_SUPABASE_REF)) {
    throw new Error('K2_PROJECT_IDENTITY_REFUSAL: token cannot access K2 project')
  }
  return { projectRef: K2_SUPABASE_REF }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`))) {
  verifyK2SupabaseProject({
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
  }).then(({ projectRef }) => {
    console.log(`K2_PROJECT_IDENTITY_OK project=${projectRef}`)
  }).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
