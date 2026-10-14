export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string[]> = {}) { super(message); }
}

const messages: Record<number, string> = {
  401: 'Your session has expired. Please sign in again.', 403: 'Access denied.',
  404: 'Record not found.', 409: 'This record has changed or the action is no longer available.',
  419: 'Your security session expired. Please sign in again.', 422: 'Please correct the highlighted fields.',
  429: 'Too many requests. Please try again later.',
};

export async function request<T>(path: string, options: RequestInit & {public?: boolean; csrf?: boolean; format?: 'json' | 'blob'} = {}): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!base) throw new ApiError(503, 'The Laravel API is not configured. Please contact the administrator.');
  const {public: isPublic, csrf, format, ...init} = options;
  const headers = new Headers(init.headers);
  headers.set('Accept', format === 'blob' ? 'application/octet-stream' : 'application/json');
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (init.method && !['GET', 'HEAD'].includes(init.method) && typeof document !== 'undefined') {
    const cookie = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='));
    if (cookie) headers.set('X-XSRF-TOKEN', decodeURIComponent(cookie.slice(11)));
  }
  let response: Response;
  try { response = await fetch(`${base}${csrf ? '' : '/api/v1'}${path}`, {...init, headers, credentials: 'include', cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(20000)}); }
  catch { throw new ApiError(503, 'Unable to reach the Laravel API. Please try again.'); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (!isPublic && [401, 419].includes(response.status) && typeof window !== 'undefined') window.dispatchEvent(new Event('portal-session-expired'));
    throw new ApiError(response.status, messages[response.status] ?? 'The server is unavailable. Please try again.', body.errors ?? {});
  }
  if (response.status === 204) return undefined as T;
  if (format === 'blob') return await response.blob() as T;
  return response.json();
}

export function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') params.set(key, String(value));
  return params.size ? `?${params}` : '';
}
