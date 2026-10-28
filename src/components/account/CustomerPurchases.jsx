import { useCallback,useEffect,useRef,useState } from 'react'
import { acceptAccountExpressDelivery,loadCustomerPortfolio,loadCustomerPaymentProof } from '../../services/customerAccountService'
import { hasFinalOrderCharge } from '../../lib/orderChargeState'
import ExpressDeliveryApproval from '../shop/ExpressDeliveryApproval'
import { primary,secondary,formatDate,peso } from './accountUi'

function download(contents,name,type) {
 const url=URL.createObjectURL(new Blob([contents],{type}));const link=document.createElement('a')
 link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),15000)
}
function OrderDetails({order,account,offline}) {
 const [pending,setPending]=useState('');const [error,setError]=useState('');const active=useRef(true)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 const proof=async(id)=>{
  setPending(id);setError('');const result=await loadCustomerPaymentProof(account.session.access_token,order.public_reference,id)
  if(!active.current)return
  setPending('')
  if(!result.ok)return setError(result.error||'The proof could not be downloaded. Try again.')
  const file=result.data?.proof
  if(!file||!['application/pdf','image/png','image/jpeg'].includes(file.mediaType)||typeof file.base64!=='string'||file.base64.length>4300000)return setError('This proof is unavailable. Contact K2.')
  try {
   const bytes=Uint8Array.from(atob(file.base64),char=>char.charCodeAt(0))
   download(bytes,`${order.public_reference}-proof-${id}.${file.mediaType==='application/pdf'?'pdf':file.mediaType==='image/png'?'png':'jpg'}`,file.mediaType)
  }catch{setError('The proof could not be downloaded. Try again.')}
 }
 const summary=()=>download([
  'K2 Jimzon — order summary',`Reference: ${order.public_reference}`,`Created: ${formatDate(order.created_at)}`,
  `Order: ${order.status}`,`Payment: ${order.payment_status.replaceAll('_',' ')}`,
  ...order.items.map(item=>`${item.name} (${item.sku}) — ${item.quantity} × ${peso(item.unitPrice)} = ${peso(item.lineTotal)}`),
  `Order total: ${hasFinalOrderCharge(order)?peso(order.total_amount):'Pending staff review'}`,
  `Recorded payment amount: ${order.payment?.currency==='PHP'?peso(order.payment?.amount):'Unavailable'}`,
  'Uploaded proof is not payment confirmation. This order summary is not a tax invoice.',
 ].join('\r\n'),`${order.public_reference}-summary.txt`,'text/plain;charset=utf-8')
 return <details className="mt-3 text-sm text-navy">
  <summary className="min-h-11 cursor-pointer py-3 font-bold underline decoration-line underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson">Order details and payment records</summary>
  <div className="space-y-4 pb-2 pt-2">
   <ul className="divide-y divide-line">{order.items.map(item=><li key={item.sku} className="py-3"><p className="font-semibold">{item.name}</p><p className="mt-1 text-navy-soft">{item.quantity} × {peso(item.unitPrice)} · {peso(item.lineTotal)}</p></li>)}</ul>
   {order.itemsTruncated&&<p className="text-navy-soft">This order has more items. Contact K2 for the complete record.</p>}
   <div className="leading-6"><p>Payment status: <strong>{order.payment_status.replaceAll('_',' ')}</strong></p>
    <p>Recorded amount: {order.payment?.currency==='PHP'?peso(order.payment?.amount):'Amount unavailable'}</p>
    {order.payment?.method&&<p>Method: {order.payment.method}</p>}{order.payment?.reference&&<p className="break-words">Reference: {order.payment.reference}</p>}
    <p className="mt-2 text-navy-soft">Uploaded proof is separate from K2’s payment verification. The order summary is not a tax invoice.</p>
   </div>
   <div className="flex flex-wrap gap-2"><button type="button" className={secondary} onClick={summary} disabled={order.itemsTruncated}>Download order summary</button>
    {(order.proofs||[]).map((item,index)=><button key={item.id} type="button" className={secondary} disabled={offline||Boolean(pending)} onClick={()=>proof(item.id)}>{pending===item.id?'Downloading proof…':`Download uploaded proof ${index+1}`}</button>)}
   </div>{error&&<p role="alert" className="font-semibold text-crimson">{error}</p>}
  </div>
 </details>
}
export default function CustomerPurchases({account,offline}) {
 const [state,setState]=useState({status:'loading',data:null,error:''});const generation=useRef(0)
 const token=account.session.access_token
 const load=useCallback(async(cursor=null)=>{
  const run=++generation.current;setState(current=>({...current,status:'loading',error:''}))
  const result=await loadCustomerPortfolio(token,cursor)
  if(run!==generation.current)return
  setState(current=>result.ok?{status:'ready',error:'',data:{...result.data,orders:cursor
   ?[...new Map([...(current.data?.orders||[]),...result.data.orders].map(order=>[order.public_reference,order])).values()]:result.data.orders}}
   :{...current,status:'error',error:result.error})
 },[token])
 useEffect(()=>{void load();return()=>{generation.current++}},[load])
 const orders=state.data?.orders||account.history?.orders||[]
 const summary=state.data?.summary
 return <section aria-labelledby="purchases-title" className="scroll-mt-32">
  <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="purchases-title" className="font-serif text-2xl font-semibold text-navy">Your purchases</h2><button className={secondary} type="button" onClick={()=>load()} disabled={offline||state.status==='loading'}>Refresh purchases</button></div>
  <p className="mt-2 text-sm leading-6 text-navy-soft">Linked K2 records only. Other guest purchases appear after you link them.</p>
  {summary&&<div className="my-4 border-y border-line py-4 text-sm leading-7 text-navy tabular-nums"><p className="font-bold">{summary.orderCount} linked orders</p><p>Verified payments: <strong>{peso(summary.verifiedAmount)}</strong></p><p>{summary.fulfilledItems} items in fulfilled orders</p><p>Recorded payments on orders marked refunded: {peso(summary.refundedAmount)}</p><p className="text-navy-soft">This total shows original payments, not the amounts refunded.</p>
   {summary.unknownPaymentCount>0&&<p className="mt-2 text-navy-soft">{summary.unknownPaymentCount} payment {summary.unknownPaymentCount===1?'record has':'records have'} no confirmed amount. The totals above cover recorded amounts only.</p>}</div>}
  {state.status==='loading'&&<p className="mt-4 text-sm text-navy-soft" role="status">Loading purchase records…</p>}
  {state.error&&<div className="mt-4 text-sm" role="alert"><p className="text-crimson">{state.error}</p><p className="mt-1 leading-6 text-navy-soft">Recent order requests remain below. Full purchase totals are unavailable.</p><button type="button" className={`${secondary} mt-2`} disabled={offline} onClick={()=>load()}>Retry purchase records</button></div>}
  <div className="mt-4 divide-y divide-line border-y border-line">{orders.map(order=><article key={order.public_reference} className="py-4">
   <div className="flex flex-wrap justify-between gap-3"><h3 className="break-all font-mono text-sm font-bold text-navy">{order.public_reference}</h3><p className="font-bold text-navy">{order.delivery_review_required===true?'Total needs staff review':hasFinalOrderCharge(order)?peso(order.total_amount):'Final total pending'}</p></div>
   <p className="mt-2 text-sm text-navy-soft">{order.status} · {order.delivery_review_required===true?'Recorded payment':'Payment'} {order.payment_status.replaceAll('_',' ')} · {formatDate(order.created_at)}</p>
   {order.delivery_review_required===true&&<p className="mt-2 text-sm leading-6 text-navy-soft">Message K2 staff before transferring money. Your recorded payment history is kept.</p>}
   {order.delivery_review_required!==true&&(order.express_quote||order.shipping_quote_status==='pending_quote')&&<ExpressDeliveryApproval key={`${account.session.user.id}:${order.public_reference}`} reference={order.public_reference} quote={order.express_quote} identity={account.session.user.id} offline={offline}
    onSubmit={body=>acceptAccountExpressDelivery(token,body)} onRefresh={()=>account.refreshHistory()} onAccepted={()=>{account.refreshHistory();load()}}/>}
   {Array.isArray(order.items)&&<OrderDetails order={order} account={account} offline={offline}/>}
  </article>)}{state.status==='ready'&&!orders.length&&<p className="py-6 text-sm leading-6 text-navy-soft">No linked order requests yet. Guest checkout still works without signing in.</p>}</div>
  {state.data?.nextCursor&&<button type="button" className={`${primary} mt-4`} disabled={offline||state.status==='loading'} onClick={()=>load(state.data.nextCursor)}>Load earlier orders</button>}
 </section>
}
