<?php

namespace App\Support;

use App\Models\CandidateRequest;
use Illuminate\Support\Facades\Storage;

class CandidateFiles
{
    public static function photoExists(CandidateRequest $candidate): bool
    {
        $prefix = 'candidate-requests/'.$candidate->id.'/photos/';
        $path = $candidate->photo_path;

        return $path !== null && str_starts_with($path, $prefix) && preg_match('/^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/D', substr($path, strlen($prefix))) === 1 && Storage::disk('employee_private')->exists($path);
    }
}
