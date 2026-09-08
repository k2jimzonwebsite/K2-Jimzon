import fs from 'node:fs'
import vm from 'node:vm'
fs.mkdirSync('.tools/readiness-audit-20260906',{recursive:true})
const source=fs.readFileSync('src/main.jsx','utf8')
const start=source.indexOf("window.addEventListener('vite:preloadError'")
const end=source.indexOf('\n\ncreateRoot(',start)
let callback,now=20000,reloads=0;const saved=new Map()
if(start>=0)vm.runInNewContext(source.slice(start,end),{window:{addEventListener:(_,fn)=>{callback=fn},location:{reload:()=>reloads++}},sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},Date:{now:()=>now},Number})
for(let n=0;n<3;n++){callback?.({preventDefault(){}});now+=11000}
const catalog=fs.readFileSync('src/components/CatalogGrid.jsx','utf8')
const compare=catalog.slice(catalog.indexOf('return [...result].sort('),catalog.indexOf('\n  }, [products'))
const run=new Function('result','sortBy',compare)
const products=[{id:'old',created_at:'2026-09-01',srp:200},{id:'new',created_at:'2026-09-06',srp:100}]
const evidence={chunkErrorsSpacedElevenSecondsApart:3,reloads,latestSort:run(products,'latest').map(p=>p.id),expectedLatest:['new','old'],scope:'executed extracted current source with fabricated state; no real deployment failures induced'}
fs.writeFileSync('.tools/readiness-audit-20260906/logic-probes.json',JSON.stringify(evidence,null,2));console.log(evidence)
