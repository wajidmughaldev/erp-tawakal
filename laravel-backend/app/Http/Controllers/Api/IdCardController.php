<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\IdCardResource;
use App\Models\Employee;
use App\Models\IdCard;
use App\Services\CardLifecycle;
use App\Services\Notifier;
use App\Support\CardToken;
use App\Support\CardValidity;
use App\Support\EmployeeFiles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

class IdCardController extends Controller
{
    public function index(Request $request)
    {
        $sorts = ['expiry_asc' => ['expiry_date', 'asc'], 'issue_desc' => ['issued_date', 'desc'], 'issue_asc' => ['issued_date', 'asc']];
        $input = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'search' => ['sometimes', 'nullable', 'string', 'max:254'], 'status' => ['sometimes', 'nullable', Rule::in(['active', 'expiring', 'expiring_soon', 'expired', 'revoked', 'replaced'])], 'expiry' => ['sometimes', 'nullable', Rule::in(['expiring', 'expired'])], 'sort' => ['sometimes', Rule::in(array_keys($sorts))]]);
        $query = IdCard::with('employee');
        if (! empty($input['status'])) {
            $query->displayStatus($input['status']);
        }
        if (($input['expiry'] ?? null) === 'expiring') {
            $query->displayStatus('expiring_soon');
        }
        if (($input['expiry'] ?? null) === 'expired') {
            $query->displayStatus('expired');
        }
        if (($search = trim($input['search'] ?? '')) !== '') {
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(fn ($q) => $q->whereRaw("card_number LIKE ? ESCAPE '!'", [$pattern])->orWhereHas('employee', fn ($e) => $e->where(fn ($columns) => $columns->whereRaw("full_name LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("employee_id LIKE ? ESCAPE '!'", [$pattern]))));
        }
        [$column,$direction] = $sorts[$input['sort'] ?? 'issue_desc'];
        $page = $query->orderBy($column, $direction)->orderBy('id', $direction)->paginate(15);

        return response()->json(['data' => IdCardResource::collection($page->getCollection())->resolve($request), 'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'perPage' => $page->perPage(), 'total' => $page->total()]])->header('Cache-Control', 'no-store');
    }

    public function policy()
    {
        $mode = config('cards.validity_policy');
        if (! in_array($mode, ['selected_years', 'eleven_months'], true)) {
            $mode = 'unconfigured';
        }

        return response()->json(['data' => ['mode' => $mode, 'canIssue' => $mode !== 'unconfigured', 'canRenew' => $mode !== 'unconfigured', 'validityYears' => $mode === 'selected_years' ? [1, 2] : [], 'termLabel' => match ($mode) {
            'selected_years' => 'Selected 1-year or 2-year term','eleven_months' => '11 calendar months',default => 'Validity policy awaiting approval'
        }]])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request, CardLifecycle $lifecycle)
    {
        $input = $request->validate(['employeeId' => ['required', 'integer', Rule::exists('employees', 'id')], 'validityYears' => ['sometimes', 'integer', Rule::in([1, 2])], 'number' => ['prohibited'], 'card_number' => ['prohibited'], 'expiryDate' => ['prohibited'], 'expiry_date' => ['prohibited'], 'verificationToken' => ['prohibited']]);

        $card = $lifecycle->issue((string) $input['employeeId'], isset($input['validityYears']) ? (int) $input['validityYears'] : null, $request->user());
        $this->announce('success', 'ID card issued', $card, 'issued to', $request);

        return $this->record($card, 201);
    }

    /** Employees who can be issued a card right now: working, not deleted and without a current credential. */
    public function eligibleEmployees()
    {
        $employees = Employee::whereIn('status', Employee::WORKING_STATUSES)
            ->whereDoesntHave('cards', fn ($card) => $card->eligibleCurrent())
            ->whereNotExists(fn ($query) => $query->selectRaw('1')->from('id_cards')->whereColumn('id_cards.current_employee_id', 'employees.id'))
            ->orderBy('full_name')->limit(1000)->get(['id', 'employee_id', 'full_name', 'designation']);

        return response()->json(['data' => $employees->map(fn ($employee) => ['id' => (string) $employee->id, 'displayId' => $employee->employee_id, 'name' => $employee->full_name, 'designation' => $employee->designation])->values()])->header('Cache-Control', 'no-store');
    }

    public function show(IdCard $idCard)
    {
        return $this->record($idCard);
    }

    public function renew(Request $request, IdCard $idCard, CardLifecycle $lifecycle)
    {
        $operation = validator(['idempotencyKey' => $request->header('Idempotency-Key')], ['idempotencyKey' => ['required', 'string', 'regex:/^[A-Za-z0-9-]{16,100}$/D']])->validate();
        $input = $request->validate(['option' => ['required', Rule::in(['existing', 'new_physical'])], 'validityYears' => ['sometimes', 'integer', Rule::in([1, 2])]]);

        $card = $lifecycle->renew($idCard, $input['option'], isset($input['validityYears']) ? (int) $input['validityYears'] : null, $request->user(), $operation['idempotencyKey'], $request->header('If-Match'));
        if ($card->id !== $idCard->id) {
            $this->announce('success', 'ID card renewed', $card, 'renewed for', $request);
        }

        return $this->record($card);
    }

    public function renewalPreview(Request $request, IdCard $idCard, CardLifecycle $lifecycle)
    {
        $input = $request->validate(['option' => ['required', Rule::in(['existing', 'new_physical'])], 'validityYears' => ['sometimes', 'integer', Rule::in([1, 2])]]);

        return response()->json(['data' => $lifecycle->preview($idCard, $input['option'], isset($input['validityYears']) ? (int) $input['validityYears'] : null)])->header('ETag', $idCard->etag())->header('Cache-Control', 'no-store');
    }

    public function reissue(Request $request, IdCard $idCard, CardLifecycle $lifecycle)
    {
        $input = $request->validate(['reason' => ['required', Rule::in(['Lost / Stolen Card', 'Damaged Card', 'Updated Information', 'Other'])], 'acknowledged' => ['required', 'accepted']]);

        $card = $lifecycle->reissue($idCard, $input['reason'], $request->user());
        $this->announce('info', 'ID card reissued', $card, 'reissued for', $request, " ({$input['reason']})");

        return $this->record($card);
    }

    public function deactivate(Request $request, IdCard $idCard, CardLifecycle $lifecycle)
    {
        $input = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:2000']]);

        $card = $lifecycle->deactivate($idCard, $input['reason'], $request->user());
        $this->announce('warning', 'ID card deactivated', $card, 'deactivated for', $request, " ({$input['reason']})");

        return $this->record($card);
    }

    public function verify(Request $request)
    {
        $input = $request->validate(['token' => CardToken::RULES]);
        $card = IdCard::with('employee')->where('verification_token_digest', CardToken::digest($input['token']))->first();
        $result = ['status' => 'invalid', 'message' => 'This credential is not recognized or its holder is ineligible.'];
        if ($card && $card->employee && ! $card->employee->trashed() && in_array($card->employee->status, Employee::WORKING_STATUSES, true)) {
            $status = ! $card->isCurrent() ? 'revoked' : ($card->expiry_date->lessThan(CardValidity::today()) ? 'expired' : ($card->expiry_date->lessThanOrEqualTo(CardValidity::today()->addDays(30)) ? 'expiring' : 'valid'));
            $messages = ['valid' => 'This official credential is active.', 'expiring' => 'This credential expires within 30 days.', 'expired' => 'This credential has expired.', 'revoked' => 'This credential is no longer active.'];
            $result = ['status' => $status, 'message' => $messages[$status], 'card' => ['number' => $card->card_number, 'employeeName' => $card->employee->full_name, 'employeeDisplayId' => $card->employee->employee_id, 'designation' => $card->employee->designation, 'bloodGroup' => $card->employee->dossier['bloodGroup'] ?? '', 'issueDate' => $card->issued_date->format('Y-m-d'), 'expiryDate' => $card->expiry_date->format('Y-m-d'), ...(EmployeeFiles::exists($card->employee, $card->employee->photo_path, 'photos') ? ['photo' => URL::temporarySignedRoute('card-verification.photo', now()->addMinutes(15), ['employee' => $card->employee->id])] : [])]];
        }

        return response()->json($result)->header('Cache-Control', 'no-store');
    }

    /** Photo for the public verification page, reachable only through the short-lived signed link issued by verify(). */
    public function verificationPhoto(Employee $employee)
    {
        abort_unless(in_array($employee->status, Employee::WORKING_STATUSES, true) && EmployeeFiles::exists($employee, $employee->photo_path, 'photos'), 404);
        $disk = Storage::disk('employee_private');
        $mime = $disk->mimeType($employee->photo_path);
        abort_unless(in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true), 404);

        return $disk->response($employee->photo_path, 'photo.'.pathinfo($employee->photo_path, PATHINFO_EXTENSION), ['Content-Type' => $mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'], 'inline');
    }

    private function announce(string $level, string $title, IdCard $card, string $verb, Request $request, string $suffix = ''): void
    {
        $card->loadMissing('employee');
        Notifier::send('cards', $level, $title, "Card {$card->card_number} {$verb} {$card->employee->full_name} ({$card->employee->employee_id}) by {$request->user()->name}.{$suffix}", ['card', $card->id], $request->user());
    }

    private function record(IdCard $card, int $status = 200)
    {
        $data = (new IdCardResource($card))->resolve(request());
        // The printed card also carries the CNIC and emergency contact, so the single-card responses include them.
        $dossier = $card->employee->dossier ?? [];
        $data['employee']['cnic'] = $dossier['cnic'] ?? '';
        $data['employee']['emergencyContact'] = $dossier['emergencyContact1'] ?? '';

        return response()->json(['data' => $data], $status)->header('ETag', $card->etag())->header('Cache-Control', 'no-store');
    }
}
