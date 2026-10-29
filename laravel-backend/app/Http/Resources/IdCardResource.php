<?php

namespace App\Http\Resources;

use App\Support\CardValidity;
use App\Models\Employee;
use App\Support\EmployeeFiles;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IdCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $employee = $this->employee;
        $photo = ! $employee->trashed() && EmployeeFiles::exists($employee, $employee->photo_path, 'photos') ? route('employees.photo', ['employee' => $employee->id]) : null;
        // Legacy expiry remains date-derived; pending-print records never become issued credentials.
        $status = match ($this->status) {
            'expired' => 'active','pending_print' => 'revoked',default => $this->status
        };

        return [
            'asOfDate' => CardValidity::today()->toDateString(),
            'credentialState' => $this->verification_token_digest === null ? 'historical' : ($this->resource->isCurrent() && ! $employee->trashed() && in_array($employee->status, Employee::WORKING_STATUSES, true) ? 'current' : 'ineligible'),
            'id' => (string) $this->id, 'number' => $this->card_number, 'employeeId' => (string) $this->employee_id,
            'employee' => ['displayId' => $employee->employee_id, 'name' => $employee->full_name, 'designation' => $employee->designation, 'department' => $employee->department ?? '', 'bloodGroup' => $employee->dossier['bloodGroup'] ?? '', ...($photo ? ['photo' => $photo] : [])],
            'status' => $status, 'issueDate' => $this->issued_date->format('Y-m-d'), 'expiryDate' => $this->expiry_date->format('Y-m-d'),
            'verificationToken' => $this->verification_token ?? '', 'issuedBy' => $this->printed_by ?? '',
        ];
    }
}
