'use client';

import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {Suspense, useState} from 'react';
import {ChevronDown, File} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';
import {employeesApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {cardLabel, currentCard, displayStatus, Employee} from '@/lib/contracts';
import {DataState} from '@/components/portal/data-state';
import {EmploymentActionDialog} from '@/components/portal/employment-action-dialog';
import {DocumentList} from '@/components/portal/document-list';

export default function EmployeeDetailPage() {return <Suspense><EmployeeDetailContent /></Suspense>;}

function EmployeeDetailContent() {
  const id = useSearchParams().get('id') ?? '';
  const [activeTab, setActiveTab] = useState('Overview');
  const state=useResource(()=>id?employeesApi.get(id):Promise.reject(new Error('Select an employee from the list.')),[id]);
  const employee=state.data?.data;
  const [action,setAction]=useState(false);
  if(!employee)return <PortalShell><DataState {...state} empty={!state.loading&&!state.error} retry={state.refetch}/></PortalShell>;
  const initials = employee.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mb-5 flex items-center justify-between border-b border-slate-200 bg-white px-1 pb-4">
          <div className="text-[12px] text-slate-600">
            <Link href="/employees" className="hover:text-blue-700">Employees</Link>
            <span className="mx-2">/</span>
            <span className="font-semibold text-slate-950">{employee.name}</span>
          </div>
          <Link href="/employees" className="rounded-md border border-slate-500/80 bg-white px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50">
            Back to Directory
          </Link>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white px-[18px] py-[18px] shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-full bg-slate-200 text-[16px] font-semibold text-[#123b6d]">{employee.photo?<img src={employee.photo} alt="Employee photograph" className="size-full rounded-full object-cover"/>:initials}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[15px] font-semibold">{employee.name}</h1>
                  <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">{displayStatus(employee.status)}</span>
                  <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700">{currentCard(employee.cards)?cardLabel(currentCard(employee.cards)):'No ID Card'}</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-600">{employee.designation} · ID: {employee.displayId} · NIC {employee.dossier.cnic}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={currentCard(employee.cards)?'/id-cards/view?id='+encodeURIComponent(currentCard(employee.cards).id):'/generate-id-card?employee='+encodeURIComponent(employee.id)} className="inline-flex h-8 items-center rounded-md border border-blue-600 px-3 text-[11px] font-medium text-blue-700 hover:bg-blue-50">View ID Card</Link>
              <Link href={`/edit-employee?id=${encodeURIComponent(employee.id)}`} className="inline-flex h-8 items-center rounded-md border border-slate-400 px-3 text-[11px] text-slate-700 hover:bg-slate-50">Edit Employee</Link>
              <button className="inline-flex h-8 items-center gap-1 rounded-md bg-[#123b6d] px-3 text-[11px] font-medium text-white hover:bg-[#0d2f58]" type="button" onClick={()=>setAction(true)}>
                Employment Action
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        </section>

        <nav className="mt-6 flex border-b border-slate-300 text-[10px]">
          {['Overview', 'ID Cards', 'Documents'].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-3 ${activeTab === tab ? 'border-b border-[#123b6d] font-semibold text-[#123b6d]' : 'text-slate-600'}`}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === 'Overview' ? <OverviewTab employee={employee}/> : null}
        {activeTab === 'ID Cards' ? <IdCardsTab employee={employee}/> : null}
        {activeTab === 'Documents' ? <DocumentList employeeId={employee.id}/> : null}
      </div>
      {action&&<EmploymentActionDialog employee={employee} onClose={()=>setAction(false)} onChanged={()=>{setAction(false);state.refetch();}}/>}
    </PortalShell>
  );
}

function OverviewTab({employee}:{employee:Employee}) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.95fr]">
          <div className="space-y-5">
            <InfoCard title="Personal Information">
              <InfoGrid
                items={[
                  ['Full Name', employee.name],
                  ['Blood Group', <span key="blood" className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">{employee.dossier.bloodGroup}</span>],
                  ['Date of Birth', employee.dossier.dateOfBirth],
                  ['NIC / CNIC', employee.dossier.cnic],
                  ['Gender', employee.dossier.gender],
                ]}
              />
            </InfoCard>

            <InfoCard title="Contact Information">
              <InfoGrid
                items={[
                  ['Phone Number', employee.phone],
                  ['Home Phone', employee.dossier.homePhone],
                  ['Residential Address', employee.dossier.residentialAddress],
                ]}
              />
            </InfoCard>

            <InfoCard title="Emergency Contact">
              <InfoGrid
                items={[
                  ['Primary Contact', employee.dossier.emergencyContact1],
                  ['Secondary Contact', employee.dossier.emergencyContact2],
                  ['Emergency Phone', <span key="phone" className="font-semibold text-rose-600">{employee.dossier.emergencyContact1}</span>],
                ]}
              />
            </InfoCard>
          </div>

          <div className="space-y-5">
            <InfoCard title="Employment Details">
              <InfoGrid
                items={[
                  ['Employee ID', employee.displayId],
                  ['Designation', employee.designation],
                  ['Joining Date', employee.dossier.joiningDate],
                  // Department and location are only known after a transfer, so hide them while empty.
                  ...(employee.department ? [['Department / Unit', employee.department] as [string, React.ReactNode]] : []),
                  ...(employee.location ? [['Location', employee.location] as [string, React.ReactNode]] : []),
                  ['Status', displayStatus(employee.status)],
                ]}
              />
            </InfoCard>

            <section className="overflow-hidden rounded-lg border border-l-2 border-slate-200 border-l-[#123b6d] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="text-[12px] font-semibold text-[#123b6d]">Current ID Card</h2>
                <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">{currentCard(employee.cards)?cardLabel(currentCard(employee.cards)):'No Card'}</span>
              </div>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Card Number</div>
                <div className="mt-2 text-[16px] font-semibold">{currentCard(employee.cards)?.number??'No card'}</div>
                <div className="mt-5 grid grid-cols-2 gap-4 text-[11px]">
                  <div><div className="text-slate-500">Issued</div><div className="mt-1 font-medium">{currentCard(employee.cards)?.issueDate??'—'}</div></div>
                  <div><div className="text-slate-500">Expires</div><div className="mt-1 font-medium">{currentCard(employee.cards)?.expiryDate??'—'}</div></div>
                </div>
                <div className="mt-4 text-[11px]">
                  <div className="text-slate-500">QR Verification</div>
                  <div className="mt-1 font-medium text-emerald-700">{currentCard(employee.cards)?cardLabel(currentCard(employee.cards)):'No card'}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={currentCard(employee.cards)?'/id-cards/view?id='+encodeURIComponent(currentCard(employee.cards).id):'/generate-id-card?employee='+encodeURIComponent(employee.id)} className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-[#123b6d] text-[11px] font-medium text-white hover:bg-[#0d2f58]">View ID Card</Link>
                  {currentCard(employee.cards)&&<><Link href={'/renew-card?card='+encodeURIComponent(currentCard(employee.cards)?.id??'')} className="inline-flex h-8 items-center rounded-md border border-slate-400 px-3 text-[11px] text-slate-700 hover:bg-slate-50">Renew</Link>
                  <Link href={'/reissue-card?card='+encodeURIComponent(currentCard(employee.cards)?.id??'')} className="inline-flex h-8 items-center rounded-md border border-slate-400 px-3 text-[11px] text-slate-700 hover:bg-slate-50">Reissue</Link></>}
                </div>
              </div>
            </section>
          </div>
        </div>
  );
}

function IdCardsTab({employee}:{employee:Employee}) {
 return <section className="mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"><h2 className="border-b px-4 py-3 text-xs font-semibold text-[#123b6d]">Card Issuance History</h2><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr>{['Card Number','Issue Date','Expiry Date','Status','Actions'].map(label=><th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{(employee.cards??[]).map(card=><tr key={card.id} className="border-t"><td className="p-4">{card.number}</td><td className="p-4">{card.issueDate}</td><td className="p-4">{card.expiryDate}</td><td className="p-4"><StatusPill status={cardLabel(card)}/></td><td className="p-4"><Link href={'/id-cards/view?id='+encodeURIComponent(card.id)} className="text-blue-700">View</Link></td></tr>)}</tbody></table>{!employee.cards?.length&&<p className="p-4 text-xs">No ID cards issued.</p>}</section>;
}

function StatusPill({status}: {status: string}) {
  const classes = status === 'Active'
    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
    : 'border-slate-300 bg-slate-100 text-slate-600';

  return <span className={`rounded-md border px-2 py-1 text-[10px] font-medium ${classes}`}>{status}</span>;
}

function InfoCard({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-200 px-4 py-3 text-[12px] font-semibold text-[#123b6d]">{title}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoGrid({items}: {items: Array<[string, React.ReactNode]>}) {
  return (
    <div className="grid gap-x-16 gap-y-5 md:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
          <div className="mt-2 text-[11px] font-medium text-slate-950">{value}</div>
        </div>
      ))}
    </div>
  );
}
