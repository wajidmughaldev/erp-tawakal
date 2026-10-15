<?php

namespace App\Http\Resources;

use App\Support\CandidateFiles;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CandidateRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => (string) $this->id, 'trackingId' => $this->tracking_id, 'status' => $this->status, 'submittedAt' => $this->created_at->toIso8601String(), 'dossier' => $this->dossier, 'documents' => [], ...(CandidateFiles::photoExists($this->resource) ? ['photo' => route('candidate-requests.photo', ['candidateRequest' => $this->id])] : []), ...($this->employee_id !== null ? ['employeeId' => (string) $this->employee_id] : []), ...($this->status === 'rejected' ? ['rejectionReason' => $this->rejection_reason] : [])];
    }
}
