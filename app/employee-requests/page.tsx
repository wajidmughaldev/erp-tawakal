'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {Check, ExternalLink, Link2, Plus} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';

const initialRequests = [
  {
    id: 'REQ-2026-0041',
    name: 'Zubair Ahmed Qureshi',
    nameUrdu: 'زبیر احمد قریشی',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces',
    designation: 'Delivery Van Driver',
    role: 'Delivery Van Driver',
    cnic: '42101-7654321-3',
    phone: '+923009876543',
    joining: '2026-09-18',
    submitted: '16 Sep 2026, 11:30 AM',
    status: 'Pending Review',
  },
  {
    id: 'REQ-2026-0042',
    name: 'Fatima Noor',
    nameUrdu: 'فاطمہ نور',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=faces',
    designation: 'Quality Control Assistant',
    role: 'Office / General',
    cnic: '42101-9876543-2',
    phone: '+923131234567',
    joining: '2026-09-20',
    submitted: '16 Sep 2026, 02:45 PM',
    status: 'Pending Review',
  },
];

const invitationLinks = [
  {token: 'TE2-INV-8491K', candidate: 'Zubair Ahmed Qureshi', target: 'Delivery Van Driver (Logistics & Distribution)', expires: '2026-09-22', status: 'Used / Form Submitted'},
  {token: 'TE2-INV-7924M', candidate: 'Fatima Noor', target: 'Quality Control Assistant (Quality Assurance)', expires: '2026-09-23', status: 'Used / Form Submitted'},
];

export default function EmployeeRequestsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState('All Requests');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All Roles');

  const pending = requests.filter((request) => request.status === 'Pending Review').length;
  const approved = requests.filter((request) => request.status === 'Approved').length;

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      const matchesTab =
        activeTab === 'All Requests' ||
        (activeTab === 'Pending Review' && request.status === 'Pending Review') ||
        (activeTab === 'Approved' && request.status === 'Approved') ||
        (activeTab === 'Rejected' && request.status === 'Rejected');
      const text = `${request.name} ${request.cnic} ${request.id}`.toLowerCase();
      return matchesTab && text.includes(search.toLowerCase()) && (role === 'All Roles' || request.role === role);
    });
  }, [activeTab, requests, role, search]);

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-[12px] text-slate-600">Tawakkal Enterprises Channel 2 · Onboarding Administration</p>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-8 items-center gap-2 rounded-md border border-blue-600 bg-white px-3 text-[12px] font-medium text-blue-700 hover:bg-blue-50" type="button">
              <Link2 size={14} />
              Generate Registration Link
            </button>
            <Link href="/employee-registration" className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-400 bg-white px-3 text-[12px] text-slate-600 hover:bg-slate-50">
              <ExternalLink size={14} />
              Candidate View
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8">
        <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight">Employee Enrollment Requests</h1>
            <p className="mt-1 text-[12px] text-slate-600">
              Review digital enrollment submissions from candidates, verify background credentials, and approve to issue Smart ID cards.
            </p>
          </div>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]" type="button">
            <Plus size={14} />
            Generate Registration Link
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Pending Review', pending, 'Awaiting admin verification', 'text-yellow-500'],
            ['Approved & Enrolled', approved, 'Ready for ID card generation', 'text-emerald-700'],
            ['Field Sales & Drivers', 1, 'Delivery Van / Motorcycle verified', 'text-blue-600'],
            ['Active Invitation Links', 1, 'Authorized access tokens', 'text-slate-950'],
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
                ['All Requests', requests.length],
                ['Pending Review', pending],
                ['Approved', approved],
                ['Rejected', 0],
              ].map(([label, count]) => (
                <button
                  key={label}
                  className={`h-8 rounded-md px-4 text-[12px] ${activeTab === label ? 'bg-[#123b6d] font-medium text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  type="button"
                  onClick={() => setActiveTab(String(label))}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600" placeholder="Search by name, CNIC, request #..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600" value={role} onChange={(event) => setRole(event.target.value)}>
                <option>All Roles</option>
                <option>Delivery Van Driver</option>
                <option>Office / General</option>
              </select>
            </div>
          </div>

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
                        <button className="h-11 rounded-md border border-blue-600 px-3 text-[12px] font-medium text-blue-700 hover:bg-blue-50" type="button">Review</button>
                        <button
                          className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-3 text-[12px] font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
                          type="button"
                          disabled={request.status === 'Approved'}
                          onClick={() => setRequests((rows) => rows.map((row) => row.id === request.id ? {...row, status: 'Approved'} : row))}
                        >
                          <Check size={13} />
                          Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-200 px-[18px] py-4">
            <div>
              <h2 className="text-[13px] font-semibold">Authorized Registration Links & Invitation Tokens</h2>
              <p className="mt-2 text-[12px] text-slate-600">Controlled employee access tokens generated by admin</p>
            </div>
            <button className="rounded-md border border-blue-600 px-3 py-2 text-[12px] text-blue-700 hover:bg-blue-50" type="button">+ New Token</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-medium">Access Token</th>
                  <th className="px-4 py-4 font-medium">Designated Candidate</th>
                  <th className="px-4 py-4 font-medium">Target Role / Department</th>
                  <th className="px-4 py-4 font-medium">Expires</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 text-right font-medium">Share Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invitationLinks.map((invite) => (
                  <tr key={invite.token}>
                    <td className="px-4 py-4 font-mono text-[12px] font-semibold text-blue-700">{invite.token}</td>
                    <td className="px-4 py-4 text-[12px]">{invite.candidate}</td>
                    <td className="px-4 py-4 text-[12px]">{invite.target}</td>
                    <td className="px-4 py-4 text-[12px] text-slate-600">{invite.expires}</td>
                    <td className="px-4 py-4"><span className="rounded-md bg-slate-200 px-2 py-1 text-[10px] text-slate-600">{invite.status}</span></td>
                    <td className="px-4 py-4 text-right">
                      <button className="mr-2 rounded-md border border-slate-400 px-3 py-2 text-[12px] text-slate-700" type="button">Copy Link</button>
                      <Link href="/employee-registration" className="rounded-md border border-blue-600 px-3 py-2 text-[12px] text-blue-700 hover:bg-blue-50">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      </div>
    </PortalShell>
  );
}
