import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(f=>f&&fs.existsSync(f)))]
const source=files.filter(f=>/^(src|server|prepared-api|api|supabase|scripts|tests)\//.test(f)&&/\.(jsx?|tsx?|mjs|sql)$/.test(f))
const manifest=source.map(file=>{const bytes=fs.readFileSync(file);return {file,bytes:bytes.length,lines:bytes.toString('utf8').split('\n').length,sha256:createHash('sha256').update(bytes).digest('hex')}})
const assets=files.filter(f=>f.startsWith('public/')).map(file=>({file,bytes:fs.statSync(file).size,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))
const groups=Map.groupBy(assets,a=>a.sha256)
const duplicateAssets=[...groups.values()].filter(a=>a.length>1)
const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'))
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFiles:source.length,sourceLines:manifest.reduce((sum,f)=>sum+f.lines,0),sourceByRoot:Object.fromEntries([...Map.groupBy(source,f=>f.split('/')[0])].map(([k,v])=>[k,v.length])),largestSource:[...manifest].sort((a,b)=>b.lines-a.lines).slice(0,15),largestPublicAssets:[...assets].sort((a,b)=>b.bytes-a.bytes).slice(0,15),duplicateAssets,dependencies:packageJson.dependencies,devDependencies:packageJson.devDependencies,lintScript:packageJson.scripts.lint||null,typecheckScript:packageJson.scripts.typecheck||null}
fs.writeFileSync(new URL('inventory.json',import.meta.url),JSON.stringify(report,null,2))
fs.writeFileSync(new URL('source-manifest.json',import.meta.url),JSON.stringify(manifest,null,2))
console.log(JSON.stringify(report,null,2))
