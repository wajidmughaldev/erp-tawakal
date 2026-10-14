'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Eye, ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    const ok = (email === 'admin@example.com' && password === 'password') || (email === 'manager@example.com' && password === 'password123');
    if (!ok) {
      setError('Invalid login credentials.');
      return;
    }

    setLoading(true);
    window.localStorage.setItem('portal_auth', JSON.stringify({email, loggedInAt: new Date().toISOString()}));
    setTimeout(() => router.push('/dashboard'), 450);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[46%_54%]">
      <section className="hidden flex-col justify-between bg-[linear-gradient(145deg,#092A4A_0%,#123B6D_100%)] p-12 text-white lg:flex">
        <div>
          <div className="mb-6 grid size-14 place-items-center rounded-lg border border-[var(--brand-gold)] bg-[#d4af37]/15 text-[var(--brand-gold)]">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-3xl font-semibold">Enterprise ID Portal</h1>
          <p className="mt-2 text-sm text-white/60">Employee Management & Smart Identification System</p>
          <div className="my-5 h-1 w-11 rounded bg-[var(--brand-gold)]" />
          <p className="max-w-md text-[15px] leading-7 text-white/75">
            Centralized credential issuance, QR verification, and employee identity lifecycle management with operational security standards.
          </p>
        </div>
        <div className="border-t border-white/20 pt-5 text-sm text-white/55">
          <div>Institutional Security & Access Protocol</div>
          <div className="mt-1">Version 2.4.0 · Authorized Personnel Only</div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 lg:hidden">
            <div className="mb-4 grid size-12 place-items-center rounded-lg border border-[var(--brand-gold)] bg-[#d4af37]/15 text-[var(--brand-gold)]">
              <ShieldCheck size={25} />
            </div>
            <h1 className="text-xl font-semibold text-[var(--brand-dark)]">Enterprise ID Portal</h1>
            <p className="text-sm text-slate-500">Employee Management System</p>
          </div>

          <h2 className="text-2xl font-semibold">Welcome Back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to access the employee management portal.</p>

          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium text-slate-600">
              Email or Username
              <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Password
              <div className="mt-1 flex">
                <Input className="rounded-r-none" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button className="rounded-l-none border-l-0" type="button" variant="outline" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">
                  <Eye size={16} />
                </Button>
              </div>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="size-4 rounded border-slate-300" />
              Remember me on this workstation
            </label>
            <Button className="w-full py-2.5" disabled={loading}>{loading ? 'Redirecting...' : 'Sign In'}</Button>
          </form>

          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            <div className="mb-3 flex items-center justify-between">
              <strong className="text-slate-900">Demo Login Accounts</strong>
              <Badge>Tawakkal Ent.</Badge>
            </div>
            {[
              ['Noman (System Admin)', 'admin@example.com', 'password'],
              ['Bilal Tariq (Branch Manager)', 'manager@example.com', 'password123'],
            ].map(([name, demoEmail, demoPassword]) => (
              <div key={demoEmail} className="mb-2 flex items-center justify-between rounded-md border border-slate-200 bg-white p-2 last:mb-0">
                <div>
                  <div className="font-medium text-slate-900">{name}</div>
                  <div className="text-xs"><code>{demoEmail}</code> · <code>{demoPassword}</code></div>
                </div>
                <Button type="button" variant="outline" className="h-8 px-2" onClick={() => { setEmail(demoEmail); setPassword(demoPassword); }}>Fill</Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
