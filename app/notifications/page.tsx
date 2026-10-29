'use client';
import {AlertTriangle, CheckCircle2, Info, XCircle} from 'lucide-react';
import {useState} from 'react';
import Link from 'next/link';
import {notificationsApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {useSession} from '@/components/portal/session-provider';
import {DataState} from '@/components/portal/data-state';
import {Pagination} from '@/components/portal/pagination';
import {PortalShell} from '@/components/portal/portal-shell';
import type {Notification} from '@/lib/contracts';

const iconStyles: Record<Notification['level'], string> = {
  warning: 'bg-yellow-100 text-orange-500',
  danger: 'bg-red-100 text-red-500',
  info: 'bg-indigo-100 text-indigo-600',
  success: 'bg-emerald-100 text-emerald-600',
};
const tabs: [label: string, category?: string][] = [['All'], ['Unread', 'unread'], ['Registrations', 'requests'], ['ID Cards', 'cards'], ['Employees', 'employees']];

function hrefFor(target: Notification['target']) {
  if (!target) return undefined;
  const id = encodeURIComponent(target.id);
  return target.type === 'employee' ? `/employees/view?id=${id}` : target.type === 'card' ? `/id-cards/view?id=${id}` : target.type === 'manager' ? '/managers' : '/employee-requests';
}

export default function NotificationsPage() {
  const {user} = useSession();
  const [tab, setTab] = useState('All');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const allTabs = user?.role === 'superadmin' ? [...tabs, ['Accounts', 'accounts'] as [string, string]] : tabs;
  const category = allTabs.find(([label]) => label === tab)?.[1];
  const state = useResource(() => notificationsApi.list({page, category}), [page, tab]);
  const items = state.data?.data ?? [];
  const unread = (state.data as {unreadCount?: number} | undefined)?.unreadCount ?? 0;

  async function markAllRead() {
    if (busy) return;
    setBusy(true); setError('');
    try {await notificationsApi.readAll(); state.refetch(); window.dispatchEvent(new Event('portal-notifications-changed'));}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to update notifications.');}
    finally {setBusy(false);}
  }

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-[20px] font-semibold leading-tight">Notifications</h1>
              <p className="mt-2 text-[12px] text-slate-600">Activity from other administrators and new registration forms. Notifications are kept for 30 days.</p>
            </div>
            <button className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[12px] text-slate-700 hover:bg-slate-50 disabled:opacity-50" type="button" disabled={busy || unread === 0} onClick={() => void markAllRead()}>Mark all as read</button>
          </div>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <nav className="flex flex-wrap border-b border-slate-200 px-4 text-[11px]">
              {allTabs.map(([label]) => (
                <button key={label} className={`px-4 py-4 ${label === tab ? 'border-b border-[#123b6d] font-semibold text-[#123b6d]' : 'text-slate-600'}`} type="button" onClick={() => {setTab(label); setPage(1);}}>
                  {label}{label === 'Unread' && unread > 0 ? ` (${unread})` : ''}
                </button>
              ))}
            </nav>

            <DataState {...state} retry={state.refetch} empty={!state.loading && !items.length} />
            {error && <p role="alert" className="p-4 text-sm text-red-600">{error}</p>}
            <div className="divide-y divide-slate-200">
              {items.map(item => {
                const href = hrefFor(item.target);
                return (
                  <div key={item.id} className={`flex gap-4 px-5 py-4 ${item.readAt ? '' : 'bg-blue-50/40'}`}>
                    <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${iconStyles[item.level]}`}><LevelIcon level={item.level} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-4">
                        <h2 className="text-[12px] font-semibold">{item.title}{!item.readAt && <span aria-label="Unread" className="ml-2 inline-block size-1.5 rounded-full bg-blue-600 align-middle" />}</h2>
                        <span className="shrink-0 text-[11px] text-slate-700">{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-700">{item.message}</p>
                      {href && <Link className="mt-3 inline-block rounded-sm border border-blue-600 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50" href={href}>View</Link>}
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination meta={state.data?.meta} onPage={setPage} />
          </section>
        </div>
      </div>
    </PortalShell>
  );
}

function LevelIcon({level}: {level: Notification['level']}) {
  if (level === 'danger') return <XCircle size={16} />;
  if (level === 'info') return <Info size={16} />;
  if (level === 'success') return <CheckCircle2 size={16} />;
  return <AlertTriangle size={16} />;
}
