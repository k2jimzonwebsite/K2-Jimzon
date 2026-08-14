export function getServiceRoleKey(): string {
  const encodedKeys = Deno.env.get('SUPABASE_SECRET_KEYS') ?? ''
  if (!encodedKeys) return ''

  try {
    const keys = JSON.parse(encodedKeys) as Record<string, unknown>
    return typeof keys.default === 'string' ? keys.default : ''
  } catch {
    return ''
  }
}
