'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {AuthLayout} from '@/components/portal/auth-layout';
import {auth} from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!email.trim()) {setError('Please enter your email.'); return;}
    setLoading(true);
    try {await auth.forgotPassword(email.trim()); setSent(true);}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to send the reset link.');}
    finally {setLoading(false);}
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Enter your account email and we will send you a reset link.">
      {sent ? (
        <div role="status" className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">If an account exists for that email, a reset link has been sent. The link expires in 60 minutes.</div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <label className="block text-sm font-medium text-slate-600">
            Email
            <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <Button className="w-full py-2.5" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</Button>
        </form>
      )}
      <Link href="/login" className="mt-5 block text-center text-sm text-blue-700 hover:underline">Back to sign in</Link>
    </AuthLayout>
  );
}
