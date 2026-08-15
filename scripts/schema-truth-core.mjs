/**
 * K2 Jimzon Schema-Truth Engine (MAP-017)
 *
 * Core library for consuming, redacting, inventorying, and comparing Supabase/Postgres
 * schema truth against repository invariants, security policies, grants, and migrations.
 */

export const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
}

// Patterns that must be sanitized from any output or diff
const SENSITIVE_PATTERNS = [
  /postgres(?:ql)?:\/\/[^@\s]+@[^\s]+/gi,
  /sb_secret_[a-zA-Z0-9_\-]+/gi,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/gi,
  /password\s*[:=]\s*['"][^'"]+['"]/gi,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
]

/**
 * Sanitize text to remove passwords, connection strings, emails, and tokens.
 */
export function sanitizeSchemaText(input) {
  if (typeof input !== 'string') return input
  let result = input
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

/**
 * Recursively redact any sensitive strings in an object.
 */
export function redactObject(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return sanitizeSchemaText(obj)
  if (Array.isArray(obj)) return obj.map(redactObject)
  if (typeof obj === 'object') {
    const cleaned = {}
    for (const [key, value] of Object.entries(obj)) {
      if (/password|secret|token|key|credential|jwt/i.test(key) && typeof value === 'string') {
        cleaned[key] = '[REDACTED]'
      } else {
        cleaned[key] = redactObject(value)
      }
    }
    return cleaned
  }
  return obj
}

/**
 * Expected repository schema specification for MAP-017.
 * Defines the canonical baseline of tables, views, grants, RLS, functions, storage, and realtime.
 */
export function buildExpectedRepositorySchema() {
  return {
    version: '2026-08-15.map017.meta.v1',
    schemas: ['public', 'storage'],
    tables: {
      brands: { rlsEnabled: true, anonGrants: ['SELECT'], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      categories: { rlsEnabled: true, anonGrants: ['SELECT'], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      warehouses: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      products: { rlsEnabled: true, anonGrants: ['SELECT'], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      product_batches: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true },
      product_drafts: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], noAnonDML: true, staffScoped: true },
      products_old: { rlsEnabled: true, anonGrants: [], authenticatedGrants: [], noAnonDML: true, legacyIsolated: true },
      channel_credentials: { rlsEnabled: true, anonGrants: [], authenticatedGrants: [], noAnonDML: true, failClosed: true },
      staff_allocations: { rlsEnabled: true, anonGrants: [], authenticatedGrants: [], noAnonDML: true, failClosed: true },
      orders: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE'], noAnonDML: true },
      user_profiles: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'UPDATE'], noAnonDML: true },
      conversations: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT', 'UPDATE'], noAnonDML: true },
      messages: { rlsEnabled: true, anonGrants: [], authenticatedGrants: ['SELECT', 'INSERT'], noAnonDML: true },
    },
    views: {
      v_channel_catalog_readiness: { securityInvoker: true, anonAccess: false },
      v_expiring_batches: { securityInvoker: true, anonAccess: false },
      products_with_margins: { securityInvoker: true, anonAccess: false },
      v_product_stock_from_batches: { securityInvoker: true, anonAccess: true },
    },
    functions: {
      'public.is_staff()': { securityDefiner: true, returns: 'boolean', anonCallable: false },
      'public.is_admin()': { securityDefiner: true, returns: 'boolean', anonCallable: false },
      'public.set_user_role(uuid,text)': { securityDefiner: true, searchPath: 'public', aal2Required: true, finalAdminProtected: true },
      'public.process_audit_log()': { securityDefiner: true, searchPathSafe: true },
    },
    deprecatedFunctionsRevoked: [
      'decrement_stock',
      'deduct_stock_fefo',
      'replace_product_batches',
      'mark_order_line_packed',
      'add_consignment_item',
      'record_consignment_scan',
    ],
    storage: {
      'product-images': {
        publicRead: true,
        noPublicUpload: true,
        noPublicUpdate: true,
        noPublicDelete: true,
        maxFileSize: 10485760, // 10 MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      },
    },
    realtime: {
      excludedTables: ['products_old'],
      staffScopedTables: ['product_drafts'],
    },
    expectedMigrations: [
      '20260809_operations_hardening',
      '20260810_security_boundary_hardening',
      '20260810_deprecated_rpc_lockdown',
      '20260812_map017_public_write_boundary_hardening',
    ],
  }
}

