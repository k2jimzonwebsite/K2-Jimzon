const PATTERNS = [
  { id: "private-key", pattern: /-----BEGIN (?:(?:RSA|EC|OPENSSH|DSA|ENCRYPTED) )?PRIVATE KEY-----/g },
  { id: "supabase-secret-key", pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g },
  { id: "stripe-live-secret", pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/g },
  { id: "openai-secret", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g },
  { id: "github-token", pattern: /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { id: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g },
  {
    id: "credentialed-database-url",
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@[^\s]+/gi,
  },
]

const ALLOWLISTED_PUBLIC_KEYS = new Set([
  // Project pixplcjqivlfflickobf public Supabase anon key (publishable client identifier)
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeHBsY2pxaXZsZmZsaWNrb2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NDE3MDMsImV4cCI6MjEwMDAxNzcwM30.54pox0CPCC3BZJrgSk9U-xlb-o8Xe-5zWU3V43k4hEM",
])

const DOCUMENTATION_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "host",
  "example.com",
  "db.example.com",
])

const DOCUMENTATION_DATABASE_USERS = new Set([
  "user",
  "username",
  "db_user",
])

const DOCUMENTATION_DATABASE_PASSWORDS = new Set([
  "password",
  "pass",
  "your-password",
  "your_password",
  "db_password",
  "placeholder",
])

function decodedUrlComponent(value) {
  try {
    return decodeURIComponent(value).toLowerCase()
  } catch {
    return ""
  }
}

function isPlaceholderDatabaseUrl(value) {
  try {
    const parsed = new URL(value)
    const hostname = parsed.hostname.toLowerCase()
    const username = decodedUrlComponent(parsed.username)
    const password = decodedUrlComponent(parsed.password)

    return (
      DOCUMENTATION_DATABASE_HOSTS.has(hostname) &&
      DOCUMENTATION_DATABASE_USERS.has(username) &&
      DOCUMENTATION_DATABASE_PASSWORDS.has(password)
    )
  } catch {
    return false
  }
}

export function looksBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192))
  return sample.includes(0)
}

export function scanText(text, file = "") {
  const findings = []
  const lines = text.split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    for (const rule of PATTERNS) {
      rule.pattern.lastIndex = 0
      const matches = line.matchAll(rule.pattern)
      for (const matchObj of matches) {
        const match = matchObj[0]
        if (rule.id === "jwt") {
          if (ALLOWLISTED_PUBLIC_KEYS.has(match)) {
            continue
          }
          findings.push({ file, line: index + 1, rule: rule.id })
        } else if (rule.id === "credentialed-database-url") {
          if (isPlaceholderDatabaseUrl(match)) {
            continue
          }
          findings.push({ file, line: index + 1, rule: rule.id })
        } else {
          findings.push({ file, line: index + 1, rule: rule.id })
        }
      }
    }
  }

  return findings
}
