'use client';

import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {Dossier, Employee, EmployeeRequest} from '@/lib/contracts';
import {blankDossier, blankEmployer, validateDossier, firstInvalidStep, validatePhoto, fieldSteps} from '@/lib/dossier';
import {employeesApi, requestsApi} from '@/lib/services';
import {ApiError} from '@/lib/api-client';
import {formTranslations} from '@/lib/form-translations';
import Link from 'next/link';
import {Calendar, Check, Pencil, Upload} from 'lucide-react';

const steps = [
  '1. Personal Details',
  '2. Contact & Residence',
  '3. Jobs & References',
  '4. Role & Vehicle',
  '5. Documents & Affidavit',
];

type FormContextValue = {data:Dossier; update:(key:string,value:unknown)=>void; errors:Record<string,string>; language:'en'|'ur'; photo?:File; preview:string; upload:(file?:File)=>void; initialPhoto?:string; candidate:boolean};
const FormContext = createContext<FormContextValue>(null!);
function useForm() {return useContext(FormContext);}
function translation(text:string, language:'en'|'ur') {
  if(language==='en') return text;
  const key=Object.entries(formTranslations.en).find(([,value])=>value===text)?.[0];
  return key ? (formTranslations.ur as Record<string,string>)[key] : (extraUrdu[text] ?? text);
}
const extraUrdu:Record<string,string> = {'Reset':'واپس کریں','Cancel':'منسوخ کریں','Save Employee':'ملازم محفوظ کریں','Save & Enroll Employee':'ملازم کا اندراج مکمل کریں','Submit Application':'درخواست جمع کریں','Recent Photograph':'حالیہ پاسپورٹ سائز تصویر','Step 1: Personal & Identity Information':'مرحلہ ۱: ذاتی اور شناختی معلومات','Enter employee biographical credentials, CNIC, and designation.':'ملازم کی ذاتی معلومات، شناختی کارڈ اور عہدہ درج کریں۔','Date of Registration':'تاریخ اندراج','Organization':'ادارہ','Designation':'عہدہ','Years / Duration':'سال / مدت','Address / Location':'پتہ / مقام','Phone Number':'فون نمبر','Action':'عمل','Sr #':'نمبر','Full Name':'پورا نام','Relation / Capacity':'رشتہ / حیثیت','Contact Details & Address':'رابطہ اور پتہ','Reference 1 (Primary Guarantor)':'ضامن ۱ (بنیادی)','Reference 2 (Secondary Guarantor)':'ضامن ۲ (متبادل)','Vehicle Registration Number':'گاڑی کا رجسٹریشن نمبر','Driving Licence Number':'ڈرائیونگ لائسنس نمبر','Token Tax Status':'ٹوکن ٹیکس کی حیثیت','Standard Office / Warehouse Staff':'دفتری / گودام کا عملہ','Motorcycle Field Sales Executive':'موٹر سائیکل فیلڈ سیلز ایگزیکٹو','Delivery Van Driver':'ڈلیوری وین ڈرائیور','No vehicle or driving license required for daily duty':'روزانہ ڈیوٹی کے لیے گاڑی یا لائسنس ضروری نہیں','Field sales executive operating company or personal motorbike':'کمپنی یا ذاتی موٹر سائیکل پر فیلڈ سیلز','Pharmaceutical distribution driver for delivery van':'ادویات کی تقسیم کے لیے ڈلیوری وین ڈرائیور','Select Operational Role Category':'آپریشنل شعبہ منتخب کریں','Home Landline Phone (with Area Code)':'گھر کا لینڈ لائن فون','Residential landline if available':'گھر کا فون اگر موجود ہو','e.g. Brother, Father, Spouse with active phone':'بھائی، والد یا شریک حیات کا فعال فون','Secondary emergency phone if available':'متبادل ہنگامی فون اگر موجود ہو','Enter previous employers in reverse chronological order if applicable.':'سابقہ اداروں کو تازہ ترین ملازمت سے شروع کرتے ہوئے درج کریں۔','Provide verifiable contact details for two respectable references':'دو معزز ضامن کی قابل تصدیق معلومات درج کریں۔','Required office inspection copies and legally binding affidavit.':'ضروری دفتری نقول اور قانونی حلف نامہ۔','Confirm receipt and verification of original and photocopy credentials.':'اصل اسناد اور نقول کی وصولی اور تصدیق کریں۔'};
function T({text}:{text:string}) {return <>{translation(text,useForm().language)}</>;}
export function EmployeeForm({mode='add', employee, token, permitted, etag, onReload}: {mode?:'add'|'edit'|'candidate'; employee?:Employee; token?:string;etag?:string;onReload?:()=>void; permitted?:{candidateName:string;designation:string;roleCategory?:Dossier['roleCategory']}}) {
  const router=useRouter();
  const [step,setStep]=useState(1);
  const [language,setLanguage]=useState<'en'|'ur'>('en');
  const [data,setData]=useState<Dossier>(()=>employee?.dossier ?? {...blankDossier(),fullName:permitted?.candidateName??'',designation:permitted?.designation??'',roleCategory:permitted?.roleCategory??'office'});
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [photo,setPhoto]=useState<File>();
  const [preview,setPreview]=useState(employee?.photo??'');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<Employee|EmployeeRequest>();
  const dirty=useRef(false);
  const [revisionError,setRevisionError]=useState(false);
  function reloadLatest(){if(dirty.current&&!window.confirm('Reload the latest employee and discard your unsaved changes?'))return;dirty.current=false;onReload?.();}
  const isAdd=mode!=='edit';
  const candidate=mode==='candidate';
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
  useEffect(()=>{const click=(event:MouseEvent)=>{const link=(event.target as Element).closest('a');if(link && dirty.current){if(!window.confirm(language==='ur'?'غیر محفوظ تبدیلیاں ختم کریں؟':'Discard unsaved changes?')){event.preventDefault();event.stopPropagation();}else dirty.current=false;}};document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true);},[language]);
  useEffect(()=>{
    // shortcut: older browsers without Navigation API keep link/reload guards; add a legacy router blocker if required.
    const navigation=(window as Window & {navigation?:EventTarget}).navigation;
    const guard=(event:Event)=>{
      const navigate=event as Event & {navigationType?:string};
      if(!dirty.current||navigate.navigationType!=='traverse'||!event.cancelable)return;
      if(window.confirm(language==='ur'?'غیر محفوظ تبدیلیاں ختم کریں؟':'Discard unsaved changes?'))dirty.current=false;
      else event.preventDefault();
    };
    navigation?.addEventListener('navigate',guard);
    return()=>navigation?.removeEventListener('navigate',guard);
  },[language]);
  useEffect(()=>{if(!photo){setPreview(employee?.photo??'');return;}const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url);},[photo,employee?.photo]);
  function update(key:string,value:unknown){dirty.current=true;setData(previous=>({...previous,[key]:value}));}
  function upload(file?:File){const message=file?validatePhoto(file,language):'';if(message){setErrors(previous=>({...previous,photo:message}));return;}setErrors(previous=>({...previous,photo:''}));setPhoto(file);dirty.current=true;}
  function next(){const found=validateDossier(data,Boolean(photo||employee?.photo),language);const current=Object.fromEntries(Object.entries(found).filter(([key])=>fieldSteps[key]===step));setErrors(current);if(!Object.keys(current).length)setStep(value=>value+1);}
  async function submit(){
    if(busy)return;
    const found=validateDossier(data,Boolean(photo||employee?.photo),language);setErrors(found);
    if(Object.keys(found).length){setStep(firstInvalidStep(found));return;}
    setBusy(true);setError('');setRevisionError(false);
    try{
      const response=candidate ? await requestsApi.submit(token!,data,photo) : mode==='edit' ? await employeesApi.update(employee!.id,data,photo,etag) : await employeesApi.create(data,photo);
      if(!response.data?.id)throw new Error('The server did not confirm a record identifier.');
      if(candidate && !(response.data as EmployeeRequest).trackingId)throw new Error('The server did not return a tracking ID.');
      dirty.current=false;setResult(response.data);
      if(mode==='edit')router.push('/employees/'+encodeURIComponent(response.data.id));
    }catch(cause){if(cause instanceof ApiError && [412,428].includes(cause.status))setRevisionError(true);if(cause instanceof ApiError && cause.status===422){const fields:Record<string,string>={};for(const [key,value] of Object.entries(cause.fields)){const field=key.replace(/^dossier\./,'');fields[field]=value.join(' ');if(field.startsWith('primaryReference.'))fields.primaryReference=value.join(' ');}setErrors(fields);setStep(firstInvalidStep(fields));}setError(cause instanceof Error?cause.message:'Unable to submit.');}
    finally{setBusy(false);}
  }
  const translatedSteps=language==='en'?steps:[formTranslations.ur.step1,formTranslations.ur.step2,formTranslations.ur.step3,formTranslations.ur.step4,formTranslations.ur.step5];
  if(result)return <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">{candidate ? 'Application received. Tracking ID: '+(result as EmployeeRequest).trackingId : 'Employee saved: '+(result as Employee).displayId}{!candidate && <Link className="ml-4 text-blue-700" href={'/employees/'+encodeURIComponent(result.id)}>View Employee</Link>}</div>;
  return (
    <FormContext.Provider value={{data,update,errors,language,photo,preview,upload,initialPhoto:employee?.photo,candidate}}><div dir={language==='ur'?'rtl':'ltr'} lang={language} className="min-h-[calc(100vh-124px)] bg-[#f4f7fb] pb-20 text-slate-950">
      <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-200 bg-white px-1 pb-3 lg:flex-row lg:items-center">
        <div className="text-[12px] text-slate-600">
          {!candidate && <Link href="/employees" className="hover:text-blue-700">Employees</Link>}
          <span className="mx-2">/</span>
          <span className="font-semibold text-slate-950">{language==='ur'?'ملازم کا فارم':candidate?'Candidate Application':isAdd?'Add Employee Form':'Edit Employee Form'}</span>
        </div>
        <div className="flex flex-wrap gap-2">

          <button className="h-8 rounded-md border border-blue-600 px-3 text-[11px] text-blue-700" type="button" onClick={()=>setLanguage(value=>value==='en'?'ur':'en')}>{formTranslations[language].switchLabel}</button>
          <Link href={candidate?'/login':'/employees'} className="inline-flex h-8 items-center rounded-md border border-slate-500 px-3 text-[11px] text-slate-700 hover:bg-slate-50"><T text="Cancel" /></Link>
          <button className="h-8 rounded-md bg-[#123b6d] px-4 text-[11px] font-medium text-white hover:bg-[#0d2f58]" type="button" disabled={busy} onClick={()=>void submit()}>{busy?(language==='ur'?'محفوظ ہو رہا ہے…':'Saving…'):translation(candidate?'Submit Application':'Save & Enroll Employee',language)}</button>
        </div>
      </div>

      <div className="mx-auto max-w-[834px]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[18px] font-semibold">{language==='ur'?(candidate?'امیدوار کی رجسٹریشن':formTranslations.ur.mainHeading):candidate?'Candidate Registration':isAdd?'Add Employee - Enrollment Dossier':'Edit Employee - Enrollment Dossier'}</h1>
              <span className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white">Tawakkal Enterprises Channel 2</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-600">{formTranslations[language].mainSubheading}</p>
          </div>
          <span className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] text-slate-700">{language==='ur'?'مرحلہ':'Step'} {step} {language==='ur'?'از':'of'} 5</span>
        </div>

        {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}{revisionError&&onReload&&<button type="button" className="ml-3 rounded border border-red-400 px-3 py-1" onClick={reloadLatest}>Reload latest employee</button>}</div>}
        <form noValidate onSubmit={event=>{event.preventDefault();void submit();}} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-5 border-b border-slate-200 bg-white">
            {translatedSteps.map((label, index) => {
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
            <button
              className="h-9 rounded-md border border-slate-500 px-3 text-[12px] text-slate-700 disabled:opacity-0"
              type="button"
              disabled={step === 1||busy}
              onClick={() => setStep((value) => Math.max(1, value - 1))}
            >
              {language==='ur'?'پچھلا مرحلہ':'← Back to Step'} {step - 1}
            </button>
            {step < 5 ? (
              <button className="h-9 rounded-md bg-[#123b6d] px-4 text-[12px] font-medium text-white hover:bg-[#0d2f58]" type="button" disabled={busy} onClick={next}>
                {language==='ur'?'جاری رکھیں':'Continue to'} {language==='ur'?['رابطہ کی تفصیلات','سابقہ ملازمت','گاڑی / شعبہ','دستاویزات و حلف نامہ'][step-1]:step === 1 ? 'Contact Details' : step === 2 ? 'Employment Record' : step === 3 ? 'Vehicle / Role Info' : 'Documents & Affidavit'} &rarr;
              </button>
            ) : (
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-4 text-[12px] font-medium text-white hover:bg-emerald-800" type="button" disabled={busy} onClick={()=>void submit()}>
                {translation(candidate?'Submit Application':'Save & Enroll Employee',language)}
                <Check size={14} />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-5 py-3 ${candidate ? '' : 'lg:left-[250px]'}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-slate-700">{language==='ur'?'مرحلہ':'Editing: Step'} {step} / 5 ({translatedSteps[step-1]})</span>
          <div className="flex gap-2">
            <Link href={candidate?'/login':'/employees'} className="inline-flex h-8 items-center rounded-md border border-slate-500 px-3 text-[11px] text-slate-700"><T text="Cancel" /></Link>
            <button className="h-8 rounded-md bg-[#123b6d] px-4 text-[11px] font-medium text-white" type="button" disabled={busy} onClick={()=>void submit()}>{translation(candidate?'Submit Application':'Save Employee',language)}</button>
          </div>
        </div>
      </div>
    </div></FormContext.Provider>
  );
}

function StepHeader({title, text, page}: {title: string; text: string; page: string}) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h2 className="text-[15px] font-semibold"><T text={title} /></h2>
        <p className="mt-1 text-[10px] text-slate-600"><T text={text} /></p>
      </div>
      <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700">{useForm().language==='ur'?page.replace('Page','صفحہ').replace('of','از'):page}</span>
    </div>
  );
}

function StepOne() {
  const {preview,upload,errors,language}=useForm();
  const input=useRef<HTMLInputElement>(null);
  return (
    <>
      <StepHeader title="Step 1: Personal & Identity Information" text="Enter employee biographical credentials, CNIC, and designation." page="Page 1 of 5" />
      <Panel>
        <div className="grid gap-5 lg:grid-cols-[240px_1fr_1fr]">
          <div className="text-center">
            <Label><T text="Recent Photograph" /> <Required /></Label>
            <p className="mt-2 text-[10px] text-slate-600"><T text="Passport size photograph with Blue or White background"/></p>
            <div className="mx-auto mt-3 h-28 w-24 overflow-hidden rounded-md bg-slate-200">
              {preview ? <img src={preview} alt="Employee photo preview" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-500">{language==='ur'?'تصویر موجود نہیں':'No photo'}</span>}
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-600 px-2 text-[10px] text-blue-700" type="button" onClick={()=>input.current?.click()}><Upload size={12} /><T text="Upload Photo" /></button>
              <button className="h-7 rounded-md border border-slate-500 px-2 text-[10px]" type="button" onClick={()=>{upload(undefined);if(input.current)input.current.value='';}}><T text="Reset" /></button>
            </div>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event=>upload(event.target.files?.[0])} /><p className="mt-3 text-[9px] text-slate-600">JPG, PNG, WEBP | Max 3MB</p>{errors.photo && <p role="alert" className="text-xs text-red-600">{errors.photo}</p>}
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
            <SelectField label="Blood Group" required options={['Select Blood Group','A+','A-','B+','B-','AB+','AB-','O+','O-']} />
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
  const {data,update,language,errors}=useForm();
  const rows=data.employers;
  return (
    <>
      <StepHeader title="Step 3: Past Employment & References" text="Prior work history and guarantors who can verify credentials." page="Page 3 of 5" />
      <Panel className="mb-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#123b6d]"><T text="Previous Employment Record"/></h3>
          <button className="rounded-md border border-blue-600 px-3 py-2 text-[10px] text-blue-700" type="button" onClick={()=>update('employers',[...rows,blankEmployer()])}><T text="+ Add Employer Record" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead><tr>{['Sr #', 'Organization', 'Designation', 'Years / Duration', 'Address / Location', 'Phone Number', 'Action'].map((h) => <th key={h} className="border border-slate-300 bg-slate-50 p-2">{translation(h,language)}</th>)}</tr></thead>
            <tbody>{(rows.length?rows:[{rowId:'blank',organization:'',designation:'',duration:'',address:'',phone:''}]).map((row,index)=><tr key={row.rowId}><td className="border border-slate-300 p-1">{index+1}</td>{(['organization','designation','duration','address','phone'] as const).map(key=><td key={key} className="border border-slate-300 p-1"><input aria-label={translation(key==='organization'?'Organization':key==='designation'?'Designation':key==='duration'?'Years / Duration':key==='address'?'Address / Location':'Phone Number',language)+' '+(index+1)} className="h-8 w-full rounded border border-slate-300 px-2" value={row[key]} onChange={event=>update('employers',rows.length?rows.map(item=>item.rowId===row.rowId?{...item,[key]:event.target.value}:item):[{...blankEmployer(),[key]:event.target.value}])} /></td>)}<td className="border border-slate-300 p-1"><button aria-label="Remove employer record" type="button" onClick={()=>update('employers',rows.filter(item=>item.rowId!==row.rowId))} className="text-red-600">×</button></td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-slate-600"><T text="Enter previous employers in reverse chronological order if applicable."/></p>
      </Panel>
      <Panel>
        <h3 className="text-[13px] font-semibold text-[#123b6d]"><T text="Guarantors & References"/></h3>
        <p className="mt-2 text-[10px] text-slate-600"><T text="Provide verifiable contact details for two respectable references"/></p>
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
  const {data}=useForm();
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
        {data.roleCategory!=='office' && <div className="mt-4 grid gap-3 md:grid-cols-3"><Field label="Vehicle Registration Number" field="vehicleRegistration" required /><Field label="Driving Licence Number" field="drivingLicence" required /><SelectField label="Token Tax Status" field="tokenTaxStatus" options={['Not Provided','Paid & Up to Date','Unpaid / Pending']} /></div>}
      </Panel>
    </>
  );
}

function StepFive() {
  const {data,update,language,errors,candidate}=useForm();
  return (
    <>
      <StepHeader title="Step 5: Mandatory Documents & Solemn Declaration" text="Required office inspection copies and legally binding affidavit." page="Page 5 of 5" />
      <Panel>
        <h3 className="text-[13px] font-semibold text-[#123b6d]"><T text="Mandatory Attachments (For Official HR Inspection)"/></h3>
        <p className="mt-2 text-[10px] text-slate-600"><T text="Confirm receipt and verification of original and photocopy credentials."/></p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {['1. CNIC Copy (Front & Back)|Clear photocopy of valid computerized National Identity Card', '2. Blood Group Verification Report|Certified medical lab test report for smart ID card encoding', '3. 4 Recent Photographs|Four passport-size color photographs taken within the last 3 months', '4. Residential Utility Bill Copy|Electricity or gas bill photocopy for residential address verification'].map((item,index) => {
            const [title, text] = item.split('|');
            return <label key={title} className="flex gap-2 rounded-md border border-slate-300 bg-slate-50 p-3 text-[11px]"><input type="checkbox" checked={data.checklist[(['cnic','bloodReport','photographs','utilityBill'] as const)[index]]} onChange={event=>update('checklist',{...data.checklist,[(['cnic','bloodReport','photographs','utilityBill'] as const)[index]]:event.target.checked})} /> <span><b>{language==='ur'?['۱. شناختی کارڈ کی نقل (دونوں طرف)','۲. بلڈ گروپ رپورٹ','۳. چار حالیہ تصاویر','۴. رہائشی یوٹیلیٹی بل'][index]:title}</b><br /><span className="text-[10px] text-slate-600">{language==='ur'?['درست قومی شناختی کارڈ کی واضح نقل','مستند طبی لیبارٹری کی رپورٹ','گزشتہ ۳ ماہ کی پاسپورٹ سائز تصاویر','بجلی یا گیس کے بل کی نقل'][index]:text}</span></span></label>;
          })}
        </div>
      </Panel>
      <Panel className="mt-5 border-yellow-300 bg-yellow-50">
        <h3 className="text-[13px] font-semibold"><T text="Legal Affidavit & Solemn Declaration"/></h3>
        <div className="mt-3 rounded-md border border-yellow-300 bg-white p-4 text-[12px] leading-6">
          {formTranslations[language].affidavitBody}
        </div>
        <label className="mt-3 flex gap-2 text-[11px]"><input type="checkbox" checked={data.declarationAccepted} onChange={event=>update('declarationAccepted',event.target.checked)} /> {candidate && language==='en'?'I hereby accept and confirm the solemn declaration stated above.':formTranslations[language].lblAffirmationCheck}</label>
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
  return <div className="text-[11px] font-semibold text-slate-950">{typeof children==='string'?<T text={children}/>:children}</div>;
}

function Required() {
  return <span className="text-red-600">*</span>;
}

const labelKeys:Record<string,string>={'Full Name':'fullName',"Father's / Guardian's Name":'fatherName','Designation / Role':'designation','Date of Joining':'joiningDate','Date of Birth (Year - Month - Day)':'dateOfBirth','Gender':'gender','Marital Status':'maritalStatus','Dependents (Persons)':'dependents','Blood Group':'bloodGroup','CNIC Number':'cnic','CNIC Expiration Date':'cnicExpiry','Full Residential Address':'residentialAddress','Home Landline Phone (with Area Code)':'homePhone','Mobile Phone Number':'mobileNumber','Emergency Contact 1 (Primary)':'emergencyContact1','Emergency Contact 2 (Secondary)':'emergencyContact2','Digital Signature / Authorized Registration':'signature','Date of Registration':'signingDate'};
function Field({label,field,required,placeholder,type='text',hint,icon}: {label:string;field?:string;required?:boolean;placeholder?:string;type?:string;hint?:string;icon?:boolean}) {
  const {data,update,errors,language}=useForm();const key=field??labelKeys[label];
  const date=['joiningDate','dateOfBirth','cnicExpiry','signingDate'].includes(key);
  return <label className="block"><Label><T text={label}/>{required&&<Required/>}</Label><span className="relative mt-2 block"><input name={key} className="h-10 w-full rounded-md border border-slate-300 px-3 text-[12px] outline-none focus:border-blue-600" placeholder={language==='en'?placeholder:undefined} type={date?'date':type} min={type==='number'?0:undefined} value={String(data[key as keyof Dossier]??'')} aria-invalid={Boolean(errors[key])} onChange={event=>update(key,type==='number'?(event.target.value===''?'':Number(event.target.value)):event.target.value)}/></span>{hint&&<span className="mt-2 block text-[9px] text-slate-600"><T text={hint}/></span>}{errors[key]&&<span role="alert" className="text-xs text-red-600">{errors[key]}</span>}</label>;
}
function SelectField({label,field,required,options}:{label:string;field?:string;required?:boolean;options:string[]}) {
  const {data,update,errors,language}=useForm();const key=field??labelKeys[label];
  return <label className="block"><Label><T text={label}/>{required&&<Required/>}</Label><select name={key} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-[12px]" value={String(data[key as keyof Dossier]??'')} onChange={event=>update(key,event.target.value)}><option value="">{language==='en'?'Select…':'منتخب کریں…'}</option>{options.filter(option=>!option.startsWith('Select ')).map(option=><option key={option} value={option}>{language==='ur'?({'Male':'مرد','Female':'عورت','Single':'غیر شادی شدہ','Married':'شادی شدہ','Not Provided':'درج نہیں','Paid & Up to Date':'ادا شدہ','Unpaid / Pending':'غیر ادا شدہ'}[option]??option):option}</option>)}</select>{errors[key]&&<span role="alert" className="text-xs text-red-600">{errors[key]}</span>}</label>;
}
function TextArea({label,required,placeholder}:{label:string;required?:boolean;placeholder?:string}) {
  const {data,update,errors,language}=useForm();const key=labelKeys[label];
  return <label className="block"><Label><T text={label}/>{required&&<Required/>}</Label><textarea name={key} className="mt-2 min-h-16 w-full rounded-md border border-slate-300 p-3 text-[12px]" placeholder={language==='en'?placeholder:undefined} value={String(data[key as keyof Dossier]??'')} onChange={event=>update(key,event.target.value)}/>{errors[key]&&<span role="alert" className="text-xs text-red-600">{errors[key]}</span>}</label>;
}
function ReferenceBlock({title,required}:{title:string;name?:string;relation?:string;contact?:string;required?:boolean}) {
  const {data,update,language}=useForm();const key=required?'primaryReference':'secondaryReference';
  return <div className="space-y-3"><div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600"><T text={title}/></div>{(['name','relation','contact'] as const).map((field,index)=><label key={field} className="block text-[11px] font-semibold"><T text={['Full Name','Relation / Capacity','Contact Details & Address'][index]}/>{required&&<Required/>}<input name={key+'.'+field} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-[12px] font-normal" value={data[key][field]} onChange={event=>update(key,{...data[key],[field]:event.target.value})}/></label>)}</div>;
}
function RoleOption({title,text,value}:{title:string;text:string;value:Dossier['roleCategory']}) {
  const {data,update}=useForm();return <label className="relative flex gap-3 rounded-md border border-slate-300 p-4 text-[11px]"><input className="mt-1" type="radio" name="roleCategory" value={value} checked={data.roleCategory===value} onChange={()=>update('roleCategory',value)}/><span><b><T text={title}/></b><br/><span className="text-[10px] text-slate-600"><T text={text}/></span></span></label>;
}
