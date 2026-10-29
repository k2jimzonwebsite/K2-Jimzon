import { useEffect, useRef, useState } from 'react'
import { createPackingJournal } from '../lib/consignmentPackingJournal'
import { validatePackingCommand } from '../lib/consignmentPackingCommand'
import { commandConsignmentPackingBff, getAdminSessionBff } from '../services/adminBffService'

const confirmedRefusals = new Set(['PACKING_REVIEW_STALE','PACKING_CLOSED','PACKING_ITEM_REMOVED','PACKING_COUNT_INVALID',
 'PACKING_VARIANCE_REQUIRED','PACKING_IDENTITY_AMBIGUOUS','PACKING_BARCODE_REQUIRED','PACKING_LOT_MISMATCH','PACKING_DATE_INVALID','PACKING_EMPTY','SCAN_CODE_MISMATCH','REQUEST_INVALID'])
const changedEvent='k2-packing-journal-changed'
export default function useConsignmentPacking({actorId,onRefresh}) {
 const [entries,setEntries]=useState([]),[error,setError]=useState(''),[paused,setPaused]=useState(true),[busy,setBusy]=useState(false),[refused,setRefused]=useState(null)
 const [refreshing,setRefreshing]=useState(false)
 const pausedRef=useRef(true)
 const updatePaused=value=>{pausedRef.current=value;setPaused(value)}
 const scope=useRef(null),running=useRef(null),refreshRef=useRef(onRefresh)
 refreshRef.current=onRefresh
 if(scope.current?.actor!==actorId){scope.current={actor:actorId};pausedRef.current=true}
 const journal=()=>createPackingJournal()
 const announce=()=>window.dispatchEvent(new Event(changedEvent))
 useEffect(()=>{
  const identity=scope.current;identity.active=true;updatePaused(true);setError('');setRefused(null);setRefreshing(false)
  const read=()=>{if(scope.current!==identity)return;try{setEntries(journal().read(actorId))}catch(e){setError(e.message);updatePaused(true)}}
  read();window.addEventListener('storage',read);window.addEventListener(changedEvent,read)
  return()=>{identity.active=false;window.removeEventListener('storage',read);window.removeEventListener(changedEvent,read)}
 },[actorId])
 const lock=async(fn)=>{
  if(!navigator.locks?.request)throw Error('Safe packing recovery is unavailable in this browser. Nothing was sent.')
  return navigator.locks.request(journal().storageKey(actorId),fn)
 }
 const actor=async(identity)=>{
  if(!identity.active||scope.current!==identity)throw Error('The staff account changed. Saved packing requests are preserved.')
  const r=await getAdminSessionBff()
  if(!r.ok||(r.user?.userId||r.user?.id)!==identity.actor||!['Admin','SuperAdmin','Staff'].includes(r.user?.role))throw Error('Return to the original staff account to recover these packing requests.')
  if(!identity.active||scope.current!==identity)throw Error('The staff account changed. Saved requests are preserved.')
 }
 const refresh=async(identity,skus=[])=>{
  if(!identity.active||scope.current!==identity)return
  identity.refreshSkus||=new Set()
  for(const sku of skus)identity.refreshSkus.add(sku)
  identity.needsRefresh=true
  if(identity.refreshing)return
  identity.refreshing=true;setRefreshing(true)
  try{
   while(identity.needsRefresh&&identity.active&&scope.current===identity){
    identity.needsRefresh=false
    const changed=[...identity.refreshSkus];identity.refreshSkus.clear()
    await refreshRef.current?.({skus:changed})
   }
  }catch{
   if(identity.active&&scope.current===identity)setError(current=>current||'Confirmed counts could not be reloaded. Refresh packing; saved requests are retained.')
  }finally{
   identity.refreshing=false
   if(identity.active&&scope.current===identity)setRefreshing(false)
  }
 }
 const drain=async()=>{
  const identity=scope.current
  if(running.current===identity)return
  running.current=identity;setBusy(true);updatePaused(false);setError('');setRefused(null)
  const changedSkus=new Set()
  let acknowledged=false
  try{
   if(!navigator.locks?.request)throw Error('Safe packing recovery is unavailable in this browser. Nothing was sent.')
   await navigator.locks.request(journal().storageKey(actorId)+':dispatch',async()=>{
    while(identity.active&&scope.current===identity){
     const head=await lock(()=>journal().read(actorId)[0]);if(!head)break
     await actor(identity)
     const response=await commandConsignmentPackingBff(head.payloadText,head.key,actorId)
     await actor(identity)
     if(!response.ok){
      if(confirmedRefusals.has(response.code))setRefused(head.key)
      throw Error(response.error||'The count was not confirmed. Keep and resume the saved packing requests.')
     }
     const payload=validatePackingCommand(JSON.parse(head.payloadText)),r=response.result
     if(r?.consignmentId!==payload.consignmentId||r?.operation!==payload.operation||!Number.isSafeInteger(r.packingRevision)||r.packingRevision<0)
      throw Error('The reply did not confirm this packing request. Keep and resume it.')
     await lock(()=>{
      if(!identity.active||scope.current!==identity)throw Error('The staff account changed. Keep the saved request.')
      const current=journal().read(actorId)[0]
      if(current?.key!==head.key||current.payloadText!==head.payloadText)throw Error('The saved packing request changed. Reload it.')
      setEntries(journal().acknowledge(actorId,head.key));announce()
     })
     acknowledged=true
     if(r.sku)changedSkus.add(r.sku)
    }
   })
  }catch(e){if(scope.current===identity&&identity.active){setError(e.message);updatePaused(true)}}
  finally{
   // Confirmed totals still require a fresh canonical read. Coalesce those reads
   // without blocking the next durable request behind a slow display refresh.
   if(acknowledged)void refresh(identity,[...changedSkus])
   if(running.current===identity){running.current=null;if(scope.current===identity&&identity.active)setBusy(false)}
  }
 }
 const enqueue=async(body)=>{
  const identity=scope.current,payloadText=JSON.stringify(validatePackingCommand(body)),key=crypto.randomUUID()
  try{
   if(pausedRef.current&&journal().read(actorId).length)throw Error('Resume or resolve the saved packing requests before adding another count.')
   await lock(()=>{
    if(!identity.active||scope.current!==identity)throw Error('The staff account changed. Nothing was queued.')
    const saved=journal().append(actorId,key,payloadText)
    // A newly saved runnable queue must not render as paused while its lock
    // resolves: a disabled default submit button would suppress the next Enter.
    updatePaused(false);setEntries(saved);announce()
   })
   void drain();return true
  }catch(e){if(scope.current===identity)setError(e.message);return false}
 }
 const dismiss=async()=>{
  // Only an exact server refusal after its historical receipt lookup proves no apply.
  if(!refused)return
  try{await navigator.locks.request(journal().storageKey(actorId)+':dispatch',()=>lock(()=>{
   const head=journal().read(actorId)[0]
   if(head?.key!==refused)throw Error('This saved request was resolved in another tab. Reload the current packing journal.')
   setEntries(journal().acknowledge(actorId,refused));announce()
  }));setRefused(null);setError('');await refreshRef.current?.();void drain()}
  catch(e){setError(e.message)}
 }
 useEffect(()=>{if(entries.length&&!paused&&!busy&&!running.current)void drain()},[entries,paused,busy])
 return {entries,error,paused,busy,refused,refreshing,enqueue,resume:drain,dismiss}
}
