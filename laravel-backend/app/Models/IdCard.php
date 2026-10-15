<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class IdCard extends Model
{
    use HasFactory,SoftDeletes;

    protected $guarded = ['id'];

    protected $hidden = ['qr_code_hash', 'verification_token_digest', 'verification_token'];

    protected function casts(): array
    {
        return ['issued_date' => 'immutable_date', 'expiry_date' => 'immutable_date', 'last_verified_at' => 'datetime', 'verification_token' => 'encrypted', 'validity_years' => 'integer'];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    public function lifecycleEvents()
    {
        return $this->hasMany(CardLifecycleEvent::class, 'card_id');
    }

    public function isCurrent(): bool
    {
        return $this->status === 'active' && $this->verification_token_digest !== null && $this->current_employee_id === $this->employee_id && ! $this->trashed();
    }
}
