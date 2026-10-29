'use client';

import {Suspense, useState} from 'react';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {AuthLayout} from '@/components/portal/auth-layout';
import {ApiError} from '@/lib/api-client';
import {auth} from '@/lib/auth';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (password !== confirmation) {setError('Passwords do not match.'); return;}
    setLoading(true);
    try {await auth.resetPassword({token, email, password, password_confirmation: confirmation}); router.replace('/login?reset=1');}
    catch (cause) {
      setError(cause instanceof ApiError && cause.status === 422 ? 'This reset link is invalid or expired, or the password is too weak (min 8 characters with upper case, lower case and a number).' : cause instanceof Error ? cause.message : 'Unable to reset the password.');
    }
    finally {setLoading(false);}
  }

  if (!token || !email) {
    return <AuthLayout title="Reset Password" subtitle="This reset link is incomplete."><Link href="/forgot-password" className="mt-5 block text-sm text-blue-700 hover:underline">Request a new link</Link></AuthLayout>;
  }
  return (
    <AuthLayout title="Reset Password" subtitle={`Choose a new password for ${email}.`}>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <label className="block text-sm font-medium text-slate-600">
          New password
          <Input className="mt-1" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="block text-sm font-medium text-slate-600">
          Confirm new password
          <Input className="mt-1" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        </label>
        <Button className="w-full py-2.5" disabled={loading}>{loading ? 'Saving…' : 'Reset Password'}</Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
