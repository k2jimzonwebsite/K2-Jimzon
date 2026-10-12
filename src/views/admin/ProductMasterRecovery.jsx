import { AdminDialog } from '../../components/ui/AdminDialog'
import { primaryButton, secondaryButton } from './AdminWorkspaceUi'

export function PendingProductDecision({ recovery, onReview }) {
  if (!recovery.pending && !recovery.error) return null
  const body = recovery.pending && JSON.parse(recovery.pending.payloadText)
  return <section aria-label="Pending product decision" className="space-y-3 border-b border-adm-line py-4">
    <h2 className="text-lg font-semibold text-white">Pending product decision</h2>
    {recovery.error && !body && <p role="alert" className="break-words text-base text-crimson">{recovery.error}</p>}
    {body && <><p className="text-base text-white/80">A product save is awaiting confirmation. Closing or reloading keeps its exact request. Review it before saving another product.</p>
      <button type="button" className={`${secondaryButton} max-w-full break-words`} onClick={onReview}>Review pending product decision {body.payload.sku}</button></>}
  </section>
}

export default function ProductMasterRecovery({ recovery, canManageProducts, onClose, onRecorded, onNotApplied }) {
  const body = recovery.pending && JSON.parse(recovery.pending.payloadText)
  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
    <AdminDialog onClose={onClose} closeDisabled={recovery.working} labelledBy="product-recovery-title">
      <div className="max-h-[90dvh] w-full space-y-4 overflow-y-auto rounded-t-adm border border-adm-line bg-adm-surface p-5 text-white sm:max-w-xl sm:rounded-adm">
        <div className="flex items-start justify-between gap-4"><h2 id="product-recovery-title" className="text-xl font-semibold">Saved product decision</h2><button type="button" disabled={recovery.working} className={secondaryButton} onClick={onClose}>Close</button></div>
        <p className="text-base text-white/80">These are the saved request details, not a current product read. Retry confirms the original decision; current product facts refresh separately.</p>
        {body && <div className="space-y-3 break-words">
          <p className="text-base font-semibold">{body.payload.sku}</p>
          <p className="text-base text-white/90">{body.payload.reason}</p>
          <p className="text-sm text-white/70">Original version: {body.payload.expectedUpdatedAt}</p>
          <p className="text-base">Human review in this request: {body.payload.patch.is_human_reviewed === true ? 'Reviewed' : body.payload.patch.is_human_reviewed === false ? 'Needs review' : 'Unchanged'}</p>
          <details><summary className="min-h-11 cursor-pointer py-3 text-base">All saved changes</summary><pre className="whitespace-pre-wrap break-all text-sm text-white/80">{JSON.stringify(body.payload.patch, null, 2)}</pre></details>
        </div>}
        {!canManageProducts && <p role="alert" className="text-base text-crimson">Only the original Admin or SuperAdmin can resolve this decision. The request stays saved.</p>}
        {recovery.error && <p role="alert" className="break-words text-base text-crimson">{recovery.error}</p>}
        {recovery.canReconcile && <div className="space-y-3">
          <p className="text-base text-white/80">Opens the latest product details. Your previous edits and reason will not carry over.</p>
          <button type="button" className={primaryButton} disabled={recovery.working || !canManageProducts || !body} onClick={async () => {
            const result = await recovery.reviewLatest()
            if (result.nonApplied) onNotApplied(result.product, result.taxonomyReview)
            else if (result.ok) onRecorded(result.result.sku)
          }}>{recovery.working ? 'Checking latest product…' : 'Review latest product'}</button>
        </div>}
        <button type="button" className={recovery.canReconcile ? secondaryButton : primaryButton} disabled={recovery.working || !canManageProducts || !body} onClick={async () => {
          const result = await recovery.retry()
          if (result.ok) onRecorded(result.result.sku)
        }}>{recovery.working ? 'Confirming saved decision…' : 'Retry saved decision'}</button>
      </div>
    </AdminDialog>
  </div>
}
