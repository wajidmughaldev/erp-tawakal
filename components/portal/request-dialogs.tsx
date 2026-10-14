'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Dialog} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {requestsApi, invitesApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {DataState} from './data-state';
import {DossierReview} from './dossier-review';
import type {EmployeeRequest} from '@/lib/contracts';
export function RequestReview({id,onClose,onChanged}:{id:string;onClose:()=>void;onChanged:()=>void}) {
  const state=useResource(()=>requestsApi.get(id),[id]);
  const [updated,setUpdated]=useState<EmployeeRequest>();
  const record=updated??state.data?.data;
  const [reason,setReason]=useState('');
  const [rejecting,setRejecting]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function transition(approve:boolean){
    if(busy||record?.status!=='pending')return;
    if(!approve&&!reason.trim()){setError('Enter a rejection reason.');return;}
    if(approve&&!window.confirm('Approve and enroll this candidate?'))return;
    setBusy(true);setError('');
    try{const result=approve?await requestsApi.approve(id):await requestsApi.reject(id,reason.trim());if(!result.data?.id||(approve&&!result.data.employeeId))throw new Error('The server did not confirm the transition.');setUpdated(result.data);onChanged();}
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to update request.');}finally{setBusy(false);}
  }
  return <Dialog open title="Review Enrollment Request" onClose={()=>{if(!busy)onClose();}} className="max-w-3xl"><DataState {...state} retry={state.refetch}/>{record&&<><div className="mb-3 flex justify-between text-sm"><span>{record.trackingId}</span><strong>{record.status}</strong></div>{record.photo&&<img src={record.photo} alt="Candidate photograph" className="mb-3 size-24 rounded-md object-cover"/>}<DossierReview data={record.dossier}/><div className="my-3 text-xs">Uploaded documents: {record.documents?.map(document=>document.name).join(', ')||'None'}</div>{record.status==='pending'&&<div className="mt-4 space-y-3">{rejecting&&<label className="block text-sm">Rejection reason<textarea className="mt-1 w-full rounded border p-2" value={reason} onChange={event=>setReason(event.target.value)}/></label>}<div className="flex gap-2"><Button disabled={busy} onClick={()=>void transition(true)}>Approve and Enroll</Button><Button variant="danger" disabled={busy} onClick={()=>rejecting?void transition(false):setRejecting(true)}>{rejecting?'Confirm Rejection':'Reject'}</Button></div></div>}{record.employeeId&&<div className="mt-4 flex flex-wrap gap-3 text-sm"><span>Approved Employee ID: {record.employeeId}</span><Link className="text-blue-700" href={'/employees/'+encodeURIComponent(record.employeeId)}>View Employee</Link><Link className="text-blue-700" href={'/generate-id-card?employee='+encodeURIComponent(record.employeeId)}>Generate ID Card</Link></div>}{record.rejectionReason&&<p className="mt-3 text-sm">Rejection reason: {record.rejectionReason}</p>}</>}{error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}</Dialog>;
}
export function InviteDialog({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [link,setLink]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const values=new FormData(event.currentTarget);setBusy(true);setError('');try{const result=await invitesApi.create({candidateName:String(values.get('candidateName')),designation:String(values.get('designation')),department:String(values.get('department')),expiresAt:new Date(String(values.get('expiresAt'))).toISOString()});if(!result.data?.id||!result.data.token)throw new Error('The server did not issue an invitation token.');setLink(window.location.origin+'/employee-registration?token='+encodeURIComponent(result.data.token));onCreated();}catch(cause){setError(cause instanceof Error?cause.message:'Unable to generate invitation.');}finally{setBusy(false);}}
  async function copy(){try{await navigator.clipboard.writeText(link);setError('Link copied.');}catch{setError('Clipboard access failed. Select and copy the link below.');}}
  return <Dialog open title="Generate Registration Link" onClose={()=>{if(!busy)onClose();}}><form onSubmit={submit} className="space-y-4">{[['candidateName','Candidate Name'],['designation','Designation'],['department','Department'],['expiresAt','Expiration Date']].map(([key,label])=><label key={key} className="block text-xs font-medium">{label}<input required name={key} type={key==='expiresAt'?'datetime-local':'text'} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3"/></label>)}<Button disabled={busy}>{busy?'Generating…':'Generate Registration Link'}</Button></form>{link&&<div className="mt-4 space-y-2"><input aria-label="Registration link" readOnly value={link} className="w-full rounded border p-2 text-xs"/><Button variant="outline" onClick={()=>void copy()}>Copy Link</Button><a href={link} className="ml-3 text-sm text-blue-700">Open Candidate Link</a></div>}{error&&<p role="status" className="mt-3 text-sm">{error}</p>}</Dialog>;
}
