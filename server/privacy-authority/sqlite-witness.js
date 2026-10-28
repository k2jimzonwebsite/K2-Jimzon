import { canonicalJson, validateCheckpoint } from './state.js'

function refuse(code = 'AUTHORITY_INTEGRITY') { throw Object.assign(new Error(code), { code }) }
const tables = { requests: 'closure_requests', actors: 'closure_actors', operations: 'closure_operations', protections: 'closure_protections' }

// Dedicated derived witness only. No business records, keys or remote I/O.
// The journal, not this adapter, proves that an incoming state was sealed.
export function createSqliteWitness({ storage, genesisId }) {
  storage.transactionSync(() => {
    storage.sql.exec('CREATE TABLE IF NOT EXISTS closure_control (id INTEGER PRIMARY KEY CHECK (id = 1), body TEXT NOT NULL)')
    for (const table of Object.values(tables)) storage.sql.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, body TEXT NOT NULL)`)
  })
  function readFull() {
    const row = storage.sql.exec('SELECT body FROM closure_control WHERE id = 1').toArray()[0]
    if (!row) {
      for (const table of Object.values(tables)) if (storage.sql.exec(`SELECT id FROM ${table} LIMIT 1`).toArray().length) refuse()
      return null
    }
    const state = JSON.parse(row.body)
    if (state.projectRef !== 'pixplcjqivlfflickobf' || state.genesisId !== genesisId) refuse()
    for (const [section, table] of Object.entries(tables)) {
      state[section] = Object.fromEntries(storage.sql.exec(`SELECT id, body FROM ${table}`).toArray().map(item => [item.id, JSON.parse(item.body)]))
    }
    return state
  }
  return {
    async read() {
      const state = storage.transactionSync(readFull)
      if (state !== null) await validateCheckpoint(state, genesisId)
      return state
    },
    async advance(inputState) {
      const state = structuredClone(inputState)
      await validateCheckpoint(state, genesisId)
      const observed = storage.transactionSync(readFull)
      if (observed !== null) await validateCheckpoint(observed, genesisId)
      const saved = storage.transactionSync(() => {
        const previous = readFull()
        // Validation awaited hashing. If another event advanced meanwhile,
        // leave its transaction untouched and let the journal reconcile it.
        if (canonicalJson(previous) !== canonicalJson(observed)) refuse('AUTHORITY_PENDING')
        if (previous && previous.revision > state.revision) return previous
        if (previous && previous.revision === state.revision) {
          if (canonicalJson(previous) !== canonicalJson(state)) refuse()
          return previous
        }
        if (previous) for (const [id, operation] of Object.entries(previous.operations)) {
          if (!state.operations[id] || canonicalJson(operation) !== canonicalJson(state.operations[id])) refuse()
        }
        const { requests: _requests, actors: _actors, operations: _operations, protections: _protections, ...control } = state
        storage.sql.exec('INSERT INTO closure_control (id, body) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body', canonicalJson(control))
        for (const [section, table] of Object.entries(tables)) {
          storage.sql.exec(`DELETE FROM ${table}`)
          for (const [id, body] of Object.entries(state[section])) storage.sql.exec(`INSERT INTO ${table} (id, body) VALUES (?, ?)`, id, canonicalJson(body))
        }
        return state
      })
      await validateCheckpoint(saved, genesisId)
      // Cloudflare's sync() flushes pending writes before an acknowledgment.
      // Native synchronous SQLite fixtures implement it as an explicit no-op.
      await storage.sync()
      return saved
    },
  }
}
