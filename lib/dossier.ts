import type {Dossier, Employer} from './contracts';
export const blankEmployer = (): Employer => ({rowId: crypto.randomUUID(), organization: '', designation: '', duration: '', address: '', phone: ''});
export function blankDossier(): Dossier {
  return {fullName:'',fatherName:'',designation:'',joiningDate:'',dateOfBirth:'',gender:'',maritalStatus:'',dependents:0,bloodGroup:'',cnic:'',cnicExpiry:'',residentialAddress:'',homePhone:'',mobileNumber:'',emergencyContact1:'',emergencyContact2:'',employers:[],primaryReference:{name:'',relation:'',contact:''},secondaryReference:{name:'',relation:'',contact:''},roleCategory:'office',vehicleRegistration:'',drivingLicence:'',tokenTaxStatus:'',checklist:{cnic:false,bloodReport:false,photographs:false,utilityBill:false},declarationAccepted:false,signature:'',signingDate:''};
}
export const fieldSteps: Record<string, number> = {fullName:1,fatherName:1,designation:1,joiningDate:1,dateOfBirth:1,gender:1,maritalStatus:1,dependents:1,bloodGroup:1,cnic:1,cnicExpiry:1,photo:1,residentialAddress:2,mobileNumber:2,emergencyContact1:2,primaryReference:3,vehicleRegistration:4,drivingLicence:4,declarationAccepted:5,signature:5,signingDate:5};
export function validateDossier(data: Dossier, hasPhoto: boolean, language: 'en' | 'ur' = 'en') {
  const errors: Record<string,string> = {};
  const required = language === 'ur' ? 'یہ خانہ ضروری ہے۔' : 'This field is required.';
  for (const field of ['fullName','fatherName','designation','joiningDate','dateOfBirth','gender','maritalStatus','bloodGroup','cnic','cnicExpiry','residentialAddress','mobileNumber','emergencyContact1','signature','signingDate'] as const) if (!String(data[field]).trim()) errors[field] = required;
  for (const field of ['joiningDate','dateOfBirth','cnicExpiry','signingDate'] as const) {
    const value = data[field];
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value)) errors[field] = language === 'ur' ? 'درست تاریخ درج کریں۔' : 'Enter a valid date.';
  }
  if (data.cnic && !/^\d{5}-\d{7}-\d$/.test(data.cnic)) errors.cnic = language === 'ur' ? 'شناختی کارڈ نمبر ۱۳ ہندسوں اور ڈیشز کے ساتھ درج کریں۔' : 'Use the 13-digit format 12345-1234567-1.';
  if (data.dependents === '' || !Number.isInteger(Number(data.dependents)) || Number(data.dependents)<0) errors.dependents = language === 'ur' ? 'صفر یا مثبت مکمل عدد درج کریں۔' : 'Enter a nonnegative whole number.';
  if (!hasPhoto) errors.photo = required;
  if (!data.primaryReference.name.trim() || !data.primaryReference.relation.trim() || !data.primaryReference.contact.trim()) errors.primaryReference = required;
  if (data.roleCategory !== 'office') {if (!data.vehicleRegistration.trim()) errors.vehicleRegistration=required; if (!data.drivingLicence.trim()) errors.drivingLicence=required;}
  if (!data.declarationAccepted) errors.declarationAccepted = language === 'ur' ? 'حلف نامے کی تصدیق کریں۔' : 'Accept the declaration before submission.';
  return errors;
}
export function firstInvalidStep(errors: Record<string, unknown>) {return Math.min(...Object.keys(errors).map(key => fieldSteps[key.replace(/^dossier\./,'').split('.')[0]] ?? 1));}
export function validatePhoto(file: Pick<File, 'type' | 'size'>) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Choose a JPEG, PNG or WebP image.';
  if (file.size > 3 * 1024 * 1024) return 'Photo must be at most 3 MB.';
  return '';
}
