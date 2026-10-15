<?php

namespace App\Services;

use App\Models\Employee;
use App\Support\EmployeeIdentity;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmployeeEnrollment
{
    // Call within the caller's transaction; the caller removes stagedPath if any write fails.
    public function create(array $dossier, UploadedFile|string|null $photo, ?string $department, ?string &$stagedPath): Employee
    {
        $employee = new Employee;
        $employee->fill(['full_name' => $dossier['fullName'], 'designation' => $dossier['designation'], 'joining_date' => $dossier['joiningDate'], 'phone' => $dossier['mobileNumber'], 'cnic_lookup' => EmployeeIdentity::lookup($dossier['cnic']), 'dossier' => $dossier]);
        $employee->department = $department;
        $employee->employee_id = null;
        $employee->status = 'active';
        $employee->save();
        $base = 'EMP-'.$employee->created_at->format('Y').'-'.str_pad((string) $employee->id, 4, '0', STR_PAD_LEFT);
        $displayId = $base;
        $suffix = 0;
        while (Employee::withTrashed()->where('employee_id', $displayId)->exists()) {
            $displayId = $base.'-'.(++$suffix);
        }
        $employee->employee_id = $displayId;
        if ($photo !== null) {
            $extension = $photo instanceof UploadedFile ? $photo->extension() : pathinfo($photo, PATHINFO_EXTENSION);
            $stagedPath = 'employees/'.$employee->id.'/photos/'.Str::random(40).'.'.$extension;
            $disk = Storage::disk('employee_private');
            $written = $photo instanceof UploadedFile ? $disk->putFileAs(dirname($stagedPath), $photo, basename($stagedPath)) : $disk->copy($photo, $stagedPath);
            if (! $written) {
                throw new \RuntimeException('Employee photo storage failed.');
            }
            $employee->photo_path = $stagedPath;
        }
        $employee->save();

        return $employee->refresh();
    }
}
