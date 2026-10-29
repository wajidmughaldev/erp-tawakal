<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EmployeeRequest;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Services\EmployeeEnrollment;
use App\Services\Notifier;
use App\Support\EmployeeFiles;
use App\Support\EmployeeIdentity;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class EmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sorts = ['newest' => ['id', 'desc'], 'oldest' => ['id', 'asc'], 'name_asc' => ['full_name', 'asc'], 'name_desc' => ['full_name', 'desc'], 'name' => ['full_name', 'asc'], '-name' => ['full_name', 'desc'], 'displayId' => ['id', 'asc'], '-displayId' => ['id', 'desc']];
        $input = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'search' => ['sometimes', 'nullable', 'string', 'max:254'], 'status' => ['sometimes', 'nullable', Rule::in(Employee::STATUSES)], 'cardStatus' => ['sometimes', 'nullable', Rule::in(['active', 'active_only', 'expiring_soon', 'expired', 'revoked', 'replaced', 'none'])], 'expiry' => ['sometimes', 'nullable', Rule::in(['expiring', 'expired'])], 'sort' => ['sometimes', 'nullable', Rule::in(array_keys($sorts))]]);
        $query = Employee::with(['documents', 'cards']);
        if (! empty($input['status'])) {
            $query->where('status', $input['status']);
        }
        if (! empty($input['cardStatus'])) {
            $status = $input['cardStatus'];
            if ($status === 'none') {
                $query->whereDoesntHave('cards');
            } elseif (in_array($status, ['revoked', 'replaced'], true)) {
                $query->whereDoesntHave('cards', fn ($card) => $card->eligibleCurrent())->whereHas('latestCard', fn ($card) => $card->displayStatus($status));
            } else {
                $query->whereHas('cards', fn ($card) => $card->displayStatus($status));
            }
        }
        if (! empty($input['expiry'])) {
            $query->whereHas('cards', fn ($card) => $card->displayStatus($input['expiry'] === 'expiring' ? 'expiring_soon' : 'expired'));
        }
        if (($search = trim($input['search'] ?? '')) !== '') {
            // shortcut: phone search decrypts at most a few hundred rows; revisit indexed protected lookup if the employee count grows substantially.
            $phoneIds = Employee::select('id', 'phone')->get()->filter(fn ($employee) => mb_stripos($employee->phone ?? '', $search) !== false)->modelKeys();
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(function ($q) use ($search, $pattern, $phoneIds) {
                $q->whereRaw("full_name LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("employee_id LIKE ? ESCAPE '!'", [$pattern])->orWhereIn('id', $phoneIds);
                if (preg_match('/^(?:[0-9]{5}-[0-9]{7}-[0-9]|[0-9]{13})$/D', $search)) {
                    $q->orWhere('cnic_lookup', EmployeeIdentity::lookup($search));
                }
            });
        }
        [$column, $direction] = $sorts[$input['sort'] ?? 'newest'];
        $page = $query->orderBy($column, $direction)->orderBy('id', 'desc')->paginate(15);

        return response()->json(['data' => EmployeeResource::collection($page->getCollection())->resolve($request), 'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'perPage' => $page->perPage(), 'total' => $page->total()]])->header('Cache-Control', 'no-store');
    }

    public function store(EmployeeRequest $request): JsonResponse
    {
        $newPath = null;
        try {
            $employee = DB::transaction(function () use ($request, &$newPath) {
                return app(EmployeeEnrollment::class)->create($request->dossier(), $request->file('photo'), null, $newPath);
            });
        } catch (Throwable $error) {
            $this->failedWrite($newPath, $error);
        }

        Notifier::send('employees', 'success', 'New employee added', "{$employee->full_name} ({$employee->employee_id}) was added by {$request->user()->name}.", ['employee', $employee->id], $request->user());

        return $this->record($employee, 201);
    }

    public function checkCnic(Request $request): JsonResponse
    {
        $input = $request->validate(['cnic' => ['required', 'string', 'regex:/^[0-9]{5}-[0-9]{7}-[0-9]$/'], 'exceptEmployeeId' => ['sometimes', 'nullable', 'integer', 'min:1']]);

        return response()->json(['registered' => EmployeeIdentity::registered($input['cnic'], $input['exceptEmployeeId'] ?? null)])->header('Cache-Control', 'no-store');
    }

    public function show(Employee $employee): JsonResponse
    {
        Gate::authorize('view', $employee);

        return $this->record($employee);
    }

    public function update(EmployeeRequest $request, Employee $employee): JsonResponse
    {
        Gate::authorize('view', $employee);
        abort_unless($request->hasHeader('If-Match'), 428, 'Retrieve the employee and send its ETag in If-Match.');
        $newPath = null;
        $oldPath = null;
        try {
            $employee = DB::transaction(function () use ($request, $employee, &$newPath, &$oldPath) {
                $current = Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
                abort_unless(hash_equals($current->etag(), trim($request->header('If-Match'))), 412, 'The employee has changed. Retrieve it again before editing.');
                $dossier = $request->dossier();
                if (isset($current->dossier['_legacy'])) {
                    $dossier['_legacy'] = $current->dossier['_legacy'];
                }
                $this->assignDossier($current, $dossier);
                if ($request->hasFile('photo')) {
                    $newPath = $request->file('photo')->store('employees/'.$current->id.'/photos', 'employee_private');
                    if (! $newPath) {
                        throw new \RuntimeException('Photo storage failed.');
                    }
                    $oldPath = $current->photo_path;
                    $current->photo_path = $newPath;
                }
                $current->revision++;
                $current->save();

                return $current;
            });
        } catch (Throwable $error) {
            $this->failedWrite($newPath, $error);
        }
        if ($oldPath && EmployeeFiles::exists($employee, $oldPath, 'photos')) {
            try {
                Storage::disk('employee_private')->delete($oldPath);
            } catch (Throwable $cleanupError) {
                report($cleanupError);
            }
        }

        return $this->record($employee);
    }

    public function destroy(Request $request, Employee $employee)
    {
        abort_unless($request->user()->role === 'superadmin', 403, 'Only a superadmin can delete employees.');
        Gate::authorize('view', $employee);
        DB::transaction(function () use ($employee) {
            $current = Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            $current->revision++;
            $current->save();
            $current->delete();
        });

        Notifier::send('employees', 'warning', 'Employee deleted', "{$employee->full_name} ({$employee->employee_id}) was deleted by {$request->user()->name}.", null, $request->user());

        return response()->noContent()->header('Cache-Control', 'no-store');
    }

    public function documents(Employee $employee): JsonResponse
    {
        Gate::authorize('view', $employee);

        return response()->json(['data' => EmployeeFiles::documents($employee)])->header('Cache-Control', 'no-store');
    }

    public function photo(Employee $employee)
    {
        Gate::authorize('view', $employee);
        abort_unless(EmployeeFiles::exists($employee, $employee->photo_path, 'photos'), 404);
        $disk = Storage::disk('employee_private');
        $mime = $disk->mimeType($employee->photo_path);
        abort_unless(in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true), 404);

        return $disk->response($employee->photo_path, 'photo.'.pathinfo($employee->photo_path, PATHINFO_EXTENSION), ['Content-Type' => $mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'], 'inline');
    }

    public function download(EmployeeDocument $document)
    {
        $employee = $document->employee;
        abort_unless($employee, 404);
        Gate::authorize('view', $employee);
        abort_unless(EmployeeFiles::exists($employee, $document->path, 'documents'), 404);
        $filename = basename(str_replace(['\\', "\r", "\n"], ['/', '', ''], $document->name));

        return Storage::disk('employee_private')->download($document->path, $filename ?: 'document', ['Content-Type' => 'application/octet-stream', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    private function assignDossier(Employee $employee, array $dossier): void
    {
        $employee->fill(['full_name' => $dossier['fullName'], 'designation' => $dossier['designation'], 'joining_date' => $dossier['joiningDate'], 'phone' => $dossier['mobileNumber'], 'cnic_lookup' => EmployeeIdentity::lookup($dossier['cnic']), 'dossier' => $dossier]);
    }

    private function record(Employee $employee, int $status = 200): JsonResponse
    {
        $employee->load(['documents', 'cards']);

        return response()->json(['data' => (new EmployeeResource($employee))->resolve(request())], $status)->header('ETag', $employee->etag())->header('Cache-Control', 'no-store');
    }

    private function failedWrite(?string $newPath, Throwable $error): never
    {
        if ($newPath) {
            try {
                Storage::disk('employee_private')->delete($newPath);
            } catch (Throwable $cleanupError) {
                report($cleanupError);
            }
        }
        if ($error instanceof QueryException && ($error->errorInfo[1] ?? null) === 1062 && str_contains($error->getMessage(), 'employees_cnic_lookup_unique')) {
            throw ValidationException::withMessages(['dossier.cnic' => ['An employee with this CNIC already exists.']]);
        }
        throw $error;
    }
}
