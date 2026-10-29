import { useRef, useState } from 'react'
import useConsignmentPacking from '../../hooks/useConsignmentPacking'
import ConsignmentScannerModal from './ConsignmentScannerModal'
import { AdminDialog } from '../../components/ui/AdminDialog'

const field='adm-input min-h-11 w-full text-base'
const button='min-h-11 rounded-adm-sm border border-adm-line px-3 text-sm font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue'
export default function ConsignmentPackingWorkspace({manifest,products,actorId,onRefresh,onReviewProduct}){
 const queue=useConsignmentPacking({actorId,onRefresh})
 const [box,setBox]=useState(''),[batch,setBatch]=useState(''),[expiry,setExpiry]=useState(''),[code,setCode]=useState('')
 const [camera,setCamera]=useState(false),[decision,setDecision]=useState(null),[reason,setReason]=useState(''),[variance,setVariance]=useState(false),[localError,setLocalError]=useState('')
 const inputRef=useRef(null)
 const [unaccepted,setUnaccepted]=useState([])
 const all=manifest.consignment_items||[],active=all.filter(i=>!i.packing_removed_at),removed=all.filter(i=>i.packing_removed_at)
 const pending=queue.entries.length>0,closed=Boolean(manifest.packing_cancelled_at),contextReady=Boolean(box.trim()&&batch.trim()&&expiry)
 const productFor=item=>products.find(p=>p.sku===item.sku)
 const beginDecision=(operation,item=null)=>{setReason('');setVariance(false);setDecision({operation,item,revision:Number(manifest.packing_revision)});setLocalError('')}
 const count=async(raw,item=null,delta=1)=>{
  const clean=String(raw||'').trim();if(!clean)return false
  const body={operation:'count',consignmentId:manifest.id,itemId:item?.id||null,code:clean,
   boxCode:item?.box_code||box.trim(),batchCode:item?.batch_code||batch.trim(),bestBeforeDate:item?.best_before_date||expiry,
   delta,source:item?'counter':'barcode'}
  if(!body.boxCode||!body.batchCode||!body.bestBeforeDate){setLocalError('Choose the physical box, batch and actual best-before date before counting this lot.');return false}
  const accepted=await queue.enqueue(body);if(accepted)setLocalError('');return accepted
 }
 const submit=async e=>{
  e.preventDefault();const submitted=(inputRef.current?.value||'').trim();if(!submitted)return
  // Separate physical Enter events immediately; only the journal confirms acceptance.
  inputRef.current.value='';setCode('');inputRef.current.focus()
  if(!await count(submitted))setUnaccepted(current=>[...current,submitted])
 }
 const confirm=async e=>{
  e.preventDefault()
  const body={operation:decision.operation,consignmentId:manifest.id,
   ...(decision.item?{itemId:decision.item.id}:{}),packingRevision:decision.revision,reason:reason.trim(),
   ...(decision.operation==='dispatch'?{acknowledgeVariance:variance}:{})}
  if(await queue.enqueue(body))setDecision(null)
 }
 return <section aria-label="Italy box packing" className="space-y-4 rounded-adm border border-adm-line bg-adm-surface p-4 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Pack boxes in Italy</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/75">Choose a box and lot, then scan items or use +1 / −1. These are packing counts; Manila counts them again before inventory is received.</p></div>
   <button className={button} disabled={pending||queue.refreshing} onClick={()=>beginDecision(closed?'reopen':'cancel')}>{closed?'Reopen packing':'Cancel this packing shipment'}</button></div>
  {queue.refreshing&&!pending&&<p role="status" className="text-sm text-white/75">Updating confirmed totals. You can keep scanning or counting.</p>}
  {closed&&<p role="status" className="rounded-adm-sm border border-adm-line p-3 text-sm">Packing cancelled. The shipment, products and count history are retained. Reopen it to continue.</p>}
  {pending&&<div role="status" className="space-y-2 rounded-adm-sm border border-blue/40 p-3 text-sm"><p>{queue.entries.length} saved request{queue.entries.length===1?'':'s'} waiting for confirmation. Confirmed totals below exclude pending counts.</p>
   <p className="break-words text-xs text-white/75">Next request: {JSON.parse(queue.entries[0].payloadText).consignmentId===manifest.id?'this shipment':'another saved shipment'} · {JSON.parse(queue.entries[0].payloadText).boxCode||JSON.parse(queue.entries[0].payloadText).operation}</p>
   {queue.paused&&<button className={button} disabled={queue.busy} onClick={queue.resume}>Resume saved packing</button>}
   {queue.refused&&<button className={button} disabled={queue.busy} onClick={queue.dismiss}>Dismiss refused attempt</button>}
  </div>}
  {(localError||queue.error)&&<p role="alert" className="rounded-adm-sm border border-crimson/50 p-3 text-sm text-white">{localError||queue.error}</p>}
  {unaccepted.length>0&&<p role="alert" className="break-words text-sm">Not accepted or counted: {unaccepted.join(', ')}. Resolve the message above, then enter these codes again.</p>}
  {!closed&&<>
   <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-3"><legend className="mb-2 text-sm font-semibold">Current physical box and lot</legend>
    <label className="space-y-1 text-sm">Physical box code<input className={field} value={box} onChange={e=>setBox(e.target.value)} maxLength={120}/></label>
    <label className="space-y-1 text-sm">Batch / lot code<input className={field} value={batch} onChange={e=>setBatch(e.target.value)} maxLength={120}/></label>
    <label className="space-y-1 text-sm">Best-before date<input className={field} type="date" value={expiry} onChange={e=>setExpiry(e.target.value)}/></label>
   </fieldset>
   <p className="text-xs leading-relaxed text-white/75">Use the date printed on this lot. Change this context when the physical box, batch or expiry changes. Product names and descriptions can be finished later.</p>
   <form onSubmit={submit} className="flex flex-wrap items-end gap-2"><label className="w-full min-w-0 space-y-1 text-sm sm:w-auto sm:flex-1">Barcode or SKU<input ref={inputRef} className={field+' font-mono'} defaultValue="" onChange={e=>setCode(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing)void submit(e)}} maxLength={120} autoComplete="off" list="packing-product-codes"/></label>
    <datalist id="packing-product-codes">{products.map(p=><option key={p.sku} value={p.sku}>{p.name}</option>)}</datalist>
    <button className={button+' bg-blue'} disabled={!contextReady||!code.trim()||pending&&queue.paused}>Count +1</button>
    <button className={button} type="button" disabled={!contextReady||pending&&queue.paused} onClick={()=>setCamera(true)}>Use camera scanner</button>
   </form>
   <p className="text-xs text-white/75">A barcode scanner that sends Enter counts each scan. Unknown barcodes create an unpublished Draft marked Details needed. No planned quantity is required.</p>
  </>}
  <div className="space-y-3"><h3 className="text-sm font-semibold">Products packed · {active.reduce((n,i)=>n+Number(i.italy_packed_qty),0)} confirmed units</h3>
   {!active.length&&<p className="py-4 text-sm text-white/75">No products counted yet. Enter the box and lot above, then scan a barcode or choose a known SKU.</p>}
   {active.map(item=>{const p=productFor(item),incomplete=p?.is_human_reviewed!==true;return <article key={item.id} className="grid grid-cols-1 items-center gap-3 border-t border-adm-line py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
    <div className="min-w-0"><p className="break-words text-sm font-semibold">{p?.name||item.sku}</p><p className="break-words text-xs text-white/75">{item.sku} · Box {item.box_code} · {item.batch_code} · {item.best_before_date}</p>
     {incomplete&&<p className="mt-1 text-xs"><span className="font-semibold text-amber-200">Details needed</span> · Packing can continue; an Admin completes product review. {onReviewProduct?<button className="min-h-11 px-2 underline" onClick={()=>onReviewProduct(item.sku)} disabled={pending}>Review product</button>:<a className="inline-flex min-h-11 items-center px-2 underline" href={`?section=inventory&packingSku=${encodeURIComponent(item.sku)}`}>Review product</a>}</p>}
     {!item.packing_count_only&&<p className="text-xs text-white/75">Planned: {item.expected_qty}; packed: {item.italy_packed_qty}. Differences are reviewed before dispatch.</p>}</div>
    <div className="flex items-center gap-2"><button className={button} aria-label={`Remove one ${item.sku}`} disabled={closed||Number(item.italy_packed_qty)<=0||pending&&queue.paused} onClick={()=>count(item.sku,item,-1)}>−1</button><output className="min-w-8 text-center font-mono text-lg" aria-label={`Packed quantity ${item.sku}`}>{item.italy_packed_qty}</output><button className={button} aria-label={`Add one ${item.sku}`} disabled={closed||pending&&queue.paused} onClick={()=>count(item.sku,item,1)}>+1</button></div>
    <button className={button} aria-label={`Remove packing line ${item.sku}`} disabled={closed||pending||queue.refreshing} onClick={()=>beginDecision('remove',item)}>Remove line</button>
   </article>})}
  </div>
  {removed.length>0&&<details><summary className="min-h-11 cursor-pointer py-3 text-sm">Removed packing lines ({removed.length})</summary><p className="text-xs text-white/75">Removed from active counts; catalog products and history are retained.</p>{removed.map(i=><div className="flex flex-wrap justify-between gap-2 py-2" key={i.id}><span className="text-sm">{i.sku} · {i.box_code} · {i.batch_code}</span><button className={button} aria-label={`Restore packing line ${i.sku}`} disabled={closed||pending||queue.refreshing} onClick={()=>beginDecision('restore',i)}>Restore line</button></div>)}</details>}
  {!closed&&<button className={button+' bg-blue'} disabled={pending||queue.refreshing||!active.some(i=>i.italy_packed_qty>0)} onClick={()=>beginDecision('dispatch')}>Review packing and dispatch</button>}
  {camera&&<ConsignmentScannerModal isOpen stage="milan" items={[]} acceptQueued contextLabel={`${box} · ${batch} · ${expiry}`} onScan={async raw=>(await count(raw))?{sku:raw,name:'Saved for confirmation'}:null} onClose={()=>setCamera(false)} onDone={()=>setCamera(false)}/>}
  {decision&&<AdminDialog onClose={()=>setDecision(null)} labelledBy="packing-change-title"><form onSubmit={confirm} className="w-full max-w-lg space-y-4 rounded-adm bg-adm-surface p-5 text-white"><h2 id="packing-change-title" className="text-xl font-semibold">{decision.operation==='dispatch'?'Review packing before dispatch':decision.operation==='remove'?'Remove this packing line':decision.operation==='restore'?'Restore this packing line':decision.operation==='reopen'?'Reopen this shipment':'Cancel this packing shipment'}</h2>
   <p className="break-words text-sm text-white/75">{manifest.manifest_code}{decision.item?` · ${decision.item.sku} · ${decision.item.box_code} · ${decision.item.batch_code}`:''}. {decision.operation==='dispatch'?'This closes Italy packing. Manila must recount the physical units independently.':'Products and recorded history are retained. This changes packing only.'}</p>
   {decision.operation==='dispatch'&&<><p className="text-sm">{active.reduce((n,i)=>n+Number(i.italy_packed_qty),0)} packed units across {active.length} lines.</p>{active.filter(i=>!i.packing_count_only&&i.expected_qty!==i.italy_packed_qty).map(i=><p className="text-sm" key={i.id}>{i.sku} / {i.box_code}: planned {i.expected_qty}, packed {i.italy_packed_qty}</p>)}<label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={variance} onChange={e=>setVariance(e.target.checked)}/>I checked the physical counts and any differences from the plan.</label></>}
   <label className="block space-y-1 text-sm">Reason for this packing change<textarea required maxLength={500} className={field+' min-h-24'} value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <div className="flex gap-2"><button type="button" className={button} onClick={()=>setDecision(null)}>Keep packing unchanged</button><button className={button+' bg-blue'} disabled={!reason.trim()||pending||decision.operation==='dispatch'&&!variance}>Confirm packing change</button></div>
  </form></AdminDialog>}
 </section>
}
