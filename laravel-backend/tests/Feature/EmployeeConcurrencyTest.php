<?php

namespace Tests\Feature;

use App\Models\CandidateRequest;
use App\Models\Employee;
use App\Models\IdCard;
use App\Models\RegistrationInvite;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class EmployeeConcurrencyTest extends TestCase
{
    use DatabaseTruncation;

    protected function tearDown(): void
    {
        foreach (['candidate_requests', 'registration_invites', 'employee_documents', 'card_lifecycle_events', 'card_renewal_operations', 'id_cards', 'employees', 'users'] as $table) {
            DB::table($table)->delete();
        }
        parent::tearDown();
    }

    private function actor(): User
    {
        return User::create(['name' => 'Parallel Test Operator', 'email' => 'parallel@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'superadmin', 'is_active' => true]);
    }

    private function parallel(?User $user, array $jobs): array
    {
        $directory = storage_path('framework/testing/employee-race-'.bin2hex(random_bytes(8)));
        File::makeDirectory($directory, 0755, true);
        $processes = [];
        try {
            foreach ($jobs as $index => $job) {
                if ($user) {
                    $job['user_id'] = $user->id;
                }
                $job['ready'] = $directory.'/'.$index.'.ready';
                $job['release'] = $directory.'/release';
                $file = $directory.'/'.$index.'.json';
                File::put($file, json_encode($job));
                $process = new Process([PHP_BINARY, base_path('tests/Fixtures/employee-worker.php'), $file], base_path(), timeout: 40);
                $process->start();
                $processes[] = $process;
            }
            $deadline = microtime(true) + 20;
            while (count(File::glob($directory.'/*.ready')) !== count($jobs)) {
                foreach ($processes as $process) {
                    if (! $process->isRunning()) {
                        $this->fail('Worker exited before barrier: '.$process->getErrorOutput().$process->getOutput());
                    }
                }
                if (microtime(true) > $deadline) {
                    $this->fail('Parallel worker startup timed out.');
                } usleep(10000);
            }
            File::put($directory.'/release', 'go');
            $results = [];
            foreach ($processes as $process) {
                $process->wait();
                $this->assertTrue($process->isSuccessful(), $process->getErrorOutput());
                $results[] = json_decode($process->getOutput(), true, 32, JSON_THROW_ON_ERROR);
            }

            return $results;
        } finally {
            foreach ($processes as $process) {
                if ($process->isRunning()) {
                    $process->stop();
                }
            }
            $resolved = realpath($directory);
            $base = realpath(storage_path('framework/testing'));
            if ($resolved && $base && str_starts_with($resolved, $base.DIRECTORY_SEPARATOR)) {
                File::deleteDirectory($resolved);
            }
        }
    }

    public function test_simultaneous_creates_receive_different_database_backed_ids(): void
    {
        $jobs = [];
        foreach ([EmployeeDossier::make(), EmployeeDossier::make()] as $dossier) {
            $jobs[] = ['method' => 'POST', 'path' => '/api/v1/employees', 'parameters' => ['dossier' => json_encode($dossier)]];
        }
        $results = $this->parallel($this->actor(), $jobs);
        $this->assertSame([201, 201], array_column($results, 'status'));
        $this->assertNotSame($results[0]['body']['data']['id'], $results[1]['body']['data']['id']);
        $this->assertNotSame($results[0]['body']['data']['displayId'], $results[1]['body']['data']['displayId']);
        $this->assertDatabaseCount('employees', 2);
    }

    public function test_simultaneous_updates_allow_exactly_one_revision_to_commit(): void
    {
        $user = $this->actor();
        $dossier = EmployeeDossier::make();
        $created = $this->actingAs($user, 'web')->postJson('/api/v1/employees', ['dossier' => json_encode($dossier)])->assertCreated();
        $id = $created->json('data.id');
        $jobs = [];
        foreach (['First Concurrent Edit', 'Second Concurrent Edit'] as $name) {
            $edit = $dossier;
            $edit['fullName'] = $name;
            $jobs[] = ['method' => 'PATCH', 'path' => '/api/v1/employees/'.$id, 'parameters' => ['dossier' => json_encode($edit)], 'headers' => ['If-Match' => $created->headers->get('ETag')]];
        }
        $results = $this->parallel($user, $jobs);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([200, 412], $statuses);
        $winner = array_values(array_filter($results, fn ($result) => $result['status'] === 200))[0];
        $employee = Employee::findOrFail($id);
        $this->assertSame(2, $employee->revision);
        $this->assertSame($winner['body']['data']['name'], $employee->full_name);
    }

    public function test_simultaneous_duplicate_identity_cannot_create_two_records(): void
    {
        $dossier = EmployeeDossier::make();
        $job = ['method' => 'POST', 'path' => '/api/v1/employees', 'parameters' => ['dossier' => json_encode($dossier)]];
        $results = $this->parallel($this->actor(), [$job, $job]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([201, 422], $statuses);
        $this->assertDatabaseCount('employees', 1);
    }

    private function candidateFixture(User $user): array
    {
        $invite = $this->actingAs($user, 'web')->postJson('/api/v1/registration-invites', ['candidateName' => 'Concurrent Candidate', 'designation' => 'Sales Representative', 'department' => 'Distribution', 'expiresAt' => now()->addHour()->toIso8601String()])->assertCreated()->json('data');
        $dossier = EmployeeDossier::make();

        return [$invite, $dossier];
    }

    public function test_simultaneous_public_submissions_consume_invite_exactly_once(): void
    {
        $user = $this->actor();
        [$invite, $dossier] = $this->candidateFixture($user);
        $job = ['method' => 'POST', 'path' => '/api/v1/employee-requests', 'parameters' => ['token' => $invite['token'], 'dossier' => json_encode($dossier)]];
        $results = $this->parallel(null, [$job, $job]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([201, 409], $statuses);
        $this->assertDatabaseCount('candidate_requests', 1);
        $this->assertDatabaseCount('employees', 0);
        $this->assertNotNull(RegistrationInvite::find($invite['id'])->used_at);
    }

    public function test_simultaneous_approvals_create_only_one_employee(): void
    {
        $user = $this->actor();
        [$invite, $dossier] = $this->candidateFixture($user);
        $created = $this->postJson('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode($dossier)])->assertCreated();
        $id = $created->json('data.id');
        $job = ['method' => 'POST', 'path' => '/api/v1/employee-requests/'.$id.'/approve', 'parameters' => []];
        $results = $this->parallel($user, [$job, $job]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([200, 409], $statuses);
        $this->assertDatabaseCount('employees', 1);
        $candidate = CandidateRequest::find($id);
        $this->assertSame('approved', $candidate->status);
        $this->assertNotNull($candidate->employee_id);
    }

    public function test_simultaneous_approval_and_rejection_allow_only_one_transition(): void
    {
        $user = $this->actor();
        [$invite, $dossier] = $this->candidateFixture($user);
        $created = $this->postJson('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode($dossier)])->assertCreated();
        $id = $created->json('data.id');
        $results = $this->parallel($user, [['method' => 'POST', 'path' => '/api/v1/employee-requests/'.$id.'/approve', 'parameters' => []], ['method' => 'POST', 'path' => '/api/v1/employee-requests/'.$id.'/reject', 'parameters' => ['reason' => 'Concurrent reviewer rejected']]]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([200, 409], $statuses);
        $candidate = CandidateRequest::find($id);
        $this->assertContains($candidate->status, ['approved', 'rejected']);
        $this->assertDatabaseCount('employees', $candidate->status === 'approved' ? 1 : 0);
        $this->assertSame($user->id, $candidate->reviewed_by);
    }

    public function test_simultaneous_approval_of_different_requests_with_same_cnic_creates_one_employee(): void
    {
        $user = $this->actor();
        [$invite, $dossier] = $this->candidateFixture($user);
        $first = $this->postJson('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode($dossier)])->assertCreated();
        [$secondInvite] = $this->candidateFixture($user);
        // Submission now refuses a second pending request with the same CNIC, so force the duplicate into storage to test the approval race itself.
        $second = $this->postJson('/api/v1/employee-requests', ['token' => $secondInvite['token'], 'dossier' => json_encode(array_replace($dossier, ['cnic' => '42101-'.random_int(1000000, 9999999).'-9']))])->assertCreated();
        \App\Models\CandidateRequest::findOrFail($second->json('data.id'))->update(['dossier' => $dossier, 'cnic_lookup' => \App\Support\EmployeeIdentity::lookup($dossier['cnic'])]);
        $jobs = [];
        foreach ([$first->json('data.id'), $second->json('data.id')] as $id) {
            $jobs[] = ['method' => 'POST', 'path' => '/api/v1/employee-requests/'.$id.'/approve', 'parameters' => []];
        }
        $results = $this->parallel($user, $jobs);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([200, 409], $statuses);
        $this->assertDatabaseCount('employees', 1);
        $this->assertSame(1, CandidateRequest::where('status', 'approved')->count());
        $this->assertSame(1, CandidateRequest::where('status', 'pending')->count());
    }

    private function cardFixture(): array
    {
        config(['cards.validity_policy' => 'selected_years']);
        $user = $this->actor();
        $employee = $this->actingAs($user, 'web')->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())])->assertCreated()->json('data');
        $card = $this->postJson('/api/v1/id-cards', ['employeeId' => $employee['id'], 'validityYears' => 1])->assertCreated()->json('data');

        return [$user, $card];
    }

    public function test_simultaneous_card_issuance_creates_one_current_credential(): void
    {
        config(['cards.validity_policy' => 'selected_years']);
        $user = $this->actor();
        $employee = $this->actingAs($user, 'web')->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())])->assertCreated()->json('data');
        $job = ['method' => 'POST', 'path' => '/api/v1/id-cards', 'parameters' => ['employeeId' => $employee['id'], 'validityYears' => 1], 'card_policy' => 'selected_years'];
        $results = $this->parallel($user, [$job, $job]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([201, 409], $statuses);
        $this->assertDatabaseCount('id_cards', 1);
        $this->assertDatabaseCount('card_lifecycle_events', 1);
        $this->assertSame(1, DB::table('id_cards')->whereNotNull('current_employee_id')->count());
    }

    public static function cardRaces(): array
    {
        return [['reissue', 'reissue', null], ['renew', 'reissue', 'new_physical'], ['deactivate', 'reissue', null], ['renew', 'reissue', 'existing']];
    }

    #[DataProvider('cardRaces')]
    public function test_simultaneous_card_lifecycle_is_serialized(string $first, string $second, ?string $option): void
    {
        [$user,$card] = $this->cardFixture();
        $jobs = [];
        foreach ([$first, $second] as $action) {
            $jobs[] = ['method' => 'POST', 'path' => '/api/v1/id-cards/'.$card['id'].'/'.$action, 'headers' => ['If-Match' => IdCard::find($card['id'])->etag(), 'Idempotency-Key' => bin2hex(random_bytes(16))], 'parameters' => ['option' => $option, 'reason' => 'Damaged Card', 'acknowledged' => true], 'card_policy' => 'selected_years'];
        }
        $results = $this->parallel($user, $jobs);
        $statuses = array_column($results, 'status');
        sort($statuses);
        // Existing renewal retains the same credential; renewal then reissue is also a valid serial outcome.
        if ($option === 'existing') {
            $this->assertContains($statuses, [[200, 200], [200, 412]]);
        } else {
            $this->assertContains($statuses, [[200, 409], [200, 412]]);
        }
        $current = DB::table('id_cards')->whereNotNull('current_employee_id')->get();
        $this->assertLessThanOrEqual(1, $current->count());
        $this->assertSame(0, DB::table('id_cards')->where('status', 'active')->whereNull('current_employee_id')->count());
        $this->assertDatabaseHas('id_cards', ['id' => $card['id'], 'current_employee_id' => null]);
        $this->assertLessThanOrEqual(2, DB::table('id_cards')->count());
        $this->assertNotSame('valid', $this->postJson('/api/v1/verify-card', ['token' => $card['verificationToken']])->json('status'));
        $this->assertDatabaseHas('card_lifecycle_events', ['administrator_id' => $user->id, 'previous_card_id' => $card['id']]);
    }

    public function test_concurrent_duplicate_renewals_apply_once_and_can_be_deliberately_repeated(): void
    {
        [$user,$card] = $this->cardFixture();
        $key = bin2hex(random_bytes(16));
        $job = ['method' => 'POST', 'path' => '/api/v1/id-cards/'.$card['id'].'/renew', 'parameters' => ['option' => 'existing'], 'headers' => ['If-Match' => IdCard::find($card['id'])->etag(), 'Idempotency-Key' => $key], 'card_policy' => 'selected_years'];
        $results = $this->parallel($user, [$job, $job]);
        $this->assertSame([200, 200], array_column($results, 'status'));
        $this->assertSame($results[0]['body']['data']['expiryDate'], $results[1]['body']['data']['expiryDate']);
        $this->assertSame(1, DB::table('card_lifecycle_events')->where('operation', 'renewal')->count());
        $this->assertDatabaseCount('card_renewal_operations', 1);
        $before = $results[0]['body']['data']['expiryDate'];
        $this->withHeader('If-Match', IdCard::find($card['id'])->etag())->withHeader('Idempotency-Key', bin2hex(random_bytes(16)))->postJson($job['path'], $job['parameters'])->assertOk();
        $this->assertGreaterThan($before, DB::table('id_cards')->where('id', $card['id'])->value('expiry_date'));
        $this->assertSame(2, DB::table('card_lifecycle_events')->where('operation', 'renewal')->count());
    }

    public function test_concurrent_different_keys_with_same_revision_allow_one_renewal(): void
    {
        [$user,$card] = $this->cardFixture();
        $job = ['method' => 'POST', 'path' => '/api/v1/id-cards/'.$card['id'].'/renew', 'parameters' => ['option' => 'existing'], 'headers' => ['If-Match' => IdCard::find($card['id'])->etag(), 'Idempotency-Key' => bin2hex(random_bytes(16))], 'card_policy' => 'selected_years'];
        $other = $job;
        $other['headers']['Idempotency-Key'] = bin2hex(random_bytes(16));
        $results = $this->parallel($user, [$job, $other]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame([200, 412], $statuses);
        $this->assertDatabaseCount('card_renewal_operations', 1);
        $this->assertSame(1, DB::table('card_lifecycle_events')->where('operation', 'renewal')->count());
        $this->assertSame(2, IdCard::find($card['id'])->revision);
    }
}
