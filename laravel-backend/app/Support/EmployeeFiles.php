<?php

namespace App\Support;

use App\Models\Employee;
use App\Models\EmployeeDocument;
use Illuminate\Support\Facades\Storage;

class EmployeeFiles
{
    public static function exists(Employee $employee, ?string $path, string $folder): bool
    {
        $prefix = 'employees/'.$employee->id.'/'.$folder.'/';

        return $path !== null && str_starts_with($path, $prefix)
            && preg_match('/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/D', substr($path, strlen($prefix))) === 1
            && Storage::disk('employee_private')->exists($path);
    }

    public static function documents(Employee $employee): array
    {
        return $employee->documents->filter(fn (EmployeeDocument $document) => self::exists($employee, $document->path, 'documents'))
            ->map(fn (EmployeeDocument $document) => ['id' => (string) $document->id, 'name' => $document->name, 'type' => $document->type, 'uploadedAt' => $document->created_at->toIso8601String()])->values()->all();
    }
}
