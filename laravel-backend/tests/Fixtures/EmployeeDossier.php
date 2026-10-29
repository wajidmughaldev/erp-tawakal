<?php

namespace Tests\Fixtures;

class EmployeeDossier
{
    public static function make(array $overrides = []): array
    {
        return array_replace([
            'fullName' => 'Integration Test Employee', 'fatherName' => 'Test Guardian', 'designation' => 'Sales Representative',
            'joiningDate' => '2026-01-10', 'dateOfBirth' => '1990-03-15', 'gender' => 'Male', 'maritalStatus' => 'Married',
            'dependents' => 2, 'bloodGroup' => 'O+', 'cnic' => '42101-'.random_int(1000000, 9999999).'-1', 'cnicExpiry' => '2030-03-15',
            'residentialAddress' => 'Test residential address', 'homePhone' => '022-1234567', 'mobileNumber' => '+92 300 1234567',
            'emergencyContact1' => '+92 321 1234567 (Test Brother)', 'emergencyContact2' => '+92 333 1234567 (Test Guardian)',
            'employers' => [['rowId' => 'client-row-1', 'organization' => 'Previous Test Employer', 'designation' => 'Assistant', 'duration' => '2 years', 'address' => 'Previous workplace', 'phone' => '021-1234567']],
            'primaryReference' => ['name' => 'Primary Test Reference', 'relation' => 'Former supervisor', 'contact' => 'Test contact/address'],
            'secondaryReference' => ['name' => 'Secondary Test Reference', 'relation' => 'Colleague', 'contact' => 'Secondary contact/address'],
            'roleCategory' => 'motorcycle', 'vehicleRegistration' => 'TEST-123', 'drivingLicence' => 'TEST-LICENCE', 'tokenTaxStatus' => 'Paid & Up to Date',
            'declarationAccepted' => true,
        ], $overrides);
    }

    public static function png(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5ioAAAAASUVORK5CYII=');
    }
}
