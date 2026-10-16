export type EmployeeStatus = 'active' | 'inactive' | 'transferred' | 'resigned';
export type CardStatus = 'active' | 'revoked' | 'replaced';
export type Employer = {rowId: string; organization: string; designation: string; duration: string; address: string; phone: string};
export type Reference = {name: string; relation: string; contact: string};
export type Dossier = {
  fullName: string; fatherName: string; designation: string; joiningDate: string; dateOfBirth: string;
  gender: string; maritalStatus: string; dependents: number | ''; bloodGroup: string; cnic: string; cnicExpiry: string;
  residentialAddress: string; homePhone: string; mobileNumber: string; emergencyContact1: string; emergencyContact2: string;
  employers: Employer[]; primaryReference: Reference; secondaryReference: Reference;
  roleCategory: 'office' | 'motorcycle' | 'van'; vehicleRegistration: string; drivingLicence: string; tokenTaxStatus: string;
  checklist: {cnic: boolean; bloodReport: boolean; photographs: boolean; utilityBill: boolean};
  declarationAccepted: boolean; signature: string; signingDate: string;
};
export type DocumentRecord = {id: string; name: string; type: string; uploadedAt: string};
export type EmploymentEvent = {id: string; title: string; date: string; description: string};
export type Employee = {id: string; displayId: string; name: string; designation: string; department: string; phone: string; status: EmployeeStatus; photo?: string; dossier: Dossier; documents: DocumentRecord[]; history: EmploymentEvent[]; cards: IDCard[]};
export type CardPolicy = {mode:'unconfigured'|'selected_years'|'eleven_months';canIssue:boolean;canRenew:boolean;validityYears:number[];termLabel:string};
export type RequestSummary = {total:number;pending:number;approved:number;rejected:number;fieldRoles:number;activeInvitations:number};
export type RenewalPreview = {currentExpiry:string;proposedExpiry:string;option:'existing'|'new_physical';validityYears:number|null;policy:'selected_years'|'eleven_months'};
export type IDCard = {asOfDate?:string;credentialState?:'current'|'historical'|'ineligible';id: string; number: string; employeeId: string; employee: {displayId: string; name: string; designation: string; department: string; bloodGroup?: string; photo?: string}; status: CardStatus; issueDate: string; expiryDate: string; verificationToken: string; issuedBy: string};
export type EmployeeRequest = {id: string; trackingId: string; status: 'pending' | 'approved' | 'rejected'; submittedAt: string; dossier: Dossier; photo?: string; documents: DocumentRecord[]; employeeId?: string; rejectionReason?: string};
export type RegistrationInvite = {id: string; candidateName: string; designation: string; department: string; roleCategory?: Dossier['roleCategory']; expiresAt: string; status: 'valid' | 'expired' | 'used' | 'invalid'; token?: string};
export type InviteValidation = {status: RegistrationInvite['status']; invite?: RegistrationInvite};
export type Manager = {id: string; name: string; email: string; phone: string; department: string; branch: string; role: 'co-admin' | 'manager'; status: 'active' | 'inactive'};
export type Notification = {id: string; title: string; category: 'expiring' | 'expired' | 'card_activity' | 'other'; readAt: string | null; createdAt: string; target?: {type: 'employee' | 'card' | 'request'; id: string}};
export type PageResult<T> = {data: T[]; meta: {currentPage: number; lastPage: number; perPage: number; total: number}};
export type Result<T> = {data: T};
export type ListQuery = {page?: number; search?: string; status?: string; cardStatus?: string; expiry?: string; sort?: string; category?: string; role?: string};
export type EmploymentAction = {type: 'transfer'; department: string; location: string; effectiveDate: string; reason: string; notes: string} | {type: 'resign'; resignationDate: string; lastWorkingDate: string; reason: string} | {type: 'other'; title: string; date: string; description: string};
export type PublicVerification = {status: 'valid' | 'expiring' | 'expired' | 'revoked' | 'invalid'; message: string; card?: {number: string; employeeName: string; employeeDisplayId: string; designation: string; photo?: string; issueDate: string; expiryDate: string}};
export type DashboardSummary = {totalEmployees: number; activeEmployees: number; resignedEmployees: number; activeCards: number; revokedCards: number; expiringCards: number; expiredCards: number; managerCount: number; pendingRequests: number; expiring: Omit<IDCard,'verificationToken'>[]};

export function cardLabel(card: Pick<IDCard,'status'|'expiryDate'> & Partial<Pick<IDCard,'verificationToken'|'credentialState'|'asOfDate'>>, now = new Date()) {
  if (card.status === 'replaced') return 'Replaced';
  if (card.status === 'revoked') return 'Revoked';
  if (card.credentialState==='historical'||('verificationToken' in card && !card.verificationToken && card.credentialState!=='current')) return 'Historical / No QR';
  if (card.credentialState==='ineligible') return 'Ineligible';
  const days = daysToExpiry(card.expiryDate, now, card.asOfDate);
  if (days === null) return 'Unknown';
  return days < 0 ? 'Expired' : days <= 30 ? 'Expiring Soon' : 'Active';
}
export function currentCard(cards: IDCard[] = []) {
  return cards.filter(card => card.status==='active' && card.credentialState!=='historical' && card.credentialState!=='ineligible' && (card.credentialState==='current'||Boolean(card.verificationToken))).sort((a,b) => Date.parse(b.issueDate) - Date.parse(a.issueDate))[0];
}
export function latestCard(cards: IDCard[] = []) {
  return [...cards].sort((a,b) => Date.parse(b.issueDate) - Date.parse(a.issueDate))[0];
}
export function daysToExpiry(date: string, now = new Date(), asOfDate?:string) {
  const end = Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
  const today = asOfDate ? Date.parse(asOfDate+'T00:00:00Z') : Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Number.isNaN(end) ? null : Math.round((end - today) / 86400000);
}
export const displayStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
