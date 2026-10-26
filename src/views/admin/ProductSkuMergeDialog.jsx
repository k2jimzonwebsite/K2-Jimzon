import { useEffect, useRef, useState } from 'react'
import { AdminDialog } from '../../components/ui/AdminDialog'
import { getAdminProductSkuMergeBff } from '../../services/adminBffService'
import { PRODUCT_SKU_MERGE_GROUPS } from '../../lib/productSkuMerge'
import { validSkuMergePreview } from '../../lib/productSkuMergeRecovery'
import { primaryButton, secondaryButton } from './AdminWorkspaceUi'

const blockers={ACTIVE_RESERVATION:'A reservation is still active.',ACTIVE_ORDER:'An order is still active.',PACKAGE_IDENTITY:'Package facts do not match.',STOCK_PROJECTION:'Stock totals need reconciliation.',CANONICAL_NOT_PUBLISHED:'The retained listing is not ready for the website.',UNKNOWN_LIFECYCLE:'A product has an unsupported lifecycle state.'}
export default function ProductSkuMergeDialog({actorId,canManageProducts,recovery,onClose,onSaved}) {
  const saved=recovery.pending && JSON.parse(recovery.pending.payloadText)
  const [groupId,setGroupId]=useState(saved?.payload.groupId||'one-fragrance')
  const [preview,setPreview]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[reviewed,setReviewed]=useState(false)
  const sequence=useRef(0),scope=useRef(null)
  if(scope.current?.actorId!==actorId||scope.current?.canManageProducts!==canManageProducts)scope.current={actorId,canManageProducts}
  const load=async()=>{
    const current=scope.current,id=++sequence.current;setPreview(null);setReviewed(false);setError('');setLoading(true)
    const result=await getAdminProductSkuMergeBff(groupId)
    if(id!==sequence.current||current!==scope.current)return
    setLoading(false)
    if(!result.ok||!validSkuMergePreview(result.preview,groupId)){setError(result.error||'The complete preview could not be verified. Retry before combining products.');return}
    setPreview(result.preview)
  }
  useEffect(()=>{if(!saved&&canManageProducts)void load();return()=>{sequence.current++}},[actorId,canManageProducts,groupId,!!saved])
  const finish=result=>{
    if(result.ok){onSaved();onClose()}
    else if(result.nonApplied){setPreview(result.preview);setReviewed(false);setNotice('The previous merge did not apply. Review the current products and lots before a new decision.')}
  }
  const blocked=!canManageProducts||loading||recovery.working||recovery.storageBlocked||!!saved||!preview||preview.recorded||!!preview.blocker||!reviewed
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
    <AdminDialog onClose={onClose} closeDisabled={recovery.working} labelledBy="sku-merge-title">
      <div className="max-h-[90dvh] w-full space-y-4 overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:max-w-2xl sm:rounded-adm">
        <div className="flex items-start justify-between gap-3"><h2 id="sku-merge-title" className="text-xl font-semibold">Combine duplicate products</h2><button className={secondaryButton} disabled={recovery.working} onClick={onClose}>Close</button></div>
        <p className="text-base text-white/80">Keep one listing and every lot and unit. The old product records and stock history stay available. This is limited to the three owner-approved groups.</p>
        {(error||recovery.error||notice)&&<p role="alert" className="break-words text-base text-crimson">{error||recovery.error||notice}</p>}
        {saved ? <div className="space-y-3"><p className="break-words text-base">Saved merge: {PRODUCT_SKU_MERGE_GROUPS[saved.payload.groupId]?.label}</p><p className="text-base text-white/80">Retry the original decision to confirm its outcome. Its exact request is preserved across reloads.</p>
          <button className={primaryButton} disabled={recovery.working||!canManageProducts} onClick={async()=>finish(await recovery.retry())}>Retry saved merge</button>
          {recovery.canReconcile&&<button className={secondaryButton} disabled={recovery.working||!canManageProducts} onClick={async()=>finish(await recovery.reviewLatest())}>Review latest merge preview</button>}
        </div> : <>
          <label className="block space-y-2 text-base"><span>Duplicate group</span><select className="adm-input min-h-11 w-full" value={groupId} disabled={recovery.working||!canManageProducts} onChange={e=>{setPreview(null);setReviewed(false);setGroupId(e.target.value)}}>{Object.entries(PRODUCT_SKU_MERGE_GROUPS).map(([id,g])=><option key={id} value={id}>{g.label}</option>)}</select></label>
          {loading&&<p role="status">Reading all products and lots…</p>}
          {!loading&&!preview&&<button className={secondaryButton} disabled={!canManageProducts} onClick={load}>Retry preview</button>}
          {preview&&<>
            <p className="break-words text-base font-semibold">Keep {preview.canonicalSku}</p>
            <ul className="space-y-3">{preview.products.map(p=><li key={p.sku} className="break-words border-b border-adm-line pb-3 text-base"><strong>{p.sku}</strong> · {p.name}<br/>{p.size} · {p.packageType} · {p.quantity} units · {p.available} available</li>)}</ul>
            <details open><summary className="min-h-11 cursor-pointer py-3 text-base">All lots ({preview.lots.length})</summary><ul className="space-y-3">{preview.lots.map(l=><li key={l.id} className="break-words text-base text-white/80">{l.sku} · {l.box_code||'No box code'} · {l.quantity} units · {l.expiry_date||l.best_before_date||'No expiry recorded'}<br/><span className="text-sm">Lot {l.id}</span></li>)}</ul></details>
            {preview.blocker&&<p role="alert" className="text-base text-crimson">{blockers[preview.blocker]||`This group cannot be combined: ${preview.blocker.toLowerCase().replaceAll('_',' ')}.`} Resolve this in the existing workflow, then refresh the preview.</p>}
            {preview.recorded&&<p role="status">This group has already been combined. Refresh inventory to see its current state.</p>}
            <label className="flex min-h-11 items-start gap-3 py-2 text-base"><input className="mt-1" type="checkbox" checked={reviewed} disabled={recovery.working} onChange={e=>setReviewed(e.target.checked)}/><span>I reviewed the retained listing and all lots</span></label>
            <div className="flex flex-wrap gap-3"><button className={primaryButton} disabled={blocked} onClick={async()=>finish(await recovery.save({groupId,expectedStateHash:preview.stateHash,reason:`Owner-confirmed duplicate consolidation: ${PRODUCT_SKU_MERGE_GROUPS[groupId].label}`}))}>Combine these duplicates</button><button className={secondaryButton} disabled={loading||recovery.working} onClick={load}>Refresh preview</button></div>
          </>}
        </>}
      </div>
    </AdminDialog>
  </div>
}
