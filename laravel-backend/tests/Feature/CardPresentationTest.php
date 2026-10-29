<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

/** What a printed card and the public verification page show about the holder. */
class CardPresentationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('employee_private');
        config(['cards.validity_policy' => 'eleven_months']);
        $this->actingAs(User::create(['name' => 'Card Operator', 'email' => 'card-presentation@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'manager', 'is_active' => true]), 'web');
    }

    private function issueCard(): array
    {
        $dossier = EmployeeDossier::make(['bloodGroup' => 'B+', 'emergencyContact1' => '0321 0000000']);
        $employee = $this->post('/api/v1/employees', ['dossier' => json_encode($dossier), 'photo' => UploadedFile::fake()->createWithContent('face.png', EmployeeDossier::png())], ['Accept' => 'application/json'])->assertCreated()->json('data');

        return [$dossier, $employee, $this->postJson('/api/v1/id-cards', ['employeeId' => $employee['id']])->assertCreated()->json('data')];
    }

    public function test_card_detail_carries_the_printed_fields_but_lists_do_not(): void
    {
        [$dossier, , $card] = $this->issueCard();
        $this->getJson('/api/v1/id-cards/'.$card['id'])->assertOk()->assertJsonPath('data.employee.cnic', $dossier['cnic'])->assertJsonPath('data.employee.emergencyContact', '0321 0000000')->assertJsonPath('data.employee.bloodGroup', 'B+');
        $this->assertArrayNotHasKey('cnic', $this->getJson('/api/v1/id-cards')->assertOk()->json('data.0.employee'));
        $this->assertArrayNotHasKey('cnic', $this->getJson('/api/v1/dashboard/summary')->json('data'));
    }

    public function test_public_verification_shows_holder_details_and_a_signed_photo_link(): void
    {
        [, $employee, $card] = $this->issueCard();
        $verified = $this->postJson('/api/v1/verify-card', ['token' => $card['verificationToken']])->assertOk()->assertJsonPath('status', 'valid')->assertJsonPath('card.bloodGroup', 'B+');
        $photo = $verified->json('card.photo');
        $this->assertStringNotContainsString($card['verificationToken'], $photo);
        $this->get($photo)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->get(preg_replace('/signature=[^&]+/', 'signature=forged', $photo))->assertForbidden();
        // A signature only ever works for the employee it was issued for.
        $this->assertContains($this->get(preg_replace('#/photo/\d+#', '/photo/'.($employee['id'] + 1), $photo))->getStatusCode(), [403, 404]);
        // Once the holder resigns the photo is no longer public.
        Employee::findOrFail($employee['id'])->update(['status' => 'resigned']);
        $this->get($photo)->assertNotFound();
    }

    public function test_one_global_card_colour_is_readable_by_all_and_changeable_only_by_a_superadmin(): void
    {
        $this->getJson('/api/v1/id-cards/settings')->assertOk()->assertExactJson(['data' => ['color' => '#092a4a', 'defaultColor' => '#092a4a', 'isDefault' => true]]);
        // The signed-in operator in this test is a manager.
        $this->putJson('/api/v1/id-cards/settings', ['color' => '#7a1f2b'])->assertForbidden();
        $this->deleteJson('/api/v1/id-cards/settings')->assertForbidden();

        \Illuminate\Support\Facades\Auth::forgetGuards();
        $this->actingAs(User::create(['name' => 'Root', 'email' => 'root-colour@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'superadmin', 'is_active' => true]), 'web');
        $this->putJson('/api/v1/id-cards/settings', ['color' => '#7A1F2B'])->assertOk()->assertJsonPath('data.color', '#7a1f2b')->assertJsonPath('data.isDefault', false);
        foreach (['red', '#fff', '7a1f2b', '#7a1f2bff', '#ffffff', '#ffff00', '#cccccc'] as $bad) {
            $this->putJson('/api/v1/id-cards/settings', ['color' => $bad])->assertUnprocessable()->assertJsonValidationErrors('color');
        }
        $this->getJson('/api/v1/id-cards/settings')->assertJsonPath('data.color', '#7a1f2b');

        \Illuminate\Support\Facades\Auth::forgetGuards();
        $this->actingAs(User::where('role', 'manager')->firstOrFail(), 'web');
        $this->getJson('/api/v1/id-cards/settings')->assertJsonPath('data.color', '#7a1f2b');

        \Illuminate\Support\Facades\Auth::forgetGuards();
        $this->actingAs(User::where('email', 'root-colour@example.test')->firstOrFail(), 'web');
        $this->deleteJson('/api/v1/id-cards/settings')->assertOk()->assertJsonPath('data.color', '#092a4a')->assertJsonPath('data.isDefault', true);
        $this->getJson('/api/v1/id-cards/settings')->assertJsonPath('data.isDefault', true);
    }

    public function test_eligible_employee_list_excludes_employees_who_already_have_a_card(): void
    {
        $with = $this->post('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())], ['Accept' => 'application/json'])->assertCreated()->json('data');
        $without = $this->post('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())], ['Accept' => 'application/json'])->assertCreated()->json('data');
        $this->postJson('/api/v1/id-cards', ['employeeId' => $with['id']])->assertCreated();
        $list = $this->getJson('/api/v1/id-cards/eligible-employees')->assertOk();
        $this->assertSame([$without['id']], array_column($list->json('data'), 'id'));
        $this->assertSame(['id', 'displayId', 'name', 'designation'], array_keys($list->json('data.0')));
    }
}
