<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('employee_id')->nullable()->change();
            $table->string('first_name')->nullable()->change();
            $table->string('last_name')->nullable()->change();
            $table->string('email')->nullable()->change();
            $table->string('department')->nullable()->change();
            $table->text('phone')->nullable()->change();
            $table->string('status')->default('active')->change();
            $table->string('full_name')->nullable()->index();
            $table->longText('dossier')->nullable();
            $table->char('cnic_lookup', 64)->nullable()->unique();
            $table->string('photo_path')->nullable();
            $table->unsignedBigInteger('revision')->default(1);
        });
        DB::table('employees')->orderBy('id')->chunkById(100, function ($employees) {
            foreach ($employees as $employee) {
                $dossier = [
                    'fullName' => trim($employee->first_name.' '.$employee->last_name),
                    'fatherName' => '', 'designation' => $employee->designation,
                    'joiningDate' => $employee->joining_date, 'dateOfBirth' => '',
                    'gender' => '', 'maritalStatus' => '', 'dependents' => 0,
                    'bloodGroup' => $employee->blood_group ?? '', 'cnic' => '', 'cnicExpiry' => '',
                    'residentialAddress' => $employee->address ?? '', 'homePhone' => '',
                    'mobileNumber' => $employee->phone ?? '', 'emergencyContact1' => $employee->emergency_phone ?? '', 'emergencyContact2' => '',
                    'employers' => [], 'primaryReference' => ['name' => '', 'relation' => '', 'contact' => ''],
                    'secondaryReference' => ['name' => '', 'relation' => '', 'contact' => ''],
                    'roleCategory' => 'office', 'vehicleRegistration' => '', 'drivingLicence' => '', 'tokenTaxStatus' => '',
                    'checklist' => ['cnic' => false, 'bloodReport' => false, 'photographs' => false, 'utilityBill' => false],
                    'declarationAccepted' => false, 'signature' => '', 'signingDate' => '',
                    '_legacy' => ['email' => $employee->email, 'photo_url' => $employee->photo_url, 'status' => $employee->status],
                ];
                DB::table('employees')->where('id', $employee->id)->update([
                    'full_name' => $dossier['fullName'],
                    'dossier' => Crypt::encryptString(json_encode($dossier, JSON_THROW_ON_ERROR)),
                    'phone' => $employee->phone === null ? null : Crypt::encryptString($employee->phone),
                    'email' => null, 'address' => null, 'emergency_phone' => null, 'photo_url' => null, 'blood_group' => null,
                    'status' => in_array($employee->status, ['active', 'inactive', 'transferred', 'resigned'], true) ? $employee->status : 'inactive',
                ]);
            }
        });
        Schema::table('employees', function (Blueprint $table) {
            $table->string('full_name')->nullable(false)->change();
            $table->enum('status', ['active', 'inactive', 'transferred', 'resigned'])->default('active')->change();
            $table->index('status');
        });
    }

    public function down(): void
    {
        // Rolling back would discard encrypted dossiers and cannot restore the old required fields for new employees.
        throw new RuntimeException('This data-preserving migration requires a reviewed restore from backup to reverse.');
    }
};
