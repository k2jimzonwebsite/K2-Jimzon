// ============================================================================
// K2 Jimzon — Modern Supabase Key Management for Edge Functions
// ============================================================================
// Supabase's modern migration contract injects SUPABASE_PUBLISHABLE_KEYS and
// SUPABASE_SECRET_KEYS as named JSON maps (e.g. {"default": "sb_..."}).
// Edge functions deployed after legacy API key disablement must parse these
// named JSON maps with fail-closed validation and never depend on legacy anon/service keys.
// ============================================================================

export function parseModernKeyMap(encoded: string, prefix: 'sb_secret_' | 'sb_publishable_'): string {
  if (!encoded) return ''
  try {
    const keys = JSON.parse(encoded) as Record<string, unknown>
    const value = typeof keys.default === 'string' ? keys.default.trim() : ''
    return value.startsWith(prefix) && value.length > prefix.length ? value : ''
  } catch {
    return ''
  }
}

function validDirectKey(value: string, prefix: 'sb_secret_' | 'sb_publishable_') {
  const normalized = value.trim()
  return normalized.startsWith(prefix) && normalized.length > prefix.length ? normalized : ''
}

export function getServiceRoleKey(): string {
  const encodedKeys = Deno.env.get('SUPABASE_SECRET_KEYS') ?? ''
  const mapped = parseModernKeyMap(encodedKeys, 'sb_secret_')
  if (mapped) return mapped

  const directSecret = Deno.env.get('SUPABASE_SECRET_KEY') ?? ''
  return validDirectKey(directSecret, 'sb_secret_')
}

export function getPublishableKey(): string {
  const encodedKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? ''
  const mapped = parseModernKeyMap(encodedKeys, 'sb_publishable_')
  if (mapped) return mapped

  const directPublishable = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  return validDirectKey(directPublishable, 'sb_publishable_')
}

export function isEdgeFunctionConfigured(): boolean {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const pub = getPublishableKey()
  const sec = getServiceRoleKey()
  return Boolean(url && pub && sec)
}
