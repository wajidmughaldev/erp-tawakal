<?php

use App\Models\Employee;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->loadEnvironmentFrom('.env.testing');
$app->make(Kernel::class)->bootstrap();
if (config('database.default') !== 'mysql' || ! str_ends_with(config('database.connections.mysql.database'), '_test')) {
    throw new RuntimeException('Migration smoke requires a dedicated MySQL _test database.');
}
// Intentionally destructive only to the isolated test database; establish the real pre-checkpoint schema.
$paths = ['database/migrations/0001_01_01_000000_create_users_table.php', 'database/migrations/2026_09_30_000001_create_employees_table.php', 'database/migrations/2026_09_30_000002_create_id_cards_table.php'];
if (Artisan::call('migrate:fresh', ['--path' => $paths, '--force' => true]) !== 0) {
    throw new RuntimeException(Artisan::output());
}
$timestamp = '2020-02-03 04:05:06';
$id = DB::table('employees')->insertGetId(['employee_id' => 'EMP-2020-LEGACY', 'first_name' => 'Legacy', 'last_name' => 'Fixture', 'email' => 'legacy@example.test', 'phone' => '+92 311 0000000', 'emergency_phone' => 'Legacy emergency', 'department' => 'Existing department', 'designation' => 'Existing designation', 'blood_group' => 'AB+', 'joining_date' => '2020-02-03', 'address' => 'Legacy private address', 'photo_url' => 'https://legacy.example.test/private-photo.jpg', 'status' => 'suspended', 'created_at' => $timestamp, 'updated_at' => $timestamp]);
$cardId = DB::table('id_cards')->insertGetId(['employee_id' => $id, 'card_number' => 'LEGACY-CARD-FIXTURE', 'qr_code_hash' => bin2hex(random_bytes(32)), 'issued_date' => '2020-02-03', 'expiry_date' => '2021-02-03', 'status' => 'expired', 'created_at' => $timestamp, 'updated_at' => $timestamp]);
if (Artisan::call('migrate', ['--force' => true]) !== 0) {
    throw new RuntimeException(Artisan::output());
}
$employee = Employee::findOrFail($id);
$row = DB::table('employees')->find($id);
$checks = [$employee->employee_id === 'EMP-2020-LEGACY', $employee->full_name === 'Legacy Fixture', $employee->phone === '+92 311 0000000', $employee->dossier['residentialAddress'] === 'Legacy private address', $employee->dossier['_legacy']['email'] === 'legacy@example.test', $employee->dossier['_legacy']['photo_url'] === 'https://legacy.example.test/private-photo.jpg', $employee->dossier['_legacy']['status'] === 'suspended', $employee->status === 'inactive', $row->created_at === $timestamp, $row->updated_at === $timestamp, $row->email === null, $row->address === null, $row->emergency_phone === null, $row->photo_url === null, $row->blood_group === null, ! str_contains($row->dossier, 'Legacy private address'), ! str_contains($row->phone, '311 0000000'), DB::table('id_cards')->where('id', $cardId)->value('employee_id') === $id];
if (in_array(false, $checks, true)) {
    throw new RuntimeException('Legacy data preservation check failed.');
}
DB::table('id_cards')->where('id', $cardId)->delete();
DB::table('employees')->where('id', $id)->delete();
echo "PASS: legacy IDs, timestamps, department, card relationship and sensitive data preserved through encrypted migration.\n";
