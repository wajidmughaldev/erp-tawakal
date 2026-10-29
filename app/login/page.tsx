'use client';

import {Suspense, useState} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Eye} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {AuthLayout} from '@/components/portal/auth-layout';
import {auth} from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const notice = params.get('reason') === 'expired' ? 'Your session has expired. Please sign in again.' : params.get('reset') === '1' ? 'Password updated. Please sign in with your new password.' : '';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!email.trim() || !password) {setError('Please enter your email and password.'); return;}
    const remember = new FormData(e.currentTarget).get('remember') === 'on';
    setLoading(true);
    try {await auth.login(email.trim(), password, remember); setPassword(''); router.replace('/dashboard');}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to sign in.');}
    finally {setLoading(false);}
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to access the employee management portal.">
      {notice && !error ? <div role="status" className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</div> : null}
      {error ? <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-600">
          Email
          <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
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
        <div className="flex items-center justify-between text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remember" className="size-4 rounded border-slate-300" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-blue-700 hover:underline">Forgot password?</Link>
        </div>
        <Button className="w-full py-2.5" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
