#!/usr/bin/env node

const PROJECT_REF = 'pixplcjqivlfflickobf'
const BACKUPS_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/backups`

export async function listMap017ProviderBackups({ accessToken, fetchImpl = fetch }) {
  if (!accessToken) {
    throw new Error('MAP017_PROVIDER_BACKUP_INVENTORY_REFUSAL: SUPABASE_ACCESS_TOKEN_REQUIRED')
  }
  const response = await fetchImpl(BACKUPS_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!response.ok) {
    throw new Error(`MAP017_PROVIDER_BACKUP_INVENTORY_REFUSAL: PROVIDER_HTTP_${response.status}`)
  }
  const body = await response.json()
  const source = Array.isArray(body) ? body : (Array.isArray(body?.backups) ? body.backups : [])
  return {
    projectRef: PROJECT_REF,
    pitrEnabled: body?.pitr_enabled === true,
    walgEnabled: body?.walg_enabled === true,
    backups: source.map((backup) => ({
      id: backup.id ?? null,
      status: backup.status ?? null,
      createdAt: backup.inserted_at ?? backup.created_at ?? null,
      type: backup.type ?? null,
    })),
  }
}

async function main() {
  try {
    const result = await listMap017ProviderBackups({ accessToken: process.env.SUPABASE_ACCESS_TOKEN })
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(String(error?.message || 'MAP017_PROVIDER_BACKUP_INVENTORY_REFUSAL'))
    process.exit(2)
  }
}

if (process.argv[1]?.endsWith('list-provider-backups.mjs')) main()
