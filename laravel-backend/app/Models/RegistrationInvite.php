<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationInvite extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['token', 'token_digest', 'candidate_name'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return ['candidate_name' => 'encrypted', 'token' => 'encrypted', 'expires_at' => 'immutable_datetime', 'used_at' => 'immutable_datetime'];
    }

    public function status(): string
    {
        return $this->used_at !== null ? 'used' : ($this->expires_at->lessThanOrEqualTo(now()) ? 'expired' : 'valid');
    }

    public function details(bool $withToken = false): array
    {
        return ['id' => (string) $this->id, 'candidateName' => $this->candidate_name, 'designation' => $this->designation, 'department' => $this->department, 'expiresAt' => $this->expires_at->toIso8601String(), 'status' => $this->status(), ...($this->role_category ? ['roleCategory' => $this->role_category] : []), ...($withToken ? ['token' => $this->token] : [])];
    }
}
