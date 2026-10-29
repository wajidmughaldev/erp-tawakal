<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\Fixtures\EmployeeDossier;
use Tests\TestCase;

class EmployeeDocumentUploadTest extends TestCase
{
    use RefreshDatabase;

    private Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('employee_private');
        $this->actingAs(User::create(['name' => 'Doc Operator', 'email' => 'doc-operator@example.test', 'password' => bin2hex(random_bytes(20)), 'role' => 'manager', 'is_active' => true]), 'web');
        $id = $this->postJson('/api/v1/employees', ['dossier' => json_encode(EmployeeDossier::make())])->assertCreated()->json('data.id');
        $this->employee = Employee::findOrFail($id);
    }

    private function upload(UploadedFile $file, string $type = 'cnic')
    {
        return $this->post('/api/v1/employees/'.$this->employee->id.'/documents', ['type' => $type, 'file' => $file], ['Accept' => 'application/json']);
    }

    private function pdf(string $name = 'cnic.pdf', int $kb = 1): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj<<>>endobj\n".str_repeat('a', $kb * 1024)."\n%%EOF");
    }

    public function test_pdf_and_images_are_stored_listed_downloaded_and_deleted(): void
    {
        $response = $this->upload($this->pdf())->assertCreated()->assertJsonPath('data.type', 'cnic')->assertJsonPath('data.name', 'cnic.pdf');
        $id = $response->json('data.id');
        $this->upload(UploadedFile::fake()->createWithContent('photo.png', EmployeeDossier::png()), 'photographs')->assertCreated();
        $this->getJson('/api/v1/employees/'.$this->employee->id.'/documents')->assertOk()->assertJsonCount(2, 'data');
        $this->get('/api/v1/documents/'.$id.'/download')->assertOk();
        $this->deleteJson('/api/v1/documents/'.$id)->assertNoContent();
        $this->getJson('/api/v1/employees/'.$this->employee->id.'/documents')->assertJsonCount(1, 'data');
        $this->assertCount(1, Storage::disk('employee_private')->allFiles('employees/'.$this->employee->id.'/documents'));
    }

    public function test_disallowed_formats_sizes_and_types_are_rejected(): void
    {
        $this->upload(UploadedFile::fake()->createWithContent('run.exe', 'MZ binary'))->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload(UploadedFile::fake()->createWithContent('notes.txt', 'plain text'))->assertUnprocessable()->assertJsonValidationErrors('file');
        // A text payload renamed to .pdf is rejected on its real content type.
        // (UploadedFile::fake() guesses the type from the file name, so use a real temporary file here.)
        $path = tempnam(sys_get_temp_dir(), 'doc');
        file_put_contents($path, '<?php echo 1;');
        $this->upload(new UploadedFile($path, 'fake.pdf', null, null, true))->assertUnprocessable()->assertJsonValidationErrors('file');
        @unlink($path);
        $this->upload($this->pdf('big.pdf', 5200))->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload($this->pdf(), 'passport')->assertUnprocessable()->assertJsonValidationErrors('type');
        $this->post('/api/v1/employees/'.$this->employee->id.'/documents', ['type' => 'cnic'], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertSame(0, $this->employee->documents()->count());
    }

    public function test_guests_and_deleted_employees_cannot_use_document_endpoints(): void
    {
        $id = $this->upload($this->pdf())->assertCreated()->json('data.id');
        $this->employee->delete();
        $this->upload($this->pdf())->assertNotFound();
        $this->deleteJson('/api/v1/documents/'.$id)->assertNotFound();
        Auth::forgetGuards();
        $this->app['auth']->guard('web')->logout();
        $this->deleteJson('/api/v1/documents/'.$id)->assertUnauthorized();
    }
}
