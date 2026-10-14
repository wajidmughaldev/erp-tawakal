import type {PageResult} from '@/lib/contracts';
export function Pagination({meta, onPage}: {meta?: PageResult<unknown>['meta']; onPage: (page: number) => void}) {
  if (!meta) return null;
  const start = meta.total ? (meta.currentPage - 1) * meta.perPage + 1 : 0;
  return <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 text-xs"><span>Showing {start} to {Math.min(meta.currentPage * meta.perPage, meta.total)} of {meta.total} entries</span><div className="flex gap-2"><button type="button" disabled={meta.currentPage <= 1} onClick={() => onPage(meta.currentPage - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><span className="px-2 py-2">{meta.currentPage} / {Math.max(1, meta.lastPage)}</span><button type="button" disabled={meta.currentPage >= meta.lastPage} onClick={() => onPage(meta.currentPage + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div></div>;
}
