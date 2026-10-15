<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CandidateSubmissionRequest;
use App\Http\Requests\EmployeeRequest;
use App\Http\Resources\CandidateRequestResource;
use App\Models\CandidateRequest;
use App\Models\RegistrationInvite;
use App\Services\EmployeeEnrollment;
use App\Support\CandidateFiles;
use App\Support\EmployeeIdentity;
use App\Support\InviteToken;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class CandidateRequestController extends Controller
{
    public function store(CandidateSubmissionRequest $request)
    {
        $stagedPath = null;
        try {
            $candidate = DB::transaction(function () use ($request, &$stagedPath) {
                $invite = RegistrationInvite::where('token_digest', InviteToken::digest($request->validated('token')))->lockForUpdate()->first();
                abort_unless($invite, 409, 'This invitation is unavailable.');
                abort_unless($invite->status() === 'valid', 409, 'This invitation is expired or already used.');
                $dossier = $request->dossier();
                $this->validateRestrictions($invite, $dossier);
                $candidate = CandidateRequest::create(['registration_invite_id' => $invite->id, 'tracking_id' => null, 'status' => 'pending', 'candidate_name' => $dossier['fullName'], 'role_category' => $dossier['roleCategory'], 'dossier' => $dossier, 'cnic_lookup' => EmployeeIdentity::lookup($dossier['cnic'])]);
                $candidate->tracking_id = 'REQ-'.$candidate->created_at->format('Y').'-'.str_pad((string) $candidate->id, 4, '0', STR_PAD_LEFT);
                if ($request->hasFile('photo')) {
                    $stagedPath = 'candidate-requests/'.$candidate->id.'/photos/'.Str::random(40).'.'.$request->file('photo')->extension();
                    if (! Storage::disk('employee_private')->putFileAs(dirname($stagedPath), $request->file('photo'), basename($stagedPath))) {
                        throw new \RuntimeException('Candidate photo storage failed.');
                    }
                    $candidate->photo_path = $stagedPath;
                }
                $candidate->save();
                // File IO may span the expiration boundary; do not consume an expired invitation.
                abort_unless($invite->expires_at->isAfter(now()), 409, 'This invitation has expired.');
                $invite->used_at = now();
                $invite->save();

                return $candidate;
            });
        } catch (Throwable $error) {
            $this->cleanup($stagedPath);
            if ($error instanceof QueryException && ($error->errorInfo[1] ?? null) === 1062) {
                abort(409, 'This invitation has already been submitted.');
            }
            throw $error;
        }

        // A public receipt confirms persistence without exposing the dossier or review data.
        return response()->json(['data' => ['id' => (string) $candidate->id, 'trackingId' => $candidate->tracking_id, 'status' => $candidate->status, 'submittedAt' => $candidate->created_at->toIso8601String(), 'documents' => []]], 201)->header('Cache-Control', 'no-store');
    }

    public function index(Request $request)
    {
        $roles = ['office' => 'office', 'motorcycle' => 'motorcycle', 'van' => 'van', 'Office / General' => 'office', 'Motorcycle Field Sales Executive' => 'motorcycle', 'Delivery Van Driver' => 'van'];
        $input = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'search' => ['sometimes', 'nullable', 'string', 'max:254'], 'status' => ['sometimes', 'nullable', Rule::in(CandidateRequest::STATUSES)], 'role' => ['sometimes', 'nullable', Rule::in(array_keys($roles))]]);
        $query = CandidateRequest::query();
        if (! empty($input['status'])) {
            $query->where('status', $input['status']);
        }
        if (! empty($input['role'])) {
            $query->where('role_category', $roles[$input['role']]);
        }
        if (($search = trim($input['search'] ?? '')) !== '') {
            // shortcut: protected name search decrypts a few hundred rows; revisit indexing if request volume grows substantially.
            $nameIds = CandidateRequest::select('id', 'candidate_name')->get()->filter(fn ($item) => mb_stripos($item->candidate_name, $search) !== false)->modelKeys();
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(function ($q) use ($search, $pattern, $nameIds) {
                $q->whereRaw("tracking_id LIKE ? ESCAPE '!'", [$pattern])->orWhereIn('id', $nameIds);
                if (preg_match('/^(?:[0-9]{5}-[0-9]{7}-[0-9]|[0-9]{13})$/D', $search)) {
                    $q->orWhere('cnic_lookup', EmployeeIdentity::lookup($search));
                }
            });
        }
        $page = $query->orderByDesc('id')->paginate(15);

        return response()->json(['data' => CandidateRequestResource::collection($page->getCollection())->resolve($request), 'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'perPage' => $page->perPage(), 'total' => $page->total()]])->header('Cache-Control', 'no-store');
    }

    public function show(CandidateRequest $candidateRequest)
    {
        return $this->record($candidateRequest);
    }

    public function approve(Request $request, CandidateRequest $candidateRequest)
    {
        $stagedPath = null;
        try {
            $candidate = DB::transaction(function () use ($request, $candidateRequest, &$stagedPath) {
                $current = CandidateRequest::whereKey($candidateRequest->id)->lockForUpdate()->firstOrFail();
                abort_unless($current->status === 'pending', 409, 'Only pending requests can be approved.');
                $validator = Validator::make(['dossier' => $current->dossier], (new EmployeeRequest)->rules());
                if ($validator->fails()) {
                    abort(409, 'This dossier is no longer eligible for enrollment.');
                }
                try {
                    $this->validateRestrictions($current->invite, $current->dossier);
                } catch (ValidationException) {
                    abort(409, 'The dossier does not match the invitation restrictions.');
                }
                if ($current->photo_path !== null) {
                    abort_unless(CandidateFiles::photoExists($current), 409, 'The candidate photo is unavailable.');
                }
                $employee = app(EmployeeEnrollment::class)->create($current->dossier, $current->photo_path, $current->invite->department, $stagedPath);
                $current->status = 'approved';
                $current->employee_id = $employee->id;
                $current->reviewed_by = $request->user()->id;
                $current->reviewed_at = now();
                $current->save();

                return $current;
            });
        } catch (Throwable $error) {
            $this->cleanup($stagedPath);
            if ($error instanceof QueryException && ($error->errorInfo[1] ?? null) === 1062 && str_contains($error->getMessage(), 'employees_cnic_lookup_unique')) {
                abort(409, 'This identity is already enrolled.');
            }
            throw $error;
        }

        return $this->record($candidate);
    }

    public function reject(Request $request, CandidateRequest $candidateRequest)
    {
        $input = $request->validate(['reason' => ['required', 'string', 'max:2000']]);
        $candidate = DB::transaction(function () use ($request, $candidateRequest, $input) {
            $current = CandidateRequest::whereKey($candidateRequest->id)->lockForUpdate()->firstOrFail();
            abort_unless($current->status === 'pending', 409, 'Only pending requests can be rejected.');
            $current->status = 'rejected';
            $current->rejection_reason = trim($input['reason']);
            $current->reviewed_by = $request->user()->id;
            $current->reviewed_at = now();
            $current->save();

            return $current;
        });

        return $this->record($candidate);
    }

    public function photo(CandidateRequest $candidateRequest)
    {
        abort_unless(CandidateFiles::photoExists($candidateRequest), 404);
        $disk = Storage::disk('employee_private');
        $mime = $disk->mimeType($candidateRequest->photo_path);
        abort_unless(in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true), 404);

        return $disk->response($candidateRequest->photo_path, 'photo.'.pathinfo($candidateRequest->photo_path, PATHINFO_EXTENSION), ['Content-Type' => $mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'], 'inline');
    }

    private function validateRestrictions(RegistrationInvite $invite, array $dossier): void
    {
        $errors = [];
        if (mb_strtolower(trim($dossier['designation'])) !== mb_strtolower(trim($invite->designation))) {
            $errors['dossier.designation'] = ['Use the designation authorized by the invitation.'];
        }
        if ($invite->role_category !== null && $invite->role_category !== $dossier['roleCategory']) {
            $errors['dossier.roleCategory'] = ['Use the operational role authorized by the invitation.'];
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function record(CandidateRequest $candidate)
    {
        return response()->json(['data' => (new CandidateRequestResource($candidate))->resolve(request())])->header('Cache-Control', 'no-store');
    }

    private function cleanup(?string $path): void
    {
        if ($path !== null) {
            try {
                Storage::disk('employee_private')->delete($path);
            } catch (Throwable $cleanupError) {
                report($cleanupError);
            }
        }
    }
}
