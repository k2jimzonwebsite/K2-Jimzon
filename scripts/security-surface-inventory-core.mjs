const PATTERNS = [
  ['table', /(?:\bsupabase|\bclient|authorized\.client)\s*\.\s*from\(\s*(['"`])([^'"`\r\n]+)\1/g],
  ['rpc', /(?:\bsupabase|\bclient|authorized\.client)\s*\.\s*rpc\(\s*(['"`])([^'"`\r\n]+)\1/g],
  ['storage', /(?:\bsupabase|\bclient|authorized\.client)\s*\.\s*storage\s*\.\s*from\(\s*(['"`])([^'"`\r\n]+)\1/g],
  ['realtime', /\bsupabase\s*\.\s*channel\(\s*(['"`])([^'"`\r\n]+)\1/g],
  ['edge_function', /\bsupabase\s*\.\s*functions\s*\.\s*invoke\(\s*(['"`])([^'"`\r\n]+)\1/g],
  ['api_request', /\b(?:fetch|adminRequest|storefrontRequest)\(\s*(['"`])(\/api\/[^'"`\r\n]+)\1/g],
]

const DYNAMIC_PATTERNS = [
  ['table', /(?:\bsupabase|\bclient|authorized\.client)\s*\.\s*from\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g],
  ['rpc', /(?:\bsupabase|\bclient|authorized\.client)\s*\.\s*rpc\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g],
  ['storage', /(?:\bsupabase|\bclient|authorized\.client)\s*\.\s*storage\s*\.\s*from\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g],
  ['realtime', /\bsupabase\s*\.\s*channel\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g],
  ['edge_function', /\bsupabase\s*\.\s*functions\s*\.\s*invoke\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g],
]

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length
}

function snippetAt(source, index) {
  return source.slice(index, index + 160).split(/\r?\n/, 1)[0].trim()
}

export function scanSecuritySurfaceText(source, file = '<memory>') {
  const operations = []
  for (const [kind, pattern] of PATTERNS) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      const interpolatedPart = kind === 'api_request' ? match[2].split('?')[0] : match[2]
      operations.push({ kind, target: match[2], file, line: lineAt(source, match.index), dynamic: interpolatedPart.includes('${') })
    }
  }
  const authPattern = /(?:\bsupabase|\bclient|callerClient|authorized\.client)\s*\.\s*auth\s*\.\s*([A-Za-z][A-Za-z0-9_]*)\s*\(/g
  for (const match of source.matchAll(authPattern)) {
    operations.push({ kind: 'auth', target: match[1], file, line: lineAt(source, match.index), dynamic: false })
  }
  for (const [kind, pattern] of DYNAMIC_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      const identifier = match[1]
      const declaration = source.match(new RegExp(`\\bconst\\s+${identifier}\\s*=\\s*(['\"\\x60])([^'\"\\x60\\r\\n]+)\\1`))
      if (declaration) {
        operations.push({ kind, target: declaration[2], file, line: lineAt(source, match.index), dynamic: false })
        continue
      }
      operations.push({
        kind, target: '[dynamic]', file, line: lineAt(source, match.index), dynamic: true,
        expression: snippetAt(source, match.index),
      })
    }
  }
  return operations.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind))
}

export function summarizeSecuritySurfaces(operations) {
  const summary = {}
  for (const operation of operations) summary[operation.kind] = (summary[operation.kind] || 0) + 1
  return Object.fromEntries(Object.entries(summary).sort(([a], [b]) => a.localeCompare(b)))
}

function splitSqlParameters(parameters) {
  const values = []
  let depth = 0
  let current = ''
  for (const character of parameters) {
    if (character === '(' || character === '[') depth += 1
    if (character === ')' || character === ']') depth = Math.max(0, depth - 1)
    if (character === ',' && depth === 0) {
      values.push(current)
      current = ''
    } else current += character
  }
  if (current.trim()) values.push(current)
  return values
}

function normalizeSqlSignature(name, parameters = '', definitionParameters = false) {
  const qualified = String(name).replaceAll('"', '').includes('.')
    ? String(name).replaceAll('"', '')
    : `public.${String(name).replaceAll('"', '')}`
  const normalizedParameters = splitSqlParameters(parameters).map((parameter) => {
    let value = parameter.replace(/\s+/g, ' ').trim().toLowerCase()
      .replace(/\s+default\s+[\s\S]*$/i, '').replace(/\s*=\s*[\s\S]*$/, '')
    if (definitionParameters) {
      value = value.replace(/^(?:inout|in|out|variadic)\s+/, '')
      const tokens = value.split(' ')
      value = tokens.length > 1 ? tokens.slice(1).join(' ') : value
    }
    return value.replace(/\bint4\b|\bint\b/g, 'integer')
      .replace(/\bint8\b/g, 'bigint')
      .replace(/\bbool\b/g, 'boolean')
      .replace(/\bdecimal\b/g, 'numeric')
  }).filter(Boolean).join(',')
  return `${qualified.toLowerCase()}(${normalizedParameters})`
}

export function scanSqlSecuritySurfaceText(source, file = '<memory>') {
  const definitions = []
  const grants = []
  const hardenings = []
  const jobs = []
  const publications = []
  const policies = []

  const definitionPattern = /create\s+(or\s+replace\s+)?function\s+([a-zA-Z0-9_."]+)\s*\(([\s\S]*?)\)\s*returns\s+([\s\S]*?)(?=\bas\s+\$[a-zA-Z0-9_]*\$)/gi
  for (const match of source.matchAll(definitionPattern)) {
    const attributes = match[4]
    definitions.push({
      signature: normalizeSqlSignature(match[2], match[3], true),
      file,
      line: lineAt(source, match.index),
      orReplace: Boolean(match[1]),
      securityDefiner: /\bsecurity\s+definer\b/i.test(attributes),
      fixedSearchPath: /\bset\s+search_path\s*=/i.test(attributes),
    })
  }

  const hardeningPattern = /alter\s+function\s+([a-zA-Z0-9_."]+)\s*\(([\s\S]*?)\)\s+set\s+search_path\s*=/gi
  for (const match of source.matchAll(hardeningPattern)) {
    hardenings.push({
      signature: normalizeSqlSignature(match[1], match[2]),
      file,
      line: lineAt(source, match.index),
    })
  }

  const grantPattern = /(grant|revoke)\s+(all|execute)\s+on\s+function\s+([a-zA-Z0-9_."]+)\s*\(([\s\S]*?)\)\s+(to|from)\s+([^;]+);/gi
  for (const match of source.matchAll(grantPattern)) {
    grants.push({
      action: match[1].toLowerCase(),
      privilege: match[2].toLowerCase(),
      signature: normalizeSqlSignature(match[3], match[4]),
      roles: match[6].split(',').map((role) => role.trim().replaceAll('"', '').toLowerCase()).filter(Boolean),
      file,
      line: lineAt(source, match.index),
    })
  }

  const jobPattern = /(?:cron\.schedule|schedule)\s*\(\s*(['"])([^'"]+)\1/gi
  for (const match of source.matchAll(jobPattern)) {
    jobs.push({ name: match[2], file, line: lineAt(source, match.index) })
  }

  const publicationPattern = /alter\s+publication\s+([a-zA-Z0-9_."]+)\s+(add|drop)\s+table\s+([a-zA-Z0-9_."]+)/gi
  for (const match of source.matchAll(publicationPattern)) {
    publications.push({
      publication: match[1].replaceAll('"', '').toLowerCase(),
      action: match[2].toLowerCase(),
      table: match[3].replaceAll('"', '').toLowerCase(),
      file,
      line: lineAt(source, match.index),
    })
  }

  const policyPattern = /create\s+policy\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))\s+on\s+([a-zA-Z0-9_."]+)/gi
  for (const match of source.matchAll(policyPattern)) {
    policies.push({
      name: match[1] || match[2],
      table: match[3].replaceAll('"', '').toLowerCase(),
      file,
      line: lineAt(source, match.index),
    })
  }

  return { definitions, grants, hardenings, jobs, publications, policies }
}

export function deriveSqlEffectiveFunctionAccess(sqlInventory) {
  const events = [
    ...sqlInventory.definitions.map((item) => ({ ...item, event: 'definition' })),
    ...sqlInventory.grants.map((item) => ({ ...item, event: item.action })),
  ].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  const access = new Map()
  for (const event of events) {
    if (event.event === 'definition') {
      const prior = access.get(event.signature)
      access.set(event.signature, {
        signature: event.signature,
        roles: event.orReplace && prior ? prior.roles : new Set(['public']),
      })
      continue
    }
    const current = access.get(event.signature) || { signature: event.signature, roles: new Set() }
    for (const role of event.roles) {
      if (event.event === 'grant') current.roles.add(role)
      else current.roles.delete(role)
    }
    access.set(event.signature, current)
  }
  return [...access.values()].map((item) => ({
    signature: item.signature,
    roles: [...item.roles].sort(),
  })).sort((a, b) => a.signature.localeCompare(b.signature))
}

export function evaluateSqlFunctionAccessPolicy(effectiveAccess, expectedAnonFunctions = []) {
  const expectedAnon = new Set(expectedAnonFunctions)
  const publicFunctions = effectiveAccess
    .filter((item) => item.roles.includes('public')).map((item) => item.signature).sort()
  const anonFunctions = effectiveAccess
    .filter((item) => item.roles.includes('anon')).map((item) => item.signature).sort()
  const actualAnon = new Set(anonFunctions)
  return {
    publicFunctions,
    anonFunctions,
    unexpectedAnonFunctions: anonFunctions.filter((signature) => !expectedAnon.has(signature)),
    missingExpectedAnonFunctions: [...expectedAnon].filter((signature) => !actualAnon.has(signature)).sort(),
  }
}

export function summarizeSqlSecuritySurfaces(sqlInventory) {
  const uniqueFunctions = new Set(sqlInventory.definitions.map((item) => item.signature))
  const orderedFunctionEvents = [
    ...sqlInventory.definitions.map((item) => ({ ...item, event: 'definition' })),
    ...(sqlInventory.hardenings || []).map((item) => ({ ...item, event: 'hardening' })),
  ].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  const effectiveFunctions = new Map()
  for (const event of orderedFunctionEvents) {
    if (event.event === 'definition') effectiveFunctions.set(event.signature, { ...event })
    else if (effectiveFunctions.has(event.signature)) effectiveFunctions.get(event.signature).fixedSearchPath = true
  }
  const unsafeDefiners = [...effectiveFunctions.values()]
    .filter((item) => item.securityDefiner && !item.fixedSearchPath)
  const effectiveAccess = deriveSqlEffectiveFunctionAccess(sqlInventory)
  return {
    functionDefinitionOccurrences: sqlInventory.definitions.length,
    uniqueFunctionSignatures: uniqueFunctions.size,
    functionGrantEvents: sqlInventory.grants.filter((item) => item.action === 'grant').length,
    functionRevokeEvents: sqlInventory.grants.filter((item) => item.action === 'revoke').length,
    functionSearchPathHardeningEvents: (sqlInventory.hardenings || []).length,
    effectiveSecurityDefinerWithoutFixedSearchPath: unsafeDefiners.length,
    effectiveFunctionsWithPublicExecute: effectiveAccess.filter((item) => item.roles.includes('public')).length,
    effectiveFunctionsWithAnonExecute: effectiveAccess.filter((item) => item.roles.includes('anon')).length,
    effectiveFunctionsWithAuthenticatedExecute: effectiveAccess.filter((item) => item.roles.includes('authenticated')).length,
    effectiveFunctionsWithServiceRoleExecute: effectiveAccess.filter((item) => item.roles.includes('service_role')).length,
    scheduledJobs: sqlInventory.jobs.length,
    publicationChanges: sqlInventory.publications.length,
    policyDefinitions: sqlInventory.policies.length,
    storagePolicyDefinitions: sqlInventory.policies.filter((item) => item.table === 'storage.objects').length,
  }
}
