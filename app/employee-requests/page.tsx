'use client';

import {useState} from 'react';
import {requestsApi, invitesApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {DataState} from '@/components/portal/data-state';
import {Pagination} from '@/components/portal/pagination';
import {RequestReview, InviteDialog} from '@/components/portal/request-dialogs';
import Link from 'next/link';
import {Check, Plus} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';

export default function EmployeeRequestsPage() {
  const [reviewId,setReviewId]=useState<string>();
  const [showInvite,setShowInvite]=useState(false);
  const [message,setMessage]=useState('');
  const [page,setPage]=useState(1);
  const [invitePage,setInvitePage]=useState(1);
  const [activeTab, setActiveTab] = useState('All Requests');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All Roles');

  const state=useResource(()=>requestsApi.list({page,search,status:activeTab==='All Requests'?undefined:activeTab==='Pending Review'?'pending':activeTab.toLowerCase(),role:role==='All Roles'?undefined:role}),[page,search,activeTab,role]);
  const invites=useResource(()=>invitesApi.list({page:invitePage}),[invitePage]);
  const summary=useResource(requestsApi.summary);
  const pending=summary.data?.data.pending??'—';
  const approved=summary.data?.data.approved??'—';
  const requests=(state.data?.data??[]);
  const filtered=requests.map(item=>({...item,name:item.dossier.fullName,nameUrdu:'',designation:item.dossier.designation,role:item.dossier.roleCategory==='van'?'Delivery Van Driver':item.dossier.roleCategory==='motorcycle'?'Motorcycle Field Sales Executive':'Office / General',cnic:item.dossier.cnic,phone:item.dossier.mobileNumber,joining:item.dossier.joiningDate,submitted:item.submittedAt,status:item.status==='pending'?'Pending Review':item.status==='approved'?'Approved':'Rejected'}));
  const invitationLinks=(invites.data?.data??[]).map(item=>({...item,expires:item.expiresAt}));
  async function copy(token?:string){if(!token){setMessage('This invitation has no shareable token.');return;}try{await navigator.clipboard.writeText(window.location.origin+'/employee-registration?token='+encodeURIComponent(token));setMessage('Registration link copied.');}catch{setMessage('Clipboard access failed. Open the candidate link and copy its address.');}}

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
      <div className="px-5 pb-8">
        <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight">Employee Enrollment Requests</h1>
            <p className="mt-1 text-[12px] text-slate-600">
              Review digital enrollment submissions from candidates, verify background credentials, and approve to issue Smart ID cards.
            </p>
          </div>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]" type="button" onClick={()=>setShowInvite(true)}>
            <Plus size={14} />
            Generate Registration Link
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Pending Review', pending, 'Awaiting admin verification', 'text-yellow-500'],
            ['Approved & Enrolled', approved, 'Ready for ID card generation', 'text-emerald-700'],
            ['Field Sales & Drivers', summary.data?.data.fieldRoles??'—', 'Delivery Van / Motorcycle verified', 'text-blue-600'],
            ['Active Invitation Links', summary.data?.data.activeInvitations??'—', 'Authorized access tokens', 'text-slate-950'],
          ].map(([label, value, helper, color]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-[18px] py-4 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
              <div className={`mt-3 text-[22px] font-semibold leading-none ${color}`}>{value}</div>
              <div className="mt-3 text-[11px] text-slate-600">{helper}</div>
            </div>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              {[
                ['All Requests', summary.data?.data.total??'—'],
                ['Pending Review', pending],
                ['Approved', approved],
                ['Rejected', summary.data?.data.rejected??'—'],
              ].map(([label, count]) => (
                <button
                  key={label}
                  className={`h-8 rounded-md px-4 text-[12px] ${activeTab === label ? 'bg-[#123b6d] font-medium text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  type="button"
                  onClick={() => {setActiveTab(String(label));setPage(1);}}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600" placeholder="Search by name, CNIC, request #..." value={search} onChange={(event) => {setSearch(event.target.value);setPage(1);}} />
              <select className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600" value={role} onChange={(event) => {setRole(event.target.value);setPage(1);}}>
                <option>All Roles</option>
                <option>Delivery Van Driver</option>
                <option>Office / General</option>
              </select>
            </div>
          </div>

          <DataState {...state} retry={state.refetch} empty={!state.loading&&!filtered.length}/>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-medium">Candidate / Applicant</th>
                  <th className="px-4 py-4 font-medium">Request ID</th>
                  <th className="px-4 py-4 font-medium">Designation & Role</th>
                  <th className="px-4 py-4 font-medium">CNIC & Contact</th>
                  <th className="px-4 py-4 font-medium">Special Role<br />/ Vehicle</th>
                  <th className="px-4 py-4 font-medium">Submitted</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img className="size-9 rounded-md object-cover" src={request.photo} alt="" />
                        <div>
                          <div className="text-[12px] font-medium leading-snug">{request.name}</div>
                          <div className="mt-1 text-right text-[10px] text-slate-600">{request.nameUrdu}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-[11px] font-semibold text-pink-600">{request.id}</td>
                    <td className="px-4 py-4">
                      <div className="text-[12px] font-medium">{request.designation}</div>
                      <div className="mt-1 text-[10px] text-slate-500">Joining: {request.joining}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[11px]">{request.cnic}</div>
                      <div className="mt-1 text-[10px] text-slate-500">{request.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-md border px-2 py-1 text-[10px] ${request.role.includes('Delivery') ? 'border-blue-200 bg-blue-100 text-blue-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                        {request.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[11px] text-slate-700">{request.submitted}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-[10px] font-medium text-yellow-700">{request.status}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="h-11 rounded-md border border-blue-600 px-3 text-[12px] font-medium text-blue-700 hover:bg-blue-50" type="button" onClick={()=>setReviewId(request.id)}>Review</button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={state.data?.meta} onPage={setPage}/>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-200 px-[18px] py-4">
            <div>
              <h2 className="text-[13px] font-semibold">Authorized Registration Links & Invitation Tokens</h2>
              <p className="mt-2 text-[12px] text-slate-600">Controlled employee access tokens generated by admin</p>
            </div>
            <button className="rounded-md border border-blue-600 px-3 py-2 text-[12px] text-blue-700 hover:bg-blue-50" type="button" onClick={()=>setShowInvite(true)}>+ New Token</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-medium">Access Token</th>
                  <th className="px-4 py-4 font-medium">Expires</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 text-right font-medium">Share Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invitationLinks.map((invite) => (
                  <tr key={invite.token}>
                    <td className="px-4 py-4 font-mono text-[12px] font-semibold text-blue-700">{invite.token}</td>
                    <td className="px-4 py-4 text-[12px] text-slate-600">{new Date(invite.expires).toLocaleString()}</td>
                    <td className="px-4 py-4"><span className="rounded-md bg-slate-200 px-2 py-1 text-[10px] text-slate-600">{invite.status}</span></td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={()=>void copy(invite.token)} className="mr-2 rounded-md border border-slate-400 px-3 py-2 text-[12px] text-slate-700" type="button">Copy Link</button>
                      <Link href={invite.token?`/employee-registration?token=${encodeURIComponent(invite.token)}`:'/employee-registration'} className="rounded-md border border-blue-600 px-3 py-2 text-[12px] text-blue-700 hover:bg-blue-50">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataState {...invites} retry={invites.refetch}/><Pagination meta={invites.data?.meta} onPage={setInvitePage}/>
        </section>
      </div>
      </div>
      {message&&<p role="status" className="my-3 text-sm">{message}</p>}
      {reviewId&&<RequestReview id={reviewId} onClose={()=>setReviewId(undefined)} onChanged={()=>{state.refetch();summary.refetch();invites.refetch();}}/>}
      {showInvite&&<InviteDialog onClose={()=>setShowInvite(false)} onCreated={()=>{invites.refetch();summary.refetch();}}/>}
    </PortalShell>
  );
}
