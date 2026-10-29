<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RegistrationInvite;
use App\Support\InviteToken;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RegistrationInviteController extends Controller
{
    public function index(Request $request)
    {
        $input = $request->validate(['page' => ['sometimes', 'integer', 'min:1']]);
        $page = RegistrationInvite::orderByDesc('id')->paginate(15);

        return response()->json(['data' => $page->getCollection()->map(fn ($invite) => $invite->details(true))->values(), 'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'perPage' => $page->perPage(), 'total' => $page->total()]])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request)
    {
        // Links carry no candidate details and are valid for exactly one day; the candidate fills in everything.
        $input = $request->validate(['candidateName' => ['sometimes', 'nullable', 'string', 'max:255'], 'designation' => ['sometimes', 'nullable', 'string', 'max:255'], 'department' => ['sometimes', 'nullable', 'string', 'max:255'], 'roleCategory' => ['sometimes', 'nullable', Rule::in(['office', 'motorcycle', 'van'])]]);
        $token = InviteToken::generate();
        $invite = RegistrationInvite::create(['candidate_name' => $input['candidateName'] ?? null, 'designation' => $input['designation'] ?? null, 'department' => $input['department'] ?? null, 'expires_at' => CarbonImmutable::now()->addDay()->utc(), 'role_category' => $input['roleCategory'] ?? null, 'token_digest' => InviteToken::digest($token), 'token' => $token, 'created_by' => $request->user()->id]);

        return response()->json(['data' => $invite->details(true)], 201)->header('Cache-Control', 'no-store');
    }

    public function validateToken(Request $request)
    {
        $input = $request->validate(['token' => InviteToken::RULES]);
        $invite = RegistrationInvite::where('token_digest', InviteToken::digest($input['token']))->first();
        $status = $invite?->status() ?? 'invalid';

        return response()->json(['status' => $status, ...($status === 'valid' ? ['invite' => $invite->details()] : [])])->header('Cache-Control', 'no-store');
    }
}
