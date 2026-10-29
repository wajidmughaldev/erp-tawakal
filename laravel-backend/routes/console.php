<?php

use App\Models\User;
use App\Models\PortalNotification;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

Artisan::command('portal:create-user', function () {
    $data = [
        'name' => $this->ask('Name'),
        'email' => strtolower(trim((string) $this->ask('Email'))),
        'role' => $this->choice('Role', User::ROLES),
        'password' => $this->secret('Password (8-72 bytes)'),
    ];
    $validator = Validator::make($data, [
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        'role' => ['required', Rule::in(User::ROLES)],
        'password' => ['required', 'string', 'min:8', function ($attribute, $value, $fail) {
            if (strlen($value) > 72) {
                $fail('Password must not exceed 72 bytes for bcrypt.');
            }
        }],
    ]);
    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $error) {
            $this->error($error);
        }

        return 1;
    }
    User::create($validator->validated());
    $this->info('Portal account created.');

    return 0;
})->purpose('Create a portal account with an operator-supplied password; no default accounts are seeded.');

Artisan::command('notifications:prune', function () {
    $this->info('Deleted '.PortalNotification::prune().' notification(s) older than '.PortalNotification::RETENTION_DAYS.' days.');
})->purpose('Delete portal notifications older than the retention period.');

// Needs `php artisan schedule:run` every minute (cron / Task Scheduler). Lists also prune on read, so this is a backstop.
Schedule::command('notifications:prune')->daily();
