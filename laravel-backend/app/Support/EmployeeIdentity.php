<?php

namespace App\Support;

use App\Models\CandidateRequest;
use App\Models\Employee;

class EmployeeIdentity
{
    public static function lookup(string $cnic): string
    {
        $key = config('employees.lookup_key') ?: config('app.key');
        if (! is_string($key) || $key === '') {
            throw new \RuntimeException('An application encryption key is required.');
        }

        return hash_hmac('sha256', 'employee-cnic:'.preg_replace('/[^0-9]/', '', $cnic), $key);
    }

    /** True when the CNIC belongs to any employee (even a deleted one) or to a candidate request still awaiting review. */
    public static function registered(string $cnic, ?int $exceptEmployeeId = null): bool
    {
        $lookup = self::lookup($cnic);
        $employees = Employee::withTrashed()->where('cnic_lookup', $lookup);
        if ($exceptEmployeeId !== null) {
            $employees->whereKeyNot($exceptEmployeeId);
        }

        return $employees->exists() || CandidateRequest::where('cnic_lookup', $lookup)->where('status', 'pending')->exists();
    }
}
