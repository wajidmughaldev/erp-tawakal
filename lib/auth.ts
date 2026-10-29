import {request, ApiError} from './api-client';
export const roles = ['superadmin', 'manager'] as const;
export type SessionUser = {id: string; name: string; role: typeof roles[number]; email: string};
export const auth = {
  async me() {const result=await request<{data:SessionUser}>('/auth/me');if(!result.data?.id || !result.data.name || !(roles as readonly string[]).includes(result.data.role))throw new ApiError(403,'Access denied: an administrative session is required.');return result;},
  async login(email: string, password: string, remember: boolean) {
    await request<void>('/sanctum/csrf-cookie', {csrf: true, public: true});
    try {await request<void>('/auth/login', {method:'POST',public:true,body:JSON.stringify({email,password,remember})});}
    catch(error){if(error instanceof ApiError && [401,422].includes(error.status))throw new ApiError(error.status,'Invalid email or password.',error.fields);throw error;}
    return auth.me();
  },
  logout: () => request<void>('/auth/logout', {method: 'POST'}),
  forgotPassword: (email: string) => request<void>('/auth/forgot-password', {method:'POST',public:true,body:JSON.stringify({email})}),
  resetPassword: (body: {token: string; email: string; password: string; password_confirmation: string}) => request<void>('/auth/reset-password', {method:'POST',public:true,body:JSON.stringify(body)}),
  changePassword: (body: {current_password: string; password: string; password_confirmation: string}) => request<void>('/auth/change-password', {method:'POST',body:JSON.stringify(body)}),
};
