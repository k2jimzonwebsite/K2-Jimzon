import { useEffect, useRef, useState } from 'react'
import { createPackingJournal } from '../lib/consignmentPackingJournal'
import { validatePackingCommand } from '../lib/consignmentPackingCommand'
import { commandConsignmentPackingBff, getAdminSessionBff } from '../services/adminBffService'

const confirmedRefusals = new Set(['PACKING_REVIEW_STALE','PACKING_CLOSED','PACKING_ITEM_REMOVED','PACKING_COUNT_INVALID',
 'PACKING_VARIANCE_REQUIRED','PACKING_IDENTITY_AMBIGUOUS','PACKING_BARCODE_REQUIRED','PACKING_LOT_MISMATCH','PACKING_DATE_INVALID','PACKING_EMPTY','SCAN_CODE_MISMATCH','REQUEST_INVALID'])
const changedEvent='k2-packing-journal-changed'
export default function useConsignmentPacking({actorId,onRefresh}) {
 const [entries,setEntries]=useState([]),[error,setError]=useState(''),[paused,setPaused]=useState(true),[busy,setBusy]=useState(false),[refused,setRefused]=useState(null)
 const scope=useRef(null),running=useRef(null),refreshRef=useRef(onRefresh)
 refreshRef.current=onRefresh
 if(scope.current?.actor!==actorId)scope.current={actor:actorId}
 const journal=()=>createPackingJournal()
 const announce=()=>window.dispatchEvent(new Event(changedEvent))
 useEffect(()=>{
  const identity=scope.current;identity.active=true;setPaused(true);setError('');setRefused(null)
  const read=()=>{if(scope.current!==identity)return;try{setEntries(journal().read(actorId))}catch(e){setError(e.message);setPaused(true)}}
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
 const drain=async()=>{
  const identity=scope.current
  if(running.current===identity)return
  running.current=identity;setBusy(true);setPaused(false);setError('');setRefused(null)
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
     // Receipt confirms history, not today's latest count. Always load current facts.
     await refreshRef.current?.()
    }
   })
  }catch(e){if(scope.current===identity&&identity.active){setError(e.message);setPaused(true)}}
  finally{if(running.current===identity){running.current=null;if(scope.current===identity&&identity.active)setBusy(false)}}
 }
 const enqueue=async(body)=>{
  const identity=scope.current,payloadText=JSON.stringify(validatePackingCommand(body)),key=crypto.randomUUID()
  try{
   if(paused&&journal().read(actorId).length)throw Error('Resume or resolve the saved packing requests before adding another count.')
   await lock(()=>{
    if(!identity.active||scope.current!==identity)throw Error('The staff account changed. Nothing was queued.')
    setEntries(journal().append(actorId,key,payloadText));announce()
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
 return {entries,error,paused,busy,refused,enqueue,resume:drain,dismiss}
}
