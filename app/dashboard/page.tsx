import Link from 'next/link';
import {ArrowUpRight, FileText, Plus, UserCog} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';
import {managers} from '@/lib/portal-data';

const expiringCards = [
  {name: 'Muhammad Ali', initials: 'MA', employeeId: 'EMP-00123', card: 'CARD-00398', expiry: '14 Oct 2026', remaining: '5 Days'},
  {name: 'Tariq Khan', initials: 'TK', employeeId: 'EMP-00142', card: 'CARD-00401', expiry: '18 Oct 2026', remaining: '9 Days'},
  {name: 'Sara Ahmed', initials: 'SA', employeeId: 'EMP-00155', card: 'CARD-00403', expiry: '21 Oct 2026', remaining: '12 Days'},
  {name: 'Bilal Raza', initials: 'BR', employeeId: 'EMP-00169', card: 'CARD-00407', expiry: '25 Oct 2026', remaining: '16 Days'},
  {name: 'Zainab Malik', initials: 'ZM', employeeId: 'EMP-00188', card: 'CARD-00410', expiry: '29 Oct 2026', remaining: '20 Days'},
];

const stats = [
  {label: 'Total Employees', value: '248', helper: 'All departments', href: '/employees', valueClass: 'text-slate-950', borderClass: ''},
  {label: 'Active Employees', value: '221', helper: '89.1% active roster', href: '/employees?status=Active', valueClass: 'text-emerald-700', borderClass: ''},
  {label: 'Resigned Employees', value: '18', helper: 'Creds deactivated', href: '/employees?status=Resigned', valueClass: 'text-slate-500', borderClass: ''},
  {label: 'Expiring ID Cards', value: '12', helper: 'Within next 30 days', href: '/id-cards?status=expiring', valueClass: 'text-amber-700', borderClass: 'border-l-2 border-l-amber-400'},
  {label: 'Expired ID Cards', value: '7', helper: 'Action required', href: '/id-cards?status=expired', valueClass: 'text-rose-600', borderClass: 'border-l-2 border-l-rose-500'},
];

export default function DashboardPage() {
  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-[20px] font-semibold leading-none tracking-tight">Dashboard</h1>
            <p className="mt-3 text-[12px] text-slate-500">Overview of employees and smart ID credentials.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/managers"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-500/70 bg-white px-3 text-[12px] text-slate-600 hover:bg-slate-50"
            >
              <UserCog size={15} />
              Managers ({managers.length})
            </Link>
            <Link
              href="/employee-requests"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 text-[12px] font-medium text-blue-700 hover:bg-blue-100"
            >
              <FileText size={15} />
              Candidate Requests
              <span className="grid size-5 place-items-center rounded-full bg-yellow-400 text-[11px] font-semibold text-slate-950">2</span>
            </Link>
            <Link
              href="/add-employee"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]"
            >
              <Plus size={15} />
              Add Employee
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className={`group rounded-lg border border-slate-200 bg-white px-[18px] py-[17px] shadow-sm transition hover:border-slate-300 hover:shadow-md ${stat.borderClass}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500">{stat.label}</span>
                <ArrowUpRight className="text-slate-400 transition group-hover:text-[#123b6d]" size={13} />
              </div>
              <div className={`mt-3 text-[24px] font-semibold leading-none ${stat.valueClass}`}>{stat.value}</div>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className={stat.valueClass}>{stat.helper}</span>
                <span className="text-blue-600">View -&gt;</span>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-200 px-[18px] py-4">
            <div>
              <h2 className="text-[13px] font-semibold">ID Cards Expiring Soon</h2>
              <p className="mt-2 text-[12px] text-slate-600">Cards nearing their 11-month institutional validity limit</p>
            </div>
            <Link
              href="/id-cards?status=expiring"
              className="rounded-md border border-slate-500/80 bg-white px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              View All (12)
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 font-medium">Employee</th>
                  <th className="px-4 py-4 font-medium">Card Number</th>
                  <th className="px-4 py-4 font-medium">Expiry</th>
                  <th className="px-4 py-4 font-medium">Remaining</th>
                  <th className="px-4 py-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {expiringCards.map((card) => (
                  <tr key={card.card} className="hover:bg-slate-50/80">
                    <td className="px-4 py-[13px]">
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-[10px] font-medium text-[#123b6d]">{card.initials}</span>
                        <span>
                          <span className="block text-[12px] font-medium leading-tight">{card.name}</span>
                          <span className="mt-1 block text-[10px] text-slate-500">{card.employeeId}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-[13px] font-mono text-[11px] font-medium text-pink-600">{card.card}</td>
                    <td className="px-4 py-[13px] text-[12px]">{card.expiry}</td>
                    <td className="px-4 py-[13px]">
                      <span className="rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-semibold text-slate-950">{card.remaining}</span>
                    </td>
                    <td className="px-4 py-[13px] text-right">
                      <Link
                        href="/renew-card"
                        className="inline-flex h-8 items-center rounded-md border border-blue-600 px-2.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Renew
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
