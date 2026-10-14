export type EmployeeStatus = 'Active' | 'Inactive' | 'Resigned';
export type CardStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Revoked';

export type Employee = {
  id: string;
  name: string;
  nameUrdu?: string;
  fatherName: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  nic: string;
  bloodGroup: string;
  joiningDate: string;
  status: EmployeeStatus;
  cardNumber?: string;
  cardStatus?: CardStatus;
  cardExpiry?: string;
  daysToExpiry?: number;
  photo: string;
};

export type IdCard = {
  card: string;
  empId: string;
  empName: string;
  designation: string;
  department: string;
  company: string;
  bloodGroup: string;
  nic: string;
  photo: string;
  issueDate: string;
  expiryDate: string;
  daysToExpiry: number;
  status: CardStatus;
  qrStatus: 'Active' | 'Deactivated';
  issuedBy: string;
  token: string;
  securityHash: string;
};

export type Manager = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  branch: string;
  role: string;
  status: 'Active' | 'Inactive';
};

export const employees: Employee[] = [
  {
    id: 'EMP-00123',
    name: 'Muhammad Ali Khan',
    nameUrdu: 'محمد علی خان',
    fatherName: 'Abdul Kareem Khan',
    designation: 'Medical Sales Representative',
    department: 'Field Sales',
    phone: '+92 300 1122334',
    email: 'm.ali@tawakkal.com',
    nic: '42101-1234567-1',
    bloodGroup: 'B+',
    joiningDate: '2026-01-14',
    status: 'Active',
    cardNumber: 'CARD-00421',
    cardStatus: 'Active',
    cardExpiry: '14 Aug 2027',
    daysToExpiry: 310,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces',
  },
  {
    id: 'EMP-00124',
    name: 'Sana Javed',
    fatherName: 'Javed Iqbal',
    designation: 'Quality Control Assistant',
    department: 'Quality Assurance',
    phone: '+92 313 1234567',
    email: 'sana.qc@tawakkal.com',
    nic: '42101-9876543-2',
    bloodGroup: 'O+',
    joiningDate: '2026-02-02',
    status: 'Active',
    cardNumber: 'CARD-00403',
    cardStatus: 'Expiring Soon',
    cardExpiry: '31 Oct 2026',
    daysToExpiry: 23,
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=faces',
  },
  {
    id: 'EMP-00125',
    name: 'Zubair Ahmed Qureshi',
    fatherName: 'Abdul Rasheed Qureshi',
    designation: 'Delivery Van Driver',
    department: 'Logistics & Distribution',
    phone: '+92 300 9876543',
    email: 'zubair.delivery@tawakkal.com',
    nic: '42101-7654321-3',
    bloodGroup: 'B+',
    joiningDate: '2026-03-18',
    status: 'Active',
    cardNumber: 'CARD-00360',
    cardStatus: 'Expired',
    cardExpiry: '15 Sep 2026',
    daysToExpiry: -23,
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=faces',
  },
  {
    id: 'EMP-00126',
    name: 'Kamran Shahzad',
    fatherName: 'Rafiq Shahzad',
    designation: 'Warehouse Supervisor',
    department: 'Warehousing',
    phone: '+92 321 9988776',
    email: 'kamran.wh@tawakkal.com',
    nic: '42101-1112223-4',
    bloodGroup: 'A+',
    joiningDate: '2025-11-21',
    status: 'Resigned',
    cardNumber: 'CARD-00375',
    cardStatus: 'Revoked',
    cardExpiry: '22 Jan 2027',
    daysToExpiry: 106,
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=faces',
  },
  {
    id: 'EMP-00127',
    name: 'Fatima Noor',
    fatherName: 'Muhammad Tariq Noor',
    designation: 'Inventory Coordinator',
    department: 'Operations',
    phone: '+92 345 6789012',
    email: 'fatima.ops@tawakkal.com',
    nic: '42101-4445556-7',
    bloodGroup: 'AB+',
    joiningDate: '2026-04-09',
    status: 'Active',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=faces',
  },
];

