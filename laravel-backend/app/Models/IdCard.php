<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class IdCard extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'card_number',
        'qr_code_hash',
        'issued_date',
        'expiry_date',
        'status',
        'printed_by',
        'last_verified_at',
        'verification_count',
    ];

    protected $casts = [
        'issued_date' => 'date',
        'expiry_date' => 'date',
        'last_verified_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
