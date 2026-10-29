import {request, queryString} from './api-client';
import type {Employee, IDCard, EmployeeRequest, RegistrationInvite, InviteValidation, Manager, Notification, ListQuery, PageResult, Result, Dossier, EmploymentAction, PublicVerification, DashboardSummary, DocumentRecord, CardPolicy, RequestSummary, RenewalPreview, CardColor} from './contracts';
const key = encodeURIComponent;
const json = (body: unknown, method = 'POST') => ({method, body: JSON.stringify(body)});
function resource<T>(path: string) {
  return {list: (query: ListQuery = {}) => request<PageResult<T>>(path + queryString(query)), get: (id: string) => request<Result<T>>(`${path}/${key(id)}`)};
}
export function dossierBody(dossier: Dossier, photo?: File, edit = false) {
  const body = new FormData();
  body.set('dossier', JSON.stringify({...dossier, employers: dossier.employers.filter(row => [row.organization, row.designation, row.duration, row.address, row.phone].some(value => value.trim())), ...(dossier.roleCategory === 'office' ? {vehicleRegistration: '', drivingLicence: '', tokenTaxStatus: ''} : {})}));
  if (photo) body.set('photo', photo);
  if (edit) body.set('_method', 'PATCH');
  return body;
}
export const employeesApi = {
  ...resource<Employee>('/employees'),
  get: async (id: string) => {
    let etag: string | undefined;
    const result=await request<Result<Employee>>('/employees/'+key(id),{onResponse:headers=>{etag=headers.get('ETag')??undefined;}});
    return {...result,etag};
  },
  create: (dossier: Dossier, photo?: File) => request<Result<Employee>>('/employees', {method: 'POST', body: dossierBody(dossier, photo)}),
  update: (id: string, dossier: Dossier, photo?: File, etag?: string) => request<Result<Employee>>(`/employees/${key(id)}`, {method:'POST',headers:etag?{'If-Match':etag}:{},body:dossierBody(dossier,photo,true)}),
  action: (id: string, action: EmploymentAction) => request<Result<Employee>>(`/employees/${key(id)}/actions`, json(action)),
  documents: (id: string) => request<Result<DocumentRecord[]>>(`/employees/${key(id)}/documents`),
  remove: (id: string) => request<void>(`/employees/${key(id)}`, {method: 'DELETE'}),
  checkCnic: (cnic: string, exceptEmployeeId?: string) => request<{registered: boolean}>('/employees/check-cnic', json({cnic, exceptEmployeeId: exceptEmployeeId ? Number(exceptEmployeeId) : undefined})),
  uploadDocument: (id: string, type: string, file: File) => {
    const body = new FormData();
    body.set('type', type);
    body.set('file', file);
    return request<Result<DocumentRecord>>(`/employees/${key(id)}/documents`, {method: 'POST', body});
  },
  deleteDocument: (documentId: string) => request<void>(`/documents/${key(documentId)}`, {method: 'DELETE'}),
};
export const requestsApi = {
  ...resource<EmployeeRequest>('/employee-requests'),
  summary: () => request<Result<RequestSummary>>('/employee-requests/summary'),
  submit: (token: string, dossier: Dossier, photo?: File, documents: {type: string; file: File}[] = []) => {
    const body = dossierBody(dossier, photo);
    body.set('token', token);
    documents.forEach((document, index) => {body.set(`documents[${index}][type]`, document.type); body.set(`documents[${index}][file]`, document.file);});
    return request<Result<EmployeeRequest>>('/employee-requests', {method: 'POST', body, public: true});
  },
  approve: (id: string) => request<Result<EmployeeRequest>>(`/employee-requests/${key(id)}/approve`, json({})),
  reject: (id: string, reason: string) => request<Result<EmployeeRequest>>(`/employee-requests/${key(id)}/reject`, json({reason})),
};
export const invitesApi = {
  list: (query:ListQuery={})=>request<PageResult<RegistrationInvite>>('/registration-invites'+queryString(query)),
  validate: (token: string) => request<InviteValidation>('/registration-invites/validate', {...json({token}), public: true}),
  // A link needs no candidate details and is valid for 24 hours.
  create: () => request<Result<RegistrationInvite>>('/registration-invites', json({})),
  checkCnic: (token: string, cnic: string) => request<{registered: boolean}>('/registration-invites/check-cnic', {...json({token, cnic}), public: true}),
};
export const cardsApi = {
  ...resource<IDCard>('/id-cards'),
  get: async(id:string)=>{let etag:string|undefined;const result=await request<Result<IDCard>>('/id-cards/'+key(id),{onResponse:headers=>{etag=headers.get('ETag')??undefined;}});return {...result,etag};},
  preview: async(id:string,option:'existing'|'new_physical')=>{let etag:string|undefined;const result=await request<Result<RenewalPreview>>(`/id-cards/${key(id)}/renewal-preview`+queryString({option}),{onResponse:headers=>{etag=headers.get('ETag')??undefined;}});return {...result,etag};},
  policy: () => request<Result<CardPolicy>>('/id-cards/policy'),
  issue: (employeeId: string, validityYears?: number) => request<Result<IDCard>>('/id-cards', json({employeeId, validityYears})),
  eligibleEmployees: () => request<Result<{id: string; displayId: string; name: string; designation: string}[]>>('/id-cards/eligible-employees'),
  renew: (id:string,option:'existing'|'new_physical',idempotencyKey:string,etag:string) => request<Result<IDCard>>(`/id-cards/${key(id)}/renew`, {...json({option}),headers:{'Idempotency-Key':idempotencyKey,'If-Match':etag}}),
  reissue: (id: string, reason: string, acknowledged: boolean) => request<Result<IDCard>>(`/id-cards/${key(id)}/reissue`, json({reason, acknowledged})),
  deactivate: (id: string, reason: string) => request<Result<IDCard>>(`/id-cards/${key(id)}/deactivate`, json({reason})),
  verify: (token: string) => request<PublicVerification>('/verify-card', {...json({token}), public: true}),
};
export const cardSettingsApi = {
  get: () => request<Result<CardColor>>('/id-cards/settings'),
  update: (color: string) => request<Result<CardColor>>('/id-cards/settings', json({color}, 'PUT')),
  reset: () => request<Result<CardColor>>('/id-cards/settings', {method: 'DELETE'}),
};
export const managersApi = {
  ...resource<Manager>('/managers'),
  create: (body: Omit<Manager, 'id' | 'role' | 'status' | 'createdAt'> & {initialPassword: string}) => request<Result<Manager>>('/managers', json(body)),
  update: (id: string, body: Omit<Manager, 'id' | 'role' | 'createdAt'>) => request<Result<Manager>>(`/managers/${key(id)}`, json(body, 'PATCH')),
};
export const notificationsApi = {
  ...resource<Notification>('/notifications'),
  readAll: () => request<void>('/notifications/read-all', json({})),
};
export const dashboardApi = () => request<Result<DashboardSummary>>('/dashboard/summary');
export const downloadDocument = (id: string) => request<Blob>(`/documents/${key(id)}/download`, {format:'blob'});
export const downloadCandidateDocument = (id: string) => request<Blob>(`/candidate-documents/${key(id)}/download`, {format:'blob'});
