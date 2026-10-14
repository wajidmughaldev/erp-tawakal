<?php

namespace App\Http\Resources;

use App\Support\EmployeeFiles;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $dossier = $this->dossier;
        unset($dossier['_legacy']);
        $photo = EmployeeFiles::exists($this->resource, $this->photo_path, 'photos') ? route('employees.photo', ['employee' => $this->id]) : null;

        return [
            'id' => (string) $this->id, 'displayId' => $this->employee_id,
            'name' => $this->full_name, 'designation' => $this->designation,
            'department' => $this->department ?? '', 'phone' => $this->phone ?? '', 'status' => $this->status,
            ...($photo ? ['photo' => $photo] : []),
            'dossier' => $dossier, 'documents' => EmployeeFiles::documents($this->resource), 'history' => [],
            // Only previously issued legacy cards are read; no verification credential is invented.
            'cards' => $this->cards->whereIn('status', ['active', 'expired', 'revoked'])->map(fn ($card) => [
                'id' => (string) $card->id, 'number' => $card->card_number, 'employeeId' => (string) $this->id,
                'employee' => ['displayId' => $this->employee_id, 'name' => $this->full_name, 'designation' => $this->designation, 'department' => $this->department ?? '', 'bloodGroup' => $dossier['bloodGroup'], ...($photo ? ['photo' => $photo] : [])],
                'status' => $card->status === 'expired' ? 'active' : $card->status,
                'issueDate' => $card->issued_date->format('Y-m-d'), 'expiryDate' => $card->expiry_date->format('Y-m-d'),
                'verificationToken' => '', 'issuedBy' => $card->printed_by ?? '',
            ])->values()->all(),
        ];
    }
}
