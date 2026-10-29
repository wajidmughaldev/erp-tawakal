'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card} from '@/components/ui/card';
import {PageHeader} from '@/components/portal/page-header';
import {PortalShell} from '@/components/portal/portal-shell';
import {useSession} from '@/components/portal/session-provider';
import {ApiError} from '@/lib/api-client';
import {auth} from '@/lib/auth';

export default function AccountPage() {
  const {user} = useSession();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(''); setDone(false);
    if (password !== confirmation) {setError('New passwords do not match.'); return;}
    setBusy(true);
    try {
      await auth.changePassword({current_password: current, password, password_confirmation: confirmation});
      setCurrent(''); setPassword(''); setConfirmation(''); setDone(true);
    } catch (cause) {
      const fields = cause instanceof ApiError ? cause.fields : {};
      setError(fields.current_password?.[0] ?? fields.password?.[0] ?? (cause instanceof Error ? cause.message : 'Unable to change the password.'));
    } finally {setBusy(false);}
  }

  return (
    <PortalShell>
      <PageHeader title="My Account" description={`${user?.name} · ${user?.email} · ${user?.role}`} />
      <Card className="max-w-md p-6">
        <h2 className="text-base font-semibold">Change Password</h2>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {done ? <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Password updated.</div> : null}
          <label className="block text-sm font-medium text-slate-600">Current password
            <Input className="mt-1" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-600">New password
            <Input className="mt-1" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-600">Confirm new password
            <Input className="mt-1" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </label>
          <p className="text-xs text-slate-500">Minimum 8 characters with upper case, lower case and a number.</p>
          <Button disabled={busy}>{busy ? 'Saving…' : 'Update Password'}</Button>
        </form>
      </Card>
    </PortalShell>
  );
}
