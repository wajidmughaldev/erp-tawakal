'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useState} from 'react';
import {ChevronDown, File} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';
import {employees} from '@/lib/portal-data';

export default function EmployeeDetailPage() {
  const params = useParams<{id: string}>();
  const [activeTab, setActiveTab] = useState('Overview');
  const employee = employees.find((item) => item.id === params.id) ?? employees[0];
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
              <span className="grid size-14 place-items-center rounded-full bg-slate-200 text-[16px] font-semibold text-[#123b6d]">{initials}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[15px] font-semibold">{employee.name}</h1>
                  <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">Active</span>
                  <span className="rounded-md border border-blue-200 bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700">ID Active</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-600">Technician · ID: EMP-00123 · NIC 42101-1234567-1</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/id-cards/CARD-00421" className="inline-flex h-8 items-center rounded-md border border-blue-600 px-3 text-[11px] font-medium text-blue-700 hover:bg-blue-50">View ID Card</Link>
              <Link href={`/edit-employee?id=${employee.id}`} className="inline-flex h-8 items-center rounded-md border border-slate-400 px-3 text-[11px] text-slate-700 hover:bg-slate-50">Edit Employee</Link>
              <button className="inline-flex h-8 items-center gap-1 rounded-md bg-[#123b6d] px-3 text-[11px] font-medium text-white hover:bg-[#0d2f58]" type="button">
                Employment Action
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        </section>

        <nav className="mt-6 flex border-b border-slate-300 text-[10px]">
          {['Overview', 'Employment History', 'ID Cards', 'Documents'].map((tab) => (
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

        {activeTab === 'Overview' ? <OverviewTab /> : null}
        {activeTab === 'Employment History' ? <EmploymentHistoryTab /> : null}
        {activeTab === 'ID Cards' ? <IdCardsTab /> : null}
        {activeTab === 'Documents' ? <DocumentsTab /> : null}
      </div>
    </PortalShell>
  );
}

function OverviewTab() {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.95fr]">
          <div className="space-y-5">
            <InfoCard title="Personal Information">
              <InfoGrid
                items={[
                  ['Full Name', 'Muhammad Ali'],
                  ['Blood Group', <span key="blood" className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">B+</span>],
                  ['Date of Birth', '14 Mar 1994'],
                  ['NIC / CNIC', '42101-1234567-1'],
                  ['Gender', 'Male'],
                ]}
              />
            </InfoCard>

            <InfoCard title="Contact Information">
              <InfoGrid
                items={[
                  ['Phone Number', '+923001234567'],
                  ['Email Address', 'm.ali@example.com'],
                  ['Residential Address', 'House 42, St 7, Sector F-8, Islamabad'],
                ]}
              />
            </InfoCard>

            <InfoCard title="Emergency Contact">
              <InfoGrid
                items={[
                  ['Contact Name', 'Fatima Ali'],
                  ['Relationship', 'Spouse'],
                  ['Emergency Phone', <span key="phone" className="font-semibold text-rose-600">+923219876543</span>],
                ]}
              />
            </InfoCard>
          </div>

          <div className="space-y-5">
            <InfoCard title="Employment Details">
              <InfoGrid
                items={[
                  ['Employee ID', 'EMP-00123'],
                  ['Designation', 'Technician'],
                  ['Joining Date', '15 Aug 2022'],
                  ['Department / Unit', 'Central Workshop'],
                  ['Status', 'Active'],
                ]}
              />
            </InfoCard>

            <section className="overflow-hidden rounded-lg border border-l-2 border-slate-200 border-l-[#123b6d] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="text-[12px] font-semibold text-[#123b6d]">Current Active ID Card</h2>
                <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">Active</span>
              </div>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Card Number</div>
                <div className="mt-2 text-[16px] font-semibold">CARD-00421</div>
                <div className="mt-5 grid grid-cols-2 gap-4 text-[11px]">
                  <div><div className="text-slate-500">Issued</div><div className="mt-1 font-medium">14 Sep 2026</div></div>
                  <div><div className="text-slate-500">Expires</div><div className="mt-1 font-medium">14 Aug 2027</div></div>
                </div>
                <div className="mt-4 text-[11px]">
                  <div className="text-slate-500">QR Verification</div>
                  <div className="mt-1 font-medium text-emerald-700">Active & Linked</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href="/id-cards/CARD-00421" className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-[#123b6d] text-[11px] font-medium text-white hover:bg-[#0d2f58]">View ID Card</Link>
                  <Link href="/renew-card" className="inline-flex h-8 items-center rounded-md border border-slate-400 px-3 text-[11px] text-slate-700 hover:bg-slate-50">Renew</Link>
                  <Link href="/reissue-card" className="inline-flex h-8 items-center rounded-md border border-slate-400 px-3 text-[11px] text-slate-700 hover:bg-slate-50">Reissue</Link>
                </div>
              </div>
            </section>
          </div>
        </div>
  );
}

function EmploymentHistoryTab() {
  const events = [
    {
      title: 'Smart ID Card Issued',
      detail: 'Card CARD-00421 issued with 11-month validity. QR code verification active.',
      meta: '14 Sep 2026 · Performed by Noman (System Admin)',
      tone: 'border-yellow-500',
    },
    {
      title: 'Employee Information Updated',
      detail: 'Updated residential address and emergency contact number.',
      meta: '10 Jan 2025 · Performed by Amina Tariq (HR Officer)',
      tone: 'border-[#123b6d]',
    },
    {
      title: 'Internal Transfer',
      detail: 'Transferred from Sub-Facility North to Central Workshop. Effective immediately.',
      meta: '01 Jul 2024 · Approved by Operations Directorate',
      tone: 'border-[#123b6d]',
    },
    {
      title: 'Employee Record Created',
      detail: 'Onboarded as Technician (EMP-00123). Verified NIC 42101-1234567-1.',
      meta: '15 Aug 2022 · Initial onboarding by System',
      tone: 'border-[#123b6d]',
    },
  ];

  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-[12px] font-semibold">Chronological Activity & Action Log</h2>
      <div className="mt-5 space-y-6">
        {events.map((event, index) => (
          <div key={event.title} className="relative flex gap-4">
            {index < events.length - 1 ? <span className="absolute left-[5px] top-4 h-[calc(100%+12px)] border-l border-slate-200" /> : null}
            <span className={`relative mt-1 size-3 rounded-full border-2 bg-white ${event.tone}`} />
            <div>
              <h3 className="text-[12px] font-semibold">{event.title}</h3>
              <p className="mt-2 text-[11px] text-slate-700">{event.detail}</p>
              <p className="mt-2 text-[10px] text-slate-600">{event.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IdCardsTab() {
  const cardRows = [
    ['CARD-00421', '14 Sep 2026', '14 Aug 2027', 'Active', 'Active'],
    ['CARD-00398', '14 Oct 2025', '14 Sep 2026', 'Replaced', 'Deactivated'],
    ['CARD-00312', '15 Aug 2024', '15 Jul 2025', 'Expired', 'Deactivated'],
  ];

  return (
    <div className="mt-5 space-y-5">
      <section className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[12px]">
          <span className="text-slate-600">Current Active Card</span>
          <span className="ml-3 font-semibold">CARD-00421</span>
          <span className="ml-3 rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">Active</span>
        </div>
        <Link href="/id-cards/CARD-00421" className="rounded-md bg-[#123b6d] px-4 py-2 text-[11px] font-medium text-white hover:bg-[#0d2f58]">Open Current Card</Link>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-200 px-4 py-3 text-[12px] font-semibold text-[#123b6d]">Card Issuance History</h2>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[11px]">
            <tr>
              {['Card Number', 'Issue Date', 'Expiry Date', 'Status', 'QR Status', 'Actions'].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {cardRows.map(([card, issue, expiry, status, qr]) => (
              <tr key={card}>
                <td className="px-4 py-3 font-mono text-[11px] font-medium text-pink-600">{card}</td>
                <td className="px-4 py-3 text-[12px]">{issue}</td>
                <td className="px-4 py-3 text-[12px]">{expiry}</td>
                <td className="px-4 py-3"><StatusPill status={status} /></td>
                <td className={`px-4 py-3 text-[12px] ${qr === 'Active' ? 'text-emerald-700' : 'text-slate-600'}`}>{qr}</td>
                <td className="px-4 py-3 text-right"><button className="rounded-md border border-slate-500 px-2 py-1 text-[11px]" type="button">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function DocumentsTab() {
  const docs = [
    ['NIC_CNIC_Scanned_Copy.pdf', 'PDF · 1.4 MB · Uploaded 15 Aug 2022'],
    ['Employment_Appointment_Letter.pdf', 'PDF · 840 KB · Uploaded 15 Aug 2022'],
  ];

  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-200 px-4 py-3 text-[12px] font-semibold text-[#123b6d]">Stored Identification & Employment Documents</h2>
      <div className="grid gap-3 p-4 xl:grid-cols-2">
        {docs.map(([name, meta]) => (
          <div key={name} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <File className="text-blue-600" size={22} />
              <div>
                <div className="text-[12px] font-semibold">{name}</div>
                <div className="mt-1 text-[10px] text-slate-600">{meta}</div>
              </div>
            </div>
            <div className="flex gap-1">
              <button className="rounded-md border border-slate-500 px-3 py-2 text-[11px]" type="button">View</button>
              <button className="rounded-md border border-slate-500 px-3 py-2 text-[11px]" type="button">Download</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
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
