'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Calendar, Check, Pencil, Upload} from 'lucide-react';

const steps = [
  '1. Personal Details',
  '2. Contact & Residence',
  '3. Jobs & References',
  '4. Role & Vehicle',
  '5. Documents & Affidavit',
];

export function EmployeeForm({mode = 'add'}: {mode?: 'add' | 'edit'}) {
  const [step, setStep] = useState(1);
  const isAdd = mode === 'add';

  return (
    <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] pb-20 text-slate-950">
      <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-200 bg-white px-1 pb-3 lg:flex-row lg:items-center">
        <div className="text-[12px] text-slate-600">
          <Link href="/employees" className="hover:text-blue-700">Employees</Link>
          <span className="mx-2">/</span>
          <span className="font-semibold text-slate-950">{isAdd ? 'Add Employee Form' : 'Edit Employee Form'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-500 px-3 text-[11px] text-slate-700 hover:bg-slate-50" type="button">
            <Pencil size={13} />
            Prefill Sample Data
          </button>
          <button className="h-8 rounded-md border border-blue-600 px-3 text-[11px] text-blue-700 hover:bg-blue-50" type="button">اردو میں فارم دکھائیں</button>
          <Link href="/employees" className="inline-flex h-8 items-center rounded-md border border-slate-500 px-3 text-[11px] text-slate-700 hover:bg-slate-50">Cancel</Link>
          <button className="h-8 rounded-md bg-[#123b6d] px-4 text-[11px] font-medium text-white hover:bg-[#0d2f58]" type="button">Save & Enroll Employee</button>
        </div>
      </div>

      <div className="mx-auto max-w-[834px]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[18px] font-semibold">{isAdd ? 'Add Employee - Enrollment Dossier' : 'Edit Employee - Enrollment Dossier'}</h1>
              <span className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white">Tawakkal Enterprises Channel 2</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-600">Complete official 5-step employment application and Smart ID registration record.</p>
          </div>
          <span className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] text-slate-700">Step {step} of 5</span>
        </div>

        <form className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-5 border-b border-slate-200 bg-white">
            {steps.map((label, index) => {
              const number = index + 1;
              const complete = number < step;
              const active = number === step;
              return (
                <button
                  key={label}
                  type="button"
                  className={`relative flex flex-col items-center gap-2 px-2 py-3 text-center text-[10px] ${active ? 'border-b-2 border-[#123b6d] font-semibold text-[#123b6d]' : complete ? 'border-b-2 border-emerald-500 text-emerald-700' : 'text-slate-600'}`}
                  onClick={() => setStep(number)}
                >
                  <span className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold ${active ? 'bg-[#123b6d] text-white' : complete ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{number}</span>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {step === 1 ? <StepOne /> : null}
            {step === 2 ? <StepTwo /> : null}
            {step === 3 ? <StepThree /> : null}
            {step === 4 ? <StepFour /> : null}
            {step === 5 ? <StepFive /> : null}
          </div>

          <div className="flex items-center justify-between px-5 pb-5">
            <button
              className="h-9 rounded-md border border-slate-500 px-3 text-[12px] text-slate-700 disabled:opacity-0"
              type="button"
              disabled={step === 1}
              onClick={() => setStep((value) => Math.max(1, value - 1))}
            >
              &larr; Back to Step {step - 1}
            </button>
            {step < 5 ? (
              <button className="h-9 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]" type="button" onClick={() => setStep((value) => value + 1)}>
                Continue to {step === 1 ? 'Contact Details' : step === 2 ? 'Employment Record' : step === 3 ? 'Vehicle / Role Info' : 'Documents & Affidavit'} &rarr;
              </button>
            ) : (
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-4 text-[12px] font-medium text-white hover:bg-emerald-800" type="button">
                Save & Enroll Employee
                <Check size={14} />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-5 py-3 lg:left-[250px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-700">Editing: Step {step} of 5 ({steps[step - 1].replace(/^\d+\.\s*/, '')})</span>
          <div className="flex gap-2">
            <Link href="/employees" className="inline-flex h-8 items-center rounded-md border border-slate-500 px-3 text-[11px] text-slate-700">Cancel</Link>
            <button className="h-8 rounded-md bg-[#123b6d] px-4 text-[11px] font-medium text-white" type="button">Save Employee</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHeader({title, text, page}: {title: string; text: string; page: string}) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="mt-1 text-[10px] text-slate-600">{text}</p>
      </div>
      <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700">{page}</span>
    </div>
  );
}

function StepOne() {
  return (
    <>
      <StepHeader title="Step 1: Personal & Identity Information" text="Enter employee biographical credentials, CNIC, and designation." page="Page 1 of 5" />
      <Panel>
        <div className="grid gap-5 lg:grid-cols-[240px_1fr_1fr]">
          <div className="text-center">
            <Label>Recent Photograph <Required /></Label>
            <p className="mt-2 text-[10px] text-slate-600">Passport size photograph with Blue or White background</p>
            <div className="mx-auto mt-3 h-28 w-24 overflow-hidden rounded-md bg-slate-200">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=200&fit=crop&crop=faces" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-600 px-2 text-[10px] text-blue-700" type="button"><Upload size={12} /> Upload Photo</button>
              <button className="h-7 rounded-md border border-slate-500 px-2 text-[10px]" type="button">Reset</button>
            </div>
            <p className="mt-3 text-[9px] text-slate-600">JPG, PNG, WEBP | Max 3MB</p>
          </div>
          <div className="space-y-4">
            <Field label="Full Name" required placeholder="e.g. Kamran Shahzad" />
            <Field label="Designation / Role" required placeholder="e.g. Medical Sales Representative" />
            <Field label="Date of Birth (Year - Month - Day)" required placeholder="mm / dd / yyyy" icon />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Marital Status" required options={['Single', 'Married']} />
              <Field label="Dependents (Persons)" type="number" placeholder="0" />
            </div>
            <Field label="CNIC Number" required placeholder="42101-XXXXXXX-X" hint="13-digit National ID format with hyphens" />
          </div>
          <div className="space-y-4">
            <Field label="Father's / Guardian's Name" required placeholder="e.g. Muhammad Shahzad" />
            <Field label="Date of Joining" required placeholder="10 / 08 / 2026" icon />
            <SelectField label="Gender" required options={['Male', 'Female']} />
            <SelectField label="Blood Group" required options={['Select Blood Group', 'B+', 'O+', 'A+', 'AB+']} />
            <Field label="CNIC Expiration Date" required placeholder="mm / dd / yyyy" icon />
          </div>
        </div>
      </Panel>
    </>
  );
}

function StepTwo() {
  return (
    <>
      <StepHeader title="Step 2: Contact & Residential Details" text="Residential address, mobile phone numbers, and emergency contact details." page="Page 2 of 5" />
      <Panel>
        <TextArea label="Full Residential Address" required placeholder="House No, Street, Mohallah / Colony, Sector, City" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Home Landline Phone (with Area Code)" placeholder="022-XXXXXXX" hint="Residential landline if available" />
          <Field label="Mobile Phone Number" required placeholder="+92 300 1234567" />
        </div>
        <div className="my-6 border-t border-slate-300" />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Emergency Contact 1 (Primary)" required placeholder="+92 321 0000000 (Name & Relation)" hint="e.g. Brother, Father, Spouse with active phone" />
          <Field label="Emergency Contact 2 (Secondary)" placeholder="+92 333 0000000 (Name & Relation)" hint="Secondary emergency phone if available" />
        </div>
      </Panel>
    </>
  );
}

function StepThree() {
  return (
    <>
      <StepHeader title="Step 3: Past Employment & References" text="Prior work history and guarantors who can verify credentials." page="Page 3 of 5" />
      <Panel className="mb-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#123b6d]">Previous Employment Record</h3>
          <button className="rounded-md border border-blue-600 px-3 py-2 text-[10px] text-blue-700" type="button">+ Add Employer Record</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr>{['Sr #', 'Organization', 'Designation', 'Years / Duration', 'Address / Location', 'Phone Number', 'Action'].map((h) => <th key={h} className="border border-slate-300 bg-slate-50 p-2">{h}</th>)}</tr></thead>
            <tbody><tr>{['1', 'Apex Medical Distributors', 'Sales Representative', '2 Years (2024-2026)', 'Saddar, Hyderabad', '022-2781199', '×'].map((v, i) => <td key={i} className={`border border-slate-300 p-1 ${i === 6 ? 'text-center text-red-600' : ''}`}><input className="h-8 w-full rounded border border-slate-300 px-2" defaultValue={v} /></td>)}</tr></tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-slate-600">Enter previous employers in reverse chronological order if applicable.</p>
      </Panel>
      <Panel>
        <h3 className="text-[13px] font-semibold text-[#123b6d]">Guarantors & References</h3>
        <p className="mt-2 text-[10px] text-slate-600">Provide verifiable contact details for two respectable references</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ReferenceBlock title="Reference 1 (Primary Guarantor)" name="Haji Noman Memon" relation="Former Branch Manager" contact="+923009876543, Saddar Hyderabad" required />
          <ReferenceBlock title="Reference 2 (Secondary Guarantor)" name="Dr. Salman Qazi" relation="Family Physician" contact="+92321 8765432, Latifabad" />
        </div>
      </Panel>
    </>
  );
}

function StepFour() {
  return (
    <>
      <StepHeader title="Step 4: Role Specification (Sales Staff & Drivers)" text="Vehicle details, driving license, and token tax status (if applicable)." page="Page 4 of 5" />
      <Panel>
        <Label>Select Operational Role Category</Label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <RoleOption active title="Standard Office / Warehouse Staff" text="No vehicle or driving license required for daily duty" />
          <RoleOption title="Motorcycle Field Sales Executive" text="Field sales executive operating company or personal motorbike" />
          <RoleOption title="Delivery Van Driver" text="Pharmaceutical distribution driver for delivery van" />
        </div>
      </Panel>
    </>
  );
}

function StepFive() {
  return (
    <>
      <StepHeader title="Step 5: Mandatory Documents & Solemn Declaration" text="Required office inspection copies and legally binding affidavit." page="Page 5 of 5" />
      <Panel>
        <h3 className="text-[13px] font-semibold text-[#123b6d]">Mandatory Attachments (For Official HR Inspection)</h3>
        <p className="mt-2 text-[10px] text-slate-600">Confirm receipt and verification of original and photocopy credentials.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {['1. CNIC Copy (Front & Back)|Clear photocopy of valid computerized National Identity Card', '2. Blood Group Verification Report|Certified medical lab test report for smart ID card encoding', '3. 4 Recent Photographs|Four passport-size color photographs taken within the last 3 months', '4. Residential Utility Bill Copy|Electricity or gas bill photocopy for residential address verification'].map((item) => {
            const [title, text] = item.split('|');
            return <label key={title} className="flex gap-2 rounded-md border border-slate-300 bg-slate-50 p-3 text-[11px]"><input type="checkbox" defaultChecked /> <span><b>{title}</b><br /><span className="text-[10px] text-slate-600">{text}</span></span></label>;
          })}
        </div>
      </Panel>
      <Panel className="mt-5 border-yellow-300 bg-yellow-50">
        <h3 className="text-[13px] font-semibold">Legal Affidavit & Solemn Declaration</h3>
        <div className="mt-3 rounded-md border border-yellow-300 bg-white p-4 text-[12px] leading-6">
          I solemnly affirm and declare that I have never been convicted of any crime or criminal attempt, whether major or minor, in any court of law, nor am I involved in any unlawful activity. All information stated above has been personally and truthfully provided by me.
        </div>
        <label className="mt-3 flex gap-2 text-[11px]"><input type="checkbox" defaultChecked /> Affidavit confirmed and verified by applicant / HR registrar.</label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Digital Signature / Authorized Registration" required placeholder="asdsad" hint="Signature matches verified CNIC credential" />
          <Field label="Date of Registration" placeholder="10 / 08 / 2026" />
        </div>
      </Panel>
    </>
  );
}

function Panel({children, className = ''}: {children: React.ReactNode; className?: string}) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>{children}</section>;
}

function Label({children}: {children: React.ReactNode}) {
  return <div className="text-[11px] font-semibold text-slate-950">{children}</div>;
}

function Required() {
  return <span className="text-red-600">*</span>;
}

function Field({label, required, placeholder, type = 'text', hint, icon}: {label: string; required?: boolean; placeholder?: string; type?: string; hint?: string; icon?: boolean}) {
  return (
    <label className="block">
      <Label>{label}{required ? <Required /> : null}</Label>
      <span className="relative mt-2 block">
        <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-[12px] outline-none focus:border-blue-600" placeholder={placeholder} type={type} />
        {icon ? <Calendar className="absolute right-3 top-2.5 text-slate-500" size={14} /> : null}
      </span>
      {hint ? <span className="mt-2 block text-[9px] text-slate-600">{hint}</span> : null}
    </label>
  );
}

function SelectField({label, required, options}: {label: string; required?: boolean; options: string[]}) {
  return (
    <label className="block">
      <Label>{label}{required ? <Required /> : null}</Label>
      <select className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-[12px] outline-none focus:border-blue-600">{options.map((option) => <option key={option}>{option}</option>)}</select>
    </label>
  );
}

function TextArea({label, required, placeholder}: {label: string; required?: boolean; placeholder?: string}) {
  return (
    <label className="block">
      <Label>{label}{required ? <Required /> : null}</Label>
      <textarea className="mt-2 min-h-16 w-full rounded-md border border-slate-300 p-3 text-[12px] outline-none focus:border-blue-600" placeholder={placeholder} />
    </label>
  );
}

function ReferenceBlock({title, name, relation, contact, required}: {title: string; name: string; relation: string; contact: string; required?: boolean}) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">{title}</div>
      <Field label="Full Name" required={required} placeholder={name} />
      <Field label="Relation / Capacity" required={required} placeholder={relation} />
      <Field label="Contact Details & Address" required={required} placeholder={contact} />
    </div>
  );
}

function RoleOption({title, text, active}: {title: string; text: string; active?: boolean}) {
  return (
    <label className="relative flex gap-3 rounded-md border border-slate-300 p-4 text-[11px]">
      <input className="mt-1" type="radio" name="role" defaultChecked={active} />
      <span><b>{title}</b><br /><span className="text-[10px] text-slate-600">{text}</span></span>
    </label>
  );
}
