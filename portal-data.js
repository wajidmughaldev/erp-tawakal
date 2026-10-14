/**
 * Tawakkal Enterprises Channel 2 (Hyderabad) - Smart ID Portal
 * Centralized Data Layer for Employee Requests, Invitation Tokens, and Unified Storage
 */

const PORTAL_STORAGE_KEYS = {
  INVITES: 'te2_portal_invites',
  REQUESTS: 'te2_portal_requests',
  EMPLOYEES: 'te2_portal_employees',
  NOTIFICATIONS: 'te2_portal_notifications',
  MANAGERS: 'te2_portal_managers',
  AUTH: 'portal_auth'
};

// Initial Seed Managers created by Admin
const DEFAULT_MANAGERS = [
  {
    id: 'MGR-001',
    name: 'Bilal Tariq',
    email: 'manager@example.com',
    phone: '+92 300 4567890',
    department: 'Field Sales & Distribution',
    branch: 'Hyderabad Central Branch',
    role: 'Branch Manager',
    password: 'password123',
    avatarInitials: 'BT',
    avatarBg: '#1E3A8A',
    status: 'Active',
    createdAt: '2026-09-01',
    createdBy: 'Noman (System Admin)',
    lastLogin: '16 Sep 2026, 09:30 AM',
    permissions: {
      canReviewRequests: true,
      canIssueCards: true,
      canManageEmployees: true,
      canInviteCandidates: true,
      canManageManagers: false
    }
  },
  {
    id: 'MGR-002',
    name: 'Ayesha Siddiqui',
    email: 'ayesha.ops@tawakkal.com',
    phone: '+92 321 9876543',
    department: 'Logistics & Warehousing',
    branch: 'Latifabad Distribution Hub',
    role: 'Operations Manager',
    password: 'password123',
    avatarInitials: 'AS',
    avatarBg: '#0F766E',
    status: 'Active',
    createdAt: '2026-09-08',
    createdBy: 'Noman (System Admin)',
    lastLogin: '15 Sep 2026, 04:15 PM',
    permissions: {
      canReviewRequests: true,
      canIssueCards: true,
      canManageEmployees: true,
      canInviteCandidates: true,
      canManageManagers: false
    }
  }
];

const DEFAULT_ADMIN = {
  id: 'ADM-001',
  name: 'Noman',
  email: 'admin@example.com',
  phone: '+92 300 1234567',
  department: 'Executive Management',
  branch: 'Head Office (Hyderabad)',
  role: 'System Administrator',
  password: 'password',
  avatarInitials: 'N',
  avatarBg: '#123B6D',
  status: 'Active',
  createdAt: '2026-01-01',
  createdBy: 'System Root',
  lastLogin: '16 Sep 2026, 11:45 AM',
  permissions: {
    canReviewRequests: true,
    canIssueCards: true,
    canManageEmployees: true,
    canInviteCandidates: true,
    canManageManagers: true
  }
};

// Initial Seed Invitation Tokens
const DEFAULT_INVITES = [
  {
    token: 'TE2-INV-8491K',
    candidateName: 'Zubair Ahmed Qureshi',
    designation: 'Delivery Van Driver',
    department: 'Logistics & Distribution',
    createdAt: '2026-09-15',
    expiresAt: '2026-09-22',
    status: 'used', // already submitted REQ-2026-0041
    createdBy: 'Noman (System Admin)'
  },
  {
    token: 'TE2-INV-7924M',
    candidateName: 'Fatima Noor',
    designation: 'Quality Control Assistant',
    department: 'Quality Assurance',
    createdAt: '2026-09-16',
    expiresAt: '2026-09-23',
    status: 'used', // submitted REQ-2026-0042
    createdBy: 'Noman (System Admin)'
  },
  {
    token: 'TE2-INV-9932X',
    candidateName: 'Kamran Shahzad',
    designation: 'Medical Sales Representative',
    department: 'Field Sales',
    createdAt: '2026-09-16',
    expiresAt: '2026-09-30',
    status: 'active', // ready for use
    createdBy: 'Noman (System Admin)'
  }
];

