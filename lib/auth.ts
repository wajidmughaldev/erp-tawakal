import {request, ApiError} from './api-client';
export type SessionUser = {id: string; name: string; role: 'admin' | 'co-admin' | 'manager'; email: string};
export const auth = {
  async me() {const result=await request<{data:SessionUser}>('/auth/me');if(!result.data?.id || !result.data.name || !['admin','co-admin','manager'].includes(result.data.role))throw new ApiError(403,'Access denied: an administrative session is required.');return result;},
  async login(identifier: string, password: string, remember: boolean) {
    await request<void>('/sanctum/csrf-cookie', {csrf: true, public: true});
    try {await request<void>('/auth/login', {method:'POST',public:true,body:JSON.stringify({identifier,password,remember})});}
    catch(error){if(error instanceof ApiError && [401,422].includes(error.status))throw new ApiError(error.status,'Invalid email/username or password.',error.fields);throw error;}
    return auth.me();
  },
  logout: () => request<void>('/auth/logout', {method: 'POST'}),
};
