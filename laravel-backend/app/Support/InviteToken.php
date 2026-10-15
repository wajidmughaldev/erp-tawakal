<?php

namespace App\Support;

class InviteToken
{
    public const RULES = ['required', 'string', 'size:43', 'regex:/^[A-Za-z0-9_-]{43}$/D'];

    public static function generate(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    public static function digest(string $token): string
    {
        $key = config('employees.lookup_key') ?: config('app.key');
        if (! is_string($key) || $key === '') {
            throw new \RuntimeException('An application key is required.');
        }

        return hash_hmac('sha256', 'registration-invite:'.$token, $key);
    }
}
