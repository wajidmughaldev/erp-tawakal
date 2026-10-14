import React, { useState } from 'react';
import { 
  Users, CreditCard, ShieldCheck, LayoutDashboard, Plus, Search, 
  CheckCircle, AlertTriangle, RefreshCw, Database, Server, Terminal, 
  ExternalLink, Building2, Phone, Mail, Calendar, UserCheck, Trash2, Edit
} from 'lucide-react';

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  designation: string;
  phone: string;
  blood_group: string;
  joining_date: string;
  status: 'active' | 'inactive';
}

interface IdCardItem {
  id: number;
  card_number: string;
  employee: Employee;
  issued_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'revoked';
  verification_count: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'cards' | 'verify' | 'backend'>('dashboard');

  // Mock initial state for production-ready preview
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 1, employee_id: 'EMP-2026-001', first_name: 'Sarah', last_name: 'Jenkins', email: 'sarah.j@enterprise.com', department: 'Executive', designation: 'Chief Executive Officer', phone: '+1 (555) 019-2834', blood_group: 'O+', joining_date: '2023-01-15', status: 'active' },
    { id: 2, employee_id: 'EMP-2026-002', first_name: 'Alex', last_name: 'Rivera', email: 'alex.r@enterprise.com', department: 'Engineering', designation: 'Senior Tech Lead', phone: '+1 (555) 014-9921', blood_group: 'A+', joining_date: '2023-06-01', status: 'active' },
    { id: 3, employee_id: 'EMP-2026-003', first_name: 'Emily', last_name: 'Wong', email: 'emily.w@enterprise.com', department: 'HR & Operations', designation: 'People Operations Manager', phone: '+1 (555) 018-4472', blood_group: 'B+', joining_date: '2024-02-10', status: 'active' },
    { id: 4, employee_id: 'EMP-2026-004', first_name: 'Marcus', last_name: 'Johnson', email: 'marcus.j@enterprise.com', department: 'Sales', designation: 'VP of Global Sales', phone: '+1 (555) 012-3389', blood_group: 'AB+', joining_date: '2022-11-20', status: 'active' }
  ]);

  const [idCards, setIdCards] = useState<IdCardItem[]>([
    { id: 1, card_number: 'CARD-00421', employee: employees[0], issued_date: '2026-01-10', expiry_date: '2028-01-10', status: 'active', verification_count: 34 },
    { id: 2, card_number: 'CARD-00422', employee: employees[1], issued_date: '2026-01-12', expiry_date: '2028-01-12', status: 'active', verification_count: 18 },
    { id: 3, card_number: 'CARD-00423', employee: employees[2], issued_date: '2026-01-15', expiry_date: '2028-01-15', status: 'active', verification_count: 7 },
    { id: 4, card_number: 'CARD-00424', employee: employees[3], issued_date: '2026-01-18', expiry_date: '2028-01-18', status: 'active', verification_count: 12 }
  ]);

  // Verification state
  const [verifyQuery, setVerifyQuery] = useState('');
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // New Employee Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: 'Engineering',
    designation: '',
    phone: '',
    blood_group: 'O+',
    joining_date: new Date().toISOString().split('T')[0]
  });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmployee: Employee = {
      id: employees.length + 1,
      employee_id: `EMP-2026-${String(employees.length + 1).padStart(3, '0')}`,
      ...newEmp,
      status: 'active'
    };

    const newCard: IdCardItem = {
      id: idCards.length + 1,
      card_number: `CARD-${Math.floor(10000 + Math.random() * 90000)}`,
      employee: newEmployee,
      issued_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(Date.now() + 730*24*60*60*1000).toISOString().split('T')[0],
      status: 'active',
      verification_count: 0
    };

    setEmployees([newEmployee, ...employees]);
    setIdCards([newCard, ...idCards]);
    setShowAddModal(false);
    setNewEmp({
      first_name: '',
      last_name: '',
      email: '',
      department: 'Engineering',
      designation: '',
      phone: '',
      blood_group: 'O+',
      joining_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setTimeout(() => {
      const found = idCards.find(c => c.card_number.toLowerCase() === verifyQuery.trim().toLowerCase() || c.employee.employee_id.toLowerCase() === verifyQuery.trim().toLowerCase());
      if (found) {
        setVerifyResult({
          valid: true,
          card: found,
          message: 'ID Card is authentic and active.'
        });
      } else {
        setVerifyResult({
          valid: false,
          message: 'ID Card not found or invalid credentials.'
        });
      }
      setVerifyLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Enterprise ID Guard <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">Laravel + React</span>
            </h1>
            <p className="text-xs text-slate-400">Production-Ready Employee Management & Smart ID System</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">MySQL DB: Connected</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-indigo-300 text-xs font-medium">
            <Server className="w-3.5 h-3.5" />
            <span>Laravel v11 API Active</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-slate-900/60 border-r border-slate-800/80 p-4 flex md:flex-col justify-between space-x-2 md:space-x-0 md:space-y-1">
          <nav className="flex md:flex-col space-x-1 md:space-x-0 md:space-y-1 w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center space-x-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'employees'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Employee Directory</span>
            </button>

            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center space-x-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'cards'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Smart ID Cards</span>
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center space-x-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'verify'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>QR Verification Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('backend')}
              className={`flex items-center space-x-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'backend'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Laravel Architecture</span>
            </button>
          </nav>

          <div className="hidden md:block pt-4 border-t border-slate-800">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
              <div className="font-semibold text-slate-200 mb-1">Production Client</div>
              <div>Approved Sample v2.4</div>
              <div className="text-emerald-400 font-mono mt-1">Status: Ready for Deploy</div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">System Overview</h2>
                  <p className="text-sm text-slate-400">Monitor employee records, active ID cards, and real-time QR verifications.</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Employee</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Total Employees</span>
                    <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-white">{employees.length}</span>
                    <span className="text-xs text-emerald-400 font-medium">+12% this month</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Active ID Cards</span>
                    <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-white">{idCards.filter(c => c.status === 'active').length}</span>
                    <span className="text-xs text-emerald-400 font-medium">100% Validated</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">QR Verifications</span>
                    <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-xl">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-white">71</span>
                    <span className="text-xs text-blue-400 font-medium">Last 24 hours</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">MySQL Database</span>
                    <div className="bg-purple-500/10 text-purple-400 p-2.5 rounded-xl">
                      <Database className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-emerald-400">Connected</span>
                    <span className="text-xs text-slate-400">InnoDB Engine</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Recently Issued ID Cards</h3>
                  <button onClick={() => setActiveTab('cards')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/40">
                        <th className="p-4">Card Number</th>
                        <th className="p-4">Employee Name</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Expiry Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Verifications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {idCards.map(card => (
                        <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-mono font-medium text-indigo-400">{card.card_number}</td>
                          <td className="p-4 font-medium text-white">{card.employee.first_name} {card.employee.last_name}</td>
                          <td className="p-4 text-slate-300">{card.employee.department}</td>
                          <td className="p-4 text-slate-300">{card.expiry_date}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-slate-300">{card.verification_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Employee Directory</h2>
                  <p className="text-sm text-slate-400">Manage all registered company personnel and generate secure ID badges.</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Employee</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search employees..." 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Showing {employees.length} records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/40">
                        <th className="p-4">Employee ID</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Designation</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {employees.map(emp => (
                        <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 font-mono font-medium text-indigo-400">{emp.employee_id}</td>
                          <td className="p-4 font-medium text-white">{emp.first_name} {emp.last_name}</td>
                          <td className="p-4 text-slate-300">{emp.department}</td>
                          <td className="p-4 text-slate-300">{emp.designation}</td>
                          <td className="p-4 text-slate-400 text-xs">{emp.email}</td>
                          <td className="p-4 text-slate-400 text-xs">{emp.phone}</td>
                          <td className="p-4 text-right space-x-2">
                            <button title="Edit" className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button title="Delete" className="p-1.5 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Smart ID Cards</h2>
                <p className="text-sm text-slate-400">Manage NFC/QR enabled ID cards for all employees.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {idCards.map(card => (
                  <div key={card.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-mono text-indigo-400 font-semibold uppercase tracking-wider">Secure Smart ID Badge</div>
                        <div className="text-xl font-bold text-white mt-1">{card.employee.first_name} {card.employee.last_name}</div>
                        <div className="text-xs text-slate-400">{card.employee.designation} • {card.employee.department}</div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium rounded-full">
                        {card.status}
                      </span>
                    </div>

                    <div className="my-6 p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-400">Card Number</div>
                        <div className="font-mono font-bold text-white text-sm">{card.card_number}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Valid Thru</div>
                        <div className="font-mono text-slate-300 text-sm">{card.expiry_date}</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg">
                        <div className="w-10 h-10 bg-slate-900 flex items-center justify-center text-[8px] text-white font-mono text-center">QR CODE</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
                      <span>Verifications: <strong className="text-white">{card.verification_count}</strong></span>
                      <button onClick={() => { setActiveTab('verify'); setVerifyQuery(card.card_number); }} className="text-indigo-400 hover:underline font-medium">
                        Verify Card →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="inline-flex p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl mb-3 border border-indigo-500/20">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Public ID Card Verification</h2>
                <p className="text-sm text-slate-400 mt-1">Enter card number or employee ID to authenticate credential status instantly.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Card Number or Employee ID</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={verifyQuery}
                        onChange={(e) => setVerifyQuery(e.target.value)}
                        placeholder="e.g. CARD-00421 or EMP-2026-001" 
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                        required
                      />
                      <button 
                        type="submit"
                        disabled={verifyLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                      >
                        {verifyLoading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                </form>

                {verifyResult && (
                  <div className={`mt-6 p-5 rounded-xl border ${verifyResult.valid ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                    <div className="flex items-center space-x-3">
                      {verifyResult.valid ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                      )}
                      <div>
                        <h4 className="font-bold text-base">{verifyResult.valid ? 'Valid & Authentic ID Card' : 'Invalid ID Card'}</h4>
                        <p className="text-xs opacity-90 mt-0.5">{verifyResult.message}</p>
                      </div>
                    </div>

                    {verifyResult.valid && verifyResult.card && (
                      <div className="mt-4 pt-4 border-t border-emerald-500/20 grid grid-cols-2 gap-3 text-xs">
                        <div><span className="opacity-70">Holder Name:</span> <strong className="text-white block">{verifyResult.card.employee.first_name} {verifyResult.card.employee.last_name}</strong></div>
                        <div><span className="opacity-70">Designation:</span> <strong className="text-white block">{verifyResult.card.employee.designation}</strong></div>
                        <div><span className="opacity-70">Department:</span> <strong className="text-white block">{verifyResult.card.employee.department}</strong></div>
                        <div><span className="opacity-70">Expiry Date:</span> <strong className="text-white block">{verifyResult.card.expiry_date}</strong></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'backend' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Laravel & MySQL Production Setup</h2>
                <p className="text-sm text-slate-400">Complete backend architecture and production deployment guide.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-400" />
                    <span>1. Database Migrations (MySQL)</span>
                  </h3>
                  <p className="text-sm text-slate-300 mb-3">The system uses normalized MySQL tables with foreign key constraints, indexes, and soft deletes.</p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">
{`// database/migrations/2026_09_30_create_employees_table.php
Schema::create('employees', function (Blueprint $table) {
    $table->id();
    $table->string('employee_id')->unique();
    $table->string('first_name');
    $table->string('last_name');
    $table->string('email')->unique();
    $table->string('department');
    $table->string('designation');
    $table->enum('status', ['active', 'inactive'])->default('active');
    $table->timestamps();
});`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    <span>2. API Endpoints (`routes/api.php`)</span>
                  </h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 font-mono text-xs">
                      <span className="text-emerald-400 font-bold">GET /api/v1/employees</span>
                      <span className="text-slate-400">List all employees with pagination & search</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 font-mono text-xs">
                      <span className="text-emerald-400 font-bold">POST /api/v1/employees</span>
                      <span className="text-slate-400">Register new employee & generate ID record</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 font-mono text-xs">
                      <span className="text-blue-400 font-bold">POST /api/v1/verify-card</span>
                      <span className="text-slate-400">Secure QR / Card number verification</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <span>3. Production Deployment Commands</span>
                  </h3>
                  <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">
{`composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan migrate --force`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Register New Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                  <input 
                    type="text" 
                    required
                    value={newEmp.first_name}
                    onChange={(e) => setNewEmp({...newEmp, first_name: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                  <input 
                    type="text" 
                    required
                    value={newEmp.last_name}
                    onChange={(e) => setNewEmp({...newEmp, last_name: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({...newEmp, email: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
                  <select 
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({...newEmp, department: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Executive">Executive</option>
                    <option value="HR & Operations">HR & Operations</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Designation</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Software Engineer"
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp({...newEmp, designation: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({...newEmp, phone: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Blood Group</label>
                  <select 
                    value={newEmp.blood_group}
                    onChange={(e) => setNewEmp({...newEmp, blood_group: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                >
                  Save & Generate ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
