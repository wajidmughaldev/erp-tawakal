<?php

use App\Models\CandidateRequest;
use App\Models\RegistrationInvite;
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
$user = User::create(['name' => 'Candidate HTTP Operator', 'email' => bin2hex(random_bytes(8)).'@example.test', 'password' => $password, 'role' => 'superadmin', 'is_active' => true]);
$admin = curl_init();
$public = curl_init();
foreach ([$admin, $public] as $handle) {
    curl_setopt_array($handle, [CURLOPT_RETURNTRANSFER => true, CURLOPT_COOKIEFILE => '', CURLOPT_TIMEOUT => 20]);
}
$request = function ($curl, string $method, string $path, ?array $body = null, bool $multipart = false, ?string $etag = null, ?bool $invalidCsrf = false) use ($url): array {
    $headers = ['Accept: application/json', 'Origin: http://localhost:3000'];
    if (! $multipart && $body !== null) {
        $headers[] = 'Content-Type: application/json';
    }
    if ($etag !== null) {
        $headers[] = 'If-Match: '.$etag;
    }
    foreach (curl_getinfo($curl, CURLINFO_COOKIELIST) as $cookie) {
        $parts = explode("\t", $cookie);
        if ($parts[5] === 'XSRF-TOKEN' && $invalidCsrf !== null) {
            $headers[] = 'X-XSRF-TOKEN: '.($invalidCsrf ? 'invalid' : rawurldecode($parts[6]));
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

$checks = 0;
$expect = function ($actual, $expected, string $label) use (&$checks): void {
    if ($actual !== $expected) {
        throw new RuntimeException($label.' failed'.(is_int($actual) ? ' (status '.$actual.')' : '').'.');
    } $checks++;
};
$photo = tempnam(sys_get_temp_dir(), 'candidate-http-');
file_put_contents($photo, EmployeeDossier::png());
$invites = [];
try {
    $expect($request($public, 'GET', '/api/v1/employee-requests')[0], 401, 'Guest protection');
    $expect($request($public, 'POST', '/api/v1/registration-invites/validate', ['token' => str_repeat('A', 43)], false, null, null)[0], 419, 'Missing CSRF');
    $expect($request($admin, 'GET', '/sanctum/csrf-cookie')[0], 204, 'Admin CSRF bootstrap');
    $expect($request($admin, 'POST', '/api/v1/auth/login', ['email' => $user->email, 'password' => $password, 'remember' => false])[0], 204, 'Admin login');
    $expect($request($public, 'GET', '/sanctum/csrf-cookie')[0], 204, 'Anonymous CSRF bootstrap');
    $expect($request($public, 'POST', '/api/v1/registration-invites/validate', ['token' => str_repeat('A', 43)], false, null, true)[0], 419, 'Invalid CSRF');
    foreach (['approve', 'reject'] as $decision) {
        $dossier = EmployeeDossier::make(['fullName' => 'HTTP Candidate '.bin2hex(random_bytes(6))]);
        $invite = $request($admin, 'POST', '/api/v1/registration-invites', ['candidateName' => 'Invited Name', 'designation' => $dossier['designation'], 'department' => 'Distribution', 'expiresAt' => now()->addHour()->toIso8601String(), 'roleCategory' => $dossier['roleCategory']]);
        $expect($invite[0], 201, 'Invitation creation');
        $invites[] = $invite[1]['data']['id'];
        $token = $invite[1]['data']['token'];
        $validation = $request($public, 'POST', '/api/v1/registration-invites/validate', ['token' => $token]);
        $expect($validation[0], 200, 'Public validation');
        $expect($validation[1]['status'], 'valid', 'Valid token');
        $expect(isset($validation[1]['invite']['token']), false, 'Token not exposed');
        $expect(isset($validation[1]['invite']['dossier']), false, 'Dossier not exposed');
        $body = ['token' => $token, 'dossier' => json_encode($dossier), 'photo' => new CURLFile($photo, 'image/png', 'candidate.png')];
        $submission = $request($public, 'POST', '/api/v1/employee-requests', $body, true);
        $expect($submission[0], 201, 'Multipart submission');
        $receipt = $submission[1]['data'];
        $id = $receipt['id'];
        $expect($receipt['status'], 'pending', 'Pending receipt');
        $expect(isset($receipt['trackingId']), true, 'Tracking receipt');
        $expect(isset($receipt['dossier']), false, 'Public receipt privacy');
        $expect($receipt['documents'], [], 'No simulated documents');
        $expect($request($public, 'GET', '/api/v1/employee-requests/'.$id)[0], 401, 'Private request protection');
        $review = $request($admin, 'GET', '/api/v1/employee-requests/'.$id);
        $expect($review[0], 200, 'Selected review');
        $expect($review[1]['data']['dossier'], $dossier, 'Five sections persisted');
        $expect($request($admin, 'GET', '/api/v1/employee-requests/'.$id.'/photo')[3], EmployeeDossier::png(), 'Candidate photo');
        $expect($request($public, 'GET', '/api/v1/employee-requests/'.$id.'/photo')[0], 401, 'Private photo protection');
        $result = $request($admin, 'POST', '/api/v1/employee-requests/'.$id.'/'.$decision, $decision === 'reject' ? ['reason' => 'HTTP review rejection'] : []);
        $expect($result[0], 200, 'Review decision');
        $record = CandidateRequest::findOrFail($id);
        $expect(Storage::disk('employee_private')->exists($record->photo_path), true, 'Original photograph retained');
        if ($decision === 'approve') {
            $expect($result[1]['data']['status'], 'approved', 'Approved state');
            $employee = $request($admin, 'GET', '/api/v1/employees/'.$result[1]['data']['employeeId']);
            $expect($employee[0], 200, 'Actual employee retrieval');
            $expect($employee[1]['data']['dossier'], $dossier, 'Original employee dossier');
            $expect($employee[1]['data']['department'], 'Distribution', 'Invitation department');
            $expect($employee[2]['etag'], '"employee-'.$record->employee_id.'-v1"', 'Initial revision');
            $expect($employee[1]['data']['cards'], [], 'No card issuance');
            $expect($request($admin, 'GET', '/api/v1/employees/'.$record->employee_id.'/photo')[3], EmployeeDossier::png(), 'Employee photograph');
        } else {
            $expect($result[1]['data']['status'], 'rejected', 'Rejected state');
            $expect($result[1]['data']['rejectionReason'], 'HTTP review rejection', 'Stored reason');
            $expect($record->employee_id, null, 'No employee on rejection');
        }
        $expect($request($admin, 'POST', '/api/v1/employee-requests/'.$id.'/approve', [])[0], 409, 'Repeated or conflicting approval');
        $expect($request($admin, 'POST', '/api/v1/employee-requests/'.$id.'/reject', ['reason' => 'Repeat'])[0], 409, 'Repeated or conflicting rejection');
        $expect($request($public, 'POST', '/api/v1/registration-invites/validate', ['token' => $token])[1]['status'], 'used', 'Consumed token');
        $expect($request($public, 'POST', '/api/v1/employee-requests', $body, true)[0], 409, 'Replay blocked');
    }
    $expect($request($admin, 'POST', '/api/v1/auth/logout', [])[0], 204, 'Logout');
    echo "PASS: candidate HTTP workflow ($checks checks): separate admin/anonymous sessions, CSRF 419/bootstrap, invitation, five-section multipart submission, private review/photo, approval and actual employee, rejection, replay and conflicting transitions.\n";
} catch (Throwable $failure) {
    // Print only the assertion label/status, never token or candidate payloads.
} finally {
    foreach ($invites as $inviteId) {
        $candidate = CandidateRequest::where('registration_invite_id', $inviteId)->first();
        $employee = $candidate?->employee;
        if ($candidate) {
            if ($candidate->photo_path) {
                Storage::disk('employee_private')->delete($candidate->photo_path);
            } $candidate->delete();
        }
        if ($employee) {
            if ($employee->photo_path) {
                Storage::disk('employee_private')->delete($employee->photo_path);
            } $employee->forceDelete();
        }
        RegistrationInvite::whereKey($inviteId)->delete();
    }
    $user->delete();
    unlink($photo);
    curl_close($admin);
    curl_close($public);
}

if (isset($failure)) {
    fwrite(STDERR, $failure->getMessage().PHP_EOL);
    exit(1);
}
