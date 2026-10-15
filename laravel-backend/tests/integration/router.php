<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

// Test-only HTTP entry point; never used by public/index.php or deployed application routing.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->loadEnvironmentFrom('.env.integration');
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
if (! $app->environment('integration') || config('database.default') !== 'mysql' || config('database.connections.mysql.database') !== 'tawakal_frontend_integration_test') {
    http_response_code(503);
    echo 'Integration server requires its dedicated _test database.';
    exit;
}
$request = Request::capture();
$response = $kernel->handle($request);
$response->send();
$kernel->terminate($request, $response);
