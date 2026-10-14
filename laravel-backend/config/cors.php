<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_filter(array_map('trim', explode(',', env('FRONTEND_ORIGINS', 'http://localhost:3000')))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'X-XSRF-TOKEN', 'X-Requested-With', 'If-Match'],
    'exposed_headers' => ['ETag'],
    'max_age' => 600,
    'supports_credentials' => true,
];
