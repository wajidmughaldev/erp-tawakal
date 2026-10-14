'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Bell, CreditCard, Home, LogOut, Menu, ShieldCheck, UserCog, Users} from 'lucide-react';
import {useEffect, useState} from 'react';
import {auth} from '@/lib/auth';
import {useSession} from './session-provider';
import {request} from '@/lib/api-client';
import {useRouter} from 'next/navigation';
import {Badge} from '@/components/ui/badge';

const nav = [
  {href: '/dashboard', label: 'Dashboard', icon: Home},
  {href: '/employees', label: 'Employees', icon: Users},
  {href: '/employee-requests', label: 'Employee Requests', icon: ShieldCheck},
  {href: '/id-cards', label: 'ID Cards', icon: CreditCard},
  {href: '/managers', label: 'Managers', icon: UserCog},
  {href: '/notifications', label: 'Notifications', icon: Bell},
];

export function PortalShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const {user} = useSession();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState<number | null>(null);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    setOpen(false);
    const close = (e: KeyboardEvent) => {if (e.key === 'Escape') setOpen(false);};
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [pathname]);
  useEffect(() => {
    const update=()=>request<{unreadCount: number}>('/notifications?summary=true').then(result=>setUnread(result.unreadCount)).catch(()=>setUnread(null));
    void update();window.addEventListener('portal-notifications-changed',update);
    return ()=>window.removeEventListener('portal-notifications-changed',update);
  }, [pathname]);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError('');
    try {await auth.logout(); router.replace('/login');}
    catch (cause) {setLogoutError(cause instanceof Error ? cause.message : 'Unable to sign out.');}
    finally {setLoggingOut(false);}
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {open && <button aria-label="Close navigation" onClick={() => setOpen(false)} className="no-print fixed inset-0 z-20 bg-black/40 lg:hidden" />}
      <aside id="portal-navigation" className={`no-print fixed left-0 top-0 z-30 h-screen w-[250px] flex-col justify-between bg-[var(--brand-dark)] text-white ${open ? 'flex' : 'hidden'} lg:flex`}>
        <div>
          <Link href="/dashboard" className="flex h-[68px] items-center border-b border-white/10 px-5">
            <span className="mr-3 grid size-9 place-items-center rounded-md border border-[var(--brand-gold)] bg-[#d4af37]/15 text-[var(--brand-gold)]">
              <ShieldCheck size={19} />
            </span>
            <span>
              <span className="block text-sm font-semibold">Tawakkal Ent.</span>
              <span className="block text-xs text-white/55">Smart ID Portal</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="px-3 py-4">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">Main Menu</div>
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-1 flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition ${
                    active ? 'border-l-[3px] border-[var(--brand-gold)] bg-[var(--brand-deep)] text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3" size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-white/10 bg-black/15 p-4 text-xs text-white/60">
          <div className="font-semibold text-white">{user?.name}</div>
          <div>{user?.role}</div>
          <button type="button" disabled={loggingOut} onClick={() => void logout()} className="mt-3 inline-flex items-center gap-2 text-white/70 hover:text-white">
            <LogOut size={15} />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
          {logoutError && <p role="alert" className="mt-2 text-red-200">{logoutError}</p>}
        </div>
      </aside>

      <main className="lg:ml-[250px]">
        <header className="no-print sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-7">
          <div className="flex items-center gap-3">
            <button aria-label="Toggle navigation" aria-expanded={open} aria-controls="portal-navigation" onClick={() => setOpen(value => !value)} className="grid size-9 place-items-center rounded-md border border-slate-200 lg:hidden" type="button">
              <Menu size={18} />
            </button>
            <div>
              <div className="text-sm font-semibold">Employee Management & Smart ID Portal</div>
              <div className="text-xs text-slate-500">Hyderabad operations console</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/notifications" aria-label={unread!==null?`Notifications (${unread} unread)`:"Notifications"} className="relative grid size-10 place-items-center rounded-md border border-slate-200 hover:bg-slate-50">
              <Bell size={18} />
              {unread !== null && unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[11px] text-white">{unread}</span>}
            </Link>
            <Badge tone="success" className="hidden sm:inline-flex">Portal Active</Badge>
            <div className="grid size-9 place-items-center rounded-full bg-[var(--brand-deep)] text-sm font-semibold text-white">{user?.name.slice(0, 1)}</div>
          </div>
        </header>
        <div className="p-4 lg:p-7">{children}</div>
      </main>
    </div>
  );
}
