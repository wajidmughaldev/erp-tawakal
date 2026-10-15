<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->loadEnvironmentFrom('.env.testing');
$app->make(ConsoleKernel::class)->bootstrap();
if (config('database.default') !== 'mysql' || ! str_ends_with(config('database.connections.mysql.database'), '_test')) {
    throw new RuntimeException('Worker requires a dedicated MySQL _test database.');
}
$spec = json_decode(file_get_contents($argv[1]), true, 32, JSON_THROW_ON_ERROR);
if (isset($spec['card_policy'])) {
    config(['cards.validity_policy' => $spec['card_policy']]);
}
if (isset($spec['user_id'])) {
    Auth::guard('web')->setUser(User::findOrFail($spec['user_id']));
}
$request = Request::create($spec['path'], $spec['method'], $spec['parameters']);
$request->headers->set('Accept', 'application/json');
foreach ($spec['headers'] ?? [] as $key => $value) {
    $request->headers->set($key, $value);
}
file_put_contents($spec['ready'], 'ready');
$deadline = microtime(true) + 20;
while (! file_exists($spec['release'])) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Worker barrier timed out.');
    } usleep(10000);
}
$kernel = $app->make(HttpKernel::class);
$response = $kernel->handle($request);
echo json_encode(['status' => $response->getStatusCode(), 'body' => json_decode($response->getContent(), true), 'etag' => $response->headers->get('ETag')], JSON_THROW_ON_ERROR);
$kernel->terminate($request, $response);
