import {request} from './api-client';
export type SessionUser = {id: string; name: string; role: 'admin' | 'co-admin' | 'manager'; email: string};
export const auth = {
  me: () => request<{data: SessionUser}>('/auth/me'),
  async login(identifier: string, password: string, remember: boolean) {
    await request<void>('/sanctum/csrf-cookie', {csrf: true, public: true});
    await request<void>('/auth/login', {method: 'POST', public: true, body: JSON.stringify({identifier, password, remember})});
    return auth.me();
  },
  logout: () => request<void>('/auth/logout', {method: 'POST'}),
};
