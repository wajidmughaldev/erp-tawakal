<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\IdCardResource;
use App\Models\IdCard;
use App\Services\CardLifecycle;
use App\Support\CardToken;
use App\Support\CardValidity;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IdCardController extends Controller
{
    public function index(Request $request)
    {
        $sorts = ['expiry_asc' => ['expiry_date', 'asc'], 'issue_desc' => ['issued_date', 'desc'], 'issue_asc' => ['issued_date', 'asc']];
        $input = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'search' => ['sometimes', 'nullable', 'string', 'max:254'], 'status' => ['sometimes', 'nullable', Rule::in(['active', 'expiring_soon', 'expired', 'revoked', 'replaced'])], 'expiry' => ['sometimes', 'nullable', Rule::in(['expiring', 'expired'])], 'sort' => ['sometimes', Rule::in(array_keys($sorts))]]);
        $query = IdCard::with('employee');
        $today = CardValidity::today()->toDateString();
        $limit = CardValidity::today()->addDays(30)->toDateString();
        $status = $input['status'] ?? null;
        if (in_array($status, ['active', 'expiring_soon', 'expired'], true)) {
            $query->whereIn('status', ['active', 'expired']);
            if ($status === 'active') {
                $query->whereDate('expiry_date', '>', $limit);
            } elseif ($status === 'expiring_soon') {
                $query->whereBetween('expiry_date', [$today, $limit]);
            } else {
                $query->whereDate('expiry_date', '<', $today);
            }
        } elseif ($status !== null) {
            $status === 'revoked' ? $query->whereIn('status', ['revoked', 'pending_print']) : $query->where('status', $status);
        }
        if (($input['expiry'] ?? null) === 'expiring') {
            $query->whereIn('status', ['active', 'expired'])->whereBetween('expiry_date', [$today, $limit]);
        }
        if (($input['expiry'] ?? null) === 'expired') {
            $query->whereIn('status', ['active', 'expired'])->whereDate('expiry_date', '<', $today);
        }
        if (($search = trim($input['search'] ?? '')) !== '') {
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(fn ($q) => $q->whereRaw("card_number LIKE ? ESCAPE '!'", [$pattern])->orWhereHas('employee', fn ($e) => $e->where(fn ($columns) => $columns->whereRaw("full_name LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("employee_id LIKE ? ESCAPE '!'", [$pattern]))));
        }
        [$column,$direction] = $sorts[$input['sort'] ?? 'issue_desc'];
        $page = $query->orderBy($column, $direction)->orderBy('id', $direction)->paginate(15);

        return response()->json(['data' => IdCardResource::collection($page->getCollection())->resolve($request), 'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'perPage' => $page->perPage(), 'total' => $page->total()]])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request, CardLifecycle $lifecycle)
    {
        $input = $request->validate(['employeeId' => ['required', 'integer', Rule::exists('employees', 'id')], 'validityYears' => ['sometimes', 'integer', Rule::in([1, 2])], 'number' => ['prohibited'], 'card_number' => ['prohibited'], 'expiryDate' => ['prohibited'], 'expiry_date' => ['prohibited'], 'verificationToken' => ['prohibited']]);

        return $this->record($lifecycle->issue((string) $input['employeeId'], isset($input['validityYears']) ? (int) $input['validityYears'] : null, $request->user()), 201);
    }

    public function show(IdCard $idCard)
    {
        return $this->record($idCard);
    }

    public function renew(Request $request, IdCard $idCard, CardLifecycle $lifecycle)
    {
        $input = $request->validate(['option' => ['required', Rule::in(['existing', 'new_physical'])], 'validityYears' => ['sometimes', 'integer', Rule::in([1, 2])]]);

        return $this->record($lifecycle->renew($idCard, $input['option'], isset($input['validityYears']) ? (int) $input['validityYears'] : null, $request->user()));
    }

    public function reissue(Request $request, IdCard $idCard, CardLifecycle $lifecycle)
    {
        $input = $request->validate(['reason' => ['required', Rule::in(['Lost / Stolen Card', 'Damaged Card', 'Updated Information', 'Other'])], 'acknowledged' => ['required', 'accepted']]);

        return $this->record($lifecycle->reissue($idCard, $input['reason'], $request->user()));
    }

    public function deactivate(Request $request, IdCard $idCard, CardLifecycle $lifecycle)
    {
        $input = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:2000']]);

        return $this->record($lifecycle->deactivate($idCard, $input['reason'], $request->user()));
    }

    public function verify(Request $request)
    {
        $input = $request->validate(['token' => CardToken::RULES]);
        $card = IdCard::with('employee')->where('verification_token_digest', CardToken::digest($input['token']))->first();
        $result = ['status' => 'invalid', 'message' => 'This credential is not recognized or its holder is ineligible.'];
        if ($card && $card->employee && ! $card->employee->trashed() && $card->employee->status === 'active') {
            $status = ! $card->isCurrent() ? 'revoked' : ($card->expiry_date->lessThan(CardValidity::today()) ? 'expired' : ($card->expiry_date->lessThanOrEqualTo(CardValidity::today()->addDays(30)) ? 'expiring' : 'valid'));
            $messages = ['valid' => 'This official credential is active.', 'expiring' => 'This credential expires within 30 days.', 'expired' => 'This credential has expired.', 'revoked' => 'This credential is no longer active.'];
            $result = ['status' => $status, 'message' => $messages[$status], 'card' => ['number' => $card->card_number, 'employeeName' => $card->employee->full_name, 'employeeDisplayId' => $card->employee->employee_id, 'designation' => $card->employee->designation, 'issueDate' => $card->issued_date->format('Y-m-d'), 'expiryDate' => $card->expiry_date->format('Y-m-d')]];
        }

        return response()->json($result)->header('Cache-Control', 'no-store');
    }

    private function record(IdCard $card, int $status = 200)
    {
        return response()->json(['data' => (new IdCardResource($card))->resolve(request())], $status)->header('Cache-Control', 'no-store');
    }
}
