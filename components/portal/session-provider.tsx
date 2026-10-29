'use client';
import {createContext, useContext, useEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {auth, SessionUser} from '@/lib/auth';
import {ApiError} from '@/lib/api-client';

const SessionContext = createContext<{user: SessionUser | null; refresh: () => Promise<void>}>({user: null, refresh: async () => {}});
export const useSession = () => useContext(SessionContext);
// The home page only redirects to login and must not wait for a session check.
const publicPaths = ['/', '/login', '/forgot-password', '/reset-password', '/employee-registration', '/verify', '/scan'];

export function SessionProvider({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicPaths.includes(pathname);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [confirmedPath, setConfirmedPath] = useState('');
  const [error, setError] = useState('');
  async function refresh() {
    setError(''); setConfirmedPath('');
    try { const result = await auth.me(); setUser(result.data); setConfirmedPath(pathname); }
    catch (cause) {
      setUser(null);
      if (cause instanceof ApiError && [401, 419].includes(cause.status)) router.replace('/login?reason=expired');
      else setError(cause instanceof Error ? cause.message : 'Unable to confirm your session.');
    }
  }
  useEffect(() => { if (!isPublic) void refresh(); else {setUser(null); setConfirmedPath('');} }, [pathname]);
  useEffect(() => {
    const expired = () => {setUser(null); setConfirmedPath(''); router.replace('/login?reason=expired');};
    window.addEventListener('portal-session-expired', expired);
    return () => window.removeEventListener('portal-session-expired', expired);
  }, [router]);
  return <SessionContext.Provider value={{user, refresh}}>{isPublic || (user && confirmedPath === pathname) ? children : <main className="grid min-h-screen place-items-center p-6"><div className="rounded-lg border border-slate-200 bg-white p-6" role="status">{error || 'Confirming your session…'}{error && <button onClick={() => void refresh()} className="ml-4 text-blue-700">Retry</button>}</div></main>}</SessionContext.Provider>;
}
