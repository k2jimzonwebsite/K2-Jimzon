// MAP-018: separate owned loopback Storefront process, no provider fallback.
import assert from 'node:assert/strict'
import http from 'node:http'
import {createServer} from 'vite'
assert.equal(process.env.SUPABASE_URL,'https://127.0.0.1:54395')
assert.equal(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_URL)
assert.equal(process.env.VITE_SUPABASE_PUBLIC_KEY,process.env.SUPABASE_PUBLISHABLE_KEY)
assert.equal(process.env.K2_DEPLOYMENT_TARGET,'storefront')
assert.equal(process.env.K2_GUEST_BFF_SECRET,Buffer.alloc(32,1).toString('base64'))
const {default:handler}=await import('../api/storefront/index.js')
const vite=await createServer({mode:'storefront',configLoader:'runner',server:{middlewareMode:true,hmr:false,watch:null},logLevel:'error'})
const server=http.createServer((req,res)=>{
 if(!req.url.startsWith('/api/storefront/'))return vite.middlewares(req,res,()=>{res.writeHead(404);res.end()})
 void(async()=>{
  const chunks=[];let size=0
  for await(const chunk of req){size+=chunk.length;if(size>24*1024){res.writeHead(413);res.end();return}chunks.push(chunk)}
  req.body=Buffer.concat(chunks).toString('utf8');req.query=Object.fromEntries(new URL(req.url,'http://127.0.0.1:54398').searchParams)
  await handler(req,res)
 })().catch(()=>{if(!res.headersSent)res.writeHead(500);res.end()})
})
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(54398,'127.0.0.1',resolve)})
let stopping=false
const stop=async()=>{
 if(stopping)return;stopping=true
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await vite.close()
 process.disconnect?.();process.exitCode=0
}
process.on('message',message=>{if(message==='stop')void stop().catch(()=>{process.exitCode=1;process.disconnect?.()})})
process.on('disconnect',()=>void stop().catch(()=>{process.exitCode=1}))
process.send?.({ready:true,pid:process.pid,port:54398})
