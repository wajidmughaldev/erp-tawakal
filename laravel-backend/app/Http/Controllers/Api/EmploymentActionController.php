<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\IdCard;
use App\Services\CardLifecycle;
use App\Services\Notifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class EmploymentActionController extends Controller
{
    public function store(Request $request, Employee $employee, CardLifecycle $lifecycle): JsonResponse
    {
        Gate::authorize('view', $employee);
        $type = $request->validate(['type' => ['required', 'in:transfer,resign,other']])['type'];
        $input = $request->validate(match ($type) {
            'transfer' => [
                'department' => ['required', 'string', 'min:2', 'max:120'],
                'location' => ['required', 'string', 'min:2', 'max:120'],
                'effectiveDate' => ['required', 'date_format:Y-m-d'],
                'reason' => ['required', 'string', 'min:3', 'max:2000'],
                'notes' => ['nullable', 'string', 'max:2000'],
            ],
            'resign' => [
                'resignationDate' => ['required', 'date_format:Y-m-d'],
                'lastWorkingDate' => ['required', 'date_format:Y-m-d', 'after_or_equal:resignationDate'],
                'reason' => ['required', 'string', 'min:3', 'max:2000'],
            ],
            'other' => [
                'title' => ['required', 'string', 'min:2', 'max:160'],
                'date' => ['required', 'date_format:Y-m-d'],
                'description' => ['required', 'string', 'min:3', 'max:2000'],
            ],
        });
        $actor = $request->user();

        DB::transaction(function () use ($employee, $type, $input, $actor, $lifecycle) {
            $current = Employee::whereKey($employee->id)->lockForUpdate()->firstOrFail();
            if ($type !== 'other') {
                abort_unless(in_array($current->status, Employee::WORKING_STATUSES, true), 409, 'Only a working employee can be transferred or resigned.');
            }
            $details = $input;
            unset($details['type']);
            if ($type === 'transfer') {
                $current->department = $input['department'];
                $current->location = $input['location'];
                $current->status = 'transferred';
                $date = $input['effectiveDate'];
            } elseif ($type === 'resign') {
                // Revoke every live credential first; deactivation requires an active employee.
                IdCard::eligibleCurrent()->where('id_cards.employee_id', $current->id)->lockForUpdate()->get()
                    ->each(fn (IdCard $card) => $lifecycle->deactivate($card, 'Employee resigned: '.$input['reason'], $actor));
                $current->status = 'resigned';
                $date = $input['resignationDate'];
            } else {
                $date = $input['date'];
            }
            $current->revision++;
            $current->save();
            DB::table('employment_actions')->insert(['employee_id' => $current->id, 'type' => $type, 'effective_date' => $date, 'details' => json_encode($details, JSON_THROW_ON_ERROR), 'administrator_id' => $actor->id, 'created_at' => now()]);
        });

        $employee->refresh()->load(['documents', 'cards']);
        if ($type === 'transfer') {
            Notifier::send('employees', 'info', 'Employee transferred', "{$employee->full_name} was transferred to {$input['department']}, {$input['location']} by {$actor->name}.", ['employee', $employee->id], $actor);
        } elseif ($type === 'resign') {
            Notifier::send('employees', 'warning', 'Employee resigned', "{$employee->full_name} resigned (last working day {$input['lastWorkingDate']}). Their ID card was revoked.", ['employee', $employee->id], $actor);
        }

        return response()->json(['data' => (new EmployeeResource($employee))->resolve($request)])->header('ETag', $employee->etag())->header('Cache-Control', 'no-store');
    }
}
