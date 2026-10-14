<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class EmployeeConcurrencyTest extends TestCase
{
    use DatabaseTruncation;

    protected function tearDown(): void
    {
        foreach (['employee_documents', 'id_cards', 'employees', 'users'] as $table) {
            DB::table($table)->delete();
        }
        parent::tearDown();
    }

    private function actor(): User
    {
        return User::create(['name' => 'Parallel Test Operator', 'email' => 'parallel@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'admin', 'is_active' => true]);
    }

    private function parallel(User $user, array $jobs): array
    {
        $directory = storage_path('framework/testing/employee-race-'.bin2hex(random_bytes(8)));
        File::makeDirectory($directory, 0755, true);
        $processes = [];
        try {
            foreach ($jobs as $index => $job) {
                $job['user_id'] = $user->id;
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
}
