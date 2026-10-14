export function DataState({loading, error, empty, retry}: {loading?: boolean; error?: string; empty?: boolean; retry?: () => void}) {
  if (!loading && !error && !empty) return null;
  return <div role={error ? 'alert' : 'status'} className="my-4 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">{loading ? 'Loading…' : error || 'No records found.'}{error && retry && <button type="button" onClick={retry} className="ml-3 text-blue-700">Retry</button>}</div>;
}
