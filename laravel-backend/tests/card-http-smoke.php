<?php

use App\Models\CardLifecycleEvent;
use App\Models\Employee;
use App\Models\IdCard;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
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
$user = User::create(['name' => 'Card HTTP Operator', 'email' => bin2hex(random_bytes(8)).'@example.test', 'password' => $password, 'role' => 'admin', 'is_active' => true]);
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

$employeeId = null;
try {
    $expect($request($public, 'GET', '/api/v1/id-cards')[0], 401, 'Anonymous list denied');
    $expect($request($public, 'POST', '/api/v1/verify-card', ['token' => str_repeat('A', 43)], false, null, null)[0], 419, 'Missing public CSRF');
    $expect($request($admin, 'GET', '/sanctum/csrf-cookie')[0], 204, 'Admin CSRF bootstrap');
    $expect($request($admin, 'POST', '/api/v1/auth/login', ['identifier' => $user->email, 'password' => $password, 'remember' => false])[0], 204, 'Admin login');
    $expect($request($public, 'GET', '/sanctum/csrf-cookie')[0], 204, 'Independent public CSRF bootstrap');
    $expect($request($public, 'POST', '/api/v1/verify-card', ['token' => str_repeat('A', 43)], false, null, true)[0], 419, 'Invalid public CSRF');
    $dossier = EmployeeDossier::make(['fullName' => 'Card HTTP Fixture '.bin2hex(random_bytes(6))]);
    $created = $request($admin, 'POST', '/api/v1/employees', ['dossier' => json_encode($dossier)], true);
    $expect($created[0], 201, 'Persist employee');
    $employeeId = $created[1]['data']['id'];
    $issued = $request($admin, 'POST', '/api/v1/id-cards', ['employeeId' => $employeeId, 'validityYears' => 1]);
    $expect($issued[0], 201, 'Issue official card');
    $card = $issued[1]['data'];
    $expect($card['employeeId'], $employeeId, 'Employee linkage');
    $expect(strlen($card['verificationToken']), 43, 'Secure token length');
    $expect($request($public, 'GET', '/api/v1/id-cards/'.$card['id'])[0], 401, 'Anonymous detail denied');
    $retrieved = $request($admin, 'GET', '/api/v1/id-cards/'.$card['id']);
    $expect($retrieved[0], 200, 'Authorized card retrieval');
    $expect($retrieved[1]['data']['verificationToken'], $card['verificationToken'], 'Authorized QR reprint');
    $verify = $request($public, 'POST', '/api/v1/verify-card', ['token' => $card['verificationToken']]);
    $expect($verify[0], 200, 'Public verification');
    $expect($verify[1]['status'], 'valid', 'Initial valid credential');
    $expect(array_keys($verify[1]['card']), ['number', 'employeeName', 'employeeDisplayId', 'designation', 'issueDate', 'expiryDate'], 'Public fields restricted');
    $expect(str_contains($verify[3], $dossier['cnic']), false, 'No CNIC disclosure');
    $expect(str_contains($verify[3], $card['verificationToken']), false, 'No token disclosure');
    $renew = $request($admin, 'POST', '/api/v1/id-cards/'.$card['id'].'/renew', ['option' => 'existing']);
    $expect($renew[0], 200, 'Existing renewal');
    $expect($renew[1]['data']['id'], $card['id'], 'Renewal preserves ID');
    $expect($renew[1]['data']['verificationToken'], $card['verificationToken'], 'Renewal preserves QR');
    $expect($renew[1]['data']['issueDate'], $card['issueDate'], 'Issue metadata retained');
    $expect($renew[1]['data']['expiryDate'] > $card['expiryDate'], true, 'Validity extended');
    $reissue = $request($admin, 'POST', '/api/v1/id-cards/'.$card['id'].'/reissue', ['reason' => 'Lost / Stolen Card', 'acknowledged' => true]);
    $expect($reissue[0], 200, 'Reissue');
    $replacement = $reissue[1]['data'];
    $expect($replacement['id'] !== $card['id'], true, 'New credential ID');
    $expect($replacement['number'] !== $card['number'], true, 'New card number');
    $expect($replacement['verificationToken'] !== $card['verificationToken'], true, 'New QR');
    $expect($replacement['expiryDate'], $renew[1]['data']['expiryDate'], 'Reissue does not extend term');
    $expect($request($public, 'POST', '/api/v1/verify-card', ['token' => $card['verificationToken']])[1]['status'], 'revoked', 'Old QR inactive');
    $expect($request($public, 'POST', '/api/v1/verify-card', ['token' => $replacement['verificationToken']])[1]['status'], 'valid', 'Replacement QR valid');
    $physical = $request($admin, 'POST', '/api/v1/id-cards/'.$replacement['id'].'/renew', ['option' => 'new_physical']);
    $expect($physical[0], 200, 'New physical renewal');
    $current = $physical[1]['data'];
    $expect($current['id'] !== $replacement['id'], true, 'New physical ID');
    $expect($request($public, 'POST', '/api/v1/verify-card', ['token' => $replacement['verificationToken']])[1]['status'], 'revoked', 'Previous physical QR inactive');
    $deactivated = $request($admin, 'POST', '/api/v1/id-cards/'.$current['id'].'/deactivate', ['reason' => 'HTTP security check']);
    $expect($deactivated[0], 200, 'Deactivate');
    $expect($deactivated[1]['data']['status'], 'revoked', 'Revoked state');
    $expect($request($public, 'POST', '/api/v1/verify-card', ['token' => $current['verificationToken']])[1]['status'], 'revoked', 'Deactivated QR inactive');
    $expect($request($admin, 'POST', '/api/v1/id-cards/'.$current['id'].'/deactivate', ['reason' => 'Repeat action'])[0], 409, 'Repeat deactivation conflict');
    $expect($request($admin, 'GET', '/api/v1/employees/'.$employeeId)[1]['data']['cards'][2]['id'], $card['id'], 'Complete historical card list');
    $expect(IdCard::where('employee_id', $employeeId)->count(), 3, 'Retained historical records');
    $expect(IdCard::where('current_employee_id', $employeeId)->count(), 0, 'Current slot released');
    $expect(CardLifecycleEvent::where('employee_id', $employeeId)->count(), 6, 'Lifecycle events persisted');
    $expect($request($admin, 'POST', '/api/v1/auth/logout', [])[0], 204, 'Logout');
    echo "PASS: Smart ID HTTP workflow ($checks checks), two independent clients, CSRF 419, issue/reprint/verify, both renewals, reissue with old QR revoked, deactivation, history, and anonymous detail denial.\n";
} catch (Throwable $failure) {
    // Do not print tokens, private payloads or HTTP response bodies on failure.
} finally {
    if ($employeeId !== null) {
        CardLifecycleEvent::where('employee_id', $employeeId)->getQuery()->delete();
        IdCard::withTrashed()->where('employee_id', $employeeId)->forceDelete();
        Employee::withTrashed()->whereKey($employeeId)->forceDelete();
    }
    $user->delete();
    curl_close($admin);
    curl_close($public);
}
if (isset($failure)) {
    fwrite(STDERR, $failure->getMessage().PHP_EOL);
    exit(1);
}