export const cards: IdCard[] = employees
  .filter((employee): employee is Employee & {cardNumber: string; cardStatus: CardStatus; cardExpiry: string; daysToExpiry: number} => Boolean(employee.cardNumber))
  .map((employee, index) => ({
    card: employee.cardNumber,
    empId: employee.id,
    empName: employee.name,
    designation: employee.designation,
    department: employee.department,
    company: 'Tawakkal Enterprises',
    bloodGroup: employee.bloodGroup,
    nic: employee.nic,
    photo: employee.photo,
    issueDate: ['14 Sep 2026', '01 Nov 2025', '12 Sep 2025', '08 Jan 2026'][index] ?? '14 Sep 2026',
    expiryDate: employee.cardExpiry,
    daysToExpiry: employee.daysToExpiry,
    status: employee.cardStatus,
    qrStatus: employee.cardStatus === 'Revoked' ? 'Deactivated' : 'Active',
    issuedBy: 'Noman (System Admin)',
    token: `${employee.cardNumber}-${employee.id}`,
    securityHash: `sha256-${employee.cardNumber.toLowerCase().replace('-', '')}...102a`,
  }));

export const managers: Manager[] = [
  {
    id: 'MGR-001',
    name: 'Bilal Tariq',
    email: 'manager@example.com',
    phone: '+92 300 4567890',
    department: 'Field Sales & Distribution',
    branch: 'Hyderabad Central Branch',
    role: 'Branch Manager',
    status: 'Active',
  },
  {
    id: 'MGR-002',
    name: 'Ayesha Siddiqui',
    email: 'ayesha.ops@tawakkal.com',
    phone: '+92 321 9876543',
    department: 'Logistics & Warehousing',
    branch: 'Latifabad Distribution Hub',
    role: 'Operations Manager',
    status: 'Active',
  },
];

export const notifications = [
  {title: 'CARD-00398 expires in 5 days', tone: 'warning'},
  {title: 'EMP-00128 transferred to Facility B', tone: 'info'},
  {title: 'CARD-00405 expired yesterday', tone: 'danger'},
  {title: 'New candidate invitation submitted', tone: 'success'},
] as const;

export function verifyCredential(query: string) {
  const clean = query.trim().toUpperCase();
  const direct: Record<string, string> = {
    VALID: 'CARD-00421',
    ACTIVE: 'CARD-00421',
    EXPIRED: 'CARD-00360',
    REVOKED: 'CARD-00375',
    DEACTIVATED: 'CARD-00375',
  };

  if (clean === 'INVALID' || clean === 'FAKE' || clean === 'FORGED') {
    return {success: false, verificationStatus: 'invalid', card: null, message: 'Invalid Credential Code - No Official Record Found'};
  }

  const lookup = direct[clean] ?? clean;
  const card = cards.find((item) => item.card.toUpperCase() === lookup || item.empId.toUpperCase() === lookup || item.token.toUpperCase() === lookup || item.nic.replace(/\D/g, '') === lookup.replace(/\D/g, ''));

  if (!card) {
    return {success: false, verificationStatus: 'invalid', card: null, message: 'Invalid Credential Code - No matching official record in Tawakkal Enterprises Registry.'};
  }

  const verificationStatus = card.status === 'Expired' ? 'expired' : card.status === 'Revoked' ? 'revoked' : card.status === 'Expiring Soon' ? 'expiring' : 'valid';
  const message =
    verificationStatus === 'valid'
      ? 'Official Identification Credential Verified and Active'
      : verificationStatus === 'expiring'
        ? 'Official Credential Active (Expiring Soon)'
        : verificationStatus === 'expired'
          ? 'Credential Expired - Renewal Required'
          : 'Credential Revoked / Deactivated';

  return {success: true, verificationStatus, card, message};
}

export function badgeTone(status: string) {
  if (['Active', 'valid'].includes(status)) return 'success';
  if (['Expiring Soon', 'expiring', 'Pending Review'].includes(status)) return 'warning';
  if (['Expired', 'Revoked', 'Resigned', 'invalid', 'revoked'].includes(status)) return 'danger';
  return 'default';
}
