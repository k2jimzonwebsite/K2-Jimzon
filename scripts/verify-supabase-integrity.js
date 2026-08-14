import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('   K2 JIMZON SUPABASE INTEGRITY AUDIT (MAP-000)     ')
console.log('====================================================\n')

let failures = 0

function check(name, condition, failureMessage) {
  if (condition) {
    console.log(`[PASS] ${name}`)
  } else {
    console.error(`[FAIL] ${name}: ${failureMessage}`)
    failures++
  }
}

// 1. Check supabase/config.toml
const configPath = path.join(rootDir, 'supabase', 'config.toml')
const configExists = fs.existsSync(configPath)
check('Supabase CLI config.toml exists', configExists, 'supabase/config.toml is missing')
if (configExists) {
  const configContent = fs.readFileSync(configPath, 'utf8')
  check(
    'Supabase project_id matches pixplcjqivlfflickobf',
    configContent.includes('project_id = "pixplcjqivlfflickobf"'),
    'project_id in config.toml is incorrect'
  )
}

// 2. Check .gitignore for .temp
const gitignorePath = path.join(rootDir, '.gitignore')
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
check(
  '.gitignore excludes supabase/.temp/',
  gitignoreContent.includes('supabase/.temp/'),
  'supabase/.temp/ is not listed in .gitignore'
)

// 3. Check .env.example secret isolation
const envExamplePath = path.join(rootDir, '.env.example')
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8')
const invalidViteSecrets = [
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_GEMINI_API_KEY',
  'VITE_SHOPEE_PARTNER_KEY',
  'VITE_LAZADA_APP_SECRET',
  'VITE_TIKTOK_APP_SECRET',
  'VITE_ENCRYPTION_SECRET'
]
const foundLeakedViteEnvs = invalidViteSecrets.filter(secret => envExampleContent.includes(secret))
check(
  '.env.example isolates server secrets (no VITE_ secret prefixes)',
  foundLeakedViteEnvs.length === 0,
  `Found leaked VITE_ secret templates in .env.example: ${foundLeakedViteEnvs.join(', ')}`
)

// 4. Check supabaseClient.js fail-fast checks
const clientPath = path.join(rootDir, 'src', 'lib', 'supabaseClient.js')
const clientContent = fs.readFileSync(clientPath, 'utf8')
check(
  'supabaseClient.js contains production fail-fast error checks',
  clientContent.includes('env.PROD') && clientContent.includes('throw new Error'),
  'supabaseClient.js does not throw error in PROD when env vars are missing'
)

// 5. Check database.types.js
const typesPath = path.join(rootDir, 'src', 'types', 'database.types.js')
check(
  'database.types.js schema contract exists',
  fs.existsSync(typesPath),
  'src/types/database.types.js is missing'
)

// 6. Scan src directory for service role key or secret leaks
function scanSrcForSecrets(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      scanSrcForSecrets(fullPath)
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8')
      if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        check(
          `No client file references SUPABASE_SERVICE_ROLE_KEY`,
          false,
          `Found SUPABASE_SERVICE_ROLE_KEY reference in ${fullPath}`
        )
      }
    }
  }
}
scanSrcForSecrets(path.join(rootDir, 'src'))

// 7. Edge Functions must not depend on the compromised legacy service-role env.
const functionsDir = path.join(rootDir, 'supabase', 'functions')
const legacyEdgeFunctionConsumers = []
function scanEdgeFunctions(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      scanEdgeFunctions(fullPath)
    } else if (file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8')
      if (content.includes("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')") ||
          content.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")')) {
        legacyEdgeFunctionConsumers.push(path.relative(rootDir, fullPath))
      }
    }
  }
}
scanEdgeFunctions(functionsDir)
check(
  'Edge Functions use modern Supabase secret-key environment',
  legacyEdgeFunctionConsumers.length === 0,
  `Legacy service-role consumers: ${legacyEdgeFunctionConsumers.join(', ')}`
)

console.log('\n----------------------------------------------------')
if (failures === 0) {
  console.log(' ALL MAP-000 INTEGRITY CHECKS PASSED SUCCESSFULLY!')
  console.log('----------------------------------------------------\n')
  process.exit(0)
} else {
  console.error(` ${failures} INTEGRITY CHECK(S) FAILED.`)
  console.log('----------------------------------------------------\n')
  process.exit(1)
}
