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
            'cards' => IdCardResource::collection($this->cards->sortByDesc('id')->values())->resolve($request),
        ];
    }
}
