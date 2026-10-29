'use client';

import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {Dossier, Employee, EmployeeRequest, IDCard} from '@/lib/contracts';
import {blankDossier, blankEmployer, validateDossier, firstInvalidStep, validatePhoto, validateDocument, fieldSteps, documentTypes, DOCUMENT_ACCEPT} from '@/lib/dossier';
import {cardsApi, employeesApi, invitesApi, requestsApi} from '@/lib/services';
import {ApiError} from '@/lib/api-client';
import Link from 'next/link';
import {Check, Upload, X} from 'lucide-react';

const steps = [
  '1. Personal Details',
  '2. Contact & Residence',
  '3. Jobs & References',
  '4. Role & Vehicle',
  '5. Documents & Declaration',
];

const affidavit = 'I solemnly affirm and declare that I have never been convicted of any crime or criminal attempt, whether major or minor, in any court of law, nor am I involved in any unlawful activity. All information stated above has been personally and truthfully provided by me. I am not involved in any disruptive political activity and take full legal responsibility for the veracity of this submission. I have thoroughly read, reviewed, and understood the entire application form.';

type StagedDocument = {id: string; type: string; file: File};
type Outcome = {employee?: Employee; request?: EmployeeRequest; uploadFailures: string[]; card?: IDCard; cardError?: string};
type FormContextValue = {
  data: Dossier; update: (key: string, value: unknown) => void; errors: Record<string, string>;
  photo?: File; preview: string; upload: (file?: File) => void; candidate: boolean;
  staged: StagedDocument[]; stageDocuments: (type: string, files: FileList | null) => void; unstageDocument: (id: string) => void;
  existing: Employee['documents']; issueCard: boolean; setIssueCard: (value: boolean) => void; canIssue: boolean;
  checkCnic: () => Promise<boolean>;
};
const FormContext = createContext<FormContextValue>(null!);
function useForm() {return useContext(FormContext);}

