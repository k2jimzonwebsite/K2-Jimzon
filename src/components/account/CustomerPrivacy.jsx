import { useEffect,useRef,useState } from 'react'
import { customerPrivacyCommand } from '../../services/customerAccountService'
import { field,primary,secondary,formatDate } from './accountUi'

const LAST='k2-privacy-last-request-v1'
const key=owner=>`k2-privacy-request-v1:${owner}`
function readSaved(owner) {
 try {
  const value=JSON.parse(localStorage.getItem(owner?key(owner):LAST)||'null')
  return value&&(!owner||value.owner===owner)&&typeof value.requestId==='string'&&typeof value.receiptToken==='string'?value:null
 }catch{return null}
}
function newSaved(owner,channel) {
 const bytes=crypto.getRandomValues(new Uint8Array(32))
 const receiptToken=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')
 return {owner,channel,requestId:crypto.randomUUID(),receiptToken}
}
const retainedLabels={excel_review:'Excel copies need review',backup_review:'Backup copies need review',transaction_retention_review:'Required transaction records are retained pending retention review',conversation_audit_review:'Conversation audit records need review',external_channel_review:'External channel copies need review'}
const reasonLabels={open_order_or_payment:'An order or payment case is still open.',open_pasabuy:'A Pasabuy request is still open.',open_wholesale:'A Wholesale inquiry is still open.',active_hold:'A legal, refund, dispute or security hold needs review.',case_review:'A support case needs review.'}
export default function CustomerPrivacy(props) {
 if(import.meta.env.VITE_CUSTOMER_PRIVACY_ENABLED!=='true')return props.recoveryOnly?null:<section aria-labelledby="account-closure-title" className="mt-10 border-t border-line pt-8">
  <h2 id="account-closure-title" className="font-serif text-2xl font-semibold text-navy">Privacy</h2>
  <p className="mt-3 text-sm leading-6 text-navy-soft">For account closure or a privacy request, contact K2.</p>
  <a className={`${secondary} mt-4`} href="/contact">Contact K2</a>
 </section>
 return <EnabledCustomerPrivacy {...props} />
}
function EnabledCustomerPrivacy({account,offline,recoveryOnly=false}) {
 const owner=account.session?.user?.id||null
 const [saved,setSaved]=useState(()=>readSaved(recoveryOnly?null:owner))
 const [receipt,setReceipt]=useState(null);const [pending,setPending]=useState(false);const [error,setError]=useState('')
 const [understood,setUnderstood]=useState(false);const [code,setCode]=useState('');const [sent,setSent]=useState(false)
 const contacts=[account.session?.user?.email_confirmed_at&&'email',account.session?.user?.phone_confirmed_at&&'phone'].filter(Boolean)
 const [channel,setChannel]=useState(contacts[0]||'email');const active=useRef(true);const operation=useRef(0)
 useEffect(()=>{active.current=true;return()=>{active.current=false;operation.current++}},[])
 const command=async(op,context=saved)=>{
  if(!context||offline)return {ok:false,error:'Reconnect before continuing this request.'}
  const run=++operation.current;setPending(true);setError('')
  const body={operation:op,requestId:context.requestId,receiptToken:context.receiptToken,
   ...(op==='begin'?{channel:context.channel}:op==='confirm'?{code}: {})}
  const result=await customerPrivacyCommand(account.session?.access_token,body)
  if(!active.current||operation.current!==run)return result
  setPending(false)
  if(result.ok) {
   setReceipt(result.data)
   if(result.data?.state==='closed') {
    try{localStorage.setItem(LAST,JSON.stringify(context))}catch{ /* in-memory receipt remains visible */ }
   }
  }else {
   if(result.code==='PRIVACY_PROOF_EXPIRED'){
    setReceipt(current=>({...current,requestId:context.requestId,state:'expired',canCancel:false}));setCode('')
   }
   setError(result.error||'This request could not be checked. Keep the saved request and try again.')
  }
  return result
 }
 useEffect(()=>{if(saved&&!offline)void command('status',saved)},[]) // one recovery read; explicit refresh handles later changes
 useEffect(()=>{if(receipt?.state==='closed'&&owner&&!recoveryOnly)void account.signOut?.()},[receipt?.state,owner,recoveryOnly])
 const begin=async()=>{
  if(!understood||offline)return
  let context=saved
  if(!context||['cancelled','expired'].includes(receipt?.state)) {
   context=newSaved(owner,channel)
   // Persist before the first request so a lost acknowledgement retains the
   // exact operation and private recovery capability. Refuse if saving fails.
   try{localStorage.setItem(key(owner),JSON.stringify(context))}catch{return setError('This browser could not save recovery details. Enable site storage before requesting closure.')}
   setSaved(context);setReceipt(null)
  }
  const start=await command('begin',context)
  if(!active.current||!start.ok)return
  const delivered=await command('send',context)
  if(active.current&&delivered.ok)setSent(true)
 }
 const confirm=async(event)=>{
  event.preventDefault()
  try{localStorage.setItem(LAST,JSON.stringify(saved))}catch{return setError('Recovery details could not be saved. Enable site storage before confirming closure.')}
  const result=await command('confirm')
  if(!active.current||!result.ok)return
  setCode('')
 }
 if(recoveryOnly&&!saved)return null
 const done=receipt?.state==='closed'
 const waiting=receipt?.state==='held'||receipt?.state==='pending'
 const fresh=!saved||!receipt||['cancelled','expired'].includes(receipt?.state)
 return <section aria-labelledby={recoveryOnly?'closure-receipt-title':'account-closure-title'} className="scroll-mt-32 border-t border-line py-8">
  <h2 id={recoveryOnly?'closure-receipt-title':'account-closure-title'} className="font-serif text-2xl font-semibold text-navy">{recoveryOnly?'Your closure receipt':'Close your account and request data removal'}</h2>
  {!done&&!recoveryOnly&&<p className="mt-2 max-w-[70ch] text-sm leading-6 text-navy-soft">We’ll send a fresh code to your verified contact. Eligible closure starts immediately after you confirm. An open order, refund or dispute keeps closure pending; it resumes automatically when resolved. You can cancel until processing starts.</p>}
  <p className="mt-2 max-w-[70ch] text-sm leading-6 text-navy-soft">K2 retains records it still needs for required transactions or active cases. Excel and backup cleanup still need confirmation. Closing app access does not mean every copy is erased.</p>
  {receipt&&<div className="mt-4 border-y border-line py-4 text-sm leading-6 text-navy" role="status">
   {done?<p className="font-bold">Account access is closed.</p>:waiting?<p className="font-bold">Your closure request is pending.</p>:receipt.state==='cancelled'?<p className="font-bold">Closure cancelled. Your account remains available.</p>:receipt.state==='expired'?<p className="font-bold">Verification expired. Start again when you’re ready.</p>:<p className="font-bold">Fresh verification is required.</p>}
   {waiting&&<><p>Access stays available while the open case is resolved, subject to normal session expiry. Closure will then continue automatically.</p>{(receipt.reasons||[]).map(reason=><p key={reason}>{reasonLabels[reason]||'K2 needs to review an outstanding case.'}</p>)}</>}
   {done&&<><p>Closed {formatDate(receipt.closedAt)}. {receipt.providerState==='complete'?'Sign-in cleanup is complete.':'Sign-in cleanup is still being processed.'}</p><ul className="mt-2 list-inside list-disc">{(receipt.retainedCategories||[]).map(category=><li key={category}>{retainedLabels[category]||'A retained record still needs review'}</li>)}</ul></>}
   <p className="mt-2 break-all font-mono text-xs text-navy-soft">Request {receipt.requestId}</p>
  </div>}
  {!recoveryOnly&&!done&&fresh&&<div className="mt-5 space-y-4">
   {contacts.length>1&&<label className="block text-sm font-bold text-navy">Verified contact<select className={field} value={channel} onChange={event=>setChannel(event.target.value)}>{contacts.map(kind=><option key={kind} value={kind}>{kind==='email'?'Email':'Phone'}</option>)}</select></label>}
   <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-navy"><input className="mt-1 h-5 w-5 shrink-0 accent-crimson" type="checkbox" checked={understood} onChange={event=>setUnderstood(event.target.checked)}/><span>I understand eligible closure starts after confirmation and pending requests resume automatically.</span></label>
   <button type="button" className={primary} disabled={pending||offline||!understood||!contacts.length} onClick={begin}>{pending?'Preparing verification…':'Send closure verification code'}</button>
  </div>}
  {!recoveryOnly&&saved&&!done&&!waiting&&!fresh&&<form onSubmit={confirm} className="mt-5 max-w-md">
   <p className="text-sm leading-6 text-navy-soft">{sent?'Check your verified contact for a code.':'Use your fresh code, or send a new one. This saved request survives a reload.'}</p>
   <label className="mt-4 block text-sm font-bold text-navy" htmlFor="closure-code">Closure verification code<input id="closure-code" className={field} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,10}" minLength={6} maxLength={10} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} required/></label>
   <div className="mt-4 flex flex-wrap gap-2"><button type="submit" className={primary} disabled={pending||offline||code.length<6}>{pending?'Checking…':'Confirm account closure'}</button><button type="button" className={secondary} disabled={pending||offline} onClick={async()=>{const result=await command('send');if(result.ok)setSent(true)}}>Send a new code</button></div>
  </form>}
  {saved&&<div className="mt-4 flex flex-wrap gap-2"><button type="button" className={secondary} disabled={pending||offline} onClick={()=>command('status')}>Check saved closure status</button>{!recoveryOnly&&receipt?.canCancel&&<button type="button" className={secondary} disabled={pending||offline} onClick={()=>command('cancel')}>Cancel closure request</button>}{done&&account.session&&<button type="button" className={secondary} onClick={()=>account.signOut()}>Sign out of closed account</button>}</div>}
  {error&&<p className="mt-4 text-sm font-semibold text-crimson" role="alert">{error}</p>}
  {offline&&<p className="mt-3 text-sm text-navy-soft">Reconnect to send a code, change this request or check its current status.</p>}
 </section>
}
