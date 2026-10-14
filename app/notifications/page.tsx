'use client';
import {AlertTriangle, CheckCircle2, Info, XCircle} from 'lucide-react';
import {useState} from 'react';
import Link from 'next/link';
import {notificationsApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {DataState} from '@/components/portal/data-state';
import {Pagination} from '@/components/portal/pagination';
import {PortalShell} from '@/components/portal/portal-shell';

const iconStyles = {
  warning: 'bg-yellow-100 text-orange-500',
  danger: 'bg-red-100 text-red-500',
  info: 'bg-indigo-100 text-indigo-600',
  success: 'bg-emerald-100 text-emerald-600',
};

export default function NotificationsPage() {
 const [tab,setTab]=useState('All');const [page,setPage]=useState(1);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const categories:Record<string,string>={'Expiring Soon':'expiring','Expired':'expired','Card Activity':'card_activity','Unread':'unread'};
 const state=useResource(()=>notificationsApi.list({page,category:categories[tab]}),[page,tab]);
 const alerts=(state.data?.data??[]).map(item=>({...item,type:item.category==='expired'?'danger':item.category==='expiring'?'warning':'info',text:'',time:item.createdAt,unread:!item.readAt,action:'View Record',href:item.target?item.target.type==='employee'?'/employees/'+encodeURIComponent(item.target.id):item.target.type==='card'?'/id-cards/'+encodeURIComponent(item.target.id):'/employee-requests':undefined}));
 async function mutate(id?:string){if(busy)return;if(!id&&!window.confirm('Clear read notifications?'))return;setBusy(true);setError('');try{if(id)await notificationsApi.read(id);else await notificationsApi.clearRead();state.refetch();window.dispatchEvent(new Event('portal-notifications-changed'));}catch(cause){setError(cause instanceof Error?cause.message:'Unable to update notifications.');}finally{setBusy(false);}}

  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-[20px] font-semibold leading-tight">System Alerts & Notifications</h1>
              <p className="mt-2 text-[12px] text-slate-600">Expiry alerts, renewal requests, and card lifecycle activity notices.</p>
            </div>
            <button className="text-[12px] text-slate-700 hover:text-[#123b6d]" type="button" disabled={busy} onClick={()=>void mutate()}>Clear Read Notifications</button>
          </div>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <nav className="flex border-b border-slate-200 px-4 text-[11px]">
              {['All','Unread','Expiring Soon','Expired','Card Activity'].map((label, index) => (
                <button key={label} className={`px-4 py-4 ${label === tab ? 'border-b border-[#123b6d] font-semibold text-[#123b6d]' : 'text-slate-600'}`} type="button" onClick={()=>{setTab(label);setPage(1);}}>
                  {label}
                </button>
              ))}
            </nav>

            <DataState {...state} retry={state.refetch} empty={!state.loading&&!alerts.length}/>{error&&<p role="alert" className="p-4 text-sm text-red-600">{error}</p>}
            <div className="divide-y divide-slate-200">
              {alerts.map((alert) => (
                <div key={`${alert.title}-${alert.time}`} className="flex gap-4 px-5 py-4">
                  <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${iconStyles[alert.type as keyof typeof iconStyles]}`}>
                    <AlertIcon type={alert.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-4">
                      <h2 className="text-[12px] font-semibold">
                        {alert.title}
                        {alert.unread ? <span className="ml-2 inline-block size-1.5 rounded-full bg-blue-600 align-middle" /> : null}
                      </h2>
                      <span className="shrink-0 text-[11px] text-slate-700">{alert.time}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-700">{alert.text}</p>
                    <div className="mt-3 flex items-center gap-3">
                      {alert.href&&<Link className="rounded-sm border border-blue-600 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50" href={alert.href}>{alert.action}</Link>}
                      <button className="text-[11px] text-slate-700 hover:text-[#123b6d]" type="button" disabled={busy||!alert.unread} onClick={()=>void mutate(alert.id)}>{alert.unread?'Mark Read':'Read'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination meta={state.data?.meta} onPage={setPage}/>
          </section>
        </div>
      </div>
    </PortalShell>
  );
}

function AlertIcon({type}: {type: string}) {
  if (type === 'danger') return <XCircle size={16} />;
  if (type === 'info') return <Info size={16} />;
  if (type === 'success') return <CheckCircle2 size={16} />;
  return <AlertTriangle size={16} />;
}
