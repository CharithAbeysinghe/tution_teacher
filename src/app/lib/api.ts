const BASE = (import.meta as any).env?.VITE_API_BASE ?? '';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(opts.headers || {}) },
  });
  let payload: any = null;
  try { payload = await res.json(); } catch {}
  if (!res.ok) {
    const err: any = new Error(payload?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = payload?.errors;
    throw err;
  }
  return payload as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => request<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
  upload: <T>(p: string, form: FormData) => request<T>(p, { method: 'POST', body: form }),
};
