'use client';

import {useMemo, useState} from 'react';
import {Check, ChevronDown, Copy, Plus, Search, UserRoundPlus, X} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';
import {managers} from '@/lib/portal-data';

const managerRows = managers.map((manager, index) => ({
  ...manager,
  initials: index === 0 ? 'BT' : 'AS',
  color: index === 0 ? 'bg-blue-900' : 'bg-teal-700',
  password: 'password123',
  created: index === 0 ? '2026-09-01' : '2026-09-08',
  createdBy: 'Noman (System Admin)',
  title: index === 0 ? 'Branch Manager' : 'Operations Manager',
}));

export default function ManagersPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All Account Statuses');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => managerRows.filter((manager) => {
    const text = `${manager.name} ${manager.email} ${manager.role}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === 'All Account Statuses' || manager.status === status);
  }), [query, status]);

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
          <StatCard label="Total Manager Accounts" value={managerRows.length} helper="Authorized co-administrators" />
          <StatCard label="Active Logins" value={managerRows.filter((manager) => manager.status === 'Active').length} helper="Login enabled" valueClass="text-emerald-700" helperClass="text-emerald-700" />
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-2 border-b border-slate-200 p-3 lg:grid-cols-[1.4fr_.55fr_.4fr]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-blue-600" placeholder="Search manager by name, email, or role..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[12px] outline-none focus:border-blue-600" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All Account Statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <button className="h-9 rounded-md border border-slate-500/80 bg-white px-3 text-[12px] text-slate-600 hover:bg-slate-50" type="button" onClick={() => { setQuery(''); setStatus('All Account Statuses'); }}>
              Reset Filter
            </button>
          </div>

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
                      <div className="mt-2 flex items-center gap-1 text-[10px]"><span className="text-slate-500">Pass:</span><span className="font-mono font-semibold text-rose-600">{manager.password}</span><Copy size={12} className="text-slate-400" /></div>
                    </td>
                    <td className="px-4 py-4"><span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium">{manager.title}</span></td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700"><Check size={11} /> Full Admin Authority</span>
                    </td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> Active</span></td>
                    <td className="px-4 py-4"><div className="text-[11px] font-medium">{manager.created}</div><div className="mt-1 text-[10px] text-slate-600">by {manager.createdBy}</div></td>
                    <td className="px-4 py-4 text-right">
                      <button className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-500/80 px-2.5 text-[12px] text-slate-700 hover:bg-slate-50" type="button">Actions<ChevronDown size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {showAddModal ? <AddManagerModal onClose={() => setShowAddModal(false)} /> : null}
    </PortalShell>
  );
}

function StatCard({label, value, helper, valueClass = 'text-slate-950', helperClass = 'text-slate-700'}: {label: string; value: number; helper: string; valueClass?: string; helperClass?: string}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-[18px] py-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className={`mt-3 text-[22px] font-semibold leading-none ${valueClass}`}>{value}</div>
      <div className={`mt-3 text-[11px] ${helperClass}`}>{helper}</div>
    </div>
  );
}

function AddManagerModal({onClose}: {onClose: () => void}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-[370px] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4">
          <div className="flex gap-3">
            <span className="grid size-7 place-items-center rounded-md border border-yellow-400 bg-yellow-50 text-yellow-600">
              <UserRoundPlus size={16} />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold">Add Manager / Co-Admin</h2>
              <p className="mt-1 text-[10px] text-slate-600">Create login credentials with full system administrative access.</p>
            </div>
          </div>
          <button className="text-slate-500 hover:text-slate-900" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <ModalField label="Manager Full Name" required placeholder="e.g. Bilal Tariq" />
          <ModalField label="Login Email Address" required placeholder="e.g. manager@example.com" hint="This email will be used to sign in to the portal" />

          <label className="block">
            <ModalLabel required>Login Password</ModalLabel>
            <div className="mt-2 flex">
              <input className="h-9 min-w-0 flex-1 rounded-l-md border border-slate-300 px-3 font-mono text-[12px] outline-none focus:border-blue-600" defaultValue="password123" />
              <button className="h-9 rounded-r-md border border-l-0 border-slate-500 px-3 text-[11px] text-slate-700" type="button">Generate</button>
            </div>
            <p className="mt-2 text-[10px] text-slate-600">Initial password for this account. Default is <span className="font-mono text-rose-600">password123</span></p>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <ModalLabel>Designation / Role Title</ModalLabel>
              <select className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-[12px] outline-none focus:border-blue-600">
                <option>Co-Admin / Manager</option>
                <option>Branch Manager</option>
                <option>Operations Manager</option>
              </select>
            </label>
            <ModalField label="Phone / Contact (Optional)" placeholder="e.g. 0300-1234567" />
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-900">
              <Check className="text-emerald-600" size={16} />
              Full System Administration Access
            </div>
            <p className="mt-2 text-[10px] leading-5 text-slate-700">
              Acts just like another admin of the system. This manager can review candidate requests, manage employee profiles, issue Smart ID cards, and access all portal modules with their own credentials.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button className="h-8 rounded-md border border-slate-500 px-3 text-[11px] text-slate-700" type="button" onClick={onClose}>Cancel</button>
          <button className="h-8 rounded-md bg-[#123b6d] px-4 text-[11px] font-medium text-white" type="button" onClick={onClose}>Create Manager Account</button>
        </div>
      </div>
    </div>
  );
}

function ModalLabel({children, required}: {children: React.ReactNode; required?: boolean}) {
  return <span className="text-[11px] font-medium text-slate-800">{children}{required ? <span className="text-red-600">*</span> : null}</span>;
}

function ModalField({label, required, placeholder, hint}: {label: string; required?: boolean; placeholder?: string; hint?: string}) {
  return (
    <label className="block">
      <ModalLabel required={required}>{label}</ModalLabel>
      <input className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-[12px] outline-none focus:border-blue-600" placeholder={placeholder} />
      {hint ? <p className="mt-2 text-[10px] text-slate-600">{hint}</p> : null}
    </label>
  );
}
