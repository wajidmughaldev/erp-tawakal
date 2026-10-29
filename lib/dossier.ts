import type {Dossier, Employer} from './contracts';
export const blankEmployer = (): Employer => ({rowId: crypto.randomUUID(), organization: '', designation: '', duration: '', address: '', phone: ''});
export function blankDossier(): Dossier {
  return {fullName:'',fatherName:'',designation:'',joiningDate:'',dateOfBirth:'',gender:'',maritalStatus:'',dependents:0,bloodGroup:'',cnic:'',cnicExpiry:'',residentialAddress:'',homePhone:'',mobileNumber:'',emergencyContact1:'',emergencyContact2:'',employers:[],primaryReference:{name:'',relation:'',contact:''},secondaryReference:{name:'',relation:'',contact:''},roleCategory:'office',vehicleRegistration:'',drivingLicence:'',tokenTaxStatus:'',declarationAccepted:false};
}
export const fieldSteps: Record<string, number> = {fullName:1,fatherName:1,designation:1,joiningDate:1,dateOfBirth:1,gender:1,maritalStatus:1,dependents:1,bloodGroup:1,cnic:1,cnicExpiry:1,photo:1,residentialAddress:2,mobileNumber:2,emergencyContact1:2,primaryReference:3,vehicleRegistration:4,drivingLicence:4,declarationAccepted:5,documents:5};
export function validateDossier(data: Dossier, hasPhoto: boolean) {
  const errors: Record<string,string> = {};
  const required = 'This field is required.';
  for (const field of ['fullName','fatherName','designation','joiningDate','dateOfBirth','gender','maritalStatus','bloodGroup','cnic','cnicExpiry','residentialAddress','mobileNumber','emergencyContact1'] as const) if (!String(data[field]).trim()) errors[field] = required;
  for (const field of ['joiningDate','dateOfBirth','cnicExpiry'] as const) {
    const value = data[field];
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value)) errors[field] = 'Enter a valid date.';
  }
  if (data.cnic && !/^\d{5}-\d{7}-\d$/.test(data.cnic)) errors.cnic = 'Use the 13-digit format 12345-1234567-1.';
  if (data.dependents === '' || !Number.isInteger(Number(data.dependents)) || Number(data.dependents)<0) errors.dependents = 'Enter a nonnegative whole number.';
  if (!hasPhoto) errors.photo = required;
  if (!data.primaryReference.name.trim() || !data.primaryReference.relation.trim() || !data.primaryReference.contact.trim()) errors.primaryReference = required;
  if (data.roleCategory !== 'office') {if (!data.vehicleRegistration.trim()) errors.vehicleRegistration=required; if (!data.drivingLicence.trim()) errors.drivingLicence=required;}
  if (!data.declarationAccepted) errors.declarationAccepted = 'Accept the declaration before submission.';
  return errors;
}
export function firstInvalidStep(errors: Record<string, unknown>) {return Math.min(...Object.keys(errors).map(key => fieldSteps[key.replace(/^dossier\./,'').split('.')[0]] ?? 1));}
export function validatePhoto(file: Pick<File, 'type' | 'size'>) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Choose a JPEG, PNG or WebP image.';
  if (file.size > 3 * 1024 * 1024) return 'Photo must be at most 3 MB.';
  return '';
}

// Documents kept for each employee. Keep these limits in sync with EmployeeDocumentController.
export const documentTypes = [
  {value: 'cnic', label: 'CNIC Copy (Front & Back)', hint: 'Clear copy of the valid computerized National Identity Card', required: true},
  {value: 'blood_report', label: 'Blood Group Verification Report', hint: 'Certified medical lab report', required: true},
  {value: 'photographs', label: 'Recent Photographs', hint: 'Passport-size colour photographs taken within the last 3 months', required: true},
  {value: 'utility_bill', label: 'Residential Utility Bill', hint: 'Recent bill showing the residential address', required: true},
  {value: 'other', label: 'Other Document', hint: 'Any other supporting document', required: false},
] as const;
export const documentTypeLabel = (type: string) => documentTypes.find(item => item.value === type)?.label ?? type;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
export function validateDocument(file: Pick<File, 'type' | 'size'>) {
  if (!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)) return 'Only PDF, JPG, PNG or WEBP files are allowed.';
  if (file.size === 0) return 'The file is empty.';
  if (file.size > DOCUMENT_MAX_BYTES) return 'The document must not be larger than 5 MB.';
  return '';
}
