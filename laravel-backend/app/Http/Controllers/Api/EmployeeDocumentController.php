<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Support\EmployeeFiles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmployeeDocumentController extends Controller
{
    public function store(Request $request, Employee $employee): JsonResponse
    {
        Gate::authorize('view', $employee);
        $input = $request->validate([
            'type' => ['required', Rule::in(EmployeeFiles::DOCUMENT_TYPES)],
            'file' => ['required', 'file', 'max:'.EmployeeFiles::DOCUMENT_MAX_KB, 'mimetypes:'.implode(',', EmployeeFiles::DOCUMENT_MIMES), 'mimes:pdf,jpg,jpeg,png,webp'],
        ], [
            'file.max' => 'The document must not be larger than 5 MB.',
            'file.mimetypes' => 'Only PDF, JPG, PNG or WEBP files are allowed.',
            'file.mimes' => 'Only PDF, JPG, PNG or WEBP files are allowed.',
        ]);
        $file = $request->file('file');
        $name = trim(preg_replace('#[\x00-\x1F\x7F/\\\\]+#u', '', $file->getClientOriginalName()) ?? '');
        $extension = $file->extension();
        $name = $name === '' ? 'document.'.$extension : Str::limit($name, 200, '');
        $path = 'employees/'.$employee->id.'/documents/'.Str::random(40).'.'.$extension;

        $document = DB::transaction(function () use ($employee, $input, $file, $name, $path) {
            // Lock the employee so concurrent uploads cannot exceed the cap.
            Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            if ($employee->documents()->count() >= EmployeeFiles::MAX_DOCUMENTS_PER_EMPLOYEE) {
                throw ValidationException::withMessages(['file' => ['An employee can have at most '.EmployeeFiles::MAX_DOCUMENTS_PER_EMPLOYEE.' documents.']]);
            }
            if (! Storage::disk('employee_private')->putFileAs(dirname($path), $file, basename($path))) {
                throw new \RuntimeException('Document storage failed.');
            }

            return $employee->documents()->create(['name' => $name, 'type' => $input['type'], 'path' => $path]);
        });

        return response()->json(['data' => ['id' => (string) $document->id, 'name' => $document->name, 'type' => $document->type, 'uploadedAt' => $document->created_at->toIso8601String()]], 201)->header('Cache-Control', 'no-store');
    }

    public function destroy(EmployeeDocument $document)
    {
        $employee = $document->employee;
        abort_unless($employee, 404);
        Gate::authorize('view', $employee);
        $path = $document->path;
        $document->delete();
        if (EmployeeFiles::exists($employee, $path, 'documents')) {
            Storage::disk('employee_private')->delete($path);
        }

        return response()->noContent()->header('Cache-Control', 'no-store');
    }
}
