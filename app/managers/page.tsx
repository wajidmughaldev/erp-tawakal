'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {initialFilter, initialPage, persistListQuery} from '@/lib/list-query';
import {managersApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {useSession} from '@/components/portal/session-provider';
import {DataState} from '@/components/portal/data-state';
import {Pagination} from '@/components/portal/pagination';
import {ManagerDialog} from '@/components/portal/manager-dialog';
import type {Manager} from '@/lib/contracts';
import {Plus, Search} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';

const allStatuses = 'All Account Statuses';

function ManagersContent() {
  const params = useSearchParams();
  const {user} = useSession();
  const [query, setQuery] = useState(params.get('search') ?? '');
  const [status, setStatus] = useState(initialFilter(params, 'status', allStatuses));
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(initialPage(params));
  const [selected, setSelected] = useState<{id: string; mode: 'view' | 'edit'}>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const state = useResource(() => managersApi.list({page, search: query, status: status === allStatuses ? undefined : status.toLowerCase()}), [page, query, status]);
  useEffect(() => persistListQuery({search: query, status, page}), [query, status, page]);
  const managers = state.data?.data ?? [];
  const activeTotal = (state.data?.meta as {activeTotal?: number} | undefined)?.activeTotal;

  async function toggle(manager: Manager) {
    const activate = manager.status !== 'active';
    if (busy || !window.confirm(`${activate ? 'Activate' : 'Deactivate'} ${manager.name}?${activate ? '' : ' They will no longer be able to sign in.'}`)) return;
    setBusy(true); setError('');
    try {
      const {id, role, createdAt, ...body} = manager;
      void role; void createdAt;
      await managersApi.update(id, {...body, status: activate ? 'active' : 'inactive'});
      state.refetch();
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to update account.');}
    finally {setBusy(false);}
  }

  if (user && user.role !== 'superadmin') {
    return <PortalShell><p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Only a superadmin can manage manager accounts.</p></PortalShell>;
  }

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight">Managers</h1>
            <p className="mt-2 text-[12px] text-slate-600">Create manager accounts with their own login. Deactivate an account to stop it signing in; accounts are never deleted.</p>
          </div>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]" type="button" onClick={() => setShowAddModal(true)}>
            <Plus size={14} />
            Add Manager
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <StatCard label="Total Managers" value={state.data?.meta.total ?? '—'} helper="Matching the current search" />
          <StatCard label="Active Logins" value={activeTotal ?? '—'} helper="Can sign in" valueClass="text-emerald-700" helperClass="text-emerald-700" />
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-2 border-b border-slate-200 p-3 lg:grid-cols-[1.4fr_.55fr_.4fr]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-blue-600" placeholder="Search by name, email, phone, department or branch..." value={query} onChange={event => {setQuery(event.target.value); setPage(1);}} />
            </div>
            <select className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600" value={status} onChange={event => {setStatus(event.target.value); setPage(1);}}>
              <option>{allStatuses}</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <button className="h-9 rounded-md border border-slate-500/80 bg-white px-3 text-[12px] text-slate-600 hover:bg-slate-50" type="button" onClick={() => {setQuery(''); setStatus(allStatuses); setPage(1);}}>
              Reset Filter
            </button>
          </div>

          <DataState {...state} retry={state.refetch} empty={!state.loading && !managers.length} />
          {error && <p role="alert" className="p-3 text-sm text-red-600">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-medium">Manager</th>
                  <th className="px-4 py-4 font-medium">Login Email</th>
                  <th className="px-4 py-4 font-medium">Phone</th>
                  <th className="px-4 py-4 font-medium">Department / Branch</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Created</th>
                  <th className="px-4 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {managers.map(manager => (
                  <tr key={manager.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-md bg-blue-900 text-[11px] font-semibold text-white">{manager.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>
                        <span className="text-[12px] font-semibold leading-tight">{manager.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[11px]">{manager.email}</td>
                    <td className="px-4 py-4 text-[11px]">{manager.phone || '—'}</td>
                    <td className="px-4 py-4 text-[11px]">{[manager.department, manager.branch].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] ${manager.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                        <span className={`size-2 rounded-full ${manager.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} /> {manager.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[11px] text-slate-600">{manager.createdAt ? new Date(manager.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button className="rounded border px-2 py-1 text-xs" onClick={() => setSelected({id: manager.id, mode: 'view'})}>View</button>
                        <button className="rounded border px-2 py-1 text-xs" onClick={() => setSelected({id: manager.id, mode: 'edit'})}>Edit</button>
                        <button className="rounded border px-2 py-1 text-xs" disabled={busy} onClick={() => void toggle(manager)}>{manager.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={state.data?.meta} onPage={setPage} />
        </section>
      </div>
      {showAddModal && <ManagerDialog mode="create" onClose={() => setShowAddModal(false)} onSaved={() => {setShowAddModal(false); state.refetch();}} />}
      {selected && <ManagerDialog mode={selected.mode} id={selected.id} onClose={() => setSelected(undefined)} onSaved={() => {setSelected(undefined); state.refetch();}} />}
    </PortalShell>
  );
}

function StatCard({label, value, helper, valueClass = 'text-slate-950', helperClass = 'text-slate-700'}: {label: string; value: number | string; helper: string; valueClass?: string; helperClass?: string}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-[18px] py-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className={`mt-3 text-[22px] font-semibold leading-none ${valueClass}`}>{value}</div>
      <div className={`mt-3 text-[11px] ${helperClass}`}>{helper}</div>
    </div>
  );
}

export default function ManagersPage() {return <Suspense><ManagersContent /></Suspense>;}
