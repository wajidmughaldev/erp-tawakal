'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Eye, ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {auth} from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!email.trim() || !password) {setError('Please enter your email/username and password.'); return;}
    const remember = new FormData(e.currentTarget).get('remember') === 'on';
    setLoading(true);
    try {await auth.login(email.trim(), password, remember); setPassword(''); router.replace('/dashboard');}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to sign in.');}
    finally {setLoading(false);}
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
              <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email or username" autoComplete="username" />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Password
              <div className="mt-1 flex">
                <Input className="rounded-r-none" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button className="rounded-l-none border-l-0" type="button" variant="outline" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">
                  <Eye size={16} />
                </Button>
              </div>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="remember" className="size-4 rounded border-slate-300" />
              Remember me on this workstation
            </label>
            <Button className="w-full py-2.5" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</Button>
          </form>


        </div>
      </section>
    </main>
  );
}