/**
 * Parses and validates an external schema export document.
 * Fails closed if the input is malformed, missing required keys, or contains unsafe structures.
 */
export function parseSchemaExport(rawInput) {
  if (!rawInput) {
    throw new Error('SCHEMA_EXPORT_EMPTY: Supplied schema export input is empty or null.')
  }

  let parsed
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput)
    } catch (err) {
      throw new Error(`SCHEMA_EXPORT_INVALID_JSON: Failed to parse schema export JSON: ${err.message}`)
    }
  } else if (typeof rawInput === 'object') {
    parsed = rawInput
  } else {
    throw new Error('SCHEMA_EXPORT_TYPE_ERROR: Schema export must be a JSON string or parsed object.')
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
    throw new Error('SCHEMA_EXPORT_FORMAT_ERROR: Root of schema export must be an object.')
  }

  const requiredSections = ['tables', 'views', 'functions', 'policies', 'grants', 'storage', 'realtime']
  const missingSections = requiredSections.filter((section) => !(section in parsed))

  if (missingSections.length > 0) {
    throw new Error(`SCHEMA_EXPORT_INCOMPLETE: Missing required sections: ${missingSections.join(', ')}`)
  }

  return redactObject(parsed)
}

/**
 * Normalize policies list from either array or object schema representation.
 */
function normalizePolicies(policiesData) {
  if (Array.isArray(policiesData)) {
    return policiesData
  }
  if (typeof policiesData === 'object' && policiesData !== null) {
    const list = []
    for (const [tableName, tablePolicies] of Object.entries(policiesData)) {
      if (Array.isArray(tablePolicies)) {
        for (const p of tablePolicies) {
          list.push({ table_name: tableName, ...p })
        }
      }
    }
    return list
  }
  return []
}

/**
 * Normalize grants list from either array or object schema representation.
 */
function normalizeGrants(grantsData) {
  if (Array.isArray(grantsData)) {
    return grantsData
  }
  if (typeof grantsData === 'object' && grantsData !== null) {
    const list = []
    for (const [tableName, tableGrants] of Object.entries(grantsData)) {
      if (Array.isArray(tableGrants)) {
        for (const g of tableGrants) {
          list.push({ table_name: tableName, ...g })
        }
      }
    }
    return list
  }
  return []
}

/**
 * Deterministically compares a live schema export against expected repository schema.
 */
