import fs from 'node:fs';import path from 'node:path';
const root='supabase/migrations';const files=fs.readdirSync(root).filter(x=>x.endsWith('.sql'));const versions=new Map();for(const f of files){const v=f.split('_')[0];versions.set(v,[...(versions.get(v)||[]),f])}const duplicates=[...versions].filter(([,f])=>f.length>1).map(([version,files])=>({version,files}));console.log(JSON.stringify(duplicates,null,2));

