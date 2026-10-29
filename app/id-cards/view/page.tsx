'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {Suspense, useState} from 'react';
import {PortalShell} from '@/components/portal/portal-shell';
import {PageHeader} from '@/components/portal/page-header';
import {Button} from '@/components/ui/button';
import {Card,CardContent} from '@/components/ui/card';
import {Dialog} from '@/components/ui/dialog';
import {DataState} from '@/components/portal/data-state';
import {IdCardPreview} from '@/components/portal/id-card-preview';
import {CardColourControl} from '@/components/portal/card-colour-control';
import {cardsApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {cardLabel} from '@/lib/contracts';
export default function CardDetailPage(){return <Suspense><CardDetailContent/></Suspense>;}

function CardDetailContent(){
 const id=useSearchParams().get('id')??'';
 const state=useResource(()=>id?cardsApi.get(id):Promise.reject(new Error('Select a card from the list.')),[id]);const card=state.data?.data;
 const [deactivate,setDeactivate]=useState(false);const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function submit(event:React.FormEvent){event.preventDefault();if(busy||!reason.trim())return;setBusy(true);setError('');try{const result=await cardsApi.deactivate(id,reason.trim());if(!result.data?.id||result.data.status!=='revoked')throw new Error('The server did not confirm deactivation.');setDeactivate(false);state.refetch();}catch(cause){setError(cause instanceof Error?cause.message:'Unable to deactivate.');}finally{setBusy(false);}}
 return <PortalShell><DataState {...state} retry={state.refetch}/>{card&&<><PageHeader title={card.number} description="Official smart ID credential detail" action={<Button variant="outline" onClick={()=>window.print()}>Print Card</Button>}/><div className="grid gap-5 xl:grid-cols-[740px_1fr]"><Card><CardContent><IdCardPreview card={card}/></CardContent></Card><Card><CardContent className="grid gap-4 md:grid-cols-2">{[['Employee ID',card.employee.displayId],['Department',card.employee.department],['Issued By',card.issuedBy],['Issue Date',card.issueDate],['Expiry Date',card.expiryDate],['Status',cardLabel(card)]].map(([label,value])=><div key={label} className="rounded-md border border-slate-100 p-3"><div className="text-xs uppercase text-slate-500">{label}</div><div className="mt-1 text-sm">{value}</div></div>)}<div className="md:col-span-2"><CardColourControl/></div><div className="flex flex-wrap gap-3 md:col-span-2"><Link href={'/employees/view?id='+encodeURIComponent(card.employeeId)} className="text-sm text-blue-700">Employee</Link>{card.status==='active'&&Boolean(card.verificationToken)&&card.credentialState!=='historical'&&card.credentialState!=='ineligible'&&<><Link href={'/renew-card?card='+encodeURIComponent(card.id)} className="text-sm text-blue-700">Renew</Link><Link href={'/reissue-card?card='+encodeURIComponent(card.id)} className="text-sm text-blue-700">Reissue</Link><Button variant="danger" onClick={()=>setDeactivate(true)}>Deactivate</Button></>}</div></CardContent></Card></div></>}{deactivate&&<Dialog open title="Confirm Card Deactivation" onClose={()=>{if(!busy)setDeactivate(false);}}><form onSubmit={submit} className="space-y-4"><p className="text-sm">Deactivate {card?.number}? This credential will no longer verify as active.</p><label className="block text-sm">Reason<textarea required className="mt-2 w-full rounded border p-2" value={reason} onChange={event=>setReason(event.target.value)}/></label>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<Button variant="danger" disabled={busy}>{busy?'Deactivating…':'Confirm Deactivation'}</Button></form></Dialog>}</PortalShell>;
}
