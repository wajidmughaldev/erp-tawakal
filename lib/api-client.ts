export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string[]> = {}) { super(message); }
}
const messages: Record<number, string> = {
  401: 'Your session has expired. Please sign in again.', 403: 'Access denied.',
  404: 'Record not found.', 409: 'This record has changed or the action is no longer available.',
  412: 'This employee was changed elsewhere. Reload the latest record before saving again.',
  428: 'The employee revision is missing. Reload the latest record before saving.',
  419: 'Your security session expired. Review your changes and try again.', 422: 'Please correct the highlighted fields.',
  429: 'Too many requests. Please try again later.',
};
function baseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!base) throw new ApiError(503, 'The Laravel API is not configured. Please contact the administrator.');
  return base;
}
function csrfCookie() {
  if (typeof document === 'undefined') return '';
  const cookie = document.cookie.split(/;\s*/).find(value => value.startsWith('XSRF-TOKEN='));
  try { return cookie ? decodeURIComponent(cookie.slice(11)) : ''; } catch { return ''; }
}
let csrfInitialization: Promise<void> | undefined;
export async function ensureCsrf(force = false): Promise<void> {
  if (!force && csrfCookie()) return;
  if (!csrfInitialization) {
    csrfInitialization = (async () => {
      let response: Response;
      try { response = await fetch(baseUrl()+'/sanctum/csrf-cookie', {credentials:'include',cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)}); }
      catch { throw new ApiError(503,'Unable to initialize the security session. Reload and try again.'); }
      if (!response.ok) throw new ApiError(response.status,'Unable to initialize the security session. Reload and try again.');
    })().finally(() => {csrfInitialization=undefined;});
  }
  return csrfInitialization;
}
export async function request<T>(path: string, options: RequestInit & {public?: boolean; csrf?: boolean; format?: 'json' | 'blob'; onResponse?: (headers: Headers) => void} = {}): Promise<T> {
  const base=baseUrl();
  const {public: isPublic, csrf, format, onResponse, ...init} = options;
  const mutation=!!init.method && !['GET','HEAD','OPTIONS'].includes(init.method.toUpperCase());
  if (isPublic && mutation && !csrf && typeof document !== 'undefined') await ensureCsrf();
  const headers = new Headers(init.headers);
  headers.set('Accept', format === 'blob' ? 'application/octet-stream' : 'application/json');
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token=csrfCookie();
  if (mutation && token) headers.set('X-XSRF-TOKEN',token);
  let response: Response;
  try { response = await fetch(base+(csrf ? '' : '/api/v1')+path, {...init, headers, credentials:'include',cache:'no-store',signal:init.signal??AbortSignal.timeout(20000)}); }
  catch { throw new ApiError(503, 'Unable to reach the Laravel API. The result may be unknown; check the record before trying again.'); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // Refresh security state after an explicit 419, but never replay the mutation automatically.
    if (response.status===419 && isPublic && typeof document!=='undefined') await ensureCsrf(true);
    if (!isPublic && [401,419].includes(response.status) && typeof window!=='undefined') window.dispatchEvent(new Event('portal-session-expired'));
    throw new ApiError(response.status,messages[response.status]??'The server is unavailable. Please try again.',body.errors??{});
  }
  onResponse?.(response.headers);
  if (response.status===204) return undefined as T;
  if (format==='blob') return await response.blob() as T;
  return response.json();
}
export function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') params.set(key, String(value));
  return params.size ? '?'+params : '';
}
