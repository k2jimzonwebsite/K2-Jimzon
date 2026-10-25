import fs from 'node:fs'
const results = []
for (const target of ['storefront','admin']) {
  const host = target === 'storefront' ? 'https://www.k2jimzon.com' : 'https://admin.k2jimzon.com'
  const config = JSON.parse(fs.readFileSync(`vercel.${target}.json`,'utf8'))
  const headers = (config.headers || []).flatMap(rule => rule.headers || [])
  const policy = headers.find(row => row.key.toLowerCase() === 'content-security-policy-report-only')?.value
  const page = await fetch(host)
  const markerResponse = await fetch(`${host}/k2-build-target.json`)
  const marker = await markerResponse.json()
  const security = Object.fromEntries(['content-security-policy-report-only','strict-transport-security','x-content-type-options','x-frame-options','referrer-policy'].map(name => [name,page.headers.get(name)]))
  const pass = page.status === 200 && markerResponse.status === 200 && marker.target === target && security['content-security-policy-report-only'] === policy && Boolean(security['strict-transport-security']) && security['x-content-type-options'] === 'nosniff' && security['x-frame-options'] === 'DENY' && security['referrer-policy'] === 'strict-origin-when-cross-origin'
  results.push({target,host,observedAt:new Date().toISOString(),pageStatus:page.status,markerStatus:markerResponse.status,marker,security,cspMatchesSource:security['content-security-policy-report-only']===policy,pass})
}
fs.writeFileSync(process.argv[2],JSON.stringify(results,null,2)+'\n')
console.log(results.map(({target,pageStatus,pass})=>({target,pageStatus,pass})))
if(results.some(r=>!r.pass))process.exitCode=1
