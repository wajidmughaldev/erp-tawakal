'use client';
import {useRef, useState} from 'react';
import {employeesApi, downloadDocument} from '@/lib/services';
import {useResource} from '@/lib/use-resource';
import {documentTypes, documentTypeLabel, validateDocument, DOCUMENT_ACCEPT} from '@/lib/dossier';
import {ApiError} from '@/lib/api-client';
import {openDocument} from '@/lib/open-document';
import {DataState} from './data-state';

export function DocumentList({employeeId}: {employeeId: string}) {
  const state = useResource(() => employeesApi.documents(employeeId), [employeeId]);
  const documents = state.data?.data ?? [];
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [type, setType] = useState<string>(documentTypes[0].value);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function open(id: string, name: string, download: boolean) {
    if (busy) return;
    setBusy(id); setError('');
    try {await openDocument(() => downloadDocument(id), name, download);}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to open document.');}
    finally {setBusy('');}
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    const files = Array.from(input.current?.files ?? []);
    setError(''); setUploadMessage('');
    if (!files.length) {setError('Choose at least one file.'); return;}
    for (const file of files) {
      const message = validateDocument(file);
      if (message) {setError(`${file.name}: ${message}`); return;}
    }
    setUploading(true);
    const failures: string[] = [];
    let uploaded = 0;
    for (const file of files) {
      try {await employeesApi.uploadDocument(employeeId, type, file); uploaded++;}
      catch (cause) {failures.push(`${file.name}: ${cause instanceof ApiError ? (Object.values(cause.fields)[0]?.[0] ?? cause.message) : 'upload failed'}`);}
    }
    if (input.current) input.current.value = '';
    setUploading(false);
    if (failures.length) setError(failures.join(' '));
    if (uploaded) {setUploadMessage(`${uploaded} document(s) uploaded.`); state.refetch();}
  }

  async function remove(id: string, name: string) {
    if (busy || !window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setBusy(id); setError('');
    try {await employeesApi.deleteDocument(id); state.refetch();}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to delete the document.');}
    finally {setBusy('');}
  }

  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b p-4 text-xs font-semibold text-[#123b6d]">Employee Documents</h2>

      <div className="grid gap-2 border-b p-4 sm:grid-cols-2 xl:grid-cols-4">
        {documentTypes.filter(item => item.required).map(item => {
          const count = documents.filter(document => document.type === item.value).length;
          return (
            <div key={item.value} className={`rounded-md border p-3 text-[11px] ${count ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              <div className="font-semibold">{item.label}</div>
              <div className="mt-1">{count ? `✔ ${count} uploaded` : 'Missing'}</div>
            </div>
          );
        })}
      </div>

      <form onSubmit={event => void upload(event)} className="flex flex-wrap items-end gap-3 border-b p-4">
        <label className="text-[11px] font-medium">Document type
          <select value={type} onChange={event => setType(event.target.value)} className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-xs">
            {documentTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-medium">File(s)
          <input ref={input} type="file" multiple accept={DOCUMENT_ACCEPT} className="mt-1 block text-xs" />
        </label>
        <button disabled={uploading} className="h-9 rounded-md bg-[#123b6d] px-4 text-xs font-medium text-white disabled:opacity-50">{uploading ? 'Uploading…' : 'Upload'}</button>
        <p className="w-full text-[10px] text-slate-500">PDF, JPG, PNG or WEBP only, up to 5 MB per file.</p>
      </form>

      <DataState {...state} retry={state.refetch} empty={!state.loading && !documents.length} />
      {error && <p role="alert" className="p-4 text-sm text-red-600">{error}</p>}
      {uploadMessage && <p role="status" className="px-4 pt-4 text-sm text-emerald-700">{uploadMessage}</p>}
      <div className="grid gap-3 p-4 xl:grid-cols-2">
        {documents.map(document => (
          <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-slate-50 p-4">
            <div>
              <h3 className="break-all text-xs font-semibold">{document.name}</h3>
              <p className="mt-1 text-[10px] text-slate-600">{documentTypeLabel(document.type)} · Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <button disabled={Boolean(busy)} onClick={() => void open(document.id, document.name, false)} className="rounded border px-3 py-2 text-xs">View</button>
              <button disabled={Boolean(busy)} onClick={() => void open(document.id, document.name, true)} className="rounded border px-3 py-2 text-xs">Download</button>
              <button disabled={Boolean(busy)} onClick={() => void remove(document.id, document.name)} className="rounded border border-red-300 px-3 py-2 text-xs text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
