<?php

namespace Tests\Feature;

use App\Models\CandidateRequest;
use App\Models\Employee;
use App\Models\RegistrationInvite;
use App\Models\User;
use App\Support\EmployeeIdentity;
use App\Support\InviteToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class CandidateRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('employee_private');
        $this->operator = User::create(['name' => 'Candidate Test Operator', 'email' => 'candidate-operator@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'superadmin', 'is_active' => true]);
        $this->actingAs($this->operator, 'web');
    }

    private function invite(array $overrides = []): array
    {
        return $this->postJson('/api/v1/registration-invites', array_replace(['candidateName' => 'Invited Candidate', 'designation' => 'Sales Representative', 'department' => 'Distribution', 'expiresAt' => now()->addHour()->toIso8601String()], $overrides))->assertCreated()->json('data');
    }

    private function submit(array $invite, ?array $dossier = null, bool $photo = false)
    {
        $payload = ['token' => $invite['token'], 'dossier' => json_encode($dossier ?? EmployeeDossier::make())];
        if ($photo) {
            $payload['photo'] = UploadedFile::fake()->createWithContent('portrait.png', EmployeeDossier::png());
        }

        return $this->post('/api/v1/employee-requests', $payload, ['Accept' => 'application/json']);
    }

    public static function roles(): array
    {
        return [['superadmin'], ['manager']];
    }

    #[DataProvider('roles')]
    public function test_supported_portal_roles_can_invite_review_and_reject(string $role): void
    {
        $this->operator->role = $role;
        $this->operator->save();
        $invite = $this->invite();
        $created = $this->submit($invite)->assertCreated();
        $id = $created->json('data.id');
        $this->getJson('/api/v1/registration-invites')->assertOk();
        $this->getJson('/api/v1/employee-requests')->assertOk();
        $this->getJson('/api/v1/employee-requests/'.$id)->assertOk();
        $this->postJson('/api/v1/employee-requests/'.$id.'/reject', ['reason' => 'Review incomplete'])->assertOk();
    }

    public function test_guests_and_inactive_users_cannot_access_admin_routes(): void
    {
        $invite = $this->invite();
        $receipt = $this->submit($invite, null, true)->assertCreated();
        $id = $receipt->json('data.id');
        Auth::forgetGuards();
        foreach (['registration-invites', 'employee-requests', 'employee-requests/'.$id, 'employee-requests/'.$id.'/photo'] as $path) {
            $this->getJson('/api/v1/'.$path)->assertUnauthorized();
        }
        foreach (['registration-invites', 'employee-requests/'.$id.'/approve', 'employee-requests/'.$id.'/reject'] as $path) {
            $this->postJson('/api/v1/'.$path, ['reason' => 'Denied'])->assertUnauthorized();
        }
        $this->operator->is_active = false;
        $this->actingAs($this->operator, 'web')->getJson('/api/v1/employee-requests/'.$id)->assertForbidden();
    }

    public function test_tokens_have_256_bits_randomness_are_unique_and_encrypted_at_rest(): void
    {
        $first = $this->invite();
        $second = $this->invite();
        $this->assertNotSame($first['token'], $second['token']);
        $this->assertSame(43, strlen($first['token']));
        $this->assertSame(32, strlen(base64_decode(strtr($first['token'], '-_', '+/').'=')));
        $row = DB::table('registration_invites')->find($first['id']);
        $this->assertSame(InviteToken::digest($first['token']), $row->token_digest);
        $this->assertStringNotContainsString($first['token'], $row->token);
        $this->assertStringNotContainsString('Invited Candidate', $row->candidate_name);
        $this->assertSame($this->operator->id, $row->created_by);
        $this->assertNull($row->used_at);
        $this->getJson('/api/v1/registration-invites')->assertJsonPath('data.1.token', $first['token'])->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_invite_validation_returns_only_safe_metadata_without_consuming(): void
    {
        $invite = $this->invite(['roleCategory' => 'motorcycle']);
        Auth::forgetGuards();
        $result = $this->postJson('/api/v1/registration-invites/validate', ['token' => $invite['token']])->assertOk()->assertJsonPath('status', 'valid')->assertJsonPath('invite.candidateName', 'Invited Candidate')->assertJsonPath('invite.roleCategory', 'motorcycle')->assertHeader('Cache-Control', 'no-store, private');
        foreach (['token', 'token_digest', 'created_by', 'dossier', 'cnic'] as $field) {
            $result->assertJsonMissingPath('invite.'.$field);
        }
        $this->assertNull(RegistrationInvite::find($invite['id'])->used_at);
    }

    public function test_invitation_invalid_expired_used_and_expiration_boundary(): void
    {
        $this->postJson('/api/v1/registration-invites/validate', ['token' => InviteToken::generate()])->assertOk()->assertExactJson(['status' => 'invalid']);
        $invite = $this->invite();
        $model = RegistrationInvite::find($invite['id']);
        $this->travelTo($model->expires_at->subMicrosecond());
        $this->postJson('/api/v1/registration-invites/validate', ['token' => $invite['token']])->assertJsonPath('status', 'valid');
        $this->travelTo($model->expires_at);
        $this->postJson('/api/v1/registration-invites/validate', ['token' => $invite['token']])->assertExactJson(['status' => 'expired']);
        $this->travelBack();
        $model->used_at = now();
        $model->save();
        $this->postJson('/api/v1/registration-invites/validate', ['token' => $invite['token']])->assertExactJson(['status' => 'used']);
        $this->postJson('/api/v1/registration-invites/validate', ['token' => '../../bad'])->assertUnprocessable()->assertJsonValidationErrors('token');
        $this->postJson('/api/v1/registration-invites/validate', ['token' => str_repeat('x', 512)])->assertUnprocessable();
    }

    public function test_invite_needs_no_details_and_always_lasts_one_day(): void
    {
        $this->travelTo(now()->startOfSecond());
        $invite = $this->postJson('/api/v1/registration-invites', [])->assertCreated()->assertJsonPath('data.status', 'valid')->assertJsonPath('data.candidateName', '')->json('data');
        $this->assertSame(now()->addDay()->toIso8601String(), \Carbon\CarbonImmutable::parse($invite['expiresAt'])->toIso8601String());
        // A client-supplied expiry is ignored.
        $other = $this->postJson('/api/v1/registration-invites', ['expiresAt' => now()->addYear()->toIso8601String()])->assertCreated()->json('data');
        $this->assertSame($invite['expiresAt'], $other['expiresAt']);
        // An open invitation lets the candidate choose any designation.
        $this->submit($invite, EmployeeDossier::make(['designation' => 'Any Role']))->assertCreated();
        $this->travelBack();
    }

    public function test_candidate_documents_are_validated_stored_and_copied_to_the_employee_on_approval(): void
    {
        $invite = $this->invite();
        $pdf = fn (string $name) => UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF");
        $this->post('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode(EmployeeDossier::make()), 'documents' => [['type' => 'cnic', 'file' => UploadedFile::fake()->createWithContent('run.exe', 'MZ')]]], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('documents.0.file');
        $this->post('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode(EmployeeDossier::make()), 'documents' => [['type' => 'passport', 'file' => $pdf('x.pdf')]]], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('documents.0.type');
        $this->assertSame(0, \App\Models\CandidateRequest::count());

        $response = $this->post('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode(EmployeeDossier::make()), 'documents' => [['type' => 'cnic', 'file' => $pdf('cnic.pdf')], ['type' => 'utility_bill', 'file' => $pdf('bill.pdf')]]], ['Accept' => 'application/json'])->assertCreated();
        $id = $response->json('data.id');
        $show = $this->getJson('/api/v1/employee-requests/'.$id)->assertOk()->assertJsonCount(2, 'data.documents');
        $this->get('/api/v1/candidate-documents/'.$show->json('data.documents.0.id').'/download')->assertOk();

        $approved = $this->postJson('/api/v1/employee-requests/'.$id.'/approve')->assertOk();
        $employeeId = $approved->json('data.employeeId');
        $this->getJson('/api/v1/employees/'.$employeeId.'/documents')->assertOk()->assertJsonCount(2, 'data');
        $this->assertCount(2, Storage::disk('employee_private')->allFiles('employees/'.$employeeId.'/documents'));
        // Approving never issues an ID card automatically.
        $this->assertSame(0, \App\Models\IdCard::count());
    }

    public function test_cnic_duplicates_are_reported_before_the_end_of_the_form(): void
    {
        $dossier = EmployeeDossier::make();
        $invite = $this->invite();
        $this->postJson('/api/v1/registration-invites/check-cnic', ['token' => $invite['token'], 'cnic' => $dossier['cnic']])->assertOk()->assertExactJson(['registered' => false]);
        $this->postJson('/api/v1/employees', ['dossier' => json_encode($dossier)])->assertCreated();
        $this->postJson('/api/v1/registration-invites/check-cnic', ['token' => $invite['token'], 'cnic' => $dossier['cnic']])->assertOk()->assertExactJson(['registered' => true]);
        $this->postJson('/api/v1/employees/check-cnic', ['cnic' => $dossier['cnic']])->assertOk()->assertExactJson(['registered' => true]);
        $employeeId = \App\Models\Employee::firstOrFail()->id;
        $this->postJson('/api/v1/employees/check-cnic', ['cnic' => $dossier['cnic'], 'exceptEmployeeId' => $employeeId])->assertOk()->assertExactJson(['registered' => false]);
        $this->submit($invite, $dossier)->assertUnprocessable()->assertJsonValidationErrors('dossier.cnic');
        // The public check needs a usable invitation and a well-formed CNIC.
        $this->postJson('/api/v1/registration-invites/check-cnic', ['token' => str_repeat('a', 43), 'cnic' => $dossier['cnic']])->assertStatus(409);
        $this->postJson('/api/v1/registration-invites/check-cnic', ['token' => $invite['token'], 'cnic' => '123'])->assertUnprocessable();
    }

    public function test_second_pending_application_with_the_same_cnic_is_rejected(): void
    {
        $dossier = EmployeeDossier::make();
        $this->submit($this->invite(), $dossier)->assertCreated();
        $second = $this->invite();
        $this->postJson('/api/v1/registration-invites/check-cnic', ['token' => $second['token'], 'cnic' => $dossier['cnic']])->assertExactJson(['registered' => true]);
        $this->submit($second, $dossier)->assertUnprocessable()->assertJsonValidationErrors('dossier.cnic');
    }

    public function test_public_rate_limits(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->postJson('/api/v1/registration-invites/validate', ['token' => InviteToken::generate()])->assertOk();
        }
        $this->postJson('/api/v1/registration-invites/validate', ['token' => InviteToken::generate()])->assertStatus(429)->assertHeader('Retry-After');
        $token = InviteToken::generate();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/employee-requests', ['token' => $token])->assertStatus(409);
        }
        $this->postJson('/api/v1/employee-requests', ['token' => $token])->assertStatus(429);
    }

    public function test_complete_submission_is_encrypted_private_and_does_not_create_employee(): void
    {
        $invite = $this->invite();
        $dossier = EmployeeDossier::make(['fullName' => 'Corrected Candidate Spelling']);
        Auth::forgetGuards();
        $receipt = $this->submit($invite, $dossier, true)->assertCreated()->assertJsonPath('data.status', 'pending')->assertJsonMissingPath('data.dossier')->assertJsonMissingPath('data.photo');
        $this->assertMatchesRegularExpression('/^REQ-[0-9]{4}-[0-9]{4,}$/', $receipt->json('data.trackingId'));
        $candidate = CandidateRequest::find($receipt->json('data.id'));
        $row = DB::table('candidate_requests')->find($candidate->id);
        $this->assertSame($dossier, $candidate->dossier);
        $this->assertSame('Corrected Candidate Spelling', $candidate->candidate_name);
        $this->assertStringNotContainsString($dossier['cnic'], $row->dossier);
        $this->assertStringNotContainsString($dossier['residentialAddress'], $row->dossier);
        $this->assertStringNotContainsString($dossier['fullName'], $row->candidate_name);
        $this->assertStringStartsWith('candidate-requests/'.$candidate->id.'/photos/', $candidate->photo_path);
        Storage::disk('employee_private')->assertExists($candidate->photo_path);
        $this->assertDatabaseCount('employees', 0);
        $this->assertNotNull(RegistrationInvite::find($invite['id'])->used_at);
        $this->submit($invite, $dossier)->assertStatus(409);
        $this->assertDatabaseCount('candidate_requests', 1);
        $this->getJson('/api/v1/employee-requests/'.$candidate->id)->assertUnauthorized();
        $this->actingAs($this->operator, 'web')->getJson('/api/v1/employee-requests/'.$candidate->id)->assertJsonPath('data.dossier', $dossier)->assertJsonPath('data.documents', [])->assertJsonMissingPath('data.photo_path')->assertJsonMissingPath('data.cnic_lookup');
        $this->get('/api/v1/employee-requests/'.$candidate->id.'/photo')->assertOk()->assertHeader('Content-Type', 'image/png');
    }

    public function test_invalid_dossier_and_restrictions_do_not_consume_invitation(): void
    {
        $invite = $this->invite(['roleCategory' => 'motorcycle']);
        $this->submit($invite, EmployeeDossier::make(['cnic' => 'invalid']))->assertUnprocessable()->assertJsonValidationErrors('dossier.cnic');
        $this->submit($invite, EmployeeDossier::make(['designation' => 'Unauthorized', 'roleCategory' => 'van']))->assertUnprocessable()->assertJsonValidationErrors(['dossier.designation', 'dossier.roleCategory']);
        $this->assertNull(RegistrationInvite::find($invite['id'])->used_at);
        $this->assertDatabaseCount('candidate_requests', 0);
    }

    public function test_bad_photos_are_rejected_without_consuming_token(): void
    {
        $invite = $this->invite();
        foreach ([UploadedFile::fake()->createWithContent('photo.jpg', 'not an image'), UploadedFile::fake()->create('photo.png', 3073, 'image/png')] as $photo) {
            $this->post('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode(EmployeeDossier::make()), 'photo' => $photo], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('photo');
        }
        $this->assertNull(RegistrationInvite::find($invite['id'])->used_at);
    }

    public function test_expired_invitation_cannot_submit(): void
    {
        $invite = $this->invite();
        RegistrationInvite::find($invite['id'])->update(['expires_at' => now()->subSecond()]);
        $this->submit($invite)->assertStatus(409);
        $this->assertDatabaseCount('candidate_requests', 0);
    }

    public function test_expiration_during_persistence_rolls_back_submission(): void
    {
        $invite = $this->invite();
        $expiry = RegistrationInvite::find($invite['id'])->expires_at;
        CandidateRequest::saved(function () use ($expiry) {
            $this->travelTo($expiry);
        });
        try {
            $this->submit($invite, null, true)->assertStatus(409);
        } finally {
            Event::forget('eloquent.saved: '.CandidateRequest::class);
            $this->travelBack();
        }
        $this->assertDatabaseCount('candidate_requests', 0);
        $this->assertNull(RegistrationInvite::find($invite['id'])->used_at);
        $this->assertSame([], Storage::disk('employee_private')->allFiles());
    }

    public function test_selected_request_review_search_role_status_and_pagination(): void
    {
        $targetDossier = EmployeeDossier::make(['fullName' => 'Review Search Candidate']);
        $created = $this->submit($this->invite(), $targetDossier)->assertCreated();
        $id = $created->json('data.id');
        $this->getJson('/api/v1/employee-requests/'.$id)->assertOk()->assertJsonPath('data.dossier', $targetDossier);
        foreach (['Review Search', $created->json('data.trackingId'), $targetDossier['cnic'], str_replace('-', '', $targetDossier['cnic'])] as $search) {
            $this->getJson('/api/v1/employee-requests?search='.urlencode($search))->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $id);
        }
        $this->getJson('/api/v1/employee-requests?status=pending&role=Motorcycle%20Field%20Sales%20Executive')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/employee-requests?role=office')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/v1/employee-requests?role=unknown')->assertUnprocessable()->assertJsonValidationErrors('role');
        $this->getJson('/api/v1/employee-requests?status=invalid')->assertUnprocessable();
        // Persist test fixtures directly to avoid intentionally triggering public submission throttles.
        for ($i = 0; $i < 16; $i++) {
            $invite = $this->invite();
            $dossier = EmployeeDossier::make();
            CandidateRequest::create(['registration_invite_id' => $invite['id'], 'tracking_id' => 'TEST-PAGINATION-'.$i, 'status' => 'pending', 'candidate_name' => $dossier['fullName'], 'role_category' => $dossier['roleCategory'], 'dossier' => $dossier, 'cnic_lookup' => EmployeeIdentity::lookup($dossier['cnic'])]);
        }
        $this->getJson('/api/v1/employee-requests?page=2')->assertJsonCount(2, 'data')->assertJsonPath('meta', ['currentPage' => 2, 'lastPage' => 2, 'perPage' => 15, 'total' => 17]);
        $this->getJson('/api/v1/registration-invites?page=2')->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 17);
        $this->getJson('/api/v1/employee-requests/999999')->assertNotFound();
    }

    public function test_approval_preserves_dossier_photo_department_and_employee_revision(): void
    {
        $invite = $this->invite();
        $dossier = EmployeeDossier::make();
        $receipt = $this->submit($invite, $dossier, true)->assertCreated();
        $id = $receipt->json('data.id');
        $candidate = CandidateRequest::find($id);
        $originalPath = $candidate->photo_path;
        $approved = $this->postJson('/api/v1/employee-requests/'.$id.'/approve')->assertOk()->assertJsonPath('data.status', 'approved')->assertJsonPath('data.dossier', $dossier);
        $employee = Employee::findOrFail($approved->json('data.employeeId'));
        $this->assertSame($dossier, $employee->dossier);
        $this->assertSame('Distribution', $employee->department);
        $this->assertSame('active', $employee->status);
        $this->assertSame(1, $employee->revision);
        Storage::disk('employee_private')->assertExists($originalPath);
        Storage::disk('employee_private')->assertExists($employee->photo_path);
        $this->assertSame(Storage::disk('employee_private')->get($originalPath), Storage::disk('employee_private')->get($employee->photo_path));
        $this->getJson('/api/v1/employees/'.$employee->id)->assertHeader('ETag', $employee->etag())->assertJsonPath('data.cards', []);
        $this->assertDatabaseCount('id_cards', 0);
        $this->assertSame($this->operator->id, $candidate->fresh()->reviewed_by);
        $this->assertNotNull($candidate->fresh()->reviewed_at);
        $this->postJson('/api/v1/employee-requests/'.$id.'/approve')->assertStatus(409);
        $this->postJson('/api/v1/employee-requests/'.$id.'/reject', ['reason' => 'Late'])->assertStatus(409);
        $this->submit($invite, $dossier)->assertStatus(409);
        $this->assertDatabaseCount('employees', 1);
    }

    public function test_duplicate_employee_identity_blocks_approval_including_soft_deletes(): void
    {
        $dossier = EmployeeDossier::make();
        $receipt = $this->submit($this->invite(), $dossier)->assertCreated();
        $employee = $this->postJson('/api/v1/employees', ['dossier' => json_encode($dossier)])->assertCreated();
        $this->postJson('/api/v1/employee-requests/'.$receipt->json('data.id').'/approve')->assertStatus(409);
        Employee::find($employee->json('data.id'))->delete();
        $this->postJson('/api/v1/employee-requests/'.$receipt->json('data.id').'/approve')->assertStatus(409);
        $this->assertSame('pending', CandidateRequest::find($receipt->json('data.id'))->status);
        $this->assertDatabaseCount('employees', 1);
    }

    public function test_rejection_records_encrypted_reason_and_never_reuses_invite(): void
    {
        $invite = $this->invite();
        $receipt = $this->submit($invite, null, true)->assertCreated();
        $id = $receipt->json('data.id');
        $this->postJson('/api/v1/employee-requests/'.$id.'/reject', ['reason' => ''])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->postJson('/api/v1/employee-requests/'.$id.'/reject', ['reason' => 'Incomplete private reference'])->assertOk()->assertJsonPath('data.status', 'rejected')->assertJsonPath('data.rejectionReason', 'Incomplete private reference');
        $candidate = CandidateRequest::find($id);
        $this->assertSame($this->operator->id, $candidate->reviewed_by);
        $this->assertNotNull($candidate->reviewed_at);
        $this->assertStringNotContainsString('Incomplete private reference', DB::table('candidate_requests')->find($id)->rejection_reason);
        Storage::disk('employee_private')->assertExists($candidate->photo_path);
        $this->assertDatabaseCount('employees', 0);
        $this->postJson('/api/v1/employee-requests/'.$id.'/reject', ['reason' => 'Again'])->assertStatus(409);
        $this->postJson('/api/v1/employee-requests/'.$id.'/approve')->assertStatus(409);
        $this->submit($invite)->assertStatus(409);
    }

    public function test_submission_database_failure_removes_staged_photo_and_keeps_invite_unused(): void
    {
        $invite = $this->invite();
        CandidateRequest::saved(function ($candidate) {
            if ($candidate->photo_path) {
                throw new \RuntimeException('Intentional candidate persistence failure.');
            }
        });
        try {
            $this->submit($invite, null, true)->assertStatus(500);
        } finally {
            Event::forget('eloquent.saved: '.CandidateRequest::class);
        }
        $this->assertDatabaseCount('candidate_requests', 0);
        $this->assertNull(RegistrationInvite::find($invite['id'])->used_at);
        $this->assertSame([], Storage::disk('employee_private')->allFiles());
    }

    public function test_approval_database_failure_preserves_original_photo_and_request(): void
    {
        $receipt = $this->submit($this->invite(), null, true)->assertCreated();
        $candidate = CandidateRequest::find($receipt->json('data.id'));
        $source = $candidate->photo_path;
        CandidateRequest::saving(function ($candidate) {
            if ($candidate->status === 'approved') {
                throw new \RuntimeException('Intentional approval write failure.');
            }
        });
        try {
            $this->postJson('/api/v1/employee-requests/'.$candidate->id.'/approve')->assertStatus(500);
        } finally {
            Event::forget('eloquent.saving: '.CandidateRequest::class);
        }
        $this->assertDatabaseCount('employees', 0);
        $this->assertSame('pending', $candidate->fresh()->status);
        $this->assertSame([$source], Storage::disk('employee_private')->allFiles());
    }

    public function test_copy_failure_cleans_partial_destination_without_losing_source(): void
    {
        $receipt = $this->submit($this->invite(), null, true)->assertCreated();
        $candidate = CandidateRequest::find($receipt->json('data.id'));
        $disk = Storage::disk('employee_private');
        $source = $candidate->photo_path;
        $broken = \Mockery::mock($disk)->makePartial();
        $broken->shouldReceive('copy')->once()->andReturnUsing(function ($from, $to) use ($disk) {
            $disk->put($to, 'partial copy');
            throw new \RuntimeException('Intentional copy failure.');
        });
        Storage::shouldReceive('disk')->with('employee_private')->andReturn($broken);
        $this->postJson('/api/v1/employee-requests/'.$candidate->id.'/approve')->assertStatus(500);
        $this->assertDatabaseCount('employees', 0);
        $this->assertSame('pending', $candidate->fresh()->status);
        $this->assertSame([$source], $disk->allFiles());
    }

    public function test_missing_candidate_photo_and_invalid_stored_dossier_prevent_approval(): void
    {
        $receipt = $this->submit($this->invite(), null, true)->assertCreated();
        $candidate = CandidateRequest::find($receipt->json('data.id'));
        Storage::disk('employee_private')->delete($candidate->photo_path);
        $this->postJson('/api/v1/employee-requests/'.$candidate->id.'/approve')->assertStatus(409);
        $dossier = $candidate->dossier;
        $dossier['cnic'] = 'invalid';
        $candidate->dossier = $dossier;
        $candidate->save();
        $this->postJson('/api/v1/employee-requests/'.$candidate->id.'/approve')->assertStatus(409);
        $this->assertDatabaseCount('employees', 0);
    }

    public function test_unknown_transitions_and_public_csrf_security(): void
    {
        $this->postJson('/api/v1/employee-requests/999999/approve')->assertNotFound();
        $this->postJson('/api/v1/employee-requests/999999/reject', ['reason' => 'Missing'])->assertNotFound();
        $invite = $this->invite();
        $this->app->instance('env', 'local');
        $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/v1/registration-invites/validate', ['token' => $invite['token']])->assertStatus(419);
        $this->post('/api/v1/employee-requests', ['token' => $invite['token'], 'dossier' => json_encode(EmployeeDossier::make())], ['Accept' => 'application/json'])->assertStatus(419);
    }
}
