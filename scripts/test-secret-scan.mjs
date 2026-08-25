import assert from "node:assert/strict"
import { scanText } from "./secret-scan-core.mjs"

const fabricatedJwt = [
  "eyJ" + "a".repeat(24),
  "b".repeat(24),
  "c".repeat(24),
].join(".")

const cases = [
  ["fabricated JWT", fabricatedJwt, "jwt"],
  ["Supabase secret", `sb_secret_${"x".repeat(24)}`, "supabase-secret-key"],
  ["AWS access key", "AKIA" + "A".repeat(16), "aws-access-key"],
  ["Google API key", "AIza" + "A".repeat(35), "google-api-key"],
  ["Slack token", ["xoxb", "1".repeat(12), "A".repeat(24)].join("-"), "slack-token"],
  ["SendGrid API key", ["SG", "A".repeat(20), "B".repeat(32)].join("."), "sendgrid-api-key"],
  ["Stripe restricted key", "rk_live_" + "A".repeat(24), "stripe-secret"],
  ["Google OAuth client secret", "GOCSPX-" + "A".repeat(28), "google-oauth-client-secret"],
  ["Google OAuth refresh token", "1//" + "A".repeat(32), "google-oauth-refresh-token"],
  ["npm access token", "npm_" + "A".repeat(36), "npm-access-token"],
  ["GitLab access token", "glpat-" + "A".repeat(24), "gitlab-access-token"],
  ["Shopify access token", "shpat_" + "a".repeat(32), "shopify-access-token"],
  ["Twilio API key", "SK" + "a".repeat(32), "twilio-api-key"],
  ["Mailgun API key", "key-" + "a".repeat(32), "mailgun-api-key"],
  ["Meta access token", "EAA" + "A".repeat(48), "meta-access-token"],
  ["Slack webhook", ["https://hooks.slack.com/services", "A".repeat(9), "B".repeat(9), "C".repeat(24)].join("/"), "slack-webhook"],
  ["Discord webhook", ["https://discord.com/api/webhooks", "1".repeat(18), "A".repeat(32)].join("/"), "discord-webhook"],
  ["Telegram bot token", "1".repeat(9) + ":" + "A".repeat(35), "telegram-bot-token"],
  ["Sentry auth token", "sntrys_" + "A".repeat(32), "sentry-auth-token"],
  ["Anthropic API key", "sk-ant-" + "A".repeat(32), "anthropic-api-key"],
  ["Hugging Face token", "hf_" + "A".repeat(32), "huggingface-token"],
  ["Groq API key", "gsk_" + "A".repeat(32), "groq-api-key"],
  ["Resend API key", "re_" + "A".repeat(32), "resend-api-key"],
  ["Azure Storage key", "AccountKey=" + "A".repeat(44), "azure-storage-key"],
  ["credentialed HTTP URL", ["https://", "operator", ":", "not-a-real-password", "@api.internal/k2"].join(""), "credentialed-http-url"],
  ["private key", ["-----BEGIN", "PRIVATE KEY-----"].join(" "), "private-key"],
  [
    "database URL",
    ["postgres", "://", "operator", ":", "not-a-real-password", "@db.internal:5432/k2"].join(""),
    "credentialed-database-url",
  ],
]

const privateKeyHeaders = ["", "RSA", "EC", "OPENSSH", "DSA", "ENCRYPTED"].map((kind) =>
  ["-----BEGIN", kind ? `${kind} PRIVATE KEY-----` : "PRIVATE KEY-----"].join(" "),
)

function databaseUrl(username, password, hostname, database = "example") {
  return ["postgres", "://", username, ":", password, "@", hostname, ":5432/", database].join("")
}

for (const [name, value, rule] of cases) {
  const findings = scanText(value, "fabricated-test")
  assert.equal(findings.some((finding) => finding.rule === rule), true, `${name} was not detected`)
}

for (const header of privateKeyHeaders) {
  assert.equal(
    scanText(header, "private-key-header-test").some((finding) => finding.rule === "private-key"),
    true,
    `${header} was not detected`,
  )
}

// Regression tests: prove each credential type is detected even when the same line contains placeholder markers
const placeholderMarkers = [
  "example",
  "placeholder",
  "[redacted]",
  "your-",
  "leave-unset",
  "generate-a-unique",
]

for (const marker of placeholderMarkers) {
  for (const [name, value, rule] of cases) {
    const lineWithMarkerPrefix = `// ${marker} setting: ${value}`
    const findingsPrefix = scanText(lineWithMarkerPrefix, "marker-prefix-test")
    assert.equal(
      findingsPrefix.some((finding) => finding.rule === rule),
      true,
      `${name} was missed when line contained prefix marker "${marker}"`,
    )

    const lineWithMarkerSuffix = `${value} // ${marker} comment`
    const findingsSuffix = scanText(lineWithMarkerSuffix, "marker-suffix-test")
    assert.equal(
      findingsSuffix.some((finding) => finding.rule === rule),
      true,
      `${name} was missed when line contained suffix marker "${marker}"`,
    )
  }
}

// All placeholder markers combined on the same line with a real credential
for (const [name, value, rule] of cases) {
  const combinedLine = `// example placeholder [redacted] your- leave-unset generate-a-unique: ${value}`
  const findings = scanText(combinedLine, "combined-markers-test")
  assert.equal(
    findings.some((finding) => finding.rule === rule),
    true,
    `${name} was missed when line contained all placeholder markers combined`,
  )
}

