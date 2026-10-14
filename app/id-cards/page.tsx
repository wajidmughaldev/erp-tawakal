'use client';

import {Suspense,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {initialFilter, initialPage, persistListQuery} from '@/lib/list-query';
import {cardsApi, dashboardApi} from '@/lib/services';
import {cardLabel} from '@/lib/contracts';
import {useResource} from '@/lib/use-resource';
import {DataState} from '@/components/portal/data-state';
import {Pagination} from '@/components/portal/pagination';
import Link from 'next/link';
import {ChevronDown, ExternalLink, Search} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';

function statusClass(status: string) {
  if (status === 'Active') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (status === 'Expiring Soon') return 'border-yellow-200 bg-yellow-100 text-yellow-700';
  if (status === 'Expired') return 'border-red-200 bg-red-100 text-red-600';
  return 'border-slate-300 bg-slate-100 text-slate-600';
}

function IdCardsContent() {
  const params=useSearchParams();
  const [query, setQuery] = useState(params.get('search')??'');
  const [status, setStatus] = useState(initialFilter(params,'status','All'));
  const [expiry, setExpiry] = useState('All');
  const [sort, setSort] = useState(initialFilter(params,'sort','Expiry Soonest'));

  const [page, setPage] = useState(initialPage(params));
  const summary = useResource(dashboardApi);
  const state = useResource(() => cardsApi.list({page,search:query,status:status === 'All' ? undefined : status.toLowerCase().replaceAll(' ','_'),expiry:expiry === 'All' ? undefined : 'expiring',sort:sort === 'Expiry Soonest' ? 'expiry_asc' : sort === 'Newest First' ? 'issue_desc' : 'issue_asc'}), [page,query,status,expiry,sort]);
  useEffect(()=>persistListQuery({search:query,status,page,expiry,sort}),[query,status,page,expiry,sort]);
  const filtered = (state.data?.data ?? []).map(item => ({id:item.id,card:item.number,employee:item.employee.name,initials:item.employee.name.slice(0,2),empId:item.employee.displayId,issue:item.issueDate,expiry:item.expiryDate,status:cardLabel(item),qr:cardLabel(item)==='Active' || cardLabel(item)==='Expiring Soon' ? 'Active' : 'Deactivated'}));

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight">ID Cards</h1>
            <p className="mt-2 text-[12px] text-slate-600">Manage employee cards, validity periods, and QR verification.</p>
          </div>
          <Link href="/scan" className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-blue-600 bg-white px-3 text-[11px] font-medium text-blue-700 hover:bg-blue-50">
            <ExternalLink size={13} />
            Public QR Scan Page -&gt;
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Cards" value={String(summary.data?.data.activeCards ?? '—')} helper="Valid QR & access credentials" valueClass="text-emerald-700" />
          <StatCard label="Expiring Soon" value={String(summary.data?.data.expiringCards ?? '—')} helper="Within next 30 days" valueClass="text-amber-600" borderClass="border-l-2 border-l-yellow-400" />
          <StatCard label="Expired" value={String(summary.data?.data.expiredCards ?? '—')} helper="Needs immediate renewal" valueClass="text-rose-600" helperClass="text-rose-600" borderClass="border-l-2 border-l-red-500" />
          <StatCard label="Deactivated" value={String(summary.data?.data.revokedCards??'—')} helper="Resigned or revoked" valueClass="text-slate-500" />
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.35fr_.65fr_.65fr_.65fr]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-blue-600"
                placeholder="Search card number, employee name or employee ID"
                value={query}
                onChange={(event) => {setQuery(event.target.value); setPage(1);}}
              />
            </div>
            <FilterSelect label="Status" value={status} onChange={value => {setStatus(value); setPage(1);}} options={['All', 'Active', 'Expiring Soon', 'Expired', 'Replaced']} />
            <FilterSelect label="Expiry" value={expiry} onChange={value => {setExpiry(value); setPage(1);}} options={['All', 'Expiring Soon']} />
            <FilterSelect label="Sort" value={sort} onChange={value => {setSort(value); setPage(1);}} options={['Expiry Soonest', 'Newest First', 'Oldest First']} />
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <DataState {...state} empty={!state.loading && !filtered.length} retry={state.refetch} />
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-medium">Card Number</th>
                  <th className="px-4 py-4 font-medium">Employee</th>
                  <th className="px-4 py-4 font-medium">Issue Date</th>
                  <th className="px-4 py-4 font-medium">Expiry Date</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">QR</th>
                  <th className="px-4 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((card) => (
                  <tr key={card.card} className="hover:bg-slate-50/70">
                    <td className="px-4 py-[13px] font-mono text-[11px] font-semibold">{card.card}</td>
                    <td className="px-4 py-[13px]">
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-[10px] font-medium text-[#123b6d]">{card.initials}</span>
                        <span>
                          <span className="block text-[12px] font-medium leading-tight">{card.employee}</span>
                          <span className="mt-1 block text-[10px] text-slate-500">{card.empId}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] text-[12px] text-slate-700">{card.issue}</td>
                    <td className="px-4 py-[13px] text-[12px] font-medium">{card.expiry}</td>
                    <td className="px-4 py-[13px]"><span className={`rounded-md border px-2 py-1 text-[10px] font-medium ${statusClass(card.status)}`}>{card.status}</span></td>
                    <td className={`px-4 py-[13px] text-[12px] ${card.qr === 'Active' ? 'text-emerald-700' : 'text-slate-600'}`}>{card.qr}</td>
                    <td className="px-4 py-[13px] text-right">
                      <Link href={`/id-cards/${encodeURIComponent(card.id)}`} className="inline-flex h-8 items-center rounded-md border border-slate-500/80 px-2.5 text-[12px]">View / Actions</Link>
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

function StatCard({label, value, helper, valueClass, helperClass = 'text-slate-700', borderClass = ''}: {label: string; value: string; helper: string; valueClass: string; helperClass?: string; borderClass?: string}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white px-[18px] py-4 shadow-sm ${borderClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className={`mt-3 text-[22px] font-semibold leading-none ${valueClass}`}>{value}</div>
      <div className={`mt-3 text-[11px] ${helperClass}`}>{helper}</div>
    </div>
  );
}

function FilterSelect({label, value, onChange, options}: {label: string; value: string; onChange: (value: string) => void; options: string[]}) {
  return (
    <select className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{label}: {option}</option>)}
    </select>
  );
}

export default function IdCardsPage(){return <Suspense><IdCardsContent/></Suspense>;}