// Initial Seed Employee Requests based on physical Tawakkal Enterprises 2-page form
const DEFAULT_REQUESTS = [
  {
    id: 'REQ-2026-0041',
    token: 'TE2-INV-8491K',
    status: 'Pending Review', // Pending Review | Approved | Rejected
    submittedAt: '16 Sep 2026, 11:30 AM',
    reviewedAt: null,
    reviewedBy: null,
    officialEmpId: null,
    notes: '',
    personal: {
      fullName: 'Zubair Ahmed Qureshi',
      fullNameUrdu: 'زبیر احمد قریشی',
      fatherName: 'Abdul Rasheed Qureshi',
      fatherNameUrdu: 'عبد الرشید قریشی',
      joiningDate: '2026-09-18',
      designation: 'Delivery Van Driver',
      dob: '1994-06-14',
      gender: 'Male',
      maritalStatus: 'Married',
      dependents: '3',
      bloodGroup: 'B+',
      cnic: '42101-7654321-3',
      cnicExpiry: '2031-08-25',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces'
    },
    contact: {
      address: 'House No. 14-B, Latifabad Unit 7, Hyderabad, Sindh',
      homePhone: '022-3841290',
      mobile: '+92 300 9876543',
      emergencyContact1: '+92 321 8765432 (Brother - Tariq Ahmed)',
      emergencyContact2: '+92 333 7654321 (Uncle - M. Farooq)'
    },
    previousEmployment: [
      {
        sr: 1,
        organization: 'Al-Shifa Pharma Logistics',
        designation: 'Delivery Van Driver',
        durationYears: '3 Years (2022-2025)',
        address: 'Auto Bhan Road, Hyderabad',
        phone: '022-2651120'
      },
      {
        sr: 2,
        organization: 'Sindh Medical Distributors',
        designation: 'Field Delivery Assistant',
        durationYears: '2 Years (2020-2022)',
        address: 'Station Road, Hyderabad',
        phone: '022-2784530'
      }
    ],
    references: [
      {
        name: 'Dr. Asif Memon',
        relation: 'Family Physician & Credential Guarantor',
        contact: '+92 301 2345112, Latifabad Unit 6'
      },
      {
        name: 'Haji Kamran Sheikh',
        relation: 'Former Supervisor at Al-Shifa Logistics',
        contact: '+92 312 9988776, Hyderabad'
      }
    ],
    specialRoles: {
      category: 'Delivery Van', // None | Motorcycle | Delivery Van
      vehicleRegNumber: 'HYB-7824',
      licenseNumber: 'DL-SND-482910',
      licenseExpiry: '2028-11-14',
      tokenTaxPaid: 'Paid & Verified Up to Date (Valid till June 2027)'
    },
    checklist: {
      cnicCopy: true,
      bloodGroupCopy: true,
      photosCount: 4,
      utilityBillCopy: true,
      emergencyNumberVerified: true,
      vehicleRegistrationCopy: true,
      licenseCopy: true,
      taxTokenCopy: true
    },
    declaration: {
      agreed: true,
      solemnAffidavit: true,
      applicantSignature: 'Zubair Ahmed Qureshi',
      signatureMatchesCnic: true,
      declarationDate: '2026-09-16'
    }
  },
  {
    id: 'REQ-2026-0042',
    token: 'TE2-INV-7924M',
    status: 'Pending Review',
    submittedAt: '16 Sep 2026, 02:45 PM',
    reviewedAt: null,
    reviewedBy: null,
    officialEmpId: null,
    notes: '',
    personal: {
      fullName: 'Fatima Noor',
      fullNameUrdu: 'فاطمہ نور',
      fatherName: 'Muhammad Tariq Noor',
      fatherNameUrdu: 'محمد طارق نور',
      joiningDate: '2026-09-20',
      designation: 'Quality Control Assistant',
      dob: '1998-03-22',
      gender: 'Female',
      maritalStatus: 'Unmarried',
      dependents: '0',
      bloodGroup: 'O+',
      cnic: '42101-9876543-2',
      cnicExpiry: '2033-04-15',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=faces'
    },
    contact: {
      address: 'Flat 402, Al-Rahim Towers, Qasimabad, Hyderabad',
      homePhone: '022-2654321',
      mobile: '+92 313 1234567',
      emergencyContact1: '+92 300 4567890 (Father - M. Tariq)',
      emergencyContact2: '+92 345 6789012 (Sister - Ayesha Noor)'
    },
    previousEmployment: [
      {
        sr: 1,
        organization: 'BioCare Pharmaceuticals Lab',
        designation: 'Trainee Chemist',
        durationYears: '1 Year (2025-2026)',
        address: 'SITE Industrial Area, Kotri',
        phone: '022-3876540'
      }
    ],
    references: [
      {
        name: 'Prof. Dr. Noman Baloch',
        relation: 'Academic Advisor / University of Sindh',
        contact: '+92 302 9876543, Jamshoro'
      },
      {
        name: 'Mrs. Saima Jamil',
        relation: 'Former Laboratory Supervisor',
        contact: '+92 334 1122334, Kotri'
      }
    ],
    specialRoles: {
      category: 'None',
      vehicleRegNumber: 'N/A',
      licenseNumber: 'N/A',
      licenseExpiry: 'N/A',
      tokenTaxPaid: 'N/A'
    },
    checklist: {
      cnicCopy: true,
      bloodGroupCopy: true,
      photosCount: 4,
      utilityBillCopy: true,
      emergencyNumberVerified: true,
      vehicleRegistrationCopy: false,
      licenseCopy: false,
      taxTokenCopy: false
    },
    declaration: {
      agreed: true,
      solemnAffidavit: true,
      applicantSignature: 'Fatima Noor',
      signatureMatchesCnic: true,
      declarationDate: '2026-09-16'
    }
  }
];

