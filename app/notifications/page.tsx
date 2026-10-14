import {AlertTriangle, CheckCircle2, Info, XCircle} from 'lucide-react';
import {PortalShell} from '@/components/portal/portal-shell';

const alerts = [
  {type: 'warning', title: 'ID Card Expiring in 5 Days - Muhammad Ali', text: 'Card validity terminates on 14 Oct 2026. Action required to avoid access gate disruptions.', time: '12 minutes ago', action: 'Renew Now', unread: true},
  {type: 'danger', title: 'ID Card Expired - Nida Siddiqui', text: 'Card expired 4 days ago on 12 Sep 2026. QR verification status is now inactive.', time: '45 minutes ago', action: 'Renew Card', unread: true},
  {type: 'info', title: 'Replacement Card Reissued - Muhammad Ali', text: 'Previous card CARD-00421 was permanently deactivated. New card CARD-00422 registered.', time: '2 hours ago', action: 'View Card', unread: true},
  {type: 'warning', title: 'ID Card Expiring in 9 Days - Tariq Khan', text: 'Expiry on 18 Oct 2026. Review profile to extend validity for 11 months.', time: '3 hours ago', action: 'Renew Now'},
  {type: 'warning', title: 'ID Card Expiring in 12 Days - Sara Ahmed', text: 'Card validity ends on 21 Oct 2026.', time: '5 hours ago', action: 'Renew Now'},
  {type: 'danger', title: 'ID Card Expired - Farhan Siddique', text: 'Expired 14 days ago. Security badge reader access blocked.', time: '1 day ago', action: 'View Employee'},
  {type: 'success', title: 'New Smart ID Card Issued - Usman Farooq', text: 'Card issued with 11 months validity. Digital QR verification enabled.', time: '2 days ago', action: 'View Card'},
  {type: 'warning', title: 'ID Card Expiring in 16 Days - Bilal Raza', text: 'Card expires on 25 Oct 2026.', time: '2 days ago', action: 'Renew Now'},
];

const iconStyles = {
  warning: 'bg-yellow-100 text-orange-500',
  danger: 'bg-red-100 text-red-500',
  info: 'bg-indigo-100 text-indigo-600',
  success: 'bg-emerald-100 text-emerald-600',
};

export default function NotificationsPage() {
  return (
    <PortalShell>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] text-slate-950">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-[20px] font-semibold leading-tight">System Alerts & Notifications</h1>
              <p className="mt-2 text-[12px] text-slate-600">Expiry alerts, renewal requests, and card lifecycle activity notices.</p>
            </div>
            <button className="text-[12px] text-slate-700 hover:text-[#123b6d]" type="button">Clear Read Notifications</button>
          </div>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <nav className="flex border-b border-slate-200 px-4 text-[11px]">
              {['All (14)', 'Unread (3)', 'Expiring Soon (8)', 'Expired (4)', 'Card Activity (2)'].map((tab, index) => (
                <button key={tab} className={`px-4 py-4 ${index === 0 ? 'border-b border-[#123b6d] font-semibold text-[#123b6d]' : 'text-slate-600'}`} type="button">
                  {tab}
                </button>
              ))}
            </nav>

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
                      <button className="rounded-sm border border-blue-600 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50" type="button">{alert.action}</button>
                      <button className="text-[11px] text-slate-700 hover:text-[#123b6d]" type="button">Mark Read</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
