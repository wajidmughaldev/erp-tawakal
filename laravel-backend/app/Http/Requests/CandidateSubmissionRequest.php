<?php

namespace App\Http\Requests;

use App\Models\RegistrationInvite;
use App\Support\InviteToken;
use Illuminate\Support\Facades\Validator;

class CandidateSubmissionRequest extends EmployeeRequest
{
    protected function prepareForValidation(): void
    {
        $input = Validator::make($this->only('token'), ['token' => InviteToken::RULES])->validate();
        $invite = RegistrationInvite::where('token_digest', InviteToken::digest($input['token']))->first();
        abort_unless($invite && $invite->status() === 'valid', 409, 'This invitation is unavailable, expired or already used.');
        parent::prepareForValidation();
    }

    public function rules(): array
    {
        return parent::rules() + ['token' => InviteToken::RULES];
    }
}
