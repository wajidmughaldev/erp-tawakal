'use client';
import {useState} from 'react';
import {Dialog} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {ApiError} from '@/lib/api-client';
import {employeesApi} from '@/lib/services';
import {workingStatuses} from '@/lib/contracts';
import type {Employee, EmploymentAction} from '@/lib/contracts';

type ActionType = 'transfer' | 'resign' | 'other';
const fieldSets: Record<ActionType, [string, string, boolean][]> = {
  transfer: [['department', 'Target Department', true], ['location', 'Target Location', true], ['effectiveDate', 'Effective Date', true], ['reason', 'Reason', true], ['notes', 'Notes', false]],
  resign: [['resignationDate', 'Resignation Date', true], ['lastWorkingDate', 'Last Working Date', true], ['reason', 'Reason', true]],
  other: [['title', 'Action Title', true], ['date', 'Date', true], ['description', 'Description', true]],
};
const warnings: Partial<Record<ActionType, string>> = {
  transfer: 'The employee status will change to Transferred. Their ID card stays active.',
  resign: 'The employee status will change to Resigned and their ID card will be revoked immediately.',
};

export function EmploymentActionDialog({employee, onClose, onChanged}: {employee: Employee; onClose: () => void; onChanged: () => void}) {
  const active = workingStatuses.includes(employee.status);
  const [type, setType] = useState<ActionType>(active ? 'transfer' : 'other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    if (type === 'resign' && values.lastWorkingDate < values.resignationDate) {setError('Last working date cannot be before resignation date.'); return;}
    if (!window.confirm(`Confirm ${type} action for ${employee.name}?`)) return;
    setBusy(true); setError('');
    try {
      const result = await employeesApi.action(employee.id, {type, ...values} as EmploymentAction);
      if (!result.data?.id) throw new Error('The server did not confirm the action.');
      onChanged();
    } catch (cause) {
      const first = cause instanceof ApiError ? Object.values(cause.fields)[0]?.[0] : undefined;
      setError(first ?? (cause instanceof Error ? cause.message : 'Unable to record action.'));
    } finally {setBusy(false);}
  }

  return (
    <Dialog open title="Employment Action" onClose={() => {if (!busy) onClose();}}>
      <form className="space-y-4" onSubmit={submit} key={type}>
        <label className="block text-xs">Action
          <select className="mt-2 h-10 w-full rounded border px-3" value={type} onChange={event => {setType(event.target.value as ActionType); setError('');}}>
            {active && <option value="transfer">Transfer</option>}
            {active && <option value="resign">Resign</option>}
            <option value="other">Other Employment Action</option>
          </select>
        </label>
        {!active && <p className="text-xs text-slate-500">This employee is {employee.status}; only other actions can be recorded.</p>}
        {fieldSets[type].map(([key, label, required]) => (
          <label key={key} className="block text-xs">{label}
            {key === 'reason' || key === 'notes' || key === 'description'
              ? <textarea name={key} required={required} maxLength={2000} rows={3} className="mt-2 w-full rounded border px-3 py-2" />
              : <input name={key} required={required} maxLength={160} type={key.toLowerCase().includes('date') ? 'date' : 'text'} className="mt-2 h-10 w-full rounded border px-3" />}
          </label>
        ))}
        {warnings[type] && <p className="text-xs text-amber-700">{warnings[type]}</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button disabled={busy}>{busy ? 'Saving…' : 'Confirm Action'}</Button>
      </form>
    </Dialog>
  );
}
