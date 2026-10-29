'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Dialog} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {requestsApi, invitesApi, downloadCandidateDocument} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {documentTypeLabel} from '@/lib/dossier';
import {openDocument} from '@/lib/open-document';
import {DataState} from './data-state';
import {DossierReview} from './dossier-review';
import type {EmployeeRequest} from '@/lib/contracts';

export function RequestReview({id, onClose, onChanged}: {id: string; onClose: () => void; onChanged: () => void}) {
  const state = useResource(() => requestsApi.get(id), [id]);
  const [updated, setUpdated] = useState<EmployeeRequest>();
  const record = updated ?? state.data?.data;
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState('');
  const [error, setError] = useState('');

  async function transition(approve: boolean) {
    if (busy || record?.status !== 'pending') return;
    if (!approve && !reason.trim()) {setError('Enter a rejection reason.'); return;}
    if (approve && !window.confirm('Approve and enroll this candidate?')) return;
    setBusy(true); setError('');
    try {
      const result = approve ? await requestsApi.approve(id) : await requestsApi.reject(id, reason.trim());
      if (!result.data?.id || (approve && !result.data.employeeId)) throw new Error('The server did not confirm the transition.');
      setUpdated(result.data); onChanged();
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to update request.');}
    finally {setBusy(false);}
  }

  async function open(documentId: string, name: string, download: boolean) {
    if (openingId) return;
    setOpeningId(documentId); setError('');
    try {await openDocument(() => downloadCandidateDocument(documentId), name, download);}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to open document.');}
    finally {setOpeningId('');}
  }

  return (
    <Dialog open title="Review Enrollment Request" onClose={() => {if (!busy) onClose();}} className="max-w-3xl">
      <DataState {...state} retry={state.refetch} />
      {record && (
        <>
          <div className="mb-3 flex justify-between text-sm"><span>{record.trackingId}</span><strong>{record.status}</strong></div>
          {record.photo && <img src={record.photo} alt="Candidate photograph" className="mb-3 size-24 rounded-md object-cover" />}
          <DossierReview data={record.dossier} />
          <section className="my-3 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold text-[#123b6d]">Uploaded Documents</h2>
            {record.documents?.length ? (
              <ul className="space-y-2">
                {record.documents.map(document => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 p-2 text-xs">
                    <span className="break-all"><b>{documentTypeLabel(document.type)}</b> · {document.name}</span>
                    <span className="flex gap-2">
                      <button type="button" disabled={Boolean(openingId)} onClick={() => void open(document.id, document.name, false)} className="rounded border px-3 py-1">View</button>
                      <button type="button" disabled={Boolean(openingId)} onClick={() => void open(document.id, document.name, true)} className="rounded border px-3 py-1">Download</button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-slate-500">No documents were uploaded.</p>}
          </section>
          {record.status === 'pending' && (
            <div className="mt-4 space-y-3">
              {rejecting && <label className="block text-sm">Rejection reason<textarea className="mt-1 w-full rounded border p-2" value={reason} onChange={event => setReason(event.target.value)} /></label>}
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => void transition(true)}>Approve and Enroll</Button>
                <Button variant="danger" disabled={busy} onClick={() => rejecting ? void transition(false) : setRejecting(true)}>{rejecting ? 'Confirm Rejection' : 'Reject'}</Button>
              </div>
            </div>
          )}
          {record.employeeId && (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span>Approved Employee ID: {record.employeeId}</span>
              <Link className="text-blue-700" href={'/employees/view?id=' + encodeURIComponent(record.employeeId)}>View Employee</Link>
              <Link className="text-blue-700" href={'/generate-id-card?employee=' + encodeURIComponent(record.employeeId)}>Generate ID Card</Link>
            </div>
          )}
          {record.rejectionReason && <p className="mt-3 text-sm">Rejection reason: {record.rejectionReason}</p>}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Dialog>
  );
}

export function InviteDialog({onClose, onCreated}: {onClose: () => void; onCreated: () => void}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');

  async function generate() {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await invitesApi.create();
      if (!result.data?.id || !result.data.token) throw new Error('The server did not issue an invitation token.');
      setLink(window.location.origin + '/employee-registration?token=' + encodeURIComponent(result.data.token));
      onCreated();
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to generate invitation.');}
    finally {setBusy(false);}
  }
  async function copy() {
    try {await navigator.clipboard.writeText(link); setMessage('Link copied.');}
    catch {setError('Clipboard access failed. Select and copy the link below.');}
  }

  return (
    <Dialog open title="Generate Registration Link" onClose={() => {if (!busy) onClose();}}>
      {!link && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Creates a one-time link for a candidate to fill in the registration form. The link is valid for 24 hours and can be used once. Copy it and send it to the candidate yourself.</p>
          <Button disabled={busy} onClick={() => void generate()}>{busy ? 'Generating…' : 'Generate Registration Link'}</Button>
        </div>
      )}
      {link && (
        <div className="space-y-2">
          <input aria-label="Registration link" readOnly value={link} onFocus={event => event.currentTarget.select()} className="w-full rounded border p-2 text-xs" />
          <Button variant="outline" onClick={() => void copy()}>Copy Link</Button>
          <p className="text-xs text-slate-500">Valid for 24 hours. It stops working after the candidate submits the form.</p>
        </div>
      )}
      {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Dialog>
  );
}
