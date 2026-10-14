<?php

namespace App\Http\Requests;

use App\Models\Employee;
use App\Support\EmployeeIdentity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $json = $this->input('dossier');
        if (! is_string($json) || strlen($json) > 131072) {
            throw ValidationException::withMessages(['dossier' => ['Provide the complete dossier as a JSON string (maximum 128 KB).']]);
        }
        try {
            $dossier = json_decode($json, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw ValidationException::withMessages(['dossier' => ['The dossier must contain valid JSON.']]);
        }
        if (! is_array($dossier)) {
            throw ValidationException::withMessages(['dossier' => ['The dossier must be an object.']]);
        }
        if (($dossier['roleCategory'] ?? null) === 'office') {
            $dossier['vehicleRegistration'] = $dossier['drivingLicence'] = $dossier['tokenTaxStatus'] = '';
        }
        $this->merge(['dossier' => $dossier]);
    }

    public function rules(): array
    {
        $strings = ['present', 'string', 'max:1000'];

        return [
            'dossier' => ['required', 'array:fullName,fatherName,designation,joiningDate,dateOfBirth,gender,maritalStatus,dependents,bloodGroup,cnic,cnicExpiry,residentialAddress,homePhone,mobileNumber,emergencyContact1,emergencyContact2,employers,primaryReference,secondaryReference,roleCategory,vehicleRegistration,drivingLicence,tokenTaxStatus,checklist,declarationAccepted,signature,signingDate'],
            'dossier.fullName' => ['required', 'string', 'max:255'],
            'dossier.fatherName' => ['required', 'string', 'max:255'],
            'dossier.designation' => ['required', 'string', 'max:255'],
            'dossier.joiningDate' => ['required', 'date_format:Y-m-d'],
            'dossier.dateOfBirth' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', 'before_or_equal:dossier.joiningDate'],
            'dossier.gender' => ['required', Rule::in(['Male', 'Female'])],
            'dossier.maritalStatus' => ['required', Rule::in(['Single', 'Married'])],
            'dossier.dependents' => ['required', 'integer', 'min:0', 'max:100'],
            'dossier.bloodGroup' => ['required', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
            'dossier.cnic' => ['required', 'string', 'regex:/^[0-9]{5}-[0-9]{7}-[0-9]$/', function ($attribute, $value, $fail) {
                if (! is_string($value)) {
                    return;
                }
                $query = Employee::withTrashed()->where('cnic_lookup', EmployeeIdentity::lookup($value));
                if ($this->route('employee')) {
                    $query->whereKeyNot($this->route('employee')->id);
                }
                if ($query->exists()) {
                    $fail('An employee with this CNIC already exists.');
                }
            }],
            'dossier.cnicExpiry' => ['required', 'date_format:Y-m-d'],
            'dossier.residentialAddress' => ['required', 'string', 'max:2000'],
            'dossier.homePhone' => $strings,
            'dossier.mobileNumber' => ['required', 'string', 'max:100'],
            'dossier.emergencyContact1' => ['required', 'string', 'max:1000'],
            'dossier.emergencyContact2' => $strings,
            'dossier.employers' => ['present', 'array', 'list', 'max:50'],
            'dossier.employers.*' => ['array:rowId,organization,designation,duration,address,phone'],
            'dossier.employers.*.rowId' => ['required', 'string', 'max:100', 'distinct'],
            'dossier.employers.*.organization' => $strings,
            'dossier.employers.*.designation' => $strings,
            'dossier.employers.*.duration' => $strings,
            'dossier.employers.*.address' => $strings,
            'dossier.employers.*.phone' => $strings,
            'dossier.primaryReference' => ['required', 'array:name,relation,contact'],
            'dossier.primaryReference.name' => ['required', 'string', 'max:255'],
            'dossier.primaryReference.relation' => ['required', 'string', 'max:255'],
            'dossier.primaryReference.contact' => ['required', 'string', 'max:2000'],
            'dossier.secondaryReference' => ['present', 'array:name,relation,contact'],
            'dossier.secondaryReference.name' => $strings,
            'dossier.secondaryReference.relation' => $strings,
            'dossier.secondaryReference.contact' => $strings,
            'dossier.roleCategory' => ['required', Rule::in(['office', 'motorcycle', 'van'])],
            'dossier.vehicleRegistration' => ['present', 'string', 'max:100', 'required_unless:dossier.roleCategory,office'],
            'dossier.drivingLicence' => ['present', 'string', 'max:100', 'required_unless:dossier.roleCategory,office'],
            'dossier.tokenTaxStatus' => ['present', Rule::in(['', 'Not Provided', 'Paid & Up to Date', 'Unpaid / Pending'])],
            'dossier.checklist' => ['required', 'array:cnic,bloodReport,photographs,utilityBill'],
            'dossier.checklist.cnic' => ['required', 'boolean'],
            'dossier.checklist.bloodReport' => ['required', 'boolean'],
            'dossier.checklist.photographs' => ['required', 'boolean'],
            'dossier.checklist.utilityBill' => ['required', 'boolean'],
            'dossier.declarationAccepted' => ['required', 'accepted'],
            'dossier.signature' => ['required', 'string', 'max:255'],
            'dossier.signingDate' => ['required', 'date_format:Y-m-d'],
            'photo' => ['sometimes', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'mimes:jpg,jpeg,png,webp', 'max:3072', 'dimensions:min_width=1,min_height=1'],
        ];
    }

    public function dossier(): array
    {
        $dossier = $this->validated('dossier');
        $dossier['dependents'] = (int) $dossier['dependents'];
        foreach ($dossier['checklist'] as &$value) {
            $value = (bool) $value;
        }
        $dossier['declarationAccepted'] = true;

        return $dossier;
    }
}
