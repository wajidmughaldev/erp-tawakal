<?php

use App\Models\Employee;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Storage;
use Tests\Fixtures\EmployeeDossier;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->loadEnvironmentFrom('.env.testing');
$app->make(Kernel::class)->bootstrap();
if (config('database.default') !== 'mysql' || ! str_ends_with(config('database.connections.mysql.database'), '_test')) {
    throw new RuntimeException('Employee HTTP smoke requires a dedicated MySQL _test database.');
}
$url = getenv('TAWAKAL_AUTH_SMOKE_URL') ?: 'http://localhost:8100';
if (! in_array(parse_url($url, PHP_URL_HOST), ['localhost', '127.0.0.1'], true)) {
    throw new RuntimeException('Smoke server must be local.');
}
$password = bin2hex(random_bytes(20));
$user = User::create(['name' => 'HTTP Test Operator', 'email' => bin2hex(random_bytes(8)).'@example.test', 'password' => $password, 'role' => 'superadmin']);
$curl = curl_init();
curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_COOKIEFILE => '', CURLOPT_TIMEOUT => 20]);
$request = function (string $method, string $path, ?array $body = null, bool $multipart = false, ?string $etag = null) use ($curl, $url): array {
    $headers = ['Accept: application/json', 'Origin: http://localhost:3000'];
    if (! $multipart && $body !== null) {
        $headers[] = 'Content-Type: application/json';
    }
    if ($etag !== null) {
        $headers[] = 'If-Match: '.$etag;
    }
    foreach (curl_getinfo($curl, CURLINFO_COOKIELIST) as $cookie) {
        $parts = explode("\t", $cookie);
        if ($parts[5] === 'XSRF-TOKEN') {
            $headers[] = 'X-XSRF-TOKEN: '.rawurldecode($parts[6]);
        }
    }
    $responseHeaders = [];
    curl_setopt_array($curl, [CURLOPT_URL => $url.$path, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_POSTFIELDS => $body === null ? null : ($multipart ? $body : json_encode($body)), CURLOPT_HTTPHEADER => $headers, CURLOPT_HEADERFUNCTION => function ($curl, $header) use (&$responseHeaders) {
        $parts = explode(':', $header, 2);
        if (count($parts) === 2) {
            $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
        }

return strlen($header);
    }]);
    $response = curl_exec($curl);
    if ($response === false) {
        throw new RuntimeException(curl_error($curl));
    }

    return [curl_getinfo($curl, CURLINFO_RESPONSE_CODE), json_decode($response, true), $responseHeaders, $response];
};
$expect = function ($actual, $expected, string $label): void {
    if ($actual !== $expected) {
        throw new RuntimeException($label.' failed: '.json_encode($actual));
    }
};
$photoFile = tempnam(sys_get_temp_dir(), 'tawakal-photo-');
file_put_contents($photoFile, EmployeeDossier::png());
$id = null;
$document = null;
try {
    $expect($request('GET', '/api/v1/employees')[0], 401, 'Guest employee protection');
    $expect($request('GET', '/sanctum/csrf-cookie')[0], 204, 'Sanctum CSRF');
    $expect($request('POST', '/api/v1/auth/login', ['email' => $user->email, 'password' => $password, 'remember' => false])[0], 204, 'Session login');
    $dossier = EmployeeDossier::make(['fullName' => 'HTTP Persistence '.bin2hex(random_bytes(6))]);
    $created = $request('POST', '/api/v1/employees', ['dossier' => json_encode($dossier), 'photo' => new CURLFile($photoFile, 'image/png', 'client-photo.png')], true);
    $expect($created[0], 201, 'Multipart employee creation');
    $id = $created[1]['data']['id'];
    $expect($created[1]['data']['dossier'], $dossier, 'Five-section creation');
    $listed = $request('GET', '/api/v1/employees?search='.urlencode($dossier['fullName']));
    $expect($listed[0], 200, 'Employee listing');
    $expect($listed[1]['meta']['total'], 1, 'Real pagination total');
    $viewed = $request('GET', '/api/v1/employees/'.$id);
    $expect($viewed[0], 200, 'Employee retrieval');
    $etag = $viewed[2]['etag'];
    $expect($viewed[1]['data']['dossier'], $dossier, 'Five-section retrieval');
    $photo = $request('GET', '/api/v1/employees/'.$id.'/photo');
    $expect($photo[0], 200, 'Authenticated photo');
    $expect($photo[3], EmployeeDossier::png(), 'Photo bytes');
    $employee = Employee::findOrFail($id);
    $photoPath = $employee->photo_path;
    $documentPath = 'employees/'.$id.'/documents/'.bin2hex(random_bytes(16)).'.pdf';
    Storage::disk('employee_private')->put($documentPath, '%PDF-1.4 private test document');
    $document = $employee->documents()->create(['name' => 'Private test document.pdf', 'type' => 'cnic', 'path' => $documentPath]);
    $expect($request('GET', '/api/v1/employees/'.$id.'/documents')[1]['data'][0]['id'], (string) $document->id, 'Real document metadata');
    $expect($request('GET', '/api/v1/documents/'.$document->id.'/download')[0], 200, 'Protected document download');
    $edited = $dossier;
    $edited['fullName'] .= ' Edited';
    $edited['secondaryReference']['contact'] = 'Updated private reference';
    $expect($request('POST', '/api/v1/employees/'.$id, ['_method' => 'PATCH', 'dossier' => json_encode($edited)], true)[0], 428, 'Missing update revision');
    $updated = $request('POST', '/api/v1/employees/'.$id, ['_method' => 'PATCH', 'dossier' => json_encode($edited)], true, $etag);
    $expect($updated[0], 200, 'Multipart employee edit');
    $expect($updated[2]['etag'], '"employee-'.$id.'-v2"', 'Atomic revision increment');
    $expect($request('PATCH', '/api/v1/employees/'.$id, ['dossier' => json_encode($dossier)], false, $etag)[0], 412, 'Stale revision rejection');
    $retrieved = $request('GET', '/api/v1/employees/'.$id);
    $expect($retrieved[1]['data']['dossier'], $edited, 'Complete edited dossier retrieval');
    $employee->refresh();
    $expect($employee->dossier, $edited, 'Real MySQL persistence');
    $expect($employee->photo_path, $photoPath, 'Existing photo retained');
    $expect($retrieved[1]['data']['documents'][0]['id'], (string) $document->id, 'Document retained');
    $expect($request('DELETE', '/api/v1/employees/'.$id)[0], 204, 'Soft deletion');
    $expect($request('GET', '/api/v1/employees/'.$id)[0], 404, 'Deleted employee hidden');
    $expect($request('POST', '/api/v1/auth/logout', [])[0], 204, 'Logout');
    $expect($request('GET', '/api/v1/documents/'.$document->id.'/download')[0], 401, 'Guest document protection');
    echo "PASS: authenticated real HTTP create -> list -> view -> edit -> retrieve, all five dossier sections, photo/document persistence, ETags 428/412, soft deletion and logout.\n";
} finally {
    if ($id !== null) {
        $employee = Employee::withTrashed()->find($id);
        if ($employee) {
            if ($document) {
                Storage::disk('employee_private')->delete($document->path);
                $document->delete();
            } if ($employee->photo_path) {
                Storage::disk('employee_private')->delete($employee->photo_path);
            } $employee->forceDelete();
        }
    }
    $user->delete();
    unlink($photoFile);
    curl_close($curl);
}
