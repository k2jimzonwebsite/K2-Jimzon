import { validatePackingCommand } from './consignmentPackingCommand.js'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const unsafe=()=>Error('The packing journal could not be restored safely. Keep it and contact the administrator.')
export function createPackingJournal(storage=localStorage) {
 const storageKey=actor=>{if(!UUID.test(actor||''))throw unsafe();return 'k2:packing:pending:v1:'+actor}
 function read(actor) {
  try {
   const raw=storage.getItem(storageKey(actor));if(raw===null)return []
   if(new TextEncoder().encode(raw).length>65536)throw unsafe()
   const data=JSON.parse(raw)
   if(data.actorId!==actor||data.version!==1||Object.keys(data).length!==3||!Array.isArray(data.entries)||data.entries.length>32)throw unsafe()
   const keys=new Set()
   for(const entry of data.entries) {
    if(Object.keys(entry).length!==2||!UUID.test(entry.key)||typeof entry.payloadText!=='string'||keys.has(entry.key))throw unsafe()
    validatePackingCommand(JSON.parse(entry.payloadText));keys.add(entry.key)
   }
   return data.entries
  }catch{throw unsafe()}
 }
 function write(actor,entries) {
  const key=storageKey(actor),raw=JSON.stringify({actorId:actor,version:1,entries})
  if(new TextEncoder().encode(raw).length>65536)throw Error('The packing journal is full. Existing saved requests are preserved; wait for confirmation before adding more.')
  try{storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw unsafe()}
  catch{throw Error('Packing could not be saved to browser storage. Input is paused; keep any saved journal.')}
 }
 function append(actor,key,payloadText) {
  validatePackingCommand(JSON.parse(payloadText))
  if(!UUID.test(key))throw unsafe()
  const entries=read(actor)
  if(entries.some(entry=>entry.key===key))throw Error('This packing key is already queued. Keep the original request.')
  if(entries.length>=32)throw Error('32 scans are waiting. Input is paused until they are confirmed.')
  write(actor,[...entries,{key,payloadText}]);return read(actor)
 }
 function acknowledge(actor,key) {
  const entries=read(actor)
  if(entries[0]?.key!==key)throw Error('The packing queue head changed. Reload the saved requests.')
  write(actor,entries.slice(1));return read(actor)
 }
 return {storageKey,read,append,acknowledge}
}
