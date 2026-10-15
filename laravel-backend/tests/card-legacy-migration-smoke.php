<?php

use App\Models\Employee;
use App\Support\CardToken;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\Fixtures\EmployeeDossier;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->loadEnvironmentFrom('.env.testing');
$app->make(Kernel::class)->bootstrap();
if (config('database.default') !== 'mysql' || ! str_ends_with(config('database.connections.mysql.database'), '_test')) {
    throw new RuntimeException('Legacy card smoke requires a dedicated MySQL _test database.');
}
$paths = ['database/migrations/0001_01_01_000000_create_users_table.php', 'database/migrations/2026_09_30_000001_create_employees_table.php', 'database/migrations/2026_09_30_000002_create_id_cards_table.php', 'database/migrations/2026_10_15_000001_complete_employee_dossiers.php', 'database/migrations/2026_10_15_000002_create_employee_documents_table.php', 'database/migrations/2026_10_15_000003_create_candidate_registration_tables.php'];
if (Artisan::call('migrate:fresh', ['--path' => $paths, '--force' => true]) !== 0) {
    throw new RuntimeException('Pre-checkpoint schema creation failed.');
}
$employee = Employee::create(['employee_id' => 'EMP-LEGACY-CARD', 'full_name' => 'Legacy Card Fixture', 'designation' => 'Legacy role', 'joining_date' => '2019-01-31', 'dossier' => EmployeeDossier::make(), 'status' => 'active']);
$rows = [];
foreach (['active', 'expired', 'revoked', 'pending_print'] as $index => $status) {
    $id = DB::table('id_cards')->insertGetId(['employee_id' => $employee->id, 'card_number' => 'LEGACY-PRESERVE-'.$status, 'qr_code_hash' => rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='), 'issued_date' => '2019-01-31', 'expiry_date' => '2020-02-29', 'status' => $status, 'printed_by' => 'Legacy printer', 'last_verified_at' => '2020-01-02 03:04:05', 'verification_count' => 7 + $index, 'created_at' => '2019-01-31 01:02:03', 'updated_at' => '2020-01-02 03:04:05', 'deleted_at' => $status === 'revoked' ? '2020-02-01 00:00:00' : null]);
    $rows[$id] = (array) DB::table('id_cards')->find($id);
}
if (Artisan::call('migrate', ['--force' => true]) !== 0) {
    throw new RuntimeException('Card upgrade failed.');
}
$checks = 0;
foreach ($rows as $id => $original) {
    $after = (array) DB::table('id_cards')->find($id);
    foreach ($original as $key => $value) {
        if ($after[$key] !== $value) {
            throw new RuntimeException('Historical field changed: '.$key);
        }$checks++;
    }
    foreach (['verification_token_digest', 'verification_token', 'current_employee_id', 'issued_by', 'validity_policy', 'validity_years'] as $key) {
        if ($after[$key] !== null) {
            throw new RuntimeException('Legacy credential metadata was invented.');
        }$checks++;
    }
    if (DB::table('id_cards')->where('verification_token_digest', CardToken::digest($original['qr_code_hash']))->exists()) {
        throw new RuntimeException('Legacy QR became a current credential.');
    }$checks++;
}
if (DB::table('card_lifecycle_events')->count() !== 0) {
    throw new RuntimeException('Synthetic legacy audit history was created.');
}
DB::table('id_cards')->whereIn('id', array_keys($rows))->delete();
$employee->forceDelete();
echo "PASS: legacy card migration ($checks checks), all original statuses, numbers, hashes, timestamps, counters, soft deletions and employee links preserved; no credentials or audit events invented.\n";
