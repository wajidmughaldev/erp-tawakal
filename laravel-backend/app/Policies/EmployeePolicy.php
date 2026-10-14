<?php

namespace App\Policies;

use App\Models\Employee;
use App\Models\User;

class EmployeePolicy
{
    // Current portal roles share employee access; no ownership or new permission tiers are invented.
    public function view(User $user, Employee $employee): bool
    {
        return $user->is_active && in_array($user->role, User::ROLES, true) && ! $employee->trashed();
    }
}
