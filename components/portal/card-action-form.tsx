'use client';
import {Suspense,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {PortalShell} from '@/components/portal/portal-shell';
import {PageHeader} from '@/components/portal/page-header';
import {Button} from '@/components/ui/button';
import {Card,CardContent} from '@/components/ui/card';
import {cardsApi} from '@/lib/services';
import {ApiError} from '@/lib/api-client';
import {useResource} from '@/lib/use-resource';
import {clearRenewal,restoreRenewal,saveRenewal,type RenewalOperation} from '@/lib/renewal-operation';
import {useSession} from './session-provider';
import {DataState} from './data-state';
import type {IDCard} from '@/lib/contracts';
function ActionContent({type}:{type:'renew'|'reissue'}){
 const id=useSearchParams().get('card')??'';const {user}=useSession();
 const state=useResource(()=>id?cardsApi.get(id):Promise.reject(new Error('Select a card from its details page.')),[id]);
 const card=state.data?.data;const [result,setResult]=useState<IDCard>();const [option,setOption]=useState<'existing'|'new_physical'>('existing');const [reason,setReason]=useState('');const [acknowledged,setAcknowledged]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const isRenew=type==='renew';
 const policy=useResource(()=>isRenew?cardsApi.policy():Promise.resolve(null),[isRenew]);const term=policy.data?.data;
 const preview=useResource(()=>isRenew&&card?.status==='active'&&term?.canRenew?cardsApi.preview(id,option):Promise.resolve(null),[isRenew,id,option,state.data?.etag,term?.canRenew]);
 const [pending,setPending]=useState<RenewalOperation|null>(null);const [storageReady,setStorageReady]=useState(false);const [unapplied,setUnapplied]=useState(false);
 const inFlight=useRef(false);
 useEffect(()=>{
  setStorageReady(false);setPending(null);setResult(undefined);setUnapplied(false);
  if(!isRenew){setStorageReady(true);return;}
  if(!user)return;
  try{const operation=restoreRenewal(sessionStorage,user.id,id);setPending(operation);if(operation)setOption(operation.option);setStorageReady(true);}
  catch{setError('Unable to restore renewal metadata. Reload and review the card; browser session storage must be available.');}
 },[isRenew,user?.id,id]);
 async function discard(){
  if(!pending||busy)return;setBusy(true);setError('');
  try{const latest=await cardsApi.get(id);if(latest.etag!==pending.etag&&!unapplied)throw new Error('The card changed. Reconcile the original operation before discarding it.');if(!window.confirm('Discard this unapplied attempt and review the latest card before any new renewal?'))return;clearRenewal(sessionStorage,pending);setPending(null);setUnapplied(false);state.refetch();}
  catch(cause){setError(cause instanceof Error?cause.message:'Unable to safely discard the operation.');}finally{setBusy(false);}
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();if(inFlight.current||busy||!card||!user||!storageReady)return;
  if(!isRenew&&(!reason.trim()||!acknowledged)){setError('Provide a reason and acknowledge deactivation.');return;}
  const impact=preview.data;
  if(isRenew&&!pending&&(!term?.canRenew||!impact||preview.loading||impact.data.option!==option||impact.etag!==state.data?.etag||card.status!=='active'))return;
  const confirmation=isRenew?(pending?'Reconcile the original renewal using the same operation identifier?':'Renew '+card.number+'? Current expiry '+impact!.data.currentExpiry+'; proposed expiry '+impact!.data.proposedExpiry+'; type '+(option==='existing'?'existing card':'new physical card')+'.'):'Deactivate and reissue '+card.number+'?';
  if(!window.confirm(confirmation))return;
  inFlight.current=true;setBusy(true);setError('');let renewalSent=false;
  try{
   let response;
   if(isRenew){
    const operation=pending??{key:crypto.randomUUID(),administratorId:user.id,cardId:id,option,etag:impact!.etag!,createdAt:Date.now()};
    // Persist before the request. Storage failure must prevent an unrecoverable write.
    saveRenewal(sessionStorage,operation);setPending(operation);
    renewalSent=true;response=await cardsApi.renew(id,operation.option,operation.key,operation.etag);
    if(!response.data?.id||!response.data.number)throw new Error('The server did not confirm the resulting card.');
    clearRenewal(sessionStorage,operation);setPending(null);setUnapplied(false);
   }else response=await cardsApi.reissue(card.id,reason.trim(),acknowledged);
   if(!response.data?.id||!response.data.number)throw new Error('The server did not confirm the resulting card.');
   if(!isRenew&&response.data.id===card.id)throw new Error('Reissue must return a new credential.');
   setResult(response.data);state.refetch();
  }catch(cause){
   const status=cause instanceof ApiError?cause.status:0;
   if(isRenew&&!renewalSent){setError('Unable to save pending renewal metadata. No renewal request was sent. Enable session storage and reload.');return;}
   if(isRenew){setUnapplied([412,422,428].includes(status));setError([412,428].includes(status)?'This renewal was not applied because the card revision changed or is missing. Reload and review the latest card before a new renewal.':status===409?'The operation details conflict. Reconcile the original operation before starting another renewal.':'The renewal result is uncertain or unconfirmed. The original operation identifier is retained. Check the latest card below and explicitly retry/reconcile; do not start another renewal.');state.refetch();}
   else setError(cause instanceof Error?cause.message:'Unable to complete card action.');
  }finally{inFlight.current=false;setBusy(false);}
 }
 return <PortalShell><PageHeader title={isRenew?'Renew Card':'Reissue Card'} description={isRenew?'Extend credential validity while preserving holder record.':'Deactivate old credential and issue a replacement card.'}/><DataState {...state} retry={state.refetch}/>{isRenew&&<><DataState {...policy} retry={policy.refetch}/><p className="mb-4 text-sm">{term?.canRenew?'Renewal policy: '+term.termLabel:'Card issuance and renewal are unavailable until a validity policy is approved.'}</p></>}{card&&<Card><CardContent className="space-y-4"><div className="rounded-md bg-slate-50 p-4 text-sm"><div className="font-semibold">{card.number} · {card.employee.name}</div><div className="text-slate-500">{card.employee.designation} · Current expiry {card.expiryDate}</div></div>{pending&&<div role="status" className="rounded-md bg-slate-50 p-4 text-sm">{Date.now()-pending.createdAt>86400000?'An older unresolved renewal requires reconciliation.':'An unresolved renewal is saved in this tab.'} Refreshing never resubmits it. Retry/reconcile the original operation to confirm its result.{(state.data?.etag===pending.etag||unapplied)&&<Button type="button" disabled={busy} onClick={()=>void discard()}>Discard unapplied attempt</Button>}</div>}{card.status!=='active'&&!result&&!pending?<p role="alert" className="text-sm">This card is inactive. Lifecycle actions are unavailable.</p>:!result&&<form onSubmit={submit} className="space-y-4">{isRenew?<><label className="block text-sm font-medium text-slate-600">Renewal Type<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" disabled={busy||!!pending||!term?.canRenew} value={option} onChange={event=>setOption(event.target.value as typeof option)}><option value="existing">Renew existing card</option><option value="new_physical">Renew and print new physical card</option></select></label>{!pending&&<><DataState {...preview} retry={preview.refetch}/>{preview.data&&<div aria-label="Renewal expiry preview" className="rounded-md bg-slate-50 p-4 text-sm"><div>Current expiry: {preview.data.data.currentExpiry}</div><div>Proposed new expiry: {preview.data.data.proposedExpiry}</div><div>Renewal type: {option==='existing'?'Renew existing card':'Renew and print new physical card'}</div></div>}{preview.data?.etag!==state.data?.etag&&!preview.loading&&<Button type="button" onClick={state.refetch}>Reload latest card</Button>}</>}</>:<><label className="block text-sm">Reissue Reason<select required disabled={busy} className="mt-1 h-10 w-full rounded border px-3" value={reason} onChange={event=>setReason(event.target.value)}><option value="">Select reason</option><option>Lost / Stolen Card</option><option>Damaged Card</option><option>Updated Information</option><option>Other</option></select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={acknowledged} onChange={event=>setAcknowledged(event.target.checked)} required/>I acknowledge the previous card will be deactivated.</label></>}<Button disabled={busy||!storageReady||(isRenew&&!pending&&(!term?.canRenew||!preview.data||preview.loading||preview.data.data.option!==option||preview.data.etag!==state.data?.etag))} variant={isRenew?'default':'danger'}>{busy?'Processing…':isRenew?(pending?'Retry / reconcile original renewal':'Confirm Renewal'):'Confirm Reissue'}</Button></form>}{result&&<div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{isRenew?'Card renewed: ':'Replacement issued: '}{result.number} · Expiry {result.expiryDate}<div className="mt-3 flex gap-2"><Link href={'/id-cards/'+encodeURIComponent(result.id)} className="rounded-md bg-emerald-600 px-3 py-2 text-white">View / Print ID Card</Link><Link href={'/employees/'+encodeURIComponent(result.employeeId)} className="px-3 py-2 text-blue-700">Employee / Card History</Link></div>{isRenew&&result.id===id&&<Button type="button" onClick={()=>{setResult(undefined);state.refetch();}}>Review another renewal</Button>}</div>}{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}</CardContent></Card>}</PortalShell>;
}
export function CardActionForm({type}:{type:'renew'|'reissue'}){return <Suspense><ActionContent type={type}/></Suspense>;}
