'use client';
import {useState} from 'react';
import {Dialog} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {ApiError} from '@/lib/api-client';
import {managersApi} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {DataState} from './data-state';
import type {Manager} from '@/lib/contracts';

const fields = [['name', 'Full Name'], ['email', 'Login Email'], ['phone', 'Phone'], ['department', 'Department'], ['branch', 'Branch']] as const;

/** 14 characters with upper case, lower case, a digit and a symbol, avoiding look-alike characters. */
export function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '@#$%&*?'];
  const all = sets.join('');
  const random = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  const chars = sets.map(set => set[random(set.length)]);
  while (chars.length < 14) chars.push(all[random(all.length)]);
  for (let index = chars.length - 1; index > 0; index--) {const swap = random(index + 1); [chars[index], chars[swap]] = [chars[swap], chars[index]];}
  return chars.join('');
}

export function ManagerDialog({mode, id, onClose, onSaved}: {mode: 'create' | 'edit' | 'view'; id?: string; onClose: () => void; onSaved: () => void}) {
  const state = useResource(() => id ? managersApi.get(id) : Promise.resolve(null), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [created, setCreated] = useState<{email: string; password: string}>();
  const [copied, setCopied] = useState(false);
  const record = state.data?.data;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const body = {name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), department: values.department.trim(), branch: values.branch.trim()};
    setBusy(true); setError('');
    try {
      if (mode === 'create') {
        const result = await managersApi.create({...body, initialPassword: password});
        if (!result.data?.id) throw new Error('The server did not confirm an account identifier.');
        setCreated({email: result.data.email, password});
        setPassword('');
      } else {
        const result = await managersApi.update(id!, {...body, status: values.status as Manager['status']});
        if (!result.data?.id) throw new Error('The server did not confirm the update.');
        onSaved();
      }
    } catch (cause) {
      const first = cause instanceof ApiError ? Object.values(cause.fields)[0]?.[0] : undefined;
      setError(first ?? (cause instanceof Error ? cause.message : 'Unable to save manager.'));
    } finally {setBusy(false);}
  }

  async function copy() {
    if (!created) return;
    try {await navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`); setCopied(true);}
    catch {setError('Clipboard access failed. Select and copy the details above.');}
  }

  if (created) {
    return (
      <Dialog open title="Manager Account Created" onClose={() => {}}>
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">Give these login details to the manager. <b>The password is shown only now</b> and cannot be viewed again. If it is lost, the manager can use &ldquo;Forgot password&rdquo; on the login page.</p>
          <div className="rounded border bg-slate-50 p-3 font-mono text-xs"><div>Email: {created.email}</div><div>Password: {created.password}</div></div>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy details'}</Button>
            <Button type="button" onClick={() => {setCreated(undefined); onSaved();}}>Done</Button>
          </div>
          {error && <p role="alert" className="text-red-600">{error}</p>}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open title={mode === 'create' ? 'Add Manager' : mode === 'edit' ? 'Edit Manager' : 'View Manager'} onClose={() => {if (!busy) {setPassword(''); onClose();}}}>
      <DataState {...state} retry={state.refetch} />
      {(mode === 'create' || record) && (
        <form onSubmit={submit} className="space-y-4" key={record?.id ?? 'new'}>
          {fields.map(([key, label]) => (
            <label key={key} className="block text-xs font-medium">{label}
              <input disabled={mode === 'view' || busy} required name={key} type={key === 'email' ? 'email' : 'text'} defaultValue={record?.[key] ?? ''} className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-xs" />
            </label>
          ))}
          <p className="text-xs text-slate-600">Role: Manager</p>
          {mode !== 'create' && (
            <label className="block text-xs">Status
              <select name="status" disabled={mode === 'view' || busy} defaultValue={record?.status ?? 'active'} className="mt-2 h-9 w-full rounded border px-3">
                <option value="active">Active</option>
                <option value="inactive">Inactive (cannot sign in)</option>
              </select>
            </label>
          )}
          {mode === 'create' && (
            <label className="block text-xs">Initial Password
              <div className="mt-2 flex">
                <input disabled={busy} aria-label="Initial Password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} className="h-9 min-w-0 flex-1 rounded-l border px-3 font-mono" />
                <button type="button" disabled={busy} onClick={() => setPassword(generatePassword())} className="rounded-r border px-3">Generate</button>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Type a password or press Generate. At least 8 characters with upper case, lower case and a number. It is shown once after the account is created.</p>
            </label>
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {mode !== 'view' && <Button disabled={busy}>{busy ? 'Saving…' : mode === 'create' ? 'Create Manager Account' : 'Save Changes'}</Button>}
        </form>
      )}
    </Dialog>
  );
}
