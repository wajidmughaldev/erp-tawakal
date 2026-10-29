<?php

namespace App\Http\Requests;

use App\Models\CandidateRequest;
use App\Models\RegistrationInvite;
use App\Support\EmployeeFiles;
use App\Support\EmployeeIdentity;
use App\Support\InviteToken;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CandidateSubmissionRequest extends EmployeeRequest
{
    public const MAX_DOCUMENTS = 12;

    protected function prepareForValidation(): void
    {
        $input = Validator::make($this->only('token'), ['token' => InviteToken::RULES])->validate();
        $invite = RegistrationInvite::where('token_digest', InviteToken::digest($input['token']))->first();
        abort_unless($invite && $invite->status() === 'valid', 409, 'This invitation is unavailable, expired or already used.');
        parent::prepareForValidation();
    }

    public function rules(): array
    {
        $rules = parent::rules();
        // A candidate who already has a request waiting for review must not submit a second one.
        $rules['dossier.cnic'][] = function ($attribute, $value, $fail) {
            if (is_string($value) && CandidateRequest::where('cnic_lookup', EmployeeIdentity::lookup($value))->where('status', 'pending')->exists()) {
                $fail('An application with this CNIC is already awaiting review.');
            }
        };

        return $rules + [
            'token' => InviteToken::RULES,
            'documents' => ['sometimes', 'array', 'list', 'max:'.self::MAX_DOCUMENTS],
            'documents.*' => ['array:type,file'],
            'documents.*.type' => ['required', Rule::in(EmployeeFiles::DOCUMENT_TYPES)],
            'documents.*.file' => ['required', 'file', 'max:'.EmployeeFiles::DOCUMENT_MAX_KB, 'mimetypes:'.implode(',', EmployeeFiles::DOCUMENT_MIMES), 'mimes:pdf,jpg,jpeg,png,webp'],
        ];
    }

    public function messages(): array
    {
        return [
            'documents.*.file.max' => 'Each document must not be larger than 5 MB.',
            'documents.*.file.mimetypes' => 'Only PDF, JPG, PNG or WEBP files are allowed.',
            'documents.*.file.mimes' => 'Only PDF, JPG, PNG or WEBP files are allowed.',
        ];
    }
}
