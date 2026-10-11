// MAP-018 / IDEA-20261009-11: local fixture transport only.
export async function readFixtureAdminHttpBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 4 * 1024 * 1024) throw new Error('FIXTURE_BODY_TOO_LARGE')
    chunks.push(chunk)
  }
  const bytes = Buffer.concat(chunks)
  return new URL(req.url, 'http://127.0.0.1').pathname === '/api/admin/product-intake/evidence'
    ? bytes : bytes.toString('utf8')
}
