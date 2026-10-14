<?php

namespace App\Support;

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
}
