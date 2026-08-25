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
  const staffMutation = {
    securityDefiner: true,
    anonCallable: false,
    searchPathSafe: true,
    authorizationGuard: 'is_staff',
    stateMutation: true,
    ownershipScope: 'canonical_staff_operations',
    aal2Required: false,
    safeFailure: 'transaction_atomic_exception',
    disposition: 'replace_with_admin_bff_command',
  }
  const adminAal2Mutation = {
    securityDefiner: true,
    anonCallable: false,
    searchPathSafe: true,
    authorizationGuard: 'admin_role',
    stateMutation: true,
    ownershipScope: 'admin_security_operation',
    aal2Required: true,
    safeFailure: 'transaction_atomic_exception',
    disposition: 'retain_behind_admin_bff',
  }

  return {
    version: '2026-08-22.map017.meta.v2',
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
      'public.is_staff()': { securityDefiner: true, returns: 'boolean', anonCallable: false, searchPathSafe: true },
      'public.is_admin()': { securityDefiner: true, returns: 'boolean', anonCallable: false, searchPathSafe: true },
      'public.set_user_role(uuid,text)': { securityDefiner: true, anonCallable: false, searchPathSafe: true, authorizationGuard: 'is_admin', aal2Required: true, finalAdminProtected: true },
      'public.process_audit_log()': { securityDefiner: true, anonCallable: false, searchPathSafe: true },
      'public.get_public_product_stock()': { securityDefiner: true, anonCallable: true, searchPathSafe: true },
    },
    // These live RPCs are reviewed authorization surfaces, not permanent schema
    // requirements. Most are transitional direct staff mutations that MAP-019/
    // MAP-020 will replace with Admin BFF commands and may then revoke.
    functionAuthorizationContracts: {
      'public.has_delete_pin()': {
        securityDefiner: true, returns: 'boolean', anonCallable: false, searchPathSafe: true,
        authorizationGuard: 'admin_role', stateMutation: false,
        ownershipScope: 'admin_security_operation', aal2Required: true,
        idempotency: 'read_only', safeFailure: 'explicit_exception',
        disposition: 'retain_behind_admin_bff',
      },
      'public.set_delete_pin(text)': {
        ...adminAal2Mutation,
        idempotency: 'repeat_safe_but_audited',
      },
      'public.delete_products_with_pin_v2(text[],text,text,uuid)': {
        ...adminAal2Mutation,
        idempotency: 'request_id_and_payload_hash',
      },
      'public.add_consignment_item_v2(uuid,text,text,text,date,integer)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.advance_consignment(uuid,text)': { ...staffMutation, idempotency: 'state_transition_guarded' },
      'public.create_consignment_manifest(text,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.finalize_consignment_receipt(uuid,text)': { ...staffMutation, idempotency: 'terminal_state_replay_safe' },
      'public.record_consignment_item_scan(uuid,uuid,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.append_internal_message(uuid,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.mark_conversation_read(uuid)': { ...staffMutation, idempotency: 'state_assignment_replay_safe' },
      'public.update_conversation_workflow(uuid,text,text,uuid,timestampwithtimezone,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.cancel_order_request(uuid,text)': { ...staffMutation, idempotency: 'terminal_state_replay_safe' },
      'public.confirm_order_request(uuid,text)': { ...staffMutation, idempotency: 'terminal_state_replay_safe' },
      'public.fulfill_order_request(uuid,text)': { ...staffMutation, idempotency: 'terminal_state_replay_safe' },
      'public.record_packing_scan(uuid,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.set_order_delivery_details(uuid,numeric,text,text,text,boolean,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.set_order_request_payment_status(uuid,text,text)': { ...staffMutation, idempotency: 'state_transition_guarded' },
      'public.reconcile_product_batches(text,jsonb,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.set_batch_clearance_approval(uuid,boolean,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.transfer_inventory_custody(text,text,text,text)': { ...staffMutation, idempotency: 'required_at_bff', disposition: 'revoke_after_exact_lot_cutover' },
      'public.transfer_inventory_custody_exact(uuid,integer,text,text,text)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.save_pasabuy_quote(uuid,numeric,numeric,text,timestampwithtimezone,numeric,text,numeric,numeric,numeric,numeric,numeric,timestampwithtimezone)': { ...staffMutation, idempotency: 'required_at_bff' },
      'public.transition_pasabuy_request(uuid,text,text)': { ...staffMutation, idempotency: 'state_transition_guarded' },
      'public.verify_internal_channel_event(text,text,text)': { ...staffMutation, idempotency: 'required_at_bff' },
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

  const requiredSections = [
    'schemas',
    'tables',
    'columns',
    'constraints',
    'indexes',
    'sequences',
    'triggers',
    'views',
    'materialized_views',
    'functions',
    'policies',
    'grants',
    'schema_grants',
    'default_privileges',
    'storage',
    'realtime',
    'migrations',
  ]
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

function matchesPublicRelation(record, relationName) {
  const schema = String(record.schema_name || record.table_schema || '').toLowerCase()
  if (schema && schema !== 'public') return false
  const target = record.table_name || record.view_name || ''
  return target === relationName || target === `public.${relationName}`
}

/**
 * Reads a boolean that may arrive in either shape. Fabricated fixtures use
 * camelCase; the live `export-schema-metadata.sql` inventory uses the
 * snake_case spelling of the underlying pg_catalog column. Reading only one
 * spelling silently yields undefined for the other source, which reports every
 * table as RLS-disabled and every view as missing security_invoker.
 */
function readFlag(source, camelKey, snakeKey) {
  if (!source || typeof source !== 'object') return undefined
  return source[camelKey] ?? source[snakeKey]
}

function normalizedSignature(signature) {
  return String(signature || '').replaceAll(' ', '').toLowerCase()
}

function functionDetails(liveFunctions, expectedSignature) {
  const expected = normalizedSignature(expectedSignature)
  return Object.entries(liveFunctions).find(([signature]) => normalizedSignature(signature) === expected)
}

/**
 * A SECURITY DEFINER function is safe when its search_path cannot be shadowed by
 * an untrusted role. This rejects `$user`, which resolves to a caller-controlled
 * schema.
 *
 * It deliberately does NOT reject `pg_temp`: naming pg_temp explicitly and last
 * is the PostgreSQL-documented hardening, because pg_temp is searched first when
 * it is not named at all. `public.process_audit_log()` uses that form correctly.
 *
 * It also accepts a plain `search_path=public`. That rests on one verifiable
 * assumption: no untrusted role may CREATE in `public`. Measured on the live
 * database 22 August 2026 — only `pg_database_owner` holds CREATE on `public`,
 * so `anon` and `authenticated` cannot plant shadowing objects. If that grant
 * ever changes, every `search_path=public` function becomes shadowable and this
 * check must tighten to require `search_path=""`.
 */
function hasSafeFixedSearchPath(details) {
  const configured = details.searchPath ?? details.search_path_config
  if (typeof configured !== 'string' || configured.trim() === '') return false
  const normalized = configured.trim().replace(/^search_path\s*=\s*/i, '')
  return !/\$user/i.test(normalized)
}

const WRITE_PRIVILEGES = new Set([
  'ALL', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN',
])

function collectionEntries(collection) {
  if (Array.isArray(collection)) return collection.map((value, index) => [String(index), value])
  if (collection && typeof collection === 'object') return Object.entries(collection)
  return []
}

function recordSchema(key, details) {
  const explicit = details?.schema_name || details?.table_schema
  if (explicit) return String(explicit).toLowerCase()
  return String(key).includes('.') ? String(key).split('.', 1)[0].toLowerCase() : 'public'
}

function recordName(key, details, fields) {
  for (const field of fields) if (details?.[field]) return String(details[field])
  const value = String(key)
  return value.includes('.') ? value.slice(value.indexOf('.') + 1) : value
}

/**
 * Exhaustively audits every relation and function currently present in the
 * exposed `public` schema. The canonical expected schema still asserts exact
 * contracts for reviewed objects; this pass prevents an unlisted object from
 * escaping simply because it was absent from that hand-maintained subset.
 */
export function auditExposedAuthorization(liveExport, expectedSchema = buildExpectedRepositorySchema()) {
  const issues = []
  const liveGrants = normalizeGrants(liveExport.grants)
  const livePolicies = normalizePolicies(liveExport.policies)
  const reviewedTables = new Set(Object.keys(expectedSchema.tables).map((name) => name.replace(/^public\./, '')))
  const reviewedViews = new Set(Object.keys(expectedSchema.views).map((name) => name.replace(/^public\./, '')))
  const reviewedFunctions = new Map([
    ...Object.entries(expectedSchema.functions || {}),
    ...Object.entries(expectedSchema.functionAuthorizationContracts || {}),
  ].map(([signature, contract]) => [normalizedSignature(signature), contract]))

  const publicTables = collectionEntries(liveExport.tables).filter(([key, details]) => recordSchema(key, details) === 'public')
  const publicViews = collectionEntries(liveExport.views).filter(([key, details]) => recordSchema(key, details) === 'public')
  const publicFunctions = collectionEntries(liveExport.functions).filter(([key, details]) => recordSchema(key, details) === 'public')

  for (const [key, table] of publicTables) {
    const tableName = recordName(key, table, ['table_name'])
    if (!reviewedTables.has(tableName) && !readFlag(table, 'rlsEnabled', 'rls_enabled')) {
      issues.push({
        type: 'EXPOSED_TABLE_RLS_DISABLED', severity: SEVERITY.CRITICAL,
        target: `public.${tableName}`,
        message: `Unlisted exposed table public.${tableName} has Row Level Security disabled.`,
      })
    }

    if (!reviewedTables.has(tableName)) {
      const anonymousWrites = liveGrants.filter((grant) =>
        matchesPublicRelation(grant, tableName)
        && ['anon', 'public'].includes(String(grant.grantee || '').toLowerCase())
        && WRITE_PRIVILEGES.has(String(grant.privilege || '').toUpperCase()),
      ).map((grant) => String(grant.privilege).toUpperCase())
      if (anonymousWrites.length > 0) {
        issues.push({
          type: 'ANON_DML_GRANTED', severity: SEVERITY.CRITICAL,
          target: `public.${tableName}`,
          message: `Direct anonymous write-capable privileges granted on unlisted public.${tableName}: ${[...new Set(anonymousWrites)].join(', ')}.`,
        })
      }
    }
  }

  for (const policy of livePolicies.filter((item) => String(item.schema_name || 'public').toLowerCase() === 'public')) {
    const tableName = String(policy.table_name || '')
    if (reviewedTables.has(tableName)) continue
    const roles = (policy.roles || []).map((role) => String(role).toLowerCase())
    const command = String(policy.command || '').toUpperCase()
    const usingExpr = String(policy.using_expression || policy.using || '').trim().toLowerCase()
    const checkExpr = String(policy.with_check_expression || policy.withCheck || '').trim().toLowerCase()
    const blanketWrite = WRITE_PRIVILEGES.has(command) && (usingExpr === 'true' || checkExpr === 'true')
    if (blanketWrite && roles.some((role) => ['public', 'anon'].includes(role))) {
      issues.push({
        type: 'BLANKET_PUBLIC_WRITE_POLICY', severity: SEVERITY.CRITICAL,
        target: `public.${tableName}.${policy.policy_name || policy.name || 'unnamed'}`,
        message: `Unlisted exposed relation public.${tableName} has a blanket anonymous/public write policy.`,
      })
    } else if (blanketWrite && roles.includes('authenticated')) {
      issues.push({
        type: 'BLANKET_AUTHENTICATED_WRITE_POLICY', severity: SEVERITY.CRITICAL,
        target: `public.${tableName}.${policy.policy_name || policy.name || 'unnamed'}`,
        message: `Unlisted exposed relation public.${tableName} allows every authenticated identity to write.`,
      })
    }
  }

  for (const [key, view] of publicViews) {
    const viewName = recordName(key, view, ['view_name'])
    const grants = liveGrants.filter((grant) => matchesPublicRelation(grant, viewName))
    const clientWrites = grants.filter((grant) =>
      ['public', 'anon', 'authenticated'].includes(String(grant.grantee || '').toLowerCase())
      && WRITE_PRIVILEGES.has(String(grant.privilege || '').toUpperCase()),
    )
    if (clientWrites.length > 0) {
      issues.push({
        type: 'VIEW_CLIENT_DML_GRANTED', severity: SEVERITY.CRITICAL,
        target: `public.${viewName}`,
        message: `Client roles hold write-capable privileges on view public.${viewName}: ${clientWrites.map((g) => `${g.grantee}:${g.privilege}`).join(', ')}.`,
      })
    }
    if (!reviewedViews.has(viewName)) {
      if (!readFlag(view, 'securityInvoker', 'security_invoker')) {
        issues.push({
          type: 'SECURITY_INVOKER_MISSING', severity: SEVERITY.HIGH,
          target: `public.${viewName}`,
          message: `Unlisted exposed view public.${viewName} does not enforce security_invoker = true.`,
        })
      }
      const anonSelect = grants.some((grant) =>
        ['public', 'anon'].includes(String(grant.grantee || '').toLowerCase())
        && ['SELECT', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
      )
      if (anonSelect) {
        issues.push({
          type: 'VIEW_ANON_ACCESS_UNREVIEWED', severity: SEVERITY.HIGH,
          target: `public.${viewName}`,
          message: `Unlisted view public.${viewName} is anonymously selectable without an explicit reviewed contract.`,
        })
      }
    }
  }

  for (const [key, fn] of publicFunctions) {
    const signature = fn.signature || (String(key).startsWith('public.') ? String(key) : `public.${key}`)
    const contract = reviewedFunctions.get(normalizedSignature(signature))
    const grants = Array.isArray(fn.grants) ? fn.grants : []
    const publicExecute = grants.some((grant) =>
      String(grant.grantee || '').toLowerCase() === 'public'
      && ['EXECUTE', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    const anonExecute = grants.some((grant) =>
      String(grant.grantee || '').toLowerCase() === 'anon'
      && ['EXECUTE', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    const authenticatedExecute = grants.some((grant) =>
      String(grant.grantee || '').toLowerCase() === 'authenticated'
      && ['EXECUTE', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    if (publicExecute) {
      issues.push({
        type: 'FUNCTION_PUBLIC_EXECUTE_GRANTED', severity: SEVERITY.CRITICAL,
        target: signature,
        message: `Function ${signature} retains PostgreSQL PUBLIC execute instead of an exact role grant.`,
      })
    }
    if (!contract && anonExecute) {
      issues.push({
        type: 'FUNCTION_ANON_EXECUTE_UNREVIEWED', severity: SEVERITY.CRITICAL,
        target: signature,
        message: `Unlisted function ${signature} is directly executable by anonymous callers.`,
      })
    }
    if (!contract && authenticatedExecute && !publicExecute && !anonExecute) {
      issues.push({
        type: 'FUNCTION_AUTHORIZATION_UNREVIEWED', severity: SEVERITY.HIGH,
        target: signature,
        message: `Authenticated execution of ${signature} lacks an explicit function-level authorization contract in MAP-017.`,
      })
    }
    if (contract?.authorizationGuard && authenticatedExecute) {
      const guardSignals = {
        is_staff: fn.references_is_staff,
        is_admin: fn.references_is_admin,
        admin_role: fn.references_admin_role,
      }
      const guardSignal = guardSignals[contract.authorizationGuard]
      if (typeof guardSignal !== 'boolean') {
        issues.push({
          type: 'FUNCTION_GUARD_EVIDENCE_MISSING', severity: SEVERITY.HIGH,
          target: signature,
          message: `Function ${signature} has a reviewed ${contract.authorizationGuard} contract, but the metadata export lacks its non-sensitive live guard signal.`,
        })
      } else if (!guardSignal) {
        issues.push({
          type: 'FUNCTION_AUTHORIZATION_GUARD_MISSING', severity: SEVERITY.CRITICAL,
          target: signature,
          message: `Function ${signature} is authenticated-callable but its live body does not contain the reviewed ${contract.authorizationGuard} authorization guard.`,
        })
      }
    }
    if (contract?.aal2Required && authenticatedExecute) {
      if (typeof fn.references_aal2 !== 'boolean') {
        issues.push({
          type: 'FUNCTION_AAL2_EVIDENCE_MISSING', severity: SEVERITY.HIGH,
          target: signature,
          message: `Function ${signature} requires AAL2, but the metadata export lacks its non-sensitive live AAL2 signal.`,
        })
      } else if (!fn.references_aal2) {
        issues.push({
          type: 'FUNCTION_AAL2_GUARD_MISSING', severity: SEVERITY.CRITICAL,
          target: signature,
          message: `Function ${signature} is authenticated-callable but its live body does not enforce the reviewed AAL2 requirement.`,
        })
      }
    }
    const securityDefiner = fn.securityDefiner ?? fn.security_definer
    if (!contract && securityDefiner === true && !hasSafeFixedSearchPath(fn)) {
      issues.push({
        type: 'FUNCTION_SEARCH_PATH_UNSAFE', severity: SEVERITY.HIGH,
        target: signature,
        message: `Unlisted SECURITY DEFINER function ${signature} lacks a fixed safe search_path.`,
      })
    }
  }

  for (const grant of liveExport.schema_grants || []) {
    if (!['public', 'storage'].includes(String(grant.schema_name || '').toLowerCase())) continue
    if (!['public', 'anon', 'authenticated'].includes(String(grant.grantee || '').toLowerCase())) continue
    if (String(grant.privilege || '').toUpperCase() !== 'CREATE') continue
    issues.push({
      type: 'EXPOSED_SCHEMA_CLIENT_CREATE', severity: SEVERITY.CRITICAL,
      target: `${grant.schema_name}.${grant.grantee}`,
      message: `Client role ${grant.grantee} can CREATE objects in exposed schema ${grant.schema_name}.`,
    })
  }

  const unsafeDefaultGroups = new Map()
  for (const grant of liveExport.default_privileges || []) {
    const role = String(grant.grantee || '').toLowerCase()
    const schemaName = String(grant.schema_name || '').toLowerCase()
    const objectType = String(grant.object_type || '').toUpperCase()
    const privilege = String(grant.privilege || '').toUpperCase()
    if (schemaName !== 'public') continue
    if (!['public', 'anon', 'authenticated'].includes(role)) continue
    const unsafe = (objectType === 'FUNCTION' && ['EXECUTE', 'ALL'].includes(privilege))
      || (['TABLE', 'SEQUENCE'].includes(objectType) && (WRITE_PRIVILEGES.has(privilege) || privilege === 'USAGE'))
      || (objectType === 'SCHEMA' && privilege === 'CREATE')
    if (unsafe) {
      const key = `${schemaName}.${grant.owner}.${role}.${objectType}`
      const group = unsafeDefaultGroups.get(key) || { ...grant, schemaName, role, objectType, privileges: [] }
      group.privileges.push(privilege)
      unsafeDefaultGroups.set(key, group)
    }
  }
  for (const [target, group] of unsafeDefaultGroups) {
    issues.push({
      type: 'UNSAFE_DEFAULT_PRIVILEGE', severity: SEVERITY.CRITICAL,
      target,
      message: `Default privileges automatically grant ${[...new Set(group.privileges)].sort().join(', ')} on future ${group.objectType} objects in public to ${group.role}.`,
    })
  }

  return {
    issues,
    summary: {
      exposedTablesAudited: publicTables.length,
      exposedViewsAudited: publicViews.length,
      exposedFunctionsAudited: publicFunctions.length,
      schemaGrantsAudited: (liveExport.schema_grants || []).length,
      defaultPrivilegesAudited: (liveExport.default_privileges || []).length,
    },
  }
}

/**
 * Deterministically compares a live schema export against expected repository schema.
 */
export function compareSchemaTruth(liveExport, expectedSchema = buildExpectedRepositorySchema()) {
  const exhaustive = auditExposedAuthorization(liveExport, expectedSchema)
  const issues = [...exhaustive.issues]

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

    if (expected.rlsEnabled && !readFlag(liveTable, 'rlsEnabled', 'rls_enabled')) {
      issues.push({
        type: 'RLS_DISABLED',
        severity: SEVERITY.CRITICAL,
        target: `public.${tableName}`,
        message: `Row Level Security is DISABLED on public.${tableName}.`,
      })
    }

    // Check grants for anonymous DML
    const tableGrants = liveGrants.filter((grant) => matchesPublicRelation(grant, tableName))
    const anonTableGrants = tableGrants
      .filter((g) => (g.grantee === 'anon' || g.grantee === 'public') && WRITE_PRIVILEGES.has(String(g.privilege || '').toUpperCase()))
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
    const tablePolicies = livePolicies.filter((policy) => matchesPublicRelation(policy, tableName))
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

    if (expected.securityInvoker && !readFlag(liveView, 'securityInvoker', 'security_invoker')) {
      issues.push({
        type: 'SECURITY_INVOKER_MISSING',
        severity: SEVERITY.HIGH,
        target: `public.${viewName}`,
        message: `Operational view public.${viewName} does not have security_invoker = true (may bypass RLS).`,
      })
    }

    const viewGrants = liveGrants.filter((grant) => matchesPublicRelation(grant, viewName))
    const anonCanSelect = viewGrants.some((grant) =>
      ['anon', 'public'].includes(String(grant.grantee || '').toLowerCase())
      && ['SELECT', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    if (expected.anonAccess === false && anonCanSelect) {
      issues.push({
        type: 'VIEW_ANON_ACCESS_GRANTED',
        severity: SEVERITY.HIGH,
        target: `public.${viewName}`,
        message: `Operational view public.${viewName} is directly selectable by an anonymous/public role.`,
      })
    } else if (expected.anonAccess === true && !anonCanSelect) {
      issues.push({
        type: 'VIEW_ANON_ACCESS_MISSING',
        severity: SEVERITY.MEDIUM,
        target: `public.${viewName}`,
        message: `Reviewed public view public.${viewName} lacks its expected anonymous SELECT grant.`,
      })
    }
  }

  // 3. Audit Functions & Deprecated RPC Lockdowns & Search Paths
  const liveFunctions = liveExport.functions || {}
  for (const [expectedSignature, expected] of Object.entries(expectedSchema.functions)) {
    const match = functionDetails(liveFunctions, expectedSignature)
    if (!match) {
      issues.push({
        type: 'FUNCTION_MISSING',
        severity: SEVERITY.HIGH,
        target: expectedSignature,
        message: `Required authorization function ${expectedSignature} is not present in the schema export.`,
      })
      continue
    }

    const [liveSignature, details] = match
    const securityDefiner = details.securityDefiner ?? details.security_definer
    if (expected.securityDefiner === true && securityDefiner !== true) {
      issues.push({
        type: 'FUNCTION_SECURITY_DEFINER_MISMATCH',
        severity: SEVERITY.HIGH,
        target: liveSignature,
        message: `Required function ${liveSignature} is not marked SECURITY DEFINER as expected.`,
      })
    }
    if (expected.searchPathSafe && !hasSafeFixedSearchPath(details)) {
      issues.push({
        type: 'FUNCTION_SEARCH_PATH_UNSAFE',
        severity: SEVERITY.HIGH,
        target: liveSignature,
        message: `SECURITY DEFINER function ${liveSignature} lacks a fixed safe search_path.`,
      })
    }
    const grants = Array.isArray(details.grants) ? details.grants : []
    const anonCallable = grants.some((grant) =>
      ['anon', 'public'].includes(String(grant.grantee || '').toLowerCase())
      && ['EXECUTE', 'ALL'].includes(String(grant.privilege || '').toUpperCase()),
    )
    if (expected.anonCallable === false && anonCallable) {
      issues.push({
        type: 'FUNCTION_ANON_EXECUTE_GRANTED',
        severity: SEVERITY.CRITICAL,
        target: liveSignature,
        message: `Sensitive function ${liveSignature} is executable by an anonymous/public role.`,
      })
    } else if (expected.anonCallable === true && !anonCallable) {
      issues.push({
        type: 'FUNCTION_ANON_EXECUTE_MISSING',
        severity: SEVERITY.MEDIUM,
        target: liveSignature,
        message: `Reviewed public function ${liveSignature} lacks its expected anonymous EXECUTE grant.`,
      })
    }
    const returnType = details.returns ?? details.return_type
    if (expected.returns && String(returnType || '').toLowerCase() !== expected.returns.toLowerCase()) {
      issues.push({
        type: 'FUNCTION_RETURN_TYPE_MISMATCH',
        severity: SEVERITY.MEDIUM,
        target: liveSignature,
        message: `Function ${liveSignature} return type does not match the reviewed contract.`,
      })
    }
  }

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
    const bucketPolicies = liveStorage.policies || livePolicies.filter((policy) =>
      policy.schema_name === 'storage' && policy.table_name === 'objects',
    )
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

  // The repository names migrations `<YYYYMMDD>_<slug>`, while the applied ledger
  // stores the Supabase CLI's `<YYYYMMDDHHMMSS>` version plus a separate name.
  // Matching the version string exactly therefore reports every genuinely applied
  // migration as missing. An entry counts as applied when its slug matches, so a
  // real absence is still reported.
  const liveMigrations = (liveExport.migrations || []).map((entry) =>
    typeof entry === 'string'
      ? { version: entry, name: '' }
      : { version: String(entry.version || ''), name: String(entry.name || '') },
  )
  const migrationSlug = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/^\d{8,14}[_-]?/, '')
      .replace(/[_-]?\d{8,14}$/, '')
      .replace(/[^a-z0-9]/g, '')
  const isMigrationApplied = (expectedVersion) => {
    const expectedSlug = migrationSlug(expectedVersion)
    return liveMigrations.some((entry) =>
      entry.version === expectedVersion ||
      (expectedSlug !== '' &&
        (migrationSlug(entry.name) === expectedSlug || migrationSlug(entry.version) === expectedSlug)),
    )
  }
  for (const expectedVersion of expectedSchema.expectedMigrations) {
    if (!isMigrationApplied(expectedVersion)) {
      issues.push({
        type: 'MIGRATION_LEDGER_ENTRY_MISSING',
        severity: SEVERITY.HIGH,
        target: expectedVersion,
        message: `Required migration ledger entry ${expectedVersion} is absent from the supplied export.`,
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
      functionsChecked: Object.keys(expectedSchema.functions).length,
      migrationsChecked: expectedSchema.expectedMigrations.length,
      storageBucketsChecked: Object.keys(expectedSchema.storage).length,
      ...exhaustive.summary,
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
  lines.push(`- Functions audited: ${diffResult.summary.functionsChecked}`)
  lines.push(`- Required migration entries audited: ${diffResult.summary.migrationsChecked}`)
  lines.push(`- Storage buckets audited: ${diffResult.summary.storageBucketsChecked}`)
  lines.push(`- Exhaustive public tables audited: ${diffResult.summary.exposedTablesAudited}`)
  lines.push(`- Exhaustive public views audited: ${diffResult.summary.exposedViewsAudited}`)
  lines.push(`- Exhaustive public functions audited: ${diffResult.summary.exposedFunctionsAudited}`)
  lines.push(`- Schema grants audited: ${diffResult.summary.schemaGrantsAudited}`)
  lines.push(`- Default privileges audited: ${diffResult.summary.defaultPrivilegesAudited}`)
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
