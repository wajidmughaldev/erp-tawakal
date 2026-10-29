'use client';
import {useEffect, useState} from 'react';
import {useCardColor} from '@/lib/use-card-color';
import {useSession} from './session-provider';
import {ApiError} from '@/lib/api-client';
import {Button} from '@/components/ui/button';

/** Colour picker for the single colour shared by every ID card. Only a superadmin may change it. */
export function CardColourControl() {
  const {user} = useSession();
  const {color, defaultColor, isDefault, save, reset} = useCardColor();
  const [draft, setDraft] = useState(color);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => setDraft(color), [color]);
  const canEdit = user?.role === 'superadmin';

  async function run(action: () => Promise<void>, done: string) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {await action(); setMessage(done);}
    catch (cause) {setError(cause instanceof ApiError ? (Object.values(cause.fields)[0]?.[0] ?? cause.message) : cause instanceof Error ? cause.message : 'Unable to save the colour.');}
    finally {setBusy(false);}
  }

  return (
    <div className="no-print space-y-2">
      <div className="text-sm font-medium text-slate-600">Card colour <span className="font-normal text-slate-500">(used on every card)</span></div>
      <div className="flex flex-wrap items-center gap-3">
        <input type="color" aria-label="Card colour" value={draft} disabled={!canEdit || busy} onChange={event => setDraft(event.target.value)} className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60" />
        <code className="text-xs text-slate-600">{draft.toUpperCase()}</code>
        {canEdit && (
          <>
            <Button type="button" disabled={busy || draft.toLowerCase() === color.toLowerCase()} onClick={() => void run(() => save(draft.toLowerCase()), 'Colour applied to all cards.')}>Apply to all cards</Button>
            <Button type="button" variant="outline" disabled={busy || isDefault} onClick={() => void run(reset, 'Colour reset to the default.')}>Reset to default</Button>
          </>
        )}
      </div>
      <p className="text-xs text-slate-500">Default: {defaultColor.toUpperCase()}. {canEdit ? 'Changing it updates the colour of all cards, front and back. Print again after changing.' : 'Only a superadmin can change the card colour.'}</p>
      {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
