<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use SoftDeletes;

    public const STATUSES = ['active', 'inactive', 'transferred', 'resigned'];

    protected $fillable = ['employee_id', 'full_name', 'designation', 'joining_date', 'phone', 'dossier', 'cnic_lookup', 'photo_path', 'status'];

    protected $hidden = ['dossier', 'cnic_lookup', 'photo_path', 'photo_url', 'email', 'phone', 'address', 'emergency_phone'];

    protected function casts(): array
    {
        return ['dossier' => 'encrypted:array', 'phone' => 'encrypted', 'joining_date' => 'date', 'revision' => 'integer'];
    }

    public function idCard()
    {
        return $this->hasOne(IdCard::class);
    }

    public function cards()
    {
        return $this->hasMany(IdCard::class);
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class);
    }

    public function etag(): string
    {
        return '"employee-'.$this->id.'-v'.$this->revision.'"';
    }

    public function latestCard()
    {
        return $this->hasOne(IdCard::class)->latestOfMany();
    }
}
