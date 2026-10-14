<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeDocument extends Model
{
    protected $fillable = ['name', 'type', 'path'];

    protected $hidden = ['path'];

    protected function casts(): array
    {
        return ['name' => 'encrypted', 'path' => 'encrypted'];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