// Initialize LocalStorage with default seeds if not present
function initializePortalData() {
  if (!localStorage.getItem(PORTAL_STORAGE_KEYS.INVITES)) {
    localStorage.setItem(PORTAL_STORAGE_KEYS.INVITES, JSON.stringify(DEFAULT_INVITES));
  }
  if (!localStorage.getItem(PORTAL_STORAGE_KEYS.REQUESTS)) {
    localStorage.setItem(PORTAL_STORAGE_KEYS.REQUESTS, JSON.stringify(DEFAULT_REQUESTS));
  }
  if (!localStorage.getItem(PORTAL_STORAGE_KEYS.MANAGERS)) {
    localStorage.setItem(PORTAL_STORAGE_KEYS.MANAGERS, JSON.stringify(DEFAULT_MANAGERS));
  }
  if (!localStorage.getItem(PORTAL_STORAGE_KEYS.AUTH)) {
    localStorage.setItem(PORTAL_STORAGE_KEYS.AUTH, JSON.stringify(DEFAULT_ADMIN));
  }
}

// Ensure initialization
initializePortalData();

const PortalData = {
  // --- INVITATION TOKENS ---
  getInvites: function() {
    try {
      return JSON.parse(localStorage.getItem(PORTAL_STORAGE_KEYS.INVITES)) || DEFAULT_INVITES;
    } catch (e) {
      return DEFAULT_INVITES;
    }
  },

  createInvite: function(inviteData) {
    const invites = this.getInvites();
    const token = 'TE2-INV-' + Math.floor(1000 + Math.random() * 9000) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const newInvite = {
      token: token,
      candidateName: inviteData.candidateName || 'Prospective Employee',
      designation: inviteData.designation || 'Staff',
      department: inviteData.department || 'General',
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: inviteData.expiresAt || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'active',
      createdBy: 'Noman (System Admin)'
    };
    invites.unshift(newInvite);
    localStorage.setItem(PORTAL_STORAGE_KEYS.INVITES, JSON.stringify(invites));
    return newInvite;
  },

  validateToken: function(token) {
    if (!token) return { valid: false, message: 'No invitation token was provided in the link.' };
    const cleanToken = token.trim().toUpperCase();
    const invites = this.getInvites();
    const found = invites.find(i => i.token.toUpperCase() === cleanToken);
    
    if (!found) {
      return { 
        valid: false, 
        message: 'Invalid invitation link or unauthorized token code. Please request an official link from Tawakkal Enterprises HR.' 
      };
    }
    if (found.status === 'expired') {
      return { 
        valid: false, 
        message: 'This invitation link has expired. Please contact the administrator for a renewed link.' 
      };
    }
    // Valid token
    return { 
      valid: true, 
      invite: found, 
      message: 'Invitation link verified successfully.' 
    };
  },

  markTokenUsed: function(token) {
    const cleanToken = token.trim().toUpperCase();
    const invites = this.getInvites();
    const idx = invites.findIndex(i => i.token.toUpperCase() === cleanToken);
    if (idx !== -1) {
      invites[idx].status = 'used';
      localStorage.setItem(PORTAL_STORAGE_KEYS.INVITES, JSON.stringify(invites));
    }
  },

  // --- EMPLOYEE REQUESTS ---
  getRequests: function() {
    try {
      return JSON.parse(localStorage.getItem(PORTAL_STORAGE_KEYS.REQUESTS)) || DEFAULT_REQUESTS;
    } catch (e) {
      return DEFAULT_REQUESTS;
    }
  },

  getRequestById: function(id) {
    const requests = this.getRequests();
    return requests.find(r => r.id === id) || null;
  },

  submitRequest: function(formData) {
    const requests = this.getRequests();
    const newId = 'REQ-2026-00' + (requests.length + 41);
    
    const newRequest = {
      id: newId,
      token: formData.token || 'DIRECT-INV',
      status: 'Pending Review',
      submittedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      reviewedAt: null,
      reviewedBy: null,
      officialEmpId: null,
      notes: '',
      personal: formData.personal,
      contact: formData.contact,
      previousEmployment: formData.previousEmployment || [],
      references: formData.references || [],
      specialRoles: formData.specialRoles || { category: 'None' },
      checklist: formData.checklist || {},
      declaration: formData.declaration || {}
    };

    requests.unshift(newRequest);
    localStorage.setItem(PORTAL_STORAGE_KEYS.REQUESTS, JSON.stringify(requests));

    if (formData.token) {
      this.markTokenUsed(formData.token);
    }

    return newRequest;
  },

  approveRequest: function(requestId, customNotes = '') {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return null;

    // Generate new official employee ID
    const empId = 'EMP-00' + Math.floor(220 + Math.random() * 50);
    req.status = 'Approved';
    req.officialEmpId = empId;
    req.reviewedAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    req.reviewedBy = 'Noman (System Admin)';
    req.notes = customNotes;

    localStorage.setItem(PORTAL_STORAGE_KEYS.REQUESTS, JSON.stringify(requests));

    // Save to employees list
    const newEmployee = {
      id: empId,
      name: req.personal.fullName,
      initials: req.personal.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      designation: req.personal.designation,
      phone: req.contact.mobile,
      nic: req.personal.cnic,
      status: 'Active',
      cardStatus: 'Not Generated',
      cardExpiry: '—',
      daysToExpiry: 999,
      cardNumber: null,
      fatherName: req.personal.fatherName,
      bloodGroup: req.personal.bloodGroup,
      photo: req.personal.photo,
      dob: req.personal.dob,
      gender: req.personal.gender,
      joiningDate: req.personal.joiningDate,
      address: req.contact.address,
      emergencyPhone: req.contact.emergencyContact1,
      sourceRequestId: req.id,
      specialRole: req.specialRoles
    };

    this.addEmployee(newEmployee);
    return { request: req, employee: newEmployee };
  },

  rejectRequest: function(requestId, reason = '') {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return null;

    req.status = 'Rejected';
    req.reviewedAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    req.reviewedBy = 'Noman (System Admin)';
    req.notes = reason || 'Candidate documents did not fulfill verification requirements.';

    localStorage.setItem(PORTAL_STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    return req;
  },

  // --- UNIFIED EMPLOYEES REPOSITORY ---
  getCustomEmployees: function() {
    try {
      return JSON.parse(localStorage.getItem(PORTAL_STORAGE_KEYS.EMPLOYEES)) || [];
    } catch (e) {
      return [];
    }
  },

  getEmployees: function() {
    return this.getCustomEmployees();
  },

  getEmployeeById: function(id) {
    const emps = this.getCustomEmployees();
    return emps.find(e => e.id === id) || null;
  },

  addEmployee: function(employee) {
    const current = this.getCustomEmployees();
    // Remove if already exists with same ID
    const filtered = current.filter(e => e.id !== employee.id);
    filtered.unshift(employee);
    localStorage.setItem(PORTAL_STORAGE_KEYS.EMPLOYEES, JSON.stringify(filtered));
  },

  createEmployeeFromForm: function(formData) {
    const current = this.getCustomEmployees();
    // Generate next unique EMP ID
    const nextNum = Math.floor(230 + Math.random() * 50);
    const empId = formData.customId || ('EMP-00' + nextNum);

    const name = (formData.personal && formData.personal.fullName) ? formData.personal.fullName.trim() : 'New Employee';
    const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM';

    const newEmp = {
      id: empId,
      name: name,
      fatherName: formData.personal ? formData.personal.fatherName : '',
      designation: (formData.personal && formData.personal.designation) ? formData.personal.designation.trim() : 'Staff Member',
      joiningDate: (formData.personal && formData.personal.joiningDate) || new Date().toISOString().split('T')[0],
      dob: (formData.personal && formData.personal.dob) || '',
      gender: (formData.personal && formData.personal.gender) || 'Male',
      maritalStatus: (formData.personal && formData.personal.maritalStatus) || 'Single',
      dependents: (formData.personal && formData.personal.dependents) || 0,
      bloodGroup: (formData.personal && formData.personal.bloodGroup) || 'O+',
      nic: (formData.personal && formData.personal.cnic) || '',
      cnicExpiry: (formData.personal && formData.personal.cnicExpiry) || '',
      phone: (formData.contact && formData.contact.mobile) || '',
      homePhone: (formData.contact && formData.contact.homePhone) || '',
      address: (formData.contact && formData.contact.address) || '',
      emergencyPhone: (formData.contact && formData.contact.emergencyContact1) || '',
      emergencyPhone2: (formData.contact && formData.contact.emergencyContact2) || '',
      photo: (formData.personal && formData.personal.photo) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces',
      initials: initials,
      status: 'Active',
      cardStatus: 'Not Generated',
      cardExpiry: '—',
      daysToExpiry: 999,
      cardNumber: null,
      previousEmployment: formData.previousEmployment || [],
      references: formData.references || [],
      specialRoles: formData.specialRoles || { category: 'None' },
      checklist: formData.checklist || {},
      declaration: formData.declaration || {},
      createdAt: new Date().toISOString()
    };

    this.addEmployee(newEmp);

    this.addNotification({
      title: 'New Employee Enrolled',
      message: `${newEmp.name} enrolled as ${newEmp.designation} (${newEmp.id}).`,
      type: 'success'
    });

    return newEmp;
  },

  getPendingRequestsCount: function() {
    const requests = this.getRequests();
    return requests.filter(r => r.status === 'Pending Review').length;
  },

  // --- MANAGER MANAGEMENT ---
  getManagers: function() {
    try {
      const stored = localStorage.getItem(PORTAL_STORAGE_KEYS.MANAGERS);
      return stored ? JSON.parse(stored) : DEFAULT_MANAGERS;
    } catch (e) {
      return DEFAULT_MANAGERS;
    }
  },

  getManagerById: function(id) {
    const managers = this.getManagers();
    return managers.find(m => m.id === id) || null;
  },

  createManager: function(data) {
    const managers = this.getManagers();
    const currentUser = this.getCurrentUser();
    
    // Generate Manager ID
    const nextNum = managers.length + 1;
    const id = 'MGR-00' + nextNum;
    
    const initials = (data.name || 'New Manager')
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'MG';

    const colors = ['#1E3A8A', '#0F766E', '#4338CA', '#7C2D12', '#065F46', '#831843'];
    const avatarBg = colors[Math.floor(Math.random() * colors.length)];

    const newManager = {
      id: id,
      name: (data.name || '').trim(),
      email: (data.email || '').trim().toLowerCase(),
      phone: (data.phone || '').trim(),
      department: data.department || 'Administration & Management',
      branch: data.branch || 'All Branches',
      role: data.role || 'Co-Admin / Manager',
      password: (data.password || 'password123').trim(),
      avatarInitials: initials,
      avatarBg: avatarBg,
      status: data.status || 'Active',
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser ? `${currentUser.name} (${currentUser.role || 'Admin'})` : 'Noman (System Admin)',
      lastLogin: 'Never logged in',
      permissions: {
        canReviewRequests: true,
        canIssueCards: true,
        canManageEmployees: true,
        canInviteCandidates: true,
        canManageManagers: true
      }
    };

    managers.unshift(newManager);
    localStorage.setItem(PORTAL_STORAGE_KEYS.MANAGERS, JSON.stringify(managers));

    // Also trigger notification
    this.addNotification({
      title: 'New Manager / Admin Created',
      message: `${newManager.name} created as ${newManager.role} with login credentials (${newManager.email}).`,
      type: 'info'
    });

    return newManager;
  },

  updateManager: function(id, data) {
    const managers = this.getManagers();
    const index = managers.findIndex(m => m.id === id);
    if (index === -1) return null;

    const existing = managers[index];
    const updated = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      email: data.email !== undefined ? data.email.trim().toLowerCase() : existing.email,
      phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
      department: data.department !== undefined ? data.department : existing.department,
      branch: data.branch !== undefined ? data.branch : existing.branch,
      role: data.role !== undefined ? data.role : existing.role,
      status: data.status !== undefined ? data.status : existing.status,
      permissions: {
        canReviewRequests: true,
        canIssueCards: true,
        canManageEmployees: true,
        canInviteCandidates: true,
        canManageManagers: true
      }
    };

    if (data.password && data.password.trim()) {
      updated.password = data.password.trim();
    }

    if (data.name) {
      updated.avatarInitials = data.name.split(' ').filter(Boolean).map(p => p[0]).join('').substring(0, 2).toUpperCase() || existing.avatarInitials;
    }

    managers[index] = updated;
    localStorage.setItem(PORTAL_STORAGE_KEYS.MANAGERS, JSON.stringify(managers));
    return updated;
  },

  deleteManager: function(id) {
    const managers = this.getManagers();
    const filtered = managers.filter(m => m.id !== id);
    localStorage.setItem(PORTAL_STORAGE_KEYS.MANAGERS, JSON.stringify(filtered));
    return true;
  },

  toggleManagerStatus: function(id) {
    const managers = this.getManagers();
    const target = managers.find(m => m.id === id);
    if (!target) return null;
    target.status = target.status === 'Active' ? 'Suspended' : 'Active';
    localStorage.setItem(PORTAL_STORAGE_KEYS.MANAGERS, JSON.stringify(managers));
    return target;
  },

  // --- AUTHENTICATION & SESSION ---
  getCurrentUser: function() {
    try {
      const stored = localStorage.getItem(PORTAL_STORAGE_KEYS.AUTH);
      return stored ? JSON.parse(stored) : DEFAULT_ADMIN;
    } catch (e) {
      return DEFAULT_ADMIN;
    }
  },

  setCurrentUser: function(user) {
    localStorage.setItem(PORTAL_STORAGE_KEYS.AUTH, JSON.stringify(user));
  },

  authenticate: function(identifier, password) {
    if (!identifier || !password) {
      return { success: false, message: 'Please enter both email/username and password.' };
    }
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check default admin
    if ((cleanId === DEFAULT_ADMIN.email.toLowerCase() || cleanId === 'admin' || cleanId === 'noman') && cleanPass === DEFAULT_ADMIN.password) {
      this.setCurrentUser(DEFAULT_ADMIN);
      return { success: true, user: DEFAULT_ADMIN };
    }

    // Check managers
    const managers = this.getManagers();
    const foundManager = managers.find(m => 
      m.email.toLowerCase() === cleanId || m.id.toLowerCase() === cleanId
    );

    if (foundManager) {
      if (foundManager.password !== cleanPass) {
        return { success: false, message: 'Incorrect password for this manager account.' };
      }
      if (foundManager.status !== 'Active') {
        return { success: false, message: 'Your manager account is currently Suspended. Please contact System Admin Noman.' };
      }
      foundManager.lastLogin = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      localStorage.setItem(PORTAL_STORAGE_KEYS.MANAGERS, JSON.stringify(managers));

      this.setCurrentUser(foundManager);
      return { success: true, user: foundManager };
    }

    return { success: false, message: 'Invalid credentials. Please verify your email and password.' };
  },

  logout: function() {
    localStorage.removeItem(PORTAL_STORAGE_KEYS.AUTH);
    window.location.href = 'login.html';
  },

  addNotification: function(notif) {
    try {
      const notifs = JSON.parse(localStorage.getItem(PORTAL_STORAGE_KEYS.NOTIFICATIONS)) || [];
      notifs.unshift({
        id: 'NOTIF-' + Date.now(),
        title: notif.title,
        message: notif.message,
        type: notif.type || 'info',
        time: 'Just now',
        read: false
      });
      localStorage.setItem(PORTAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    } catch (e) {}
  },

  // --- OFFICIAL CREDENTIAL & QR VERIFICATION REGISTRY ---
  getAllCards: function() {
    const baseCards = [
      {
        card: "CARD-00421",
        empId: "EMP-00123",
        empName: "Muhammad Ali",
        empNameUrdu: "محمد علی",
        designation: "Technician & Field Specialist",
        department: "Operations & Logistics",
        company: "Tawakkal Enterprises",
        bloodGroup: "B+",
        nic: "42101-1234567-1",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces",
        issueDate: "14 Sep 2026",
        expiryDate: "14 Aug 2027",
        daysToExpiry: 334,
        status: "Active",
        qrStatus: "Active",
        issuedBy: "Noman (System Admin)",
        token: "X7K92PQM",
        securityHash: "sha256-8f3c4e91...d28a"
      },
      {
        card: "CARD-00403",
        empId: "EMP-00155",
        empName: "Sara Ahmed",
        empNameUrdu: "سارہ احمد",
        designation: "Quality Control Officer",
        department: "Quality Assurance",
        company: "Tawakkal Enterprises",
        bloodGroup: "A+",
        nic: "42101-6789012-1",
        photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=faces",
        issueDate: "21 Nov 2025",
        expiryDate: "21 Oct 2026",
        daysToExpiry: 12,
        status: "Expiring Soon",
        qrStatus: "Active",
        issuedBy: "Noman (System Admin)",
        token: "SA843KLP",
        securityHash: "sha256-4b8c91a3...f192"
      },
      {
        card: "CARD-00412",
        empId: "EMP-00128",
        empName: "Usman Farooq",
        empNameUrdu: "عثمان فاروق",
        designation: "Sales Manager",
        department: "Field Sales",
        company: "Tawakkal Enterprises",
        bloodGroup: "O-",
        nic: "42101-2345678-3",
        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=faces",
        issueDate: "28 Feb 2026",
        expiryDate: "28 Jan 2027",
        daysToExpiry: 135,
        status: "Active",
        qrStatus: "Active",
        issuedBy: "Noman (System Admin)",
        token: "UF921MZQ",
        securityHash: "sha256-11ac99ef...e771"
      },
      {
        card: "CARD-00418",
        empId: "EMP-00135",
        empName: "Amina Tariq",
        empNameUrdu: "امینہ طارق",
        designation: "Pharmacist",
        department: "Warehouse & Dispensary",
        company: "Tawakkal Enterprises",
        bloodGroup: "A+",
        nic: "42101-3456789-5",
        photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=faces",
        issueDate: "12 Jun 2026",
        expiryDate: "12 May 2027",
        daysToExpiry: 240,
        status: "Active",
        qrStatus: "Active",
        issuedBy: "Noman (System Admin)",
        token: "AT551PWX",
        securityHash: "sha256-aa9128fe...99b2"
      },
      {
        card: "CARD-00360",
        empId: "EMP-00201",
        empName: "Nida Siddiqui",
        empNameUrdu: "ندا صدیقی",
        designation: "Administrative Assistant",
        department: "Administration",
        company: "Tawakkal Enterprises",
        bloodGroup: "B+",
        nic: "42101-1122334-1",
        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=faces",
        issueDate: "12 Oct 2025",
        expiryDate: "12 Sep 2026",
        daysToExpiry: -4,
        status: "Expired",
        qrStatus: "Deactivated",
        issuedBy: "Noman (System Admin)",
        token: "NS194XLP",
        securityHash: "sha256-778811bc...430a"
      },
      {
        card: "CARD-00375",
        empId: "EMP-00150",
        empName: "Fahad Qureshi",
        empNameUrdu: "فہد قریشی",
        designation: "Safety Inspector",
        department: "Safety & Compliance",
        company: "Tawakkal Enterprises",
        bloodGroup: "O+",
        nic: "42101-5678901-9",
        photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=300&fit=crop&crop=faces",
        issueDate: "10 Jan 2026",
        expiryDate: "10 Dec 2026",
        daysToExpiry: 62,
        status: "Deactivated",
        qrStatus: "Deactivated",
        issuedBy: "Noman (System Admin)",
        token: "FQ881REV",
        securityHash: "sha256-ff00213a...90aa"
      },
      {
        card: "CARD-00392",
        empId: "EMP-00174",
        empName: "Kashif Mehmood",
        empNameUrdu: "کاشف محمود",
        designation: "Logistics Assistant",
        department: "Logistics",
        company: "Tawakkal Enterprises",
        bloodGroup: "AB-",
        nic: "42101-8901234-5",
        photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=faces",
        issueDate: "05 Dec 2025",
        expiryDate: "05 Nov 2026",
        daysToExpiry: 27,
        status: "Deactivated",
        qrStatus: "Deactivated",
        issuedBy: "Noman (System Admin)",
        token: "KM742DEC",
        securityHash: "sha256-5522aa44...8811"
      }
    ];

    // Merge any custom employees with generated cards
    const customEmps = this.getCustomEmployees();
    customEmps.forEach(emp => {
      if (emp.cardNumber) {
        const existingIdx = baseCards.findIndex(c => c.card === emp.cardNumber || c.empId === emp.id);
        const cardObj = {
          card: emp.cardNumber,
          empId: emp.id,
          empName: emp.name,
          empNameUrdu: emp.fullNameUrdu || '',
          designation: emp.designation || 'Staff Member',
          department: emp.department || 'Operations',
          company: 'Tawakkal Enterprises',
          bloodGroup: emp.bloodGroup || 'O+',
          nic: emp.nic || emp.cnic || '—',
          photo: emp.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces',
          issueDate: emp.createdAt ? emp.createdAt.split('T')[0] : '16 Sep 2026',
          expiryDate: emp.cardExpiry || '16 Aug 2027',
          daysToExpiry: emp.daysToExpiry !== undefined ? emp.daysToExpiry : 334,
          status: emp.cardStatus || 'Active',
          qrStatus: (emp.cardStatus === 'Active' || emp.cardStatus === 'Expiring Soon') ? 'Active' : 'Deactivated',
          issuedBy: 'Noman (System Admin)',
          token: 'TK-' + (emp.id.replace('EMP-', '')) + 'X',
          securityHash: 'sha256-' + Math.random().toString(36).substring(2, 10) + '...99a'
        };

        if (existingIdx >= 0) {
          baseCards[existingIdx] = cardObj;
        } else {
          baseCards.unshift(cardObj);
        }
      }
    });

    return baseCards;
  },

  verifyCredential: function(query) {
    if (!query) {
      // Default to Muhammad Ali CARD-00421
      const defaultCard = this.getAllCards()[0];
      return {
        success: true,
        verificationStatus: 'valid',
        card: defaultCard,
        message: 'Official Identification Credential Verified and Active'
      };
    }

    const clean = query.trim().toUpperCase();

    // Direct state simulator testing
    if (clean === 'VALID' || clean === 'ACTIVE') {
      return {
        success: true,
        verificationStatus: 'valid',
        card: this.getAllCards().find(c => c.card === 'CARD-00421'),
        message: 'Official Identification Credential Verified and Active'
      };
    }
    if (clean === 'EXPIRED') {
      return {
        success: true,
        verificationStatus: 'expired',
        card: this.getAllCards().find(c => c.card === 'CARD-00360'),
        message: 'Credential Expired - Renewal Required'
      };
    }
    if (clean === 'REVOKED' || clean === 'DEACTIVATED') {
      return {
        success: true,
        verificationStatus: 'revoked',
        card: this.getAllCards().find(c => c.card === 'CARD-00375'),
        message: 'Credential Inactive / Revoked - Access Prohibited'
      };
    }
    if (clean === 'INVALID' || clean === 'FAKE' || clean === 'FORGED') {
      return {
        success: false,
        verificationStatus: 'invalid',
        card: null,
        message: 'Invalid Credential Code - No Official Record Found'
      };
    }

    // Lookup in cards
    const cards = this.getAllCards();
    const foundCard = cards.find(c => 
      c.card.toUpperCase() === clean ||
      c.empId.toUpperCase() === clean ||
      (c.token && c.token.toUpperCase() === clean) ||
      (c.nic && c.nic.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, ''))
    );

    if (foundCard) {
      let status = 'valid';
      if (foundCard.status === 'Expired' || foundCard.daysToExpiry <= 0) {
        status = 'expired';
      } else if (foundCard.status === 'Deactivated' || foundCard.status === 'Revoked' || foundCard.status === 'Terminated' || foundCard.qrStatus === 'Deactivated') {
        status = 'revoked';
      } else if (foundCard.status === 'Expiring Soon') {
        status = 'expiring';
      }

      return {
        success: true,
        verificationStatus: status,
        card: foundCard,
        message: status === 'valid' ? 'Official Identification Credential Verified and Active' :
                 status === 'expiring' ? 'Official Credential Active (Expiring Soon)' :
                 status === 'expired' ? 'Credential Expired - Renewal Required' :
                 'Credential Revoked / Deactivated'
      };
    }

    // Lookup in raw employees
    const emps = this.getEmployees();
    const foundEmp = emps.find(e => 
      e.id.toUpperCase() === clean ||
      e.name.toUpperCase().includes(clean) ||
      (e.nic && e.nic.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, ''))
    );

    if (foundEmp) {
      const generatedCard = {
        card: foundEmp.cardNumber || 'CARD-TEMP',
        empId: foundEmp.id,
        empName: foundEmp.name,
        empNameUrdu: foundEmp.nameUrdu || '',
        designation: foundEmp.designation || 'Staff Member',
        department: 'Operations',
        company: 'Tawakkal Enterprises',
        bloodGroup: foundEmp.bloodGroup || 'O+',
        nic: foundEmp.nic || foundEmp.cnic || '—',
        photo: foundEmp.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces',
        issueDate: '14 Sep 2026',
        expiryDate: foundEmp.cardExpiry || '14 Aug 2027',
        daysToExpiry: foundEmp.daysToExpiry || 334,
        status: foundEmp.status === 'Active' ? 'Active' : 'Deactivated',
        qrStatus: foundEmp.status === 'Active' ? 'Active' : 'Deactivated',
        issuedBy: 'Noman (System Admin)',
        token: clean,
        securityHash: 'sha256-99b821ac...102a'
      };

      const status = (foundEmp.status === 'Active') ? 'valid' : 'revoked';
      return {
        success: true,
        verificationStatus: status,
        card: generatedCard,
        message: status === 'valid' ? 'Official Identification Credential Verified and Active' : 'Credential Revoked / Deactivated'
      };
    }

    return {
      success: false,
      verificationStatus: 'invalid',
      card: null,
      message: 'Invalid Credential Code - No matching official record in Tawakkal Enterprises Registry.'
    };
  },

  syncUserInterface: function() {
    const user = this.getCurrentUser();
    if (!user) return;

    // Update avatar text and colors
    document.querySelectorAll('.admin-avatar').forEach(el => {
      el.textContent = user.avatarInitials || (user.name ? user.name[0] : 'U');
      if (user.avatarBg) {
        el.style.backgroundColor = user.avatarBg;
      }
    });

    // Update user name in header and sidebar
    document.querySelectorAll('.current-user-name, [data-user-name]').forEach(el => {
      el.textContent = user.name || 'Admin';
    });

    // Update user role
    document.querySelectorAll('.current-user-role, [data-user-role]').forEach(el => {
      el.textContent = user.role || 'Administrator';
    });

    // Update user email
    document.querySelectorAll('.current-user-email, [data-user-email]').forEach(el => {
      el.textContent = user.email || 'admin@example.com';
    });
  }
};

// Global export for browsers
window.PortalData = PortalData;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    PortalData.syncUserInterface();
  });
}
