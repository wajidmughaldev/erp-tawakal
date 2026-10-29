<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CandidateDocument extends Model
{
    protected $fillable = ['name', 'type', 'path'];

    protected $hidden = ['path'];

    protected function casts(): array
    {
        return ['name' => 'encrypted', 'path' => 'encrypted'];
    }

    public function candidateRequest()
    {
        return $this->belongsTo(CandidateRequest::class);
    }
}
