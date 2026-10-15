<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CandidateRequest extends Model
{
    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $guarded = ['id'];

    protected $hidden = ['dossier', 'cnic_lookup', 'photo_path', 'candidate_name', 'rejection_reason'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return ['dossier' => 'encrypted:array', 'candidate_name' => 'encrypted', 'photo_path' => 'encrypted', 'rejection_reason' => 'encrypted', 'reviewed_at' => 'immutable_datetime'];
    }

    public function invite()
    {
        return $this->belongsTo(RegistrationInvite::class, 'registration_invite_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
