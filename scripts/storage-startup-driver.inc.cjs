// Real pinned Storage package/service against the owned captured local database.
const fs=require('node:fs')
const assert=require('node:assert/strict')
const {spawn}=require('node:child_process')
const {createHmac}=require('node:crypto')
const {Client}=require('pg')
let child,closed,serviceLog
;(async()=>{
  const config=require('./dist/config').getConfig()
  assert.equal(config.dbMigrationFreezeAt,'drop-bucketid-objname-index')
  assert.equal(config.dbRefreshMigrationHashesOnMismatch,false)
  assert.equal(config.dbInstallRoles,false)
  assert.equal(config.pgQueueEnable,false)
  assert.equal(config.vectorStoreMigrationsEnabled,false)
  assert.match(config.databaseURL,/^postgres:\/\/supabase_storage_admin@127\.0\.0\.1:5432\/postgres\?sslmode=disable/)
  fs.mkdirSync(config.storageFilePath,{recursive:true})
  console.log('K2_STORAGE_ACTUAL_CONFIG_OK '+JSON.stringify({freezeAt:config.dbMigrationFreezeAt,refresh:config.dbRefreshMigrationHashesOnMismatch,installRoles:config.dbInstallRoles,queue:config.pgQueueEnable,vectorMigrations:config.vectorStoreMigrationsEnabled}))
  const db=new Client({connectionString:config.databaseURL})
  await db.connect()
  try{
    const {rows}=await db.query("SELECT current_user AS actor,current_setting('server_version') AS version,r.rolsuper AS superuser,r.rolbypassrls AS bypass_rls,(SELECT count(*)::int FROM storage.migrations) AS migration_count FROM pg_roles r WHERE r.rolname=current_user")
    assert.equal(rows[0].actor,'supabase_storage_admin')
    assert.equal(rows[0].superuser,false)
    assert.equal(rows[0].bypass_rls,false)
    assert.equal(rows[0].migration_count,73)
    assert.match(rows[0].version,/^17\.6(?:\D|$)/)
    console.log('K2_STORAGE_DB_IDENTITY_OK '+JSON.stringify(rows[0]))
  }finally{await db.end()}
  serviceLog=fs.openSync('/tmp/k2-storage-service.log','wx')
  child=spawn('/usr/local/bin/node',['dist/start/server.js'],{cwd:'/app',env:process.env,stdio:['ignore',serviceLog,serviceLog]})
  closed=new Promise(resolve=>{child.once('close',(code,signal)=>resolve({code,signal}));child.once('error',error=>resolve({error:error.message}))})
  let healthy=false
  for(let attempt=0;attempt<120;attempt++){
    if(child.exitCode!==null||child.signalCode!==null)break
    try{const reply=await fetch('http://127.0.0.1:9996/status',{signal:AbortSignal.timeout(1000)});if(reply.status===200){healthy=true;break}}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  assert.equal(healthy,true,'Storage process must reach actual HTTP status200')
  const version=await fetch('http://127.0.0.1:9996/version',{signal:AbortSignal.timeout(2000)})
  assert.equal(version.status,200)
  assert.equal(await version.text(),'1.79.20')
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
  const now=Math.floor(Date.now()/1000)
  const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'service_role',iss:'supabase',iat:now,exp:now+300})
  const token=body+'.'+createHmac('sha256',process.env.AUTH_JWT_SECRET).update(body).digest('base64url')
  const reply=await fetch('http://127.0.0.1:9996/health',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(5000)})
  assert.equal(reply.status,200)
  assert.deepEqual(await reply.json(),{healthy:true})
  console.log('K2_STORAGE_ACTUAL_HTTP_HEALTH_OK')
})().catch(error=>{
  console.error('K2_STORAGE_STARTUP_DRIVER_FAILED '+error.message)
  if(fs.existsSync('/tmp/k2-storage-service.log'))console.error(fs.readFileSync('/tmp/k2-storage-service.log','utf8').slice(-6000).replaceAll(process.env.AUTH_JWT_SECRET,'[SYNTHETIC_SECRET]'))
  process.exitCode=1
}).finally(async()=>{
  if(child){
    if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM')
    const stopped=await Promise.race([closed,new Promise(resolve=>setTimeout(()=>resolve(null),10000))])
    if(!stopped){child.kill('SIGKILL');await closed}
    if(child.exitCode===null&&child.signalCode===null)process.exitCode=1
    else console.log('K2_STORAGE_PROCESS_STOPPED')
  }
  if(serviceLog!==undefined)fs.closeSync(serviceLog)
})