export function compareSchemaTruth(liveExport, expectedSchema = buildExpectedRepositorySchema()) {
  const issues = []

  // 1. Audit Tables & RLS & Grants & Policies
  const liveTables = liveExport.tables || {}
  const liveGrants = normalizeGrants(liveExport.grants)
  const livePolicies = normalizePolicies(liveExport.policies)

  for (const [tableName, expected] of Object.entries(expectedSchema.tables)) {
    const tableKey = tableName.includes('.') ? tableName : `public.${tableName}`
    const liveTable = liveTables[tableName] || liveTables[tableKey]

    if (!liveTable) {
      issues.push({
        type: 'TABLE_MISSING',
        severity: expected.legacyIsolated ? SEVERITY.INFO : SEVERITY.HIGH,
        target: `public.${tableName}`,
        message: `Expected table public.${tableName} is not present in schema export.`,
      })
      continue
    }

    if (expected.rlsEnabled && !liveTable.rlsEnabled) {
      issues.push({
        type: 'RLS_DISABLED',
        severity: SEVERITY.CRITICAL,
        target: `public.${tableName}`,
        message: `Row Level Security is DISABLED on public.${tableName}.`,
      })
    }

    // Check grants for anonymous DML
    const tableGrants = liveGrants.filter((g) => g.table_name === tableName || g.table_name === `public.${tableName}`)
    const anonTableGrants = tableGrants
      .filter((g) => (g.grantee === 'anon' || g.grantee === 'public') && ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(g.privilege))
      .map((g) => g.privilege)

    if (expected.noAnonDML && anonTableGrants.length > 0) {
      issues.push({
        type: 'ANON_DML_GRANTED',
        severity: SEVERITY.CRITICAL,
        target: `public.${tableName}`,
        message: `Direct anonymous DML privileges granted on public.${tableName}: ${anonTableGrants.join(', ')}.`,
      })
    }

    // Check policies for blanket public or unconstrained authenticated write
    const tablePolicies = livePolicies.filter((p) => p.table_name === tableName || p.table_name === `public.${tableName}`)
    for (const policy of tablePolicies) {
      const policyName = policy.policy_name || policy.name
      const roles = policy.roles || []
      const isPublicRole = roles.includes('public') || roles.includes('anon')
      const isAuthenticatedRole = roles.includes('authenticated')
      const isWriteCommand = ['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(policy.command)
      const usingExpr = (policy.using_expression || policy.using || '').trim()
      const withCheckExpr = (policy.with_check_expression || policy.withCheck || '').trim()
      const isBlanketTrue = usingExpr === 'true' || withCheckExpr === 'true'

      if (isPublicRole && isWriteCommand && isBlanketTrue) {
        issues.push({
          type: 'BLANKET_PUBLIC_WRITE_POLICY',
          severity: SEVERITY.CRITICAL,
          target: `public.${tableName}.${policyName}`,
          message: `Permissive public write policy detected on public.${tableName}: "${policyName}" (${policy.command} USING/WITH CHECK true).`,
        })
      } else if (isAuthenticatedRole && isWriteCommand && isBlanketTrue && expected.staffScoped) {
        issues.push({
          type: 'BLANKET_AUTHENTICATED_WRITE_POLICY',
          severity: SEVERITY.CRITICAL,
          target: `public.${tableName}.${policyName}`,
          message: `Permissive authenticated write policy without staff scoping on public.${tableName}: "${policyName}" (${policy.command} USING/WITH CHECK true).`,
        })
      }
    }
  }

  // 2. Audit Views & Security Invoker
  const liveViews = liveExport.views || {}
  for (const [viewName, expected] of Object.entries(expectedSchema.views)) {
    const viewKey = viewName.includes('.') ? viewName : `public.${viewName}`
    const liveView = liveViews[viewName] || liveViews[viewKey]
    if (!liveView) {
      issues.push({
        type: 'VIEW_MISSING',
        severity: SEVERITY.MEDIUM,
        target: `public.${viewName}`,
        message: `Expected view public.${viewName} is not present in schema export.`,
      })
      continue
    }

    if (expected.securityInvoker && !liveView.securityInvoker) {
      issues.push({
        type: 'SECURITY_INVOKER_MISSING',
        severity: SEVERITY.HIGH,
        target: `public.${viewName}`,
        message: `Operational view public.${viewName} does not have security_invoker = true (may bypass RLS).`,
      })
    }
  }

  // 3. Audit Functions & Deprecated RPC Lockdowns & Search Paths
  const liveFunctions = liveExport.functions || {}
  for (const deprecatedName of expectedSchema.deprecatedFunctionsRevoked) {
    const fn = Object.entries(liveFunctions).find(([k]) => k.includes(deprecatedName))
    if (fn) {
      const [signature, details] = fn
      const grants = details.grants || []
      const clientExecutable = grants.some((g) => ['anon', 'public', 'authenticated'].includes(g.grantee))
      if (clientExecutable && !details.disabled) {
        issues.push({
          type: 'DEPRECATED_RPC_ACTIVE',
          severity: SEVERITY.HIGH,
          target: signature.includes('.') ? signature : `public.${signature}`,
          message: `Deprecated mutation RPC ${signature} is still executable by client roles.`,
        })
      }
    }
  }

  // 4. Audit Storage Policies & Bucket Limits
  const liveStorage = liveExport.storage || {}
  for (const [bucketId, expected] of Object.entries(expectedSchema.storage)) {
    const bucket = liveStorage.buckets?.[bucketId]
    if (!bucket) {
      issues.push({
        type: 'STORAGE_BUCKET_MISSING',
        severity: SEVERITY.HIGH,
        target: `storage.buckets.${bucketId}`,
        message: `Storage bucket "${bucketId}" not found in schema export.`,
      })
      continue
    }

    if (expected.maxFileSize && (!bucket.file_size_limit || bucket.file_size_limit > expected.maxFileSize)) {
      issues.push({
        type: 'STORAGE_LIMIT_MISSING',
        severity: SEVERITY.HIGH,
        target: `storage.buckets.${bucketId}`,
        message: `Storage bucket "${bucketId}" lacks enforced max file size limit (expected <= ${expected.maxFileSize} bytes, got ${bucket.file_size_limit}).`,
      })
    }

    if (expected.allowedMimeTypes && (!bucket.allowed_mime_types || bucket.allowed_mime_types.length === 0)) {
      issues.push({
        type: 'STORAGE_MIME_ALLOWLIST_MISSING',
        severity: SEVERITY.HIGH,
        target: `storage.buckets.${bucketId}`,
        message: `Storage bucket "${bucketId}" has no allowed MIME type restriction.`,
      })
    }

    // Check storage policies for unauthenticated public writes
    const bucketPolicies = liveStorage.policies || []
    for (const policy of bucketPolicies) {
      const pName = policy.policy_name || policy.name || ''
      const roles = policy.roles || []
      const isPublic = roles.includes('public') || roles.includes('anon') || /anyone/i.test(pName)
      const isWrite = ['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(policy.command) || /upload|update|delete/i.test(pName)

      if (isPublic && isWrite && expected.noPublicUpload) {
        issues.push({
          type: 'STORAGE_PUBLIC_WRITE_POLICY',
          severity: SEVERITY.CRITICAL,
          target: `storage.objects.${pName || 'unnamed_public_policy'}`,
          message: `Legacy permissive write policy "${pName}" present on storage bucket "${bucketId}".`,
        })
      }
    }
  }

  // 5. Audit Realtime Publications
  const liveRealtime = liveExport.realtime || {}
  const realtimeTables = liveRealtime.publication_tables || []
  for (const excludedTable of expectedSchema.realtime.excludedTables) {
    if (realtimeTables.includes(excludedTable)) {
      issues.push({
        type: 'REALTIME_EXCLUDED_TABLE_PRESENT',
        severity: SEVERITY.HIGH,
        target: `supabase_realtime.${excludedTable}`,
        message: `Legacy table public.${excludedTable} is published in supabase_realtime publication.`,
      })
    }
  }

  const criticalCount = issues.filter((i) => i.severity === SEVERITY.CRITICAL).length
  const highCount = issues.filter((i) => i.severity === SEVERITY.HIGH).length

  return {
    timestamp: new Date().toISOString(),
    clean: issues.length === 0,
    criticalCount,
    highCount,
    totalIssues: issues.length,
    issues,
    summary: {
      tablesChecked: Object.keys(expectedSchema.tables).length,
      viewsChecked: Object.keys(expectedSchema.views).length,
      storageBucketsChecked: Object.keys(expectedSchema.storage).length,
      status: issues.length === 0 ? 'CONFORMANT' : criticalCount > 0 ? 'NON_CONFORMANT_CRITICAL' : 'DRIFT_DETECTED',
    },
  }
}

/**
 * Format the comparison result into a clean markdown or console report.
 */
export function formatSchemaTruthReport(diffResult, { format = 'markdown' } = {}) {
  if (format === 'json') {
    return JSON.stringify(diffResult, null, 2)
  }

  const lines = []
  lines.push('# Schema-Truth Audit Report (MAP-017)')
  lines.push('')
  lines.push(`**Generated:** ${diffResult.timestamp}`)
  lines.push(`**Overall Status:** ${diffResult.clean ? 'CONFORMANT (No drift detected)' : diffResult.summary.status}`)
  lines.push(`**Total Findings:** ${diffResult.totalIssues} (Critical: ${diffResult.criticalCount}, High: ${diffResult.highCount})`)
  lines.push('')
  lines.push('## Executive Summary')
  lines.push('')
  lines.push(`- Tables audited: ${diffResult.summary.tablesChecked}`)
  lines.push(`- Views audited: ${diffResult.summary.viewsChecked}`)
  lines.push(`- Storage buckets audited: ${diffResult.summary.storageBucketsChecked}`)
  lines.push('')

  if (diffResult.issues.length === 0) {
    lines.push('✓ All inspected schema objects, RLS settings, grants, views, storage policies, and realtime publications conform to repository truth.')
  } else {
    lines.push('## Findings by Severity')
    lines.push('')
    lines.push('| Severity | Issue Type | Target | Details |')
    lines.push('| --- | --- | --- | --- |')
    for (const issue of diffResult.issues) {
      lines.push(`| **${issue.severity}** | \`${issue.type}\` | \`${issue.target}\` | ${sanitizeSchemaText(issue.message)} |`)
    }
  }

  lines.push('')
  lines.push('---')
  lines.push('*No credentials, tokens, or private data were printed or stored in this audit.*')
  return lines.join('\n')
}
