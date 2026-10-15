<?php

use App\Models\CandidateRequest;
use App\Models\Employee;
use App\Models\IdCard;
use App\Models\RegistrationInvite;
use App\Models\User;
use App\Support\CardValidity;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->loadEnvironmentFrom('.env.integration');
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('integration') || config('database.default') !== 'mysql' || config('database.connections.mysql.database') !== 'tawakal_frontend_integration_test') {
    fwrite(STDERR, "Integration fixture command refused: use the dedicated integration _test environment.\n");
    exit(1);
}
$path = dirname(__DIR__, 3).'/.next/integration/fixtures.json';
function cleanupIntegration(array $fixture): void
{
    if (! preg_match('/^QA[0-9a-f]{16}$/D', $fixture['prefix'] ?? '')) {
        throw new RuntimeException('Invalid owned fixture prefix.');
    }
    $employees = Employee::withTrashed()->where('full_name', 'like', $fixture['prefix'].'%')->get();
    $ids = $employees->modelKeys();
    $invites = RegistrationInvite::where('created_by', $fixture['adminId'])->pluck('id');
    $candidates = CandidateRequest::whereIn('registration_invite_id', $invites)->get();
    $cards = IdCard::withTrashed()->whereIn('employee_id', $ids)->pluck('id');
    foreach ($candidates as $candidate) {
        if ($candidate->photo_path) {
            Storage::disk('employee_private')->delete($candidate->photo_path);
        }
    }
    foreach ($employees as $employee) {
        if ($employee->photo_path) {
            Storage::disk('employee_private')->delete($employee->photo_path);
        }foreach ($employee->documents as $document) {
            Storage::disk('employee_private')->delete($document->path);
        }
    }
    DB::transaction(function () use ($ids, $invites, $cards, $fixture) {
        DB::table('card_renewal_operations')->whereIn('card_id', $cards)->delete();
        DB::table('card_lifecycle_events')->whereIn('employee_id', $ids)->delete();
        DB::table('id_cards')->whereIn('id', $cards)->delete();
        DB::table('candidate_requests')->whereIn('registration_invite_id', $invites)->delete();
        DB::table('registration_invites')->whereIn('id', $invites)->delete();
        DB::table('employee_documents')->whereIn('employee_id', $ids)->delete();
        DB::table('employees')->whereIn('id', $ids)->delete();
        DB::table('users')->where('id', $fixture['adminId'])->delete();
    });
}
try {
    $command = $argv[1] ?? '';
    if ($command === 'init') {
        if (Artisan::call('migrate', ['--force' => true]) !== 0) {
            throw new RuntimeException('Integration migration failed.');
        }
        if (is_file($path)) {
            cleanupIntegration(json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR));
        }
        if (Employee::withTrashed()->exists() || User::exists() || RegistrationInvite::exists()) {
            throw new RuntimeException('The integration database is not empty; it must not contain unrelated records.');
        }
        $prefix = 'QA'.bin2hex(random_bytes(8));
        $password = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $email = strtolower($prefix).'@example.test';
        $admin = User::create(['name' => 'Integration Test Administrator', 'email' => $email, 'username' => strtolower($prefix), 'password' => $password, 'role' => 'admin', 'is_active' => true]);
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0700, true);
        }file_put_contents($path, json_encode(['prefix' => $prefix, 'email' => $email, 'password' => $password, 'adminId' => $admin->id], JSON_THROW_ON_ERROR));
        echo "Integration fixtures initialized; credentials saved only in ignored local storage.\n";
    } elseif ($command === 'cleanup') {
        if (is_file($path)) {
            cleanupIntegration(json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR));
            unlink($path);
        }echo "Owned integration fixtures cleaned.\n";
    } elseif ($command === 'policy') {
        $mode = $argv[2] ?? '';
        if (! in_array($mode, ['unconfigured', 'selected_years', 'eleven_months'], true)) {
            throw new RuntimeException('Invalid test policy.');
        }
        $env = base_path('.env.integration');
        $content = file_get_contents($env);
        $content = preg_replace('/^CARD_VALIDITY_POLICY=.*$/m', 'CARD_VALIDITY_POLICY='.$mode, $content);
        file_put_contents($env, $content);
        echo "Test-only policy updated.\n";
    } elseif ($command === 'document') {
        $fixture = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
        $employee = Employee::whereKey($argv[2] ?? '')->where('full_name', 'like', $fixture['prefix'].'%')->firstOrFail();
        $file = 'employees/'.$employee->id.'/documents/'.bin2hex(random_bytes(16)).'.pdf';
        Storage::disk('employee_private')->put($file, "%PDF-1.4\nPrivate fictional QA document\n%%EOF");
        $document = $employee->documents()->create(['name' => 'Private QA document.pdf', 'type' => 'employment', 'path' => $file]);
        $fixture['documentId'] = $document->id;
        file_put_contents($path, json_encode($fixture, JSON_THROW_ON_ERROR));
        echo "Owned private test document created.\n";
    } elseif ($command === 'expire-invite') {
        $fixture = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
        RegistrationInvite::where('created_by', $fixture['adminId'])->whereKey($argv[2] ?? '')->update(['expires_at' => now()->subSecond()]);
        echo "Owned invitation expired for boundary QA.\n";
    } elseif ($command === 'legacy-card') {
        $fixture = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
        $employee = Employee::whereKey($argv[2] ?? '')->where('full_name', 'like', $fixture['prefix'].'%')->firstOrFail();
        IdCard::create(['employee_id' => $employee->id, 'card_number' => 'HISTORICAL-'.$fixture['prefix'], 'qr_code_hash' => bin2hex(random_bytes(32)), 'issued_date' => now()->subYears(3), 'expiry_date' => now()->addYear(), 'status' => 'active']);
        echo "Owned historical non-credential fixture created.\n";
    } elseif ($command === 'counts') {
        $counts = ['totalEmployees' => DB::table('employees')->whereNull('deleted_at')->count(), 'activeEmployees' => DB::table('employees')->whereNull('deleted_at')->where('status', 'active')->count(), 'pendingRequests' => DB::table('candidate_requests')->where('status', 'pending')->count(), 'approvedRequests' => DB::table('candidate_requests')->where('status', 'approved')->count(), 'rejectedRequests' => DB::table('candidate_requests')->where('status', 'rejected')->count(), 'cards' => DB::table('id_cards')->count(), 'renewals' => DB::table('card_lifecycle_events')->where('operation', 'renewal')->count()];
        $base = DB::table('id_cards as c')->join('employees as e', 'c.employee_id', '=', 'e.id')->whereNull('e.deleted_at')->whereNull('c.deleted_at')->whereNotNull('c.verification_token_digest');
        $today = CardValidity::today()->toDateString();
        $limit = CardValidity::today()->addDays(30)->toDateString();
        foreach (['activeCards' => ['>', $limit], 'expiringCards' => ['between', [$today, $limit]], 'expiredCards' => ['<', $today]] as $name => [$operator,$value]) {
            $query = (clone $base)->where('c.status', 'active')->where('e.status', 'active')->whereColumn('c.current_employee_id', 'e.id');
            $counts[$name] = $operator === 'between' ? $query->whereBetween('c.expiry_date', $value)->count() : $query->where('c.expiry_date', $operator, $value)->count();
        }$counts['revokedCards'] = (clone $base)->where('c.status','revoked')->count();
        echo json_encode($counts,JSON_THROW_ON_ERROR);
    } else {
        throw new RuntimeException('Unknown integration fixture operation.');
    }
} catch (Throwable $error) {
    fwrite(STDERR,"Integration fixture operation failed. Review the isolated database setup and owned fixture state.\n");
    exit(1);
}
