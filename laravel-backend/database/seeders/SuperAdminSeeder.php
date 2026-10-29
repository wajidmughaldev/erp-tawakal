<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    /**
     * Creates the first superadmin from SUPERADMIN_* environment values.
     * An existing account is never modified, so a password changed in the portal is not reset by re-seeding.
     */
    public function run(): void
    {
        $email = strtolower(trim((string) env('SUPERADMIN_EMAIL')));
        $password = (string) env('SUPERADMIN_PASSWORD');
        if ($email === '' || $password === '') {
            $this->command?->warn('SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set; no superadmin created.');

            return;
        }
        $user = User::firstOrCreate(['email' => $email], [
            'name' => env('SUPERADMIN_NAME', 'Super Admin'),
            'password' => $password,
            'role' => 'superadmin',
            'is_active' => true,
        ]);
        $this->command?->info($user->wasRecentlyCreated ? "Superadmin {$email} created." : "Superadmin {$email} already exists; left unchanged.");
    }
}
