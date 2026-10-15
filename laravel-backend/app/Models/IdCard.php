<?php

namespace App\Models;

use App\Support\CardValidity;
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

    public function scopeEligibleCurrent($query)
    {
        return $query->where('id_cards.status', 'active')->whereNotNull('id_cards.verification_token_digest')->whereColumn('id_cards.current_employee_id', 'id_cards.employee_id')->whereHas('employee', fn ($employee) => $employee->whereNull('employees.deleted_at')->where('employees.status', 'active'));
    }

    public function scopeDisplayStatus($query, string $status)
    {
        $today = CardValidity::today()->toDateString();
        $limit = CardValidity::today()->addDays(30)->toDateString();
        if (in_array($status, ['active', 'expiring', 'expiring_soon', 'expired'], true)) {
            $query->eligibleCurrent();

            return match ($status) {
                'active' => $query->whereDate('id_cards.expiry_date', '>', $limit),'expired' => $query->whereDate('id_cards.expiry_date', '<', $today),default => $query->whereBetween('id_cards.expiry_date', [$today, $limit])
            };
        }

        return $query->where('id_cards.status', $status)->whereNotNull('id_cards.verification_token_digest')->whereHas('employee', fn ($employee) => $employee->whereNull('employees.deleted_at'));
    }
}