// Documented non-secret placeholders must not trigger false positives
assert.deepEqual(
  scanText("SUPABASE_SECRET_KEY=your-supabase-secret-key-here", ".env.example"),
  [],
  "documented placeholders must not fail the scan",
)

assert.deepEqual(
  scanText("SUPABASE_SECRET_KEY=placeholder-key-leave-unset", ".env.example"),
  [],
  "documented non-credential placeholders must not fail the scan",
)

// Obvious localhost / documentation database URLs must not fail the scan
assert.deepEqual(
  scanText("DATABASE_URL=postgres://user:password@localhost:5432/example", "example.md"),
  [],
  "obvious localhost documentation examples must not fail the scan",
)

assert.deepEqual(
  scanText("DATABASE_URL=postgres://user:password@127.0.0.1:5432/example", "example.md"),
  [],
  "obvious 127.0.0.1 documentation examples must not fail the scan",
)

assert.deepEqual(
  scanText("DATABASE_URL=postgres://user:password@host:5432/example", "example.md"),
  [],
  "obvious @host: documentation examples must not fail the scan",
)

for (const hostname of ["localhost", "127.0.0.1", "host", "example.com", "db.example.com"]) {
  assert.deepEqual(
    scanText(`DATABASE_URL=${databaseUrl("user", "password", hostname)}`, "example.md"),
    [],
    `exact documentation credentials on ${hostname} must not fail the scan`,
  )

  assert.equal(
    scanText(`DATABASE_URL=${databaseUrl("user", "real-secret-value", hostname, "production")}`, "secret-leak.env")
      .some((finding) => finding.rule === "credentialed-database-url"),
    true,
    `non-placeholder password on ${hostname} must fail the scan`,
  )

  assert.equal(
    scanText(`DATABASE_URL=${databaseUrl("operator", "password", hostname, "production")}`, "secret-leak.env")
      .some((finding) => finding.rule === "credentialed-database-url"),
    true,
    `non-placeholder username on ${hostname} must fail the scan`,
  )
}

assert.deepEqual(
  scanText(['SERVICE_URL=https://', 'user', ':', 'password', '@example.com/api'].join(''), 'example.md'),
  [],
  'exact documentation HTTP credentials must not fail the scan',
)

assert.equal(
  scanText(['SERVICE_URL=https://', 'operator', ':', 'real-secret-value', '@example.com/api'].join(''), 'secret-leak.env')
    .some((finding) => finding.rule === 'credentialed-http-url'),
  true,
  'credentialed HTTP URL with non-placeholder credentials must fail',
)

for (const hostname of ["evil-example.com", "example.com.attacker.test", "localhost.attacker.test"]) {
  assert.equal(
    scanText(`DATABASE_URL=${databaseUrl("user", "password", hostname, "production")}`, "secret-leak.env")
      .some((finding) => finding.rule === "credentialed-database-url"),
    true,
    `documentation-host lookalike ${hostname} must fail the scan`,
  )
}

// Allowlisted public publishable anon key must not fail the scan
const allowlistedAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeHBsY2pxaXZsZmZsaWNrb2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NDE3MDMsImV4cCI6MjEwMDAxNzcwM30.54pox0CPCC3BZJrgSk9U-xlb-o8Xe-5zWU3V43k4hEM"
assert.deepEqual(
  scanText(`VITE_SUPABASE_ANON_KEY=${allowlistedAnonKey}`, "client-bundle.js"),
  [],
  "allowlisted public publishable anon key must not fail the scan",
)

assert.deepEqual(
  scanText(`VITE_SUPABASE_ANON_KEY=${allowlistedAnonKey} // example [redacted] placeholder your-`, "client-bundle.js"),
  [],
  "allowlisted public publishable anon key with comments must not fail the scan",
)

// Unallowlisted JWTs must always fail the scan
const unallowlistedJwt = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeHBsY2pxaXZsZmZsaWNrb2JmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ0MTcwMywiZXhwIjoyMTAwMDE3NzAzfQ",
  "unallowlisted-signature-value-here",
].join(".")

assert.equal(
  scanText(`SUPABASE_SERVICE_ROLE_KEY=${unallowlistedJwt}`, "secret-leak.js").length > 0,
  true,
  "unallowlisted service-role or secret JWT must fail the scan",
)

assert.equal(
  scanText(`SUPABASE_SERVICE_ROLE_KEY=${unallowlistedJwt} // example [redacted] placeholder your-`, "secret-leak.js").length > 0,
  true,
  "unallowlisted JWT must fail even with placeholder markers on the same line",
)

// Multiple credentials on the same line: allowlisted key + unallowlisted JWT
assert.equal(
  scanText(`PUBLIC_KEY=${allowlistedAnonKey} PRIVATE_KEY=${unallowlistedJwt}`, "mixed-line.js").length > 0,
  true,
  "unallowlisted JWT must fail even when an allowlisted key is on the same line",
)

// Multiple credentials on the same line: allowlisted key + sb_secret_
assert.equal(
  scanText(`PUBLIC_KEY=${allowlistedAnonKey} SECRET=sb_secret_${"y".repeat(24)}`, "mixed-line.js").length > 0,
  true,
  "Supabase secret key must fail even when an allowlisted key is on the same line",
)

console.log("Secret scanner tests passed (fabricated values only).")
