'use client';

import {Suspense,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {initialFilter, initialPage, persistListQuery} from '@/lib/list-query';
import {managersApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {useSession} from '@/components/portal/session-provider';
import {DataState} from '@/components/portal/data-state';
import {Pagination} from '@/components/portal/pagination';
import {ManagerDialog} from '@/components/portal/manager-dialog';
import type {Manager} from '@/lib/contracts';
import {Check, ChevronDown, Copy, Plus, Search, UserRoundPlus, X} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';
function ManagersContent() {
  const params=useSearchParams();
  const [query, setQuery] = useState(params.get('search')??'');
  const [status, setStatus] = useState(initialFilter(params,'status','All Account Statuses'));
  const [showAddModal, setShowAddModal] = useState(false);

  const [page,setPage]=useState(initialPage(params));const [selected,setSelected]=useState<{id:string;mode:'view'|'edit'}>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);const {user}=useSession();
  const state=useResource(()=>managersApi.list({page,search:query,status:status==='All Account Statuses'?undefined:status.toLowerCase()}),[page,query,status]);
  useEffect(()=>persistListQuery({search:query,status,page}),[query,status,page]);
  const filtered=(state.data?.data??[]).map(manager=>({...manager,initials:manager.name.split(' ').map(part=>part[0]).slice(0,2).join(''),color:'bg-blue-900',title:manager.role,created:'—',createdBy:'—'}));
  async function mutate(manager:Manager,remove:boolean){if(busy||manager.id===user?.id)return;if(!window.confirm(remove?'Delete '+manager.name+'?':(manager.status==='active'?'Deactivate ':'Activate ')+manager.name+'?'))return;setBusy(true);setError('');try{if(remove)await managersApi.remove(manager.id);else{const {id,...body}=manager;await managersApi.update(id,{...body,status:manager.status==='active'?'inactive':'active'});}state.refetch();}catch(cause){setError(cause instanceof Error?cause.message:'Unable to update account.');}finally{setBusy(false);}}

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[20px] font-semibold leading-tight">System Managers & Co-Admins</h1>
              <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">Full Admin Privileges</span>
            </div>
            <p className="mt-2 text-[12px] text-slate-600">Add and manage administrative accounts with their own login credentials and full administrative access across the portal.</p>
          </div>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]" type="button" onClick={() => setShowAddModal(true)}>
            <Plus size={14} />
            Add New Manager / Admin
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <StatCard label="Total Manager Accounts" value={state.data?.meta.total??'—'} helper="Authorized co-administrators" />
          <StatCard label="Active Logins" value={status==='Active'?state.data?.meta.total??'—':'—'} helper="Login enabled" valueClass="text-emerald-700" helperClass="text-emerald-700" />
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-2 border-b border-slate-200 p-3 lg:grid-cols-[1.4fr_.55fr_.4fr]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-blue-600" placeholder="Search manager by name, email, or role..." value={query} onChange={(event) => {setQuery(event.target.value);setPage(1);}} />
            </div>
            <select className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600" value={status} onChange={(event) => {setStatus(event.target.value);setPage(1);}}>
              <option>All Account Statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <button className="h-9 rounded-md border border-slate-500/80 bg-white px-3 text-[12px] text-slate-600 hover:bg-slate-50" type="button" onClick={() => { setQuery(''); setStatus('All Account Statuses');setPage(1); }}>
              Reset Filter
            </button>
          </div>

          <DataState {...state} retry={state.refetch} empty={!state.loading&&!filtered.length}/>{error&&<p role="alert" className="p-3 text-sm text-red-600">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-medium">Manager / Admin</th>
                  <th className="px-4 py-4 font-medium">Login Credentials</th>
                  <th className="px-4 py-4 font-medium">Role / Title</th>
                  <th className="px-4 py-4 font-medium">System Authority</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Created</th>
                  <th className="px-4 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((manager) => (
                  <tr key={manager.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`grid size-9 place-items-center rounded-md text-[11px] font-semibold text-white ${manager.color}`}>{manager.initials}</span>
                        <span>
                          <span className="block text-[12px] font-semibold leading-tight">{manager.name}</span>
                          <span className="mt-1 block font-mono text-[10px] text-slate-600">{manager.id}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-[11px]">{manager.email}<Copy size={12} className="text-slate-400" /></div>

                    </td>
                    <td className="px-4 py-4"><span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium">{manager.title}</span></td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700"><Check size={11} /> Full Admin Authority</span>
                    </td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> {manager.status}</span></td>
                    <td className="px-4 py-4"><div className="text-[11px] font-medium">{manager.created}</div><div className="mt-1 text-[10px] text-slate-600">by {manager.createdBy}</div></td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2"><button className="rounded border px-2 py-1 text-xs" onClick={()=>setSelected({id:manager.id,mode:'view'})}>View</button><button className="rounded border px-2 py-1 text-xs" onClick={()=>setSelected({id:manager.id,mode:'edit'})}>Edit</button><button className="rounded border px-2 py-1 text-xs" disabled={busy||manager.id===user?.id} onClick={()=>void mutate(manager,false)}>{manager.status==='active'?'Deactivate':'Activate'}</button><button className="rounded border px-2 py-1 text-xs text-red-600" disabled={busy||manager.id===user?.id} onClick={()=>void mutate(manager,true)}>Delete</button></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={state.data?.meta} onPage={setPage}/>
        </section>
      </div>
      {showAddModal&&<ManagerDialog mode="create" onClose={()=>setShowAddModal(false)} onSaved={()=>{setShowAddModal(false);state.refetch();}}/>}
      {selected&&<ManagerDialog mode={selected.mode} id={selected.id} onClose={()=>setSelected(undefined)} onSaved={()=>{setSelected(undefined);state.refetch();}}/>}
    </PortalShell>
  );
}

function StatCard({label, value, helper, valueClass = 'text-slate-950', helperClass = 'text-slate-700'}: {label: string; value: number|string; helper: string; valueClass?: string; helperClass?: string}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-[18px] py-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className={`mt-3 text-[22px] font-semibold leading-none ${valueClass}`}>{value}</div>
      <div className={`mt-3 text-[11px] ${helperClass}`}>{helper}</div>
    </div>
  );
}


export default function ManagersPage(){return <Suspense><ManagersContent/></Suspense>;}
