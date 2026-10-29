'use client';
import Link from 'next/link';
import {ArrowUpRight, FileText, Plus, UserCog} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';
import {useSession} from '@/components/portal/session-provider';
import {dashboardApi} from '@/lib/services';
import {daysToExpiry} from '@/lib/contracts';
import type {DashboardSummary} from '@/lib/contracts';
import {useResource} from '@/lib/use-resource';
import {DataState} from '@/components/portal/data-state';

type CardRow = DashboardSummary['expiring'][number];

function CardsTable({title, description, rows, total, href, tone}: {title: string; description: string; rows: CardRow[]; total?: number; href: string; tone: 'amber' | 'rose'}) {
  const badge = tone === 'amber' ? 'bg-yellow-400 text-slate-950' : 'bg-rose-600 text-white';
  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between border-b border-slate-200 px-[18px] py-4">
        <div>
          <h2 className="text-[13px] font-semibold">{title}</h2>
          <p className="mt-2 text-[12px] text-slate-600">{description}</p>
        </div>
        <Link href={href} className="rounded-md border border-slate-500/80 bg-white px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50">
          View All ({total ?? '—'})
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-4 py-4 font-medium">Employee</th>
              <th className="px-4 py-4 font-medium">Card Number</th>
              <th className="px-4 py-4 font-medium">Expiry</th>
              <th className="px-4 py-4 font-medium">{tone === 'amber' ? 'Remaining' : 'Expired'}</th>
              <th className="px-4 py-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-[12px] text-slate-500">No cards in this list.</td></tr>}
            {rows.map((item) => {
              const days = daysToExpiry(item.expiryDate, new Date(), item.asOfDate);
              const label = days === null ? '—' : tone === 'amber' ? `${days} Days` : `${Math.abs(days)} Days ago`;
              return (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-[13px]">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-[10px] font-medium text-[#123b6d]">{item.employee.name.slice(0, 2)}</span>
                      <span>
                        <span className="block text-[12px] font-medium leading-tight">{item.employee.name}</span>
                        <span className="mt-1 block text-[10px] text-slate-500">{item.employee.displayId}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-[13px] font-mono text-[11px] font-medium text-pink-600">{item.number}</td>
                  <td className="px-4 py-[13px] text-[12px]">{item.expiryDate}</td>
                  <td className="px-4 py-[13px]"><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${badge}`}>{label}</span></td>
                  <td className="px-4 py-[13px] text-right">
                    <Link href={`/renew-card?card=${encodeURIComponent(item.id)}`} className="inline-flex h-8 items-center rounded-md border border-blue-600 px-2.5 text-[11px] font-medium text-blue-700 hover:bg-blue-50">
                      Renew
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const state = useResource(dashboardApi);
  const {user} = useSession();
  const summary = state.data?.data;
  const employeeStats = [
    {label: 'Total Employees', value: summary?.totalEmployees, helper: 'All employees', href: '/employees', valueClass: 'text-slate-950', borderClass: ''},
    {label: 'Active Employees', value: summary?.activeEmployees, helper: 'Active roster', href: '/employees?status=active', valueClass: 'text-emerald-700', borderClass: ''},
    {label: 'Resigned Employees', value: summary?.resignedEmployees, helper: 'Employment status', href: '/employees?status=resigned', valueClass: 'text-slate-500', borderClass: ''},
  ];
  const cardStats = [
    {label: 'Active ID Cards', value: summary?.activeCards, helper: 'Valid, includes expiring soon', href: '/id-cards?status=active', valueClass: 'text-emerald-700', borderClass: 'border-l-2 border-l-emerald-500'},
    {label: 'Expiring Soon', value: summary?.expiringCards, helper: 'Within next 30 days', href: '/id-cards?status=expiring_soon', valueClass: 'text-amber-700', borderClass: 'border-l-2 border-l-amber-400'},
    {label: 'Expired ID Cards', value: summary?.expiredCards, helper: 'Renewal required', href: '/id-cards?status=expired', valueClass: 'text-rose-600', borderClass: 'border-l-2 border-l-rose-500'},
    {label: 'Revoked ID Cards', value: summary?.revokedCards, helper: 'Deactivated cards', href: '/id-cards?status=revoked', valueClass: 'text-slate-600', borderClass: 'border-l-2 border-l-slate-400'},
  ];
  const renderStats = (stats: typeof cardStats, columns: string) => (
    <div className={`grid gap-4 md:grid-cols-2 ${columns}`}>
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href} className={`group rounded-lg border border-slate-200 bg-white px-[18px] py-[17px] shadow-sm transition hover:border-slate-300 hover:shadow-md ${stat.borderClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500">{stat.label}</span>
            <ArrowUpRight className="text-slate-400 transition group-hover:text-[#123b6d]" size={13} />
          </div>
          <div className={`mt-3 text-[24px] font-semibold leading-none ${stat.valueClass}`}>{stat.value ?? '—'}</div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className={stat.valueClass}>{stat.helper}</span>
            <span className="text-blue-600">View -&gt;</span>
          </div>
        </Link>
      ))}
    </div>
  );
  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-[20px] font-semibold leading-none tracking-tight">Dashboard</h1>
            <p className="mt-3 text-[12px] text-slate-500">Overview of employees and ID cards.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.role === 'superadmin' && (
              <Link href="/managers" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-500/70 bg-white px-3 text-[12px] text-slate-600 hover:bg-slate-50">
                <UserCog size={15} />
                Managers ({summary?.managerCount ?? '—'})
              </Link>
            )}
            <Link href="/employee-requests" className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-3 text-[12px] font-medium text-blue-700 hover:bg-blue-100">
              <FileText size={15} />
              Pending Requests
              <span className="grid size-5 place-items-center rounded-full bg-yellow-400 text-[11px] font-semibold text-slate-950">{summary?.pendingRequests ?? '—'}</span>
            </Link>
            <Link href="/add-employee" className="inline-flex h-9 items-center gap-2 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]">
              <Plus size={15} />
              Add Employee
            </Link>
          </div>
        </div>

        <DataState {...state} retry={state.refetch} />
        {renderStats(employeeStats, 'xl:grid-cols-3')}
        <div className="mt-4">{renderStats(cardStats, 'xl:grid-cols-4')}</div>

        <CardsTable title="ID Cards Expiring Soon" description="Cards expiring within the next 30 days" rows={summary?.expiring ?? []} total={summary?.expiringCards} href="/id-cards?status=expiring_soon" tone="amber" />
        <CardsTable title="Expired ID Cards" description="Most recently expired cards" rows={summary?.expired ?? []} total={summary?.expiredCards} href="/id-cards?status=expired" tone="rose" />
      </div>
    </PortalShell>
  );
}
