<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

Artisan::command('portal:create-user', function () {
    $data = [
        'name' => $this->ask('Name'),
        'email' => strtolower(trim((string) $this->ask('Email'))),
        'username' => strtolower(trim((string) $this->ask('Username (letters, numbers, dots, underscores or hyphens)'))),
        'role' => $this->choice('Role', User::ROLES),
        'password' => $this->secret('Password (12-72 bytes)'),
    ];
    $validator = Validator::make($data, [
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        'username' => ['required', 'regex:/^[a-z0-9._-]+$/', 'max:100', 'unique:users,username'],
        'role' => ['required', Rule::in(User::ROLES)],
        'password' => ['required', 'string', 'min:12', function ($attribute, $value, $fail) {
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
