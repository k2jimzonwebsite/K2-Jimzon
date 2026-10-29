import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createPackingJournal } from '../src/lib/consignmentPackingJournal.js'
const storage = () => { const data=new Map(); return { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k) } }
const body = consignmentId => JSON.stringify({operation:'count',consignmentId,itemId:null,code:'8001234567890',
 boxCode:'BOX-A',batchCode:'LOT-A',bestBeforeDate:'2027-10-01',delta:1,source:'barcode'})
test('a rapid burst survives reload with every original unsent key and box context', () => {
 const s=storage(), actor=randomUUID(), shipment=randomUUID(),journal=createPackingJournal(s), keys=[]
 for(let n=0;n<10;n++){ const key=randomUUID();keys.push(key);journal.append(actor,key,body(shipment)) }
 const reloaded=createPackingJournal(s)
 assert.deepEqual(reloaded.read(actor).map(x=>x.key),keys)
 assert.ok(reloaded.read(actor).every(x=>JSON.parse(x.payloadText).boxCode==='BOX-A'))
 for(const key of keys)reloaded.acknowledge(actor,key)
 assert.deepEqual(reloaded.read(actor),[])
})
test('acknowledgement removes only the exact head and cannot erase a newer tail', () => {
 const s=storage(), actor=randomUUID(),j=createPackingJournal(s),first=randomUUID(),next=randomUUID(),p=body(randomUUID())
 j.append(actor,first,p);j.append(actor,next,p)
 assert.throws(()=>j.acknowledge(actor,next),/head|changed/i)
 j.acknowledge(actor,first);assert.deepEqual(j.read(actor).map(x=>x.key),[next])
 assert.deepEqual(j.read(randomUUID()),[])
})
test('full or unavailable storage refuses acceptance without dropping accepted scans', () => {
 const s=storage(), actor=randomUUID(),j=createPackingJournal(s),p=body(randomUUID())
 for(let n=0;n<32;n++)j.append(actor,randomUUID(),p)
 assert.throws(()=>j.append(actor,randomUUID(),p),/32|full/i)
 assert.equal(j.read(actor).length,32)
 const blocked=createPackingJournal({...storage(),setItem(){throw Error('denied')}})
 assert.throws(()=>blocked.append(actor,randomUUID(),p),/saved|storage/i)
})
test('corrupt journal is held and original keys cannot be reused with a changed payload', () => {
 const s=storage(),actor=randomUUID(),j=createPackingJournal(s),key=randomUUID(),p=body(randomUUID())
 j.append(actor,key,p)
 assert.throws(()=>j.append(actor,key,body(randomUUID())),/key|changed|duplicate/i)
 s.setItem(j.storageKey(actor),'broken')
 assert.throws(()=>j.read(actor),/restored|journal/i)
 assert.equal(s.getItem(j.storageKey(actor)),'broken')
})

test('an oversized append cannot make previously accepted requests unrestorable', () => {
 const s=storage(),actor=randomUUID(),j=createPackingJournal(s)
 const p=JSON.stringify({operation:'cancel',consignmentId:randomUUID(),packingRevision:0,reason:'\u0000'.repeat(500)})
 let accepted=0
 for(let n=0;n<32;n++){
  try{j.append(actor,randomUUID(),p);accepted++}catch{break}
 }
 assert.ok(accepted>0)
 assert.equal(j.read(actor).length,accepted)
})
