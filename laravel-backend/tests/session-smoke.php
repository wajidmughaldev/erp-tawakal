<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

// Run against an already-started local server: php artisan serve --env=testing --port=8100
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->loadEnvironmentFrom('.env.testing');
$app->make(Kernel::class)->bootstrap();
if (config('database.default') !== 'mysql' || ! str_ends_with(config('database.connections.mysql.database'), '_test')) {
    throw new RuntimeException('HTTP smoke test requires a dedicated MySQL _test database.');
}
$url = getenv('TAWAKAL_AUTH_SMOKE_URL') ?: 'http://localhost:8100';
if (! in_array(parse_url($url, PHP_URL_HOST), ['localhost', '127.0.0.1'], true)) {
    throw new RuntimeException('HTTP smoke test only supports a local server.');
}
$password = bin2hex(random_bytes(20));
$user = User::create(['name' => 'HTTP Test', 'email' => bin2hex(random_bytes(8)).'@example.test', 'role' => 'admin', 'password' => $password]);
$curl = curl_init();
curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_COOKIEFILE => '', CURLOPT_TIMEOUT => 15]);
$request = function (string $method, string $path, ?array $body = null, bool $csrf = true) use ($curl, $url): array {
    $headers = ['Accept: application/json', 'Origin: http://localhost:3000', 'Content-Type: application/json'];
    foreach (curl_getinfo($curl, CURLINFO_COOKIELIST) as $cookie) {
        $parts = explode("\t", $cookie);
        if ($csrf && $parts[5] === 'XSRF-TOKEN') {
            $headers[] = 'X-XSRF-TOKEN: '.rawurldecode($parts[6]);
        }
    }
    $responseHeaders = [];
    curl_setopt_array($curl, [
        CURLOPT_URL => $url.$path,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_POSTFIELDS => $body === null ? null : json_encode($body),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADERFUNCTION => function ($curl, $header) use (&$responseHeaders) {
            $responseHeaders[] = $header;

            return strlen($header);
        },
    ]);
    $response = curl_exec($curl);
    if ($response === false) {
        throw new RuntimeException(curl_error($curl));
    }

    return [curl_getinfo($curl, CURLINFO_RESPONSE_CODE), json_decode($response, true), implode('', $responseHeaders)];
};
$expect = function ($actual, $expected, string $label): void {
    if ($actual !== $expected) {
        throw new RuntimeException($label.' failed: '.json_encode($actual));
    }
};
try {
    $expect($request('GET', '/api/v1/auth/me')[0], 401, 'Guest access');
    $csrfResponse = $request('GET', '/sanctum/csrf-cookie');
    $expect($csrfResponse[0], 204, 'CSRF bootstrap');
    $expect(str_contains($csrfResponse[2], 'httponly'), true, 'HttpOnly session cookie');
    $credentials = ['identifier' => $user->email, 'password' => $password, 'remember' => true];
    $expect($request('POST', '/api/v1/auth/login', $credentials, false)[0], 419, 'Missing CSRF rejection');
    $expect($request('POST', '/api/v1/auth/login', $credentials)[0], 204, 'Cookie login');
    $me = $request('GET', '/api/v1/auth/me');
    $expect($me[0], 200, 'Session persistence');
    $expect($me[1]['data']['id'], (string) $user->id, 'Authenticated identity');
    $expect($request('GET', '/api/v1/id-cards')[0], 200, 'Authenticated card directory');
    $expect($request('POST', '/api/v1/auth/logout', [], false)[0], 419, 'Logout CSRF');
    $expect($request('POST', '/api/v1/auth/logout', [])[0], 204, 'Logout');
    $expect($request('GET', '/api/v1/auth/me')[0], 401, 'Session removed after logout');
    echo "PASS: real HTTP cookies, CSRF login/logout, session persistence, authenticated identity and logout invalidation.\n";
} finally {
    $user->delete();
    curl_close($curl);
}
