import { useEffect,useRef,useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { getAdminWebsiteAssignmentBff } from '../../services/adminBffService'
import { validWebsiteListing } from '../../lib/websiteAssignmentRecovery'
import { primaryButton,secondaryButton } from './AdminWorkspaceUi'

export function PendingWebsiteDecision({recovery,onReview}) {
  const body=recovery.pending&&JSON.parse(recovery.pending.payloadText)
  if(!body&&!recovery.error)return null
  return <section aria-label="Pending Website decision" className="space-y-3 border-b border-adm-line py-4">
    <h2 className="text-lg font-semibold text-white">Pending Website decision</h2>
    {body?<><p className="text-base text-white/80">An assignment save is awaiting confirmation. Closing or reloading keeps its original request.</p><button type="button" className={secondaryButton} onClick={()=>onReview(body.sku)}>Review pending Website decision {body.sku}</button></>:<p role="alert" className="break-words text-base text-crimson">{recovery.error}</p>}
  </section>
}

export default function WebsiteAssignmentDialog({sku,actorId,canManageProducts,recovery,onClose}) {
  const [listing,setListing]=useState(null),[assigned,setAssigned]=useState(false),[reason,setReason]=useState('')
  const [loading,setLoading]=useState(false),[readError,setReadError]=useState(''),[notice,setNotice]=useState('')
  const readSequence=useRef(0),mounted=useRef(true),scope=useRef(null)
  if(scope.current?.actorId!==actorId||scope.current?.sku!==sku||scope.current?.canManageProducts!==canManageProducts)scope.current={actorId,sku,canManageProducts}
  const saved=recovery.pending&&JSON.parse(recovery.pending.payloadText)
  const load=async()=>{
    const identity=scope.current,sequence=++readSequence.current
    setLoading(true);setListing(null);setReason('');setReadError('')
    const response=await getAdminWebsiteAssignmentBff(sku)
    if(!mounted.current||scope.current!==identity||sequence!==readSequence.current)return
    setLoading(false)
    if(!response.ok||!validWebsiteListing(response.listing,sku)) {setReadError('Current Website assignment could not be verified. Retry the read before a new decision.');return}
    setListing(response.listing);setAssigned(response.listing.assigned)
  }
  useEffect(()=>{
    mounted.current=true
    if(!saved&&canManageProducts)void load()
    return()=>{mounted.current=false;readSequence.current++}
  },[sku,actorId,canManageProducts])
  useEffect(()=>{
    if(saved) {readSequence.current++;setListing(null);setLoading(false);setReadError('')}
  },[recovery.pending?.key])
  const finish=result=>{
    if(!mounted.current)return
    if(result.nonApplied) {readSequence.current++;setListing(result.listing);setAssigned(result.listing.assigned);setReason('');setLoading(false);setReadError('');setNotice('Your previous Website decision did not apply. Review the current assignment and enter a new reason before saving.')}
    else if(result.ok) {setNotice('Original Website decision was recorded. Current assignment is shown separately.');void load()}
  }
  const blocked=recovery.working||recovery.storageBlocked||!!saved||!canManageProducts||loading||!listing
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
    <AdminDialog onClose={onClose} closeDisabled={recovery.working} labelledBy="website-assignment-title">
      <div className="max-h-[90dvh] w-full space-y-4 overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:max-w-xl sm:rounded-adm">
        <div className="flex items-start justify-between gap-4"><h2 id="website-assignment-title" className="text-xl font-semibold">Website assignment</h2><button type="button" disabled={recovery.working} className={secondaryButton} onClick={onClose}>Close</button></div>
        <p className="break-words text-base font-semibold">{sku}</p>
        <p className="text-base text-white/80">Assignment does not publish a product or add stock. Customer availability is checked separately.</p>
        {!canManageProducts&&<p role="alert" className="text-base text-crimson">Only the original Admin or SuperAdmin can resolve a saved decision.</p>}
        {notice&&<p role="status" className="text-base text-white/90">{notice}</p>}
        {saved?<div className="space-y-3 break-words">
          <p className="text-base text-white/80">These are the original saved details, not the current assignment. Retry confirms this decision without duplicating it.</p>
          <p className="text-base">Saved decision: {saved.assigned?'Assign to Website':'Remove from Website'}</p>
          <p className="text-base text-white/90">{saved.reason}</p>
          <p className="text-sm text-white/70">Original version: {saved.expectedUpdatedAt||'No listing existed'}</p>
        </div>:<>
          {loading&&<p role="status" className="text-base text-white/80">Loading current assignment…</p>}
          {listing&&<p className="text-base text-white/90">Current assignment: {listing.assigned?'Assigned':'Not assigned'}</p>}
          {!listing&&!loading&&<div className="space-y-3"><p role={readError?'alert':'status'} className={`text-base ${readError?'text-crimson':'text-white/80'}`}>{readError||'Read the current assignment before a new decision.'}</p><button type="button" className={secondaryButton} disabled={recovery.working||!canManageProducts} onClick={load}>Retry current assignment</button></div>}
          <form className="space-y-4" onSubmit={async event=>{event.preventDefault();if(blocked||assigned===listing.assigned)return;const trimmed=reason.trim();const effectiveReason=trimmed.length>=3?trimmed:(assigned?'Assigned to Website by admin':'Removed from Website by admin');finish(await recovery.save({sku,assigned,expectedUpdatedAt:listing.updatedAt,reason:effectiveReason}))}}>
            <label className="flex min-h-11 items-center gap-3 text-base"><input type="checkbox" className="h-5 w-5 shrink-0 accent-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue" disabled={blocked} checked={assigned} onChange={event=>setAssigned(event.target.checked)}/>Assign this product to Website</label>
            <label className="block space-y-2 text-base"><span>Reason for Website decision <span className="text-sm font-normal text-white/50">(optional)</span></span><textarea className="adm-input min-h-24 text-base" disabled={blocked} value={reason} maxLength={500} placeholder={`Default: ${assigned?'Assigned to Website by admin':'Removed from Website by admin'}`} onChange={event=>setReason(event.target.value)}/></label>
            <button type="submit" className={primaryButton} disabled={blocked||assigned===listing?.assigned}>{recovery.working?'Confirming Website decision…':'Save Website decision'}</button>
          </form>
        </>}
        {recovery.error&&<p role="alert" className="break-words text-base text-crimson">{recovery.error}</p>}
        {saved&&<>
          {recovery.canReconcile&&<div className="space-y-3"><p className="text-base text-white/80">Opens the current assignment. Your previous choice and reason will not carry over.</p><button type="button" className={primaryButton} disabled={recovery.working||!canManageProducts} onClick={async()=>finish(await recovery.reviewLatest())}>Review latest assignment</button></div>}
          <button type="button" className={recovery.canReconcile?secondaryButton:primaryButton} disabled={recovery.working||!canManageProducts} onClick={async()=>finish(await recovery.retry())}>{recovery.working?'Confirming saved decision…':'Retry saved Website decision'}</button>
        </>}
      </div>
    </AdminDialog>
  </div>
}
