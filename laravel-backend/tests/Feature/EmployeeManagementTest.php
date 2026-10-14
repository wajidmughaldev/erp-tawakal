<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\IdCard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpFoundation\Request;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class EmployeeManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('employee_private');
        $this->actingAs(User::create(['name' => 'Test Operator', 'email' => 'employee-operator@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'admin', 'is_active' => true]), 'web');
    }

    public static function roles(): array
    {
        return [['admin'], ['co-admin'], ['manager']];
    }

    private function createEmployee(array $dossier = [], bool $photo = false)
    {
        $payload = ['dossier' => json_encode($dossier ?: EmployeeDossier::make())];
        if ($photo) {
            $payload['photo'] = UploadedFile::fake()->createWithContent('untrusted-name.png', EmployeeDossier::png());
        }

        return $this->post('/api/v1/employees', $payload, ['Accept' => 'application/json']);
    }

    #[DataProvider('roles')]
    public function test_all_portal_roles_have_employee_access(string $role): void
    {
        $user = Auth::user();
        $user->role = $role;
        $user->save();
        $response = $this->createEmployee()->assertCreated();
        $this->getJson('/api/v1/employees')->assertOk();
        $id = $response->json('data.id');
        $this->getJson('/api/v1/employees/'.$id)->assertOk();
        $this->withHeader('If-Match', $response->headers->get('ETag'))->patchJson('/api/v1/employees/'.$id, ['dossier' => json_encode(Employee::find($id)->dossier)])->assertOk();
        $this->getJson('/api/v1/employees/'.$id.'/documents')->assertOk();
    }

    public function test_guests_are_denied_on_every_employee_endpoint(): void
    {
        $response = $this->createEmployee([], true)->assertCreated();
        $id = $response->json('data.id');
        Auth::forgetGuards();
        foreach (['/api/v1/employees', '/api/v1/employees/'.$id, '/api/v1/employees/'.$id.'/documents', '/api/v1/employees/'.$id.'/photo', '/api/v1/documents/1/download'] as $path) {
            $this->getJson($path)->assertUnauthorized();
        }
        $this->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())])->assertUnauthorized();
        $this->patchJson('/api/v1/employees/'.$id, [])->assertUnauthorized();
        $this->deleteJson('/api/v1/employees/'.$id)->assertUnauthorized();
    }

    public function test_complete_dossier_round_trip_and_encryption(): void
    {
        $dossier = EmployeeDossier::make();
        $created = $this->createEmployee($dossier)->assertCreated();
        $id = $created->json('data.id');
        $this->assertIsString($id);
        $this->assertMatchesRegularExpression('/^EMP-[0-9]{4}-[0-9]{4,}$/', $created->json('data.displayId'));
        $this->getJson('/api/v1/employees/'.$id)->assertOk()->assertJsonPath('data.dossier', $dossier)->assertJsonPath('data.department', '')->assertJsonPath('data.documents', [])->assertJsonPath('data.history', [])->assertJsonPath('data.cards', []);
        $row = DB::table('employees')->find($id);
        $this->assertNull($row->email);
        $this->assertNull($row->department);
        foreach ([$dossier['cnic'], $dossier['residentialAddress'], $dossier['signature'], $dossier['mobileNumber']] as $secret) {
            $this->assertStringNotContainsString($secret, $row->dossier);
        }
        $this->assertStringNotContainsString($dossier['mobileNumber'], $row->phone);
        $this->assertStringNotContainsString($dossier['cnic'], $row->cnic_lookup);
        $this->assertArrayNotHasKey('cnic_lookup', $created->json('data'));
        $this->assertArrayNotHasKey('photo_path', $created->json('data'));
        $this->assertArrayNotHasKey('_legacy', $created->json('data.dossier'));
    }

    public function test_required_fields_and_malformed_json_are_rejected(): void
    {
        $this->postJson('/api/v1/employees', ['dossier' => '{bad-json'])->assertUnprocessable()->assertJsonValidationErrors('dossier');
        $this->postJson('/api/v1/employees', ['dossier' => json_encode([])])->assertUnprocessable()->assertJsonValidationErrors(['dossier.fullName', 'dossier.cnic', 'dossier.primaryReference', 'dossier.declarationAccepted']);
        $this->assertDatabaseCount('employees', 0);
    }

    public function test_cnic_date_and_declaration_validation(): void
    {
        $this->createEmployee(EmployeeDossier::make(['cnic' => '123', 'dateOfBirth' => '2026-02-30', 'joiningDate' => 'not-a-date', 'declarationAccepted' => false]))->assertUnprocessable()->assertJsonValidationErrors(['dossier.cnic', 'dossier.dateOfBirth', 'dossier.joiningDate', 'dossier.declarationAccepted']);
        $this->createEmployee(EmployeeDossier::make(['cnic' => '4210112345671']))->assertUnprocessable()->assertJsonValidationErrors('dossier.cnic');
    }

    public function test_duplicate_cnic_is_rejected_even_after_soft_delete(): void
    {
        $dossier = EmployeeDossier::make();
        $response = $this->createEmployee($dossier)->assertCreated();
        $this->createEmployee($dossier)->assertUnprocessable()->assertJsonValidationErrors('dossier.cnic');
        $this->deleteJson('/api/v1/employees/'.$response->json('data.id'))->assertNoContent();
        $this->createEmployee($dossier)->assertUnprocessable()->assertJsonValidationErrors('dossier.cnic');
    }

    public function test_vehicle_roles_require_vehicle_and_licence_and_office_clears_stale_values(): void
    {
        foreach (['motorcycle', 'van'] as $role) {
            $this->createEmployee(EmployeeDossier::make(['roleCategory' => $role, 'vehicleRegistration' => '', 'drivingLicence' => '']))->assertUnprocessable()->assertJsonValidationErrors(['dossier.vehicleRegistration', 'dossier.drivingLicence']);
        }
        $this->createEmployee(EmployeeDossier::make(['roleCategory' => 'office']))->assertCreated()->assertJsonPath('data.dossier.vehicleRegistration', '')->assertJsonPath('data.dossier.drivingLicence', '')->assertJsonPath('data.dossier.tokenTaxStatus', '');
    }

    public function test_employers_and_references_are_validated(): void
    {
        $dossier = EmployeeDossier::make();
        $dossier['primaryReference']['contact'] = '';
        $dossier['employers'][0]['rowId'] = '';
        $this->createEmployee($dossier)->assertUnprocessable()->assertJsonValidationErrors(['dossier.primaryReference.contact', 'dossier.employers.0.rowId']);
    }

    public function test_photo_upload_private_delivery_and_retention_on_edit(): void
    {
        $dossier = EmployeeDossier::make();
        $response = $this->createEmployee($dossier, true)->assertCreated();
        $id = $response->json('data.id');
        $employee = Employee::findOrFail($id);
        $path = $employee->photo_path;
        Storage::disk('employee_private')->assertExists($path);
        $this->assertStringStartsWith('employees/'.$id.'/photos/', $path);
        $this->assertStringNotContainsString('untrusted-name', $path);
        $this->get('/api/v1/employees/'.$id.'/photo')->assertOk()->assertHeader('Content-Type', 'image/png')->assertHeader('X-Content-Type-Options', 'nosniff');
        $dossier['fullName'] = 'Edited Test Employee';
        $this->withHeader('If-Match', $response->headers->get('ETag'))->patchJson('/api/v1/employees/'.$id, ['dossier' => json_encode($dossier)])->assertOk()->assertJsonPath('data.name', $dossier['fullName']);
        $this->assertSame($path, $employee->fresh()->photo_path);
        $this->getJson('/api/v1/employees/'.$id)->assertJsonPath('data.dossier', $dossier);
    }

    public function test_successful_photo_replacement_retains_documents(): void
    {
        $created = $this->createEmployee([], true)->assertCreated();
        $id = $created->json('data.id');
        $employee = Employee::findOrFail($id);
        $oldPath = $employee->photo_path;
        $path = 'employees/'.$id.'/documents/existing.pdf';
        Storage::disk('employee_private')->put($path, 'existing document');
        $document = $employee->documents()->create(['name' => 'Existing.pdf', 'type' => 'cnic', 'path' => $path]);
        $dossier = $employee->dossier;
        $dossier['signature'] = 'Updated Signature';
        Request::enableHttpMethodParameterOverride();
        $updated = $this->withHeader('If-Match', $created->headers->get('ETag'))->post('/api/v1/employees/'.$id, ['_method' => 'PATCH', 'dossier' => json_encode($dossier), 'photo' => UploadedFile::fake()->createWithContent('replacement.png', EmployeeDossier::png())], ['Accept' => 'application/json'])->assertOk();
        $this->assertNotSame($oldPath, $employee->fresh()->photo_path);
        Storage::disk('employee_private')->assertMissing($oldPath);
        Storage::disk('employee_private')->assertExists($employee->fresh()->photo_path);
        Storage::disk('employee_private')->assertExists($path);
        $updated->assertJsonPath('data.documents.0.id', (string) $document->id)->assertJsonPath('data.dossier', $dossier);
    }

    public function test_failed_update_retains_old_photo_dossier_and_revision(): void
    {
        $created = $this->createEmployee([], true)->assertCreated();
        $id = $created->json('data.id');
        $employee = Employee::findOrFail($id);
        $oldPath = $employee->photo_path;
        $original = $employee->dossier;
        Employee::saving(function (Employee $employee) {
            if ($employee->isDirty('photo_path')) {
                throw new \RuntimeException('Intentional replacement transaction failure.');
            }
        });
        $dossier = $original;
        $dossier['fullName'] = 'Should Not Persist';
        Request::enableHttpMethodParameterOverride();
        try {
            $this->withHeader('If-Match', $created->headers->get('ETag'))->post('/api/v1/employees/'.$id, ['_method' => 'PATCH', 'dossier' => json_encode($dossier), 'photo' => UploadedFile::fake()->createWithContent('replacement.png', EmployeeDossier::png())], ['Accept' => 'application/json'])->assertStatus(500);
        } finally {
            Event::forget('eloquent.saving: '.Employee::class);
        }
        $employee->refresh();
        $this->assertSame($oldPath, $employee->photo_path);
        $this->assertSame($original, $employee->dossier);
        $this->assertSame(1, $employee->revision);
        $this->assertSame([$oldPath], Storage::disk('employee_private')->allFiles());
    }

    public static function photoFormats(): array
    {
        return [['jpg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']];
    }

    #[DataProvider('photoFormats')]
    public function test_actual_photo_mime_is_used_instead_of_client_filename(string $extension, string $mime): void
    {
        $photo = new UploadedFile(base_path('tests/Fixtures/valid-photo.'.$extension), 'untrusted.txt', 'application/octet-stream', null, true);
        $created = $this->post('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make()), 'photo' => $photo], ['Accept' => 'application/json'])->assertCreated();
        $this->get('/api/v1/employees/'.$created->json('data.id').'/photo')->assertOk()->assertHeader('Content-Type', $mime);
        $this->assertStringNotContainsString('.txt', Employee::find($created->json('data.id'))->photo_path);
    }

    public function test_legacy_display_id_collision_does_not_change_existing_identifiers(): void
    {
        $first = $this->createEmployee()->assertCreated();
        $employee = Employee::find($first->json('data.id'));
        $reservedId = 'EMP-'.$employee->created_at->format('Y').'-'.str_pad((string) ($employee->id + 1), 4, '0', STR_PAD_LEFT);
        $employee->employee_id = $reservedId;
        $employee->save();
        $second = $this->createEmployee()->assertCreated();
        $this->assertSame($reservedId, $employee->fresh()->employee_id);
        $this->assertNotSame($reservedId, $second->json('data.displayId'));
        $this->assertStringStartsWith($reservedId.'-', $second->json('data.displayId'));
    }

    public function test_invalid_and_oversize_photos_do_not_create_employees(): void
    {
        foreach ([UploadedFile::fake()->createWithContent('photo.jpg', 'This is not an image'), UploadedFile::fake()->create('large.png', 3073, 'image/png')] as $photo) {
            $this->post('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make()), 'photo' => $photo], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('photo');
        }
        $this->assertDatabaseCount('employees', 0);
    }

    public function test_update_requires_etag_and_rejects_stale_revision(): void
    {
        $dossier = EmployeeDossier::make();
        $response = $this->createEmployee($dossier)->assertCreated();
        $id = $response->json('data.id');
        $etag = $response->headers->get('ETag');
        $dossier['fullName'] = 'Revision Two';
        $this->patchJson('/api/v1/employees/'.$id, ['dossier' => json_encode($dossier)])->assertStatus(428);
        $this->withHeader('If-Match', $etag)->patchJson('/api/v1/employees/'.$id, ['dossier' => json_encode($dossier)])->assertOk()->assertHeader('ETag', '"employee-'.$id.'-v2"');
        $dossier['fullName'] = 'Stale Attempt';
        $this->patchJson('/api/v1/employees/'.$id, ['dossier' => json_encode($dossier)])->assertStatus(412);
        $this->getJson('/api/v1/employees/'.$id)->assertJsonPath('data.name', 'Revision Two');
        $this->assertSame(2, Employee::find($id)->revision);
    }

    public function test_multipart_post_method_patch_preserves_all_sections(): void
    {
        $response = $this->createEmployee()->assertCreated();
        $id = $response->json('data.id');
        $dossier = Employee::find($id)->dossier;
        $dossier['primaryReference']['name'] = 'Edited Reference';
        Request::enableHttpMethodParameterOverride();
        $this->withHeader('If-Match', $response->headers->get('ETag'))->post('/api/v1/employees/'.$id, ['_method' => 'PATCH', 'dossier' => json_encode($dossier)], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.dossier', $dossier);
    }

    public function test_unknown_employee_returns_404_for_read_update_delete_and_files(): void
    {
        foreach (['/api/v1/employees/999999', '/api/v1/employees/999999/documents', '/api/v1/employees/999999/photo', '/api/v1/documents/999999/download'] as $path) {
            $this->getJson($path)->assertNotFound();
        }
        $this->withHeader('If-Match', '"missing"')->patchJson('/api/v1/employees/999999', ['dossier' => json_encode(EmployeeDossier::make())])->assertNotFound();
        $this->deleteJson('/api/v1/employees/999999')->assertNotFound();
    }

    public function test_name_id_phone_and_protected_exact_cnic_search(): void
    {
        $dossier = EmployeeDossier::make(['fullName' => 'Searchable Person', 'mobileNumber' => '+92 311 5555555']);
        $created = $this->createEmployee($dossier)->assertCreated();
        $this->createEmployee(EmployeeDossier::make(['fullName' => 'Other Person', 'mobileNumber' => '+92 300 6666666']))->assertCreated();
        foreach (['Searchable', $created->json('data.displayId'), '311 555', $dossier['cnic'], str_replace('-', '', $dossier['cnic'])] as $term) {
            $this->getJson('/api/v1/employees?search='.urlencode($term))->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $created->json('data.id'));
        }
        $this->getJson('/api/v1/employees?search=%25')->assertJsonPath('meta.total', 0);
    }

    public function test_status_sort_and_pagination_are_database_backed(): void
    {
        for ($i = 0; $i < 17; $i++) {
            $created = $this->createEmployee(EmployeeDossier::make(['fullName' => sprintf('Person %02d', $i)]))->assertCreated();
            if ($i === 0) {
                Employee::find($created->json('data.id'))->forceFill(['status' => 'resigned'])->save();
            }
        }
        $this->getJson('/api/v1/employees?page=2')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta', ['currentPage' => 2, 'lastPage' => 2, 'perPage' => 15, 'total' => 17]);
        $this->getJson('/api/v1/employees?status=resigned')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/employees?sort=name_asc')->assertJsonPath('data.0.name', 'Person 00');
        $this->getJson('/api/v1/employees?sort=name;DROP%20TABLE%20employees')->assertUnprocessable()->assertJsonValidationErrors('sort');
        $this->getJson('/api/v1/employees?status=suspended')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->getJson('/api/v1/employees?page=0')->assertUnprocessable()->assertJsonValidationErrors('page');
    }

    public function test_soft_delete_preserves_cards_files_and_unique_identifiers(): void
    {
        $first = $this->createEmployee([], true)->assertCreated();
        $id = $first->json('data.id');
        $card = IdCard::create(['employee_id' => $id, 'card_number' => 'TEST-HISTORICAL', 'qr_code_hash' => bin2hex(random_bytes(32)), 'issued_date' => '2026-01-01', 'expiry_date' => '2027-01-01', 'status' => 'active']);
        $path = Employee::find($id)->photo_path;
        $this->getJson('/api/v1/employees/'.$id)->assertJsonPath('data.cards.0.number', 'TEST-HISTORICAL')->assertJsonMissingPath('data.cards.0.qr_code_hash');
        $this->deleteJson('/api/v1/employees/'.$id)->assertNoContent();
        $this->assertSoftDeleted('employees', ['id' => $id]);
        $this->assertDatabaseHas('id_cards', ['id' => $card->id, 'employee_id' => $id]);
        Storage::disk('employee_private')->assertExists($path);
        $this->getJson('/api/v1/employees/'.$id)->assertNotFound();
        $this->getJson('/api/v1/employees/'.$id.'/photo')->assertNotFound();
        $second = $this->createEmployee()->assertCreated();
        $this->assertNotSame($first->json('data.displayId'), $second->json('data.displayId'));
        $this->getJson('/api/v1/employees')->assertJsonPath('meta.total', 1);
    }

    public function test_document_metadata_and_download_require_real_employee_scoped_files(): void
    {
        $first = $this->createEmployee()->assertCreated();
        $employee = Employee::find($first->json('data.id'));
        $path = 'employees/'.$employee->id.'/documents/generated-name.pdf';
        Storage::disk('employee_private')->put($path, '%PDF-1.4 test bytes');
        $document = $employee->documents()->create(['name' => 'Identity copy.pdf', 'type' => 'cnic', 'path' => $path]);
        $this->getJson('/api/v1/employees/'.$employee->id.'/documents')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Identity copy.pdf');
        $this->get('/api/v1/documents/'.$document->id.'/download')->assertOk()->assertDownload('Identity copy.pdf')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertArrayNotHasKey('path', $this->getJson('/api/v1/employees/'.$employee->id.'/documents')->json('data.0'));
        $other = $this->createEmployee()->assertCreated();
        $otherEmployee = Employee::find($other->json('data.id'));
        $wrong = $otherEmployee->documents()->create(['name' => 'Wrong association.pdf', 'type' => 'cnic', 'path' => $path]);
        $this->get('/api/v1/documents/'.$wrong->id.'/download')->assertNotFound();
        $this->getJson('/api/v1/employees/'.$otherEmployee->id.'/documents')->assertJsonPath('data', []);
        Storage::disk('employee_private')->delete($path);
        $this->get('/api/v1/documents/'.$document->id.'/download')->assertNotFound();
        $this->getJson('/api/v1/employees/'.$employee->id.'/documents')->assertJsonPath('data', []);
    }

    public function test_documents_of_deleted_employees_and_inactive_users_are_denied(): void
    {
        $created = $this->createEmployee()->assertCreated();
        $employee = Employee::find($created->json('data.id'));
        $path = 'employees/'.$employee->id.'/documents/secure.pdf';
        Storage::disk('employee_private')->put($path, 'private');
        $document = $employee->documents()->create(['name' => 'Secure.pdf', 'type' => 'cnic', 'path' => $path]);
        $user = Auth::user();
        $user->is_active = false;
        $user->save();
        $this->get('/api/v1/documents/'.$document->id.'/download')->assertForbidden();
        $user->is_active = true;
        $user->save();
        $employee->delete();
        $this->get('/api/v1/documents/'.$document->id.'/download')->assertNotFound();
    }

    public function test_public_routes_never_disclose_employee_dossiers(): void
    {
        $created = $this->createEmployee()->assertCreated();
        $cnic = $created->json('data.dossier.cnic');
        foreach (['verify-card', 'employee-requests', 'registration-invites/validate'] as $path) {
            $response = $this->postJson('/api/v1/'.$path, ['employeeId' => $created->json('data.id')])->assertStatus(503);
            $this->assertStringNotContainsString($cnic, $response->getContent());
            $response->assertJsonMissingPath('data.dossier');
        }
    }

    public function test_failed_database_write_cleans_new_photo_and_rolls_back_employee(): void
    {
        Employee::saved(function (Employee $employee) {
            if ($employee->employee_id !== null) {
                throw new \RuntimeException('Intentional test database write failure.');
            }
        });
        try {
            $this->createEmployee([], true)->assertStatus(500);
        } finally {
            Event::forget('eloquent.saved: '.Employee::class);
        }
        $this->assertDatabaseCount('employees', 0);
        $this->assertSame([], Storage::disk('employee_private')->allFiles());
    }
}