export function EmployeeForm({mode = 'add', employee, token, permitted, etag, onReload}: {mode?: 'add' | 'edit' | 'candidate'; employee?: Employee; token?: string; etag?: string; onReload?: () => void; permitted?: {candidateName: string; designation: string; roleCategory?: Dossier['roleCategory']}}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Dossier>(() => employee?.dossier ?? {...blankDossier(), fullName: permitted?.candidateName ?? '', designation: permitted?.designation ?? '', roleCategory: permitted?.roleCategory ?? 'office'});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState(employee?.photo ?? '');
  const [staged, setStaged] = useState<StagedDocument[]>([]);
  const [issueCard, setIssueCard] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>();
  const dirty = useRef(false);
  const [revisionError, setRevisionError] = useState(false);
  const isAdd = mode !== 'edit';
  const candidate = mode === 'candidate';

  function reloadLatest() {if (dirty.current && !window.confirm('Reload the latest employee and discard your unsaved changes?')) return; dirty.current = false; onReload?.();}
  useEffect(() => {const warn = (e: BeforeUnloadEvent) => {if (dirty.current) {e.preventDefault(); e.returnValue = '';}}; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);}, []);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a');
      if (link && dirty.current) {
        if (!window.confirm('Discard unsaved changes?')) {event.preventDefault(); event.stopPropagation();}
        else dirty.current = false;
      }
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, []);
  useEffect(() => {
    // shortcut: older browsers without Navigation API keep link/reload guards; add a legacy router blocker if required.
    const navigation = (window as Window & {navigation?: EventTarget}).navigation;
    const guard = (event: Event) => {
      const navigate = event as Event & {navigationType?: string};
      if (!dirty.current || navigate.navigationType !== 'traverse' || !event.cancelable) return;
      if (window.confirm('Discard unsaved changes?')) dirty.current = false;
      else event.preventDefault();
    };
    navigation?.addEventListener('navigate', guard);
    return () => navigation?.removeEventListener('navigate', guard);
  }, []);
  useEffect(() => {if (!photo) {setPreview(employee?.photo ?? ''); return;} const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url);}, [photo, employee?.photo]);

  function update(key: string, value: unknown) {dirty.current = true; setData(previous => ({...previous, [key]: value}));}
  function upload(file?: File) {
    const message = file ? validatePhoto(file) : '';
    if (message) {setErrors(previous => ({...previous, photo: message})); return;}
    setErrors(previous => ({...previous, photo: ''}));
    setPhoto(file);
    dirty.current = true;
  }
  function stageDocuments(type: string, files: FileList | null) {
    if (!files?.length) return;
    const accepted: StagedDocument[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const message = validateDocument(file);
      if (message) rejected.push(`${file.name}: ${message}`);
      else accepted.push({id: crypto.randomUUID(), type, file});
    }
    setErrors(previous => ({...previous, documents: rejected.join(' ')}));
    if (accepted.length) {setStaged(previous => [...previous, ...accepted]); dirty.current = true;}
  }
  function unstageDocument(id: string) {setStaged(previous => previous.filter(item => item.id !== id));}

  // Tells the user right away when a CNIC is already registered, instead of failing after the last step.
  async function checkCnic() {
    const cnic = data.cnic.trim();
    if (!/^\d{5}-\d{7}-\d$/.test(cnic) || (mode === 'edit' && cnic === employee?.dossier.cnic)) return false;
    try {
      const result = candidate ? await invitesApi.checkCnic(token!, cnic) : await employeesApi.checkCnic(cnic, employee?.id);
      if (result.registered) setErrors(previous => ({...previous, cnic: 'This CNIC is already registered.'}));
      return result.registered;
    } catch {return false;} // the server repeats this check when saving
  }

  async function next() {
    const found = validateDossier(data, Boolean(photo || employee?.photo));
    const current = Object.fromEntries(Object.entries(found).filter(([key]) => fieldSteps[key] === step));
    if (step === 1 && !current.cnic && await checkCnic()) return;
    setErrors(current);
    if (!Object.keys(current).length) setStep(value => value + 1);
  }

  async function uploadStaged(employeeId: string) {
    const failures: string[] = [];
    for (const item of staged) {
      try {await employeesApi.uploadDocument(employeeId, item.type, item.file);}
      catch (cause) {
        const detail = cause instanceof ApiError ? (Object.values(cause.fields)[0]?.[0] ?? cause.message) : 'upload failed';
        failures.push(`${item.file.name}: ${detail}`);
      }
    }
    return failures;
  }

  async function submit() {
    if (busy) return;
    const found = validateDossier(data, Boolean(photo || employee?.photo));
    if (!found.cnic && await checkCnic()) {setStep(1); return;}
    setErrors(found);
    if (Object.keys(found).length) {setStep(firstInvalidStep(found)); return;}
    setBusy(true); setError(''); setRevisionError(false);
    try {
      const response = candidate ? await requestsApi.submit(token!, data, photo, staged.map(({type, file}) => ({type, file}))) : mode === 'edit' ? await employeesApi.update(employee!.id, data, photo, etag) : await employeesApi.create(data, photo);
      if (!response.data?.id) throw new Error('The server did not confirm a record identifier.');
      if (candidate && !(response.data as EmployeeRequest).trackingId) throw new Error('The server did not return a tracking ID.');
      dirty.current = false;
      if (candidate) {setOutcome({request: response.data as EmployeeRequest, uploadFailures: []}); return;}
      const saved = response.data as Employee;
      const uploadFailures = await uploadStaged(saved.id);
      if (mode === 'edit' && !uploadFailures.length) {router.push('/employees/view?id=' + encodeURIComponent(saved.id)); return;}
      let card: IDCard | undefined;
      let cardError: string | undefined;
      if (mode === 'add' && issueCard) {
        try {
          const policy = (await cardsApi.policy()).data;
          if (!policy?.canIssue) throw new Error('The card validity policy is not configured.');
          card = (await cardsApi.issue(saved.id, policy.mode === 'selected_years' ? policy.validityYears[0] : undefined)).data;
        } catch (cause) {cardError = cause instanceof Error ? cause.message : 'Unable to issue the ID card.';}
      }
      setOutcome({employee: saved, uploadFailures, card, cardError});
    } catch (cause) {
      if (cause instanceof ApiError && [412, 428].includes(cause.status)) setRevisionError(true);
      if (cause instanceof ApiError && cause.status === 422) {
        const fields: Record<string, string> = {};
        for (const [key, value] of Object.entries(cause.fields)) {
          const field = key.replace(/^dossier\./, '');
          fields[field] = value.join(' ');
          if (field.startsWith('primaryReference.')) fields.primaryReference = value.join(' ');
        }
        setErrors(fields); setStep(firstInvalidStep(fields));
      }
      setError(cause instanceof Error ? cause.message : 'Unable to submit.');
    } finally {setBusy(false);}
  }

  if (outcome) {
    return (
      <div role="status" className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm">
        {outcome.request ? <p>Application received. Tracking ID: {outcome.request.trackingId}</p> : <p>Employee saved: {outcome.employee!.displayId}</p>}
        {outcome.card && <p>ID card issued: {outcome.card.number} <Link className="ml-2 text-blue-700" href={'/id-cards/view?id=' + encodeURIComponent(outcome.card.id)}>View ID Card</Link></p>}
        {outcome.cardError && <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-800">The employee was saved but the ID card could not be issued: {outcome.cardError}. You can issue it from the employee list.</p>}
        {outcome.uploadFailures.length > 0 && (
          <div role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-800">
            <p>The employee was saved but {outcome.uploadFailures.length} document(s) could not be uploaded. Upload them again from the Documents tab:</p>
            <ul className="mt-1 list-disc pl-5">{outcome.uploadFailures.map(item => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
        {outcome.employee && <Link className="inline-block text-blue-700" href={'/employees/view?id=' + encodeURIComponent(outcome.employee.id)}>View Employee</Link>}
      </div>
    );
  }

  return (
    <FormContext.Provider value={{data, update, errors, photo, preview, upload, candidate, staged, stageDocuments, unstageDocument, existing: employee?.documents ?? [], issueCard, setIssueCard, canIssue: isAdd && !candidate, checkCnic}}>
      <div className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] pb-20 text-slate-950">
        <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-200 bg-white px-1 pb-3 lg:flex-row lg:items-center">
          <div className="text-[12px] text-slate-600">
            {!candidate && <Link href="/employees" className="hover:text-blue-700">Employees</Link>}
            <span className="mx-2">/</span>
            <span className="font-semibold text-slate-950">{candidate ? 'Candidate Application' : isAdd ? 'Add Employee Form' : 'Edit Employee Form'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={candidate ? '/login' : '/employees'} className="inline-flex h-8 items-center rounded-md border border-slate-500 px-3 text-[11px] text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button className="h-8 rounded-md bg-[#123b6d] px-4 text-[11px] font-medium text-white hover:bg-[#0d2f58]" type="button" disabled={busy} onClick={() => void submit()}>{busy ? 'Saving…' : candidate ? 'Submit Application' : 'Save & Enroll Employee'}</button>
          </div>
        </div>

        <div className="mx-auto max-w-[834px]">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[18px] font-semibold">{candidate ? 'Candidate Registration' : isAdd ? 'Add Employee - Enrollment Dossier' : 'Edit Employee - Enrollment Dossier'}</h1>
                <span className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white">Tawakal Enterprises Channel 2</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-600">Complete official 5-step employment application and Smart ID registration record.</p>
            </div>
            <span className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] text-slate-700">Step {step} of 5</span>
          </div>

          {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}{revisionError && onReload && <button type="button" className="ml-3 rounded border border-red-400 px-3 py-1" onClick={reloadLatest}>Reload latest employee</button>}</div>}
          <form noValidate onSubmit={event => {event.preventDefault(); void submit();}} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
                    disabled={busy}
                    onClick={() => setStep(number)}
                  >
                    <span className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold ${active ? 'bg-[#123b6d] text-white' : complete ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{number}</span>
                    {label}
                  </button>
                );
              })}
            </div>

            <fieldset disabled={busy} className="p-5">
              {step === 1 ? <StepOne /> : null}
              {step === 2 ? <StepTwo /> : null}
              {step === 3 ? <StepThree /> : null}
              {step === 4 ? <StepFour /> : null}
              {step === 5 ? <StepFive /> : null}
            </fieldset>

            <div className="flex items-center justify-between px-5 pb-5">
              <button className="h-9 rounded-md border border-slate-500 px-3 text-[12px] text-slate-700 disabled:opacity-0" type="button" disabled={step === 1 || busy} onClick={() => setStep(value => Math.max(1, value - 1))}>
                ← Back to Step {step - 1}
              </button>
              {step < 5 ? (
                <button className="h-9 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]" type="button" disabled={busy} onClick={() => void next()}>
                  Continue to {['Contact Details', 'Employment Record', 'Vehicle / Role Info', 'Documents & Declaration'][step - 1]}
                </button>
              ) : (
                <button className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-4 text-[12px] font-medium text-white hover:bg-emerald-800" type="button" disabled={busy} onClick={() => void submit()}>
                  {candidate ? 'Submit Application' : 'Save & Enroll Employee'}
                  <Check size={14} />
                </button>
              )}
            </div>
          </form>
        </div>

        <div className={`fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-5 py-3 ${candidate ? '' : 'lg:left-[250px]'}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] text-slate-700">Editing: Step {step} / 5 ({steps[step - 1]})</span>
            <div className="flex gap-2">
              <Link href={candidate ? '/login' : '/employees'} className="inline-flex h-8 items-center rounded-md border border-slate-500 px-3 text-[11px] text-slate-700">Cancel</Link>
              <button className="h-8 rounded-md bg-[#123b6d] px-4 text-[11px] font-medium text-white" type="button" disabled={busy} onClick={() => void submit()}>{candidate ? 'Submit Application' : 'Save Employee'}</button>
            </div>
          </div>
        </div>
      </div>
    </FormContext.Provider>
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
  const {preview, upload, errors} = useForm();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <StepHeader title="Step 1: Personal & Identity Information" text="Enter employee biographical credentials, CNIC, and designation." page="Page 1 of 5" />
      <Panel>
        <div className="grid gap-5 lg:grid-cols-[240px_1fr_1fr]">
          <div className="text-center">
            <Label>Recent Photograph <Required /></Label>
            <p className="mt-2 text-[10px] text-slate-600">Passport size photograph with Blue or White background</p>
            <div className="mx-auto mt-3 h-28 w-24 overflow-hidden rounded-md bg-slate-200">
              {preview ? <img src={preview} alt="Employee photo preview" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-500">No photo</span>}
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-600 px-2 text-[10px] text-blue-700" type="button" onClick={() => input.current?.click()}><Upload size={12} />Upload Photo</button>
              <button className="h-7 rounded-md border border-slate-500 px-2 text-[10px]" type="button" onClick={() => {upload(undefined); if (input.current) input.current.value = '';}}>Reset</button>
            </div>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => upload(event.target.files?.[0])} />
            <p className="mt-3 text-[9px] text-slate-600">JPG, PNG, WEBP | Max 3MB</p>
            {errors.photo && <p role="alert" className="text-xs text-red-600">{errors.photo}</p>}
          </div>
          <div className="space-y-4">
            <Field label="Full Name" required placeholder="e.g. Kamran Shahzad" />
            <Field label="Designation / Role" required placeholder="e.g. Medical Sales Representative" />
            <Field label="Date of Birth (Year - Month - Day)" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Marital Status" required options={['Single', 'Married']} />
              <Field label="Dependents (Persons)" type="number" placeholder="0" />
            </div>
            <Field label="CNIC Number" required placeholder="42101-XXXXXXX-X" hint="13-digit National ID format with hyphens" />
          </div>
          <div className="space-y-4">
            <Field label="Father's / Guardian's Name" required placeholder="e.g. Muhammad Shahzad" />
            <Field label="Date of Joining" required />
            <SelectField label="Gender" required options={['Male', 'Female']} />
            <SelectField label="Blood Group" required options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            <Field label="CNIC Expiration Date" required />
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

const employerColumns = [['organization', 'Organization'], ['designation', 'Designation'], ['duration', 'Years / Duration'], ['address', 'Address / Location'], ['phone', 'Phone Number']] as const;

function StepThree() {
  const {data, update, errors} = useForm();
  const rows = data.employers;
  const shown = rows.length ? rows : [{rowId: 'blank', organization: '', designation: '', duration: '', address: '', phone: ''}];
  return (
    <>
      <StepHeader title="Step 3: Past Employment & References" text="Prior work history and guarantors who can verify credentials." page="Page 3 of 5" />
      <Panel className="mb-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#123b6d]">Previous Employment Record</h3>
          <button className="rounded-md border border-blue-600 px-3 py-2 text-[10px] text-blue-700" type="button" onClick={() => update('employers', [...rows, blankEmployer()])}>+ Add Employer Record</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr>{['Sr #', ...employerColumns.map(([, label]) => label), 'Action'].map(h => <th key={h} className="border border-slate-300 bg-slate-50 p-2">{h}</th>)}</tr></thead>
            <tbody>
              {shown.map((row, index) => (
                <tr key={row.rowId}>
                  <td className="border border-slate-300 p-1">{index + 1}</td>
                  {employerColumns.map(([key, label]) => (
                    <td key={key} className="border border-slate-300 p-1">
                      <input aria-label={`${label} ${index + 1}`} className="h-8 w-full rounded border border-slate-300 px-2" value={row[key]}
                        onChange={event => update('employers', rows.length ? rows.map(item => item.rowId === row.rowId ? {...item, [key]: event.target.value} : item) : [{...blankEmployer(), [key]: event.target.value}])} />
                    </td>
                  ))}
                  <td className="border border-slate-300 p-1"><button aria-label="Remove employer record" type="button" onClick={() => update('employers', rows.filter(item => item.rowId !== row.rowId))} className="text-red-600">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-slate-600">Enter previous employers in reverse chronological order if applicable.</p>
      </Panel>
      <Panel>
        <h3 className="text-[13px] font-semibold text-[#123b6d]">Guarantors & References</h3>
        <p className="mt-2 text-[10px] text-slate-600">Provide verifiable contact details for two respectable references</p>
        {errors.primaryReference && <p role="alert" className="text-xs text-red-600">{errors.primaryReference}</p>}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ReferenceBlock title="Reference 1 (Primary Guarantor)" required />
          <ReferenceBlock title="Reference 2 (Secondary Guarantor)" />
        </div>
      </Panel>
    </>
  );
}

function StepFour() {
  const {data} = useForm();
  return (
    <>
      <StepHeader title="Step 4: Role Specification (Sales Staff & Drivers)" text="Vehicle details, driving license, and token tax status (if applicable)." page="Page 4 of 5" />
      <Panel>
        <Label>Select Operational Role Category</Label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <RoleOption value="office" title="Standard Office / Warehouse Staff" text="No vehicle or driving license required for daily duty" />
          <RoleOption value="motorcycle" title="Motorcycle Field Sales Executive" text="Field sales executive operating company or personal motorbike" />
          <RoleOption value="van" title="Delivery Van Driver" text="Pharmaceutical distribution driver for delivery van" />
        </div>
        {data.roleCategory !== 'office' && <div className="mt-4 grid gap-3 md:grid-cols-3"><Field label="Vehicle Registration Number" field="vehicleRegistration" required /><Field label="Driving Licence Number" field="drivingLicence" required /><SelectField label="Token Tax Status" field="tokenTaxStatus" options={['Not Provided', 'Paid & Up to Date', 'Unpaid / Pending']} /></div>}
      </Panel>
    </>
  );
}

function StepFive() {
  const {data, update, errors, candidate, staged, stageDocuments, unstageDocument, existing, issueCard, setIssueCard, canIssue} = useForm();
  return (
    <>
      <StepHeader title="Step 5: Documents & Declaration" text="Upload the supporting documents and accept the declaration." page="Page 5 of 5" />
      <Panel>
          <h3 className="text-[13px] font-semibold text-[#123b6d]">Supporting Documents</h3>
          <p className="mt-2 text-[10px] text-slate-600">PDF, JPG, PNG or WEBP only, up to 5 MB per file.{candidate ? '' : " Documents can also be added later from the employee's Documents tab."}</p>
          {errors.documents && <p role="alert" className="mt-2 text-xs text-red-600">{errors.documents}</p>}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {documentTypes.map(({value, label, hint}) => {
              const files = staged.filter(item => item.type === value);
              const saved = existing.filter(item => item.type === value).length;
              return (
                <div key={value} className="rounded-md border border-slate-300 bg-slate-50 p-3 text-[11px]">
                  <div className="font-semibold">{label}</div>
                  <p className="mt-1 text-[10px] text-slate-600">{hint}</p>
                  {saved > 0 && <p className="mt-1 text-[10px] text-emerald-700">{saved} already uploaded</p>}
                  <label className="mt-2 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-blue-600 bg-white px-2 text-[10px] text-blue-700">
                    <Upload size={12} />Choose file(s)
                    <input type="file" multiple className="sr-only" accept={DOCUMENT_ACCEPT} aria-label={`Upload ${label}`} onChange={event => {stageDocuments(value, event.target.files); event.target.value = '';}} />
                  </label>
                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {files.map(item => (
                        <li key={item.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1">
                          <span className="truncate">{item.file.name} <span className="text-slate-500">({Math.max(1, Math.round(item.file.size / 1024))} KB)</span></span>
                          <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => unstageDocument(item.id)} className="text-red-600"><X size={12} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      <Panel className="mt-5 border-yellow-300 bg-yellow-50">
        <h3 className="text-[13px] font-semibold">Legal Affidavit & Solemn Declaration</h3>
        <div className="mt-3 rounded-md border border-yellow-300 bg-white p-4 text-[12px] leading-6">&ldquo;{affidavit}&rdquo;</div>
        <label className="mt-3 flex gap-2 text-[11px]"><input type="checkbox" checked={data.declarationAccepted} onChange={event => update('declarationAccepted', event.target.checked)} /> {candidate ? 'I hereby accept and confirm the solemn declaration stated above.' : 'Affidavit confirmed and verified by applicant / HR registrar.'}</label>
        {errors.declarationAccepted && <p role="alert" className="text-xs text-red-600">{errors.declarationAccepted}</p>}
      </Panel>
      {canIssue && (
        <Panel className="mt-5">
          <label className="flex gap-2 text-[12px]"><input type="checkbox" checked={issueCard} onChange={event => setIssueCard(event.target.checked)} /> Issue the employee&apos;s ID card as soon as the employee is saved</label>
          <p className="mt-1 text-[10px] text-slate-600">The card is valid for the approved validity period (11 months).</p>
        </Panel>
      )}
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

const labelKeys: Record<string, string> = {'Full Name': 'fullName', "Father's / Guardian's Name": 'fatherName', 'Designation / Role': 'designation', 'Date of Joining': 'joiningDate', 'Date of Birth (Year - Month - Day)': 'dateOfBirth', 'Gender': 'gender', 'Marital Status': 'maritalStatus', 'Dependents (Persons)': 'dependents', 'Blood Group': 'bloodGroup', 'CNIC Number': 'cnic', 'CNIC Expiration Date': 'cnicExpiry', 'Full Residential Address': 'residentialAddress', 'Home Landline Phone (with Area Code)': 'homePhone', 'Mobile Phone Number': 'mobileNumber', 'Emergency Contact 1 (Primary)': 'emergencyContact1', 'Emergency Contact 2 (Secondary)': 'emergencyContact2'};
function Field({label, field, required, placeholder, type = 'text', hint}: {label: string; field?: string; required?: boolean; placeholder?: string; type?: string; hint?: string}) {
  const {data, update, errors, checkCnic} = useForm();
  const key = field ?? labelKeys[label];
  const date = ['joiningDate', 'dateOfBirth', 'cnicExpiry'].includes(key);
  return (
    <label className="block">
      <Label>{label}{required && <Required />}</Label>
      <span className="relative mt-2 block">
        <input name={key} className="h-10 w-full rounded-md border border-slate-300 px-3 text-[12px] outline-none focus:border-blue-600" placeholder={placeholder} type={date ? 'date' : type} min={type === 'number' ? 0 : undefined} value={String(data[key as keyof Dossier] ?? '')} aria-invalid={Boolean(errors[key])} onBlur={key === 'cnic' ? () => void checkCnic() : undefined} onChange={event => update(key, type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)} />
      </span>
      {hint && <span className="mt-2 block text-[9px] text-slate-600">{hint}</span>}
      {errors[key] && <span role="alert" className="text-xs text-red-600">{errors[key]}</span>}
    </label>
  );
}
function SelectField({label, field, required, options}: {label: string; field?: string; required?: boolean; options: string[]}) {
  const {data, update, errors} = useForm();
  const key = field ?? labelKeys[label];
  return (
    <label className="block">
      <Label>{label}{required && <Required />}</Label>
      <select name={key} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-[12px]" value={String(data[key as keyof Dossier] ?? '')} onChange={event => update(key, event.target.value)}>
        <option value="">Select…</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {errors[key] && <span role="alert" className="text-xs text-red-600">{errors[key]}</span>}
    </label>
  );
}
function TextArea({label, required, placeholder}: {label: string; required?: boolean; placeholder?: string}) {
  const {data, update, errors} = useForm();
  const key = labelKeys[label];
  return (
    <label className="block">
      <Label>{label}{required && <Required />}</Label>
      <textarea name={key} className="mt-2 min-h-16 w-full rounded-md border border-slate-300 p-3 text-[12px]" placeholder={placeholder} value={String(data[key as keyof Dossier] ?? '')} onChange={event => update(key, event.target.value)} />
      {errors[key] && <span role="alert" className="text-xs text-red-600">{errors[key]}</span>}
    </label>
  );
}
function ReferenceBlock({title, required}: {title: string; required?: boolean}) {
  const {data, update} = useForm();
  const key = required ? 'primaryReference' : 'secondaryReference';
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">{title}</div>
      {(['name', 'relation', 'contact'] as const).map((field, index) => (
        <label key={field} className="block text-[11px] font-semibold">
          {['Full Name', 'Relation / Capacity', 'Contact Details & Address'][index]}{required && <Required />}
          <input name={key + '.' + field} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-[12px] font-normal" value={data[key][field]} onChange={event => update(key, {...data[key], [field]: event.target.value})} />
        </label>
      ))}
    </div>
  );
}
function RoleOption({title, text, value}: {title: string; text: string; value: Dossier['roleCategory']}) {
  const {data, update} = useForm();
  return (
    <label className="relative flex gap-3 rounded-md border border-slate-300 p-4 text-[11px]">
      <input className="mt-1" type="radio" name="roleCategory" value={value} checked={data.roleCategory === value} onChange={() => update('roleCategory', value)} />
      <span><b>{title}</b><br /><span className="text-[10px] text-slate-600">{text}</span></span>
    </label>
  );
}
