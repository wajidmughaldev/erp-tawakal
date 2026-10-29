'use client';

import {Suspense,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {initialFilter, initialPage, persistListQuery} from '@/lib/list-query';
import {employeesApi} from '@/lib/services';
import {cardLabel, currentCard, latestCard, displayStatus, workingStatuses} from '@/lib/contracts';
import {useResource} from '@/lib/use-resource';
import {DataState} from '@/components/portal/data-state';
import {Pagination} from '@/components/portal/pagination';
import {useSession} from '@/components/portal/session-provider';
import Link from 'next/link';
import {Plus, Search, Trash2} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';

const cardFilters: Record<string, string | undefined> = {'All': undefined, 'Active': 'active_only', 'Expiring Soon': 'expiring_soon', 'Expired': 'expired', 'Revoked': 'revoked', 'No Card': 'none'};
const cardFilterFromUrl: Record<string, string> = {active_only: 'Active', expiring_soon: 'Expiring Soon', expired: 'Expired', revoked: 'Revoked', none: 'No Card'};

function statusClass(status: string) {
  if (status === 'Active') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (status === 'Transferred') return 'border-cyan-200 bg-cyan-100 text-cyan-700';
  if (status === 'Expiring Soon') return 'border-yellow-200 bg-yellow-100 text-yellow-700';
  if (status === 'Expired' || status === 'Revoked') return 'border-rose-200 bg-rose-100 text-rose-700';
  return 'border-slate-300 bg-slate-200 text-slate-600';
}

function Avatar({name, photo}: {name: string; photo?: string}) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(' ').map(part => part[0]).slice(0, 2).join('');
  if (photo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={name} onError={() => setFailed(true)} className="size-9 rounded-full border border-slate-200 object-cover" />;
  }
  return <span className="grid size-9 place-items-center rounded-full bg-slate-200 text-[10px] font-medium text-[#123b6d]">{initials}</span>;
}

function EmployeesContent() {
  const params=useSearchParams();
  const {user} = useSession();
  const [query, setQuery] = useState(params.get('search')??'');
  const [status, setStatus] = useState(initialFilter(params,'status','All'));
  const [cardStatus, setCardStatus] = useState(cardFilterFromUrl[params.get('cardStatus') ?? ''] ?? 'All');
  const [page, setPage] = useState(initialPage(params));
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const state = useResource(() => employeesApi.list({page, search: query, status: status === 'All' ? undefined : status.toLowerCase(), cardStatus: cardFilters[cardStatus]}), [page, query, status, cardStatus]);
  useEffect(()=>persistListQuery({search:query,status,page,cardStatus:cardStatus==='All'?'':Object.keys(cardFilterFromUrl).find(key=>cardFilterFromUrl[key]===cardStatus)??''}),[query,status,page,cardStatus]);
  const rows = (state.data?.data ?? []).map(item => {
    const latest = latestCard(item.cards);
    return {...item, role: item.designation, employment: displayStatus(item.status), card: (currentCard(item.cards)??latest) ? cardLabel(latest) : 'No Card', cardId: latest?.id, expiry: latest?.expiryDate ?? '—'};
  });

  async function remove(id: string, name: string) {
    if (busyId || !window.confirm(`Delete ${name}? The employee will be removed from the list. This cannot be undone from the portal.`)) return;
    setBusyId(id); setActionError('');
    try {await employeesApi.remove(id); state.refetch();}
    catch (cause) {setActionError(cause instanceof Error ? cause.message : 'Unable to delete the employee.');}
    finally {setBusyId('');}
  }

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight">Employees</h1>
            <p className="mt-2 text-[12px] text-slate-600">Manage employee information, employment status and ID cards.</p>
          </div>
          <Link href="/add-employee" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]">
            <Plus size={14} />
            Add Employee
          </Link>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.5fr_.7fr_.7fr]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-blue-600"
                placeholder="Search name, employee ID, phone or NIC"
                value={query}
                onChange={(event) => {setQuery(event.target.value); setPage(1);}}
              />
            </div>
            <FilterSelect label="Status" value={status} onChange={value => {setStatus(value); setPage(1);}} options={['All', 'Active', 'Transferred', 'Resigned']} />
            <FilterSelect label="ID Card" value={cardStatus} onChange={value => {setCardStatus(value); setPage(1);}} options={Object.keys(cardFilters)} />
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <DataState {...state} empty={!state.loading && !rows.length} retry={state.refetch} />
          {actionError && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">{actionError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-medium">Employee</th>
                  <th className="px-4 py-4 font-medium">Employee ID</th>
                  <th className="px-4 py-4 font-medium">Phone</th>
                  <th className="px-4 py-4 font-medium">Employment Status</th>
                  <th className="px-4 py-4 font-medium">ID Card Status</th>
                  <th className="px-4 py-4 font-medium">ID Expiry</th>
                  <th className="px-4 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-[13px]">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee.name} photo={employee.photo} />
                        <span>
                          <Link href={`/employees/view?id=${encodeURIComponent(employee.id)}`} className="block text-[12px] font-medium leading-tight hover:text-blue-700">{employee.name}</Link>
                          <span className="mt-1 block text-[10px] text-slate-500">{employee.role}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] font-mono text-[11px] font-medium text-pink-600">{employee.displayId}</td>
                    <td className="px-4 py-[13px] text-[12px] text-slate-600">{employee.phone}</td>
                    <td className="px-4 py-[13px]">
                      <span className={`rounded-md border px-2.5 py-1 text-[10px] font-medium ${statusClass(employee.employment)}`}>{employee.employment}</span>
                    </td>
                    <td className="px-4 py-[13px]">
                      <span className={`rounded-md border px-2.5 py-1 text-[10px] font-medium ${statusClass(employee.card)}`}>{employee.card}</span>
                    </td>
                    <td className="px-4 py-[13px] text-[12px] text-slate-600">{employee.expiry}</td>
                    <td className="px-4 py-[13px]">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/employees/view?id=${encodeURIComponent(employee.id)}`} className="inline-flex h-8 items-center rounded-md border border-slate-500/80 px-2.5 text-[12px]">View</Link>
                        {(employee.card === 'Expiring Soon' || employee.card === 'Expired') && employee.cardId && (
                          <Link href={`/renew-card?card=${encodeURIComponent(employee.cardId)}`} className="inline-flex h-8 items-center rounded-md border border-blue-600 px-2.5 text-[12px] font-medium text-blue-700 hover:bg-blue-50">Renew</Link>
                        )}
                        {employee.card === 'No Card' && workingStatuses.includes(employee.status) && (
                          <Link href={`/generate-id-card?employee=${encodeURIComponent(employee.id)}`} className="inline-flex h-8 items-center rounded-md border border-blue-600 px-2.5 text-[12px] font-medium text-blue-700 hover:bg-blue-50">Issue Card</Link>
                        )}
                        {user?.role === 'superadmin' && (
                          <button type="button" disabled={busyId === employee.id} onClick={() => void remove(employee.id, employee.name)} aria-label={`Delete ${employee.name}`} className="inline-flex h-8 items-center rounded-md border border-red-300 px-2 text-red-600 hover:bg-red-50 disabled:opacity-50">
                            <Trash2 size={14} />
                          </button>
                        )}
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
    </PortalShell>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {label}: {option}
        </option>
      ))}
    </select>
  );
}

export default function EmployeesPage(){return <Suspense><EmployeesContent/></Suspense>;}
