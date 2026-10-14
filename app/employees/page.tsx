'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {ChevronDown, Plus, Search} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';

const employeeRows = [
  {name: 'Muhammad Ali', initials: 'MA', role: 'Senior Technician', id: 'EMP-00123', phone: '+92 300 1234567', employment: 'Active', card: 'Expiring Soon', expiry: '14 Oct 2026'},
  {name: 'Usman Farooq', initials: 'UF', role: 'Operations Lead', id: 'EMP-00128', phone: '+92 301 2345678', employment: 'Transferred', card: 'Active', expiry: '28 Jan 2027'},
  {name: 'Amina Tariq', initials: 'AT', role: 'HR Officer', id: 'EMP-00135', phone: '+92 302 3456789', employment: 'Active', card: 'Active', expiry: '12 May 2027'},
  {name: 'Tariq Khan', initials: 'TK', role: 'Electrical Specialist', id: 'EMP-00142', phone: '+92 303 4567890', employment: 'Active', card: 'Expiring Soon', expiry: '18 Oct 2026'},
  {name: 'Fahad Qureshi', initials: 'FQ', role: 'Safety Inspector', id: 'EMP-00150', phone: '+92 304 5678901', employment: 'Resigned', card: 'Deactivated', expiry: '10 Dec 2026'},
];

function statusClass(status: string) {
  if (status === 'Active') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (status === 'Transferred') return 'border-cyan-200 bg-cyan-100 text-cyan-700';
  if (status === 'Expiring Soon') return 'border-yellow-200 bg-yellow-100 text-yellow-700';
  return 'border-slate-300 bg-slate-200 text-slate-600';
}

export default function EmployeesPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [cardStatus, setCardStatus] = useState('All');
  const [expiry, setExpiry] = useState('All');

  const filtered = useMemo(() => {
    return employeeRows.filter((employee) => {
      const searchText = `${employee.name} ${employee.id} ${employee.phone}`.toLowerCase();
      return (
        searchText.includes(query.toLowerCase()) &&
        (status === 'All' || employee.employment === status) &&
        (cardStatus === 'All' || employee.card === cardStatus) &&
        (expiry === 'All' || employee.card === 'Expiring Soon')
      );
    });
  }, [cardStatus, expiry, query, status]);

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-[20px] font-semibold leading-tight">Employees</h1>
            <p className="mt-2 text-[12px] text-slate-600">Manage employee information, employment status and ID cards.</p>
          </div>
          <Link
            href="/add-employee"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]"
          >
            <Plus size={14} />
            Add Employee
          </Link>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 lg:grid-cols-[1.5fr_.7fr_.7fr_.7fr]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-blue-600"
                placeholder="Search name, employee ID, phone or NIC"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <FilterSelect label="Status" value={status} onChange={setStatus} options={['All', 'Active', 'Transferred', 'Resigned']} />
            <FilterSelect label="ID Card" value={cardStatus} onChange={setCardStatus} options={['All', 'Active', 'Expiring Soon', 'Deactivated']} />
            <FilterSelect label="Expiry" value={expiry} onChange={setExpiry} options={['All', 'Expiring Soon']} />
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
                {filtered.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-[13px]">
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-[10px] font-medium text-[#123b6d]">{employee.initials}</span>
                        <span>
                          <Link href={`/employees/${employee.id}`} className="block text-[12px] font-medium leading-tight hover:text-blue-700">{employee.name}</Link>
                          <span className="mt-1 block text-[10px] text-slate-500">{employee.role}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] font-mono text-[11px] font-medium text-pink-600">{employee.id}</td>
                    <td className="px-4 py-[13px] text-[12px] text-slate-600">{employee.phone}</td>
                    <td className="px-4 py-[13px]">
                      <span className={`rounded-md border px-2.5 py-1 text-[10px] font-medium ${statusClass(employee.employment)}`}>{employee.employment}</span>
                    </td>
                    <td className="px-4 py-[13px]">
                      <span className={`rounded-md border px-2.5 py-1 text-[10px] font-medium ${statusClass(employee.card)}`}>{employee.card}</span>
                    </td>
                    <td className="px-4 py-[13px] text-[12px] text-slate-600">{employee.expiry}</td>
                    <td className="px-4 py-[13px] text-right">
                      <button className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-500/80 px-2.5 text-[12px] text-slate-700 hover:bg-slate-50" type="button">
                        Actions
                        <ChevronDown size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-4 py-4 text-[12px] text-slate-700 sm:flex-row sm:items-center">
            <span>Showing 1 to {filtered.length} of 12 entries</span>
            <div className="flex items-center">
              <button className="h-8 rounded-l-md border border-slate-200 bg-slate-100 px-3">Previous</button>
              <button className="h-8 border-y border-slate-200 bg-[#123b6d] px-3 text-white">1</button>
              <button className="h-8 border border-slate-200 px-3">2</button>
              <button className="h-8 border-y border-slate-200 px-3">3</button>
              <button className="h-8 rounded-r-md border border-slate-200 px-3">Next</button>
            </div>
          </div>
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
