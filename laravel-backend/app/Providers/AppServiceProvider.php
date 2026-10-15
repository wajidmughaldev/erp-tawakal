<?php

namespace App\Providers;

use App\Support\InviteToken;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // This application accepts SPA sessions only, never bearer tokens.
        Sanctum::getAccessTokenFromRequestUsing(fn () => null);
        RateLimiter::for('card-verification', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
        RateLimiter::for('invite-validation', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
        RateLimiter::for('candidate-submission', function (Request $request) {
            $token = $request->input('token');

            return [Limit::perMinute(10)->by('candidate-ip:'.$request->ip()), Limit::perMinute(5)->by('candidate-token:'.InviteToken::digest(is_string($token) ? $token : 'invalid'))];
        });
        RateLimiter::for('login', function (Request $request) {
            $identifier = $request->input('identifier');

            return [
                Limit::perMinute(30)->by('ip:'.$request->ip()),
                Limit::perMinute(5)->by('account:'.hash('sha256', is_string($identifier) ? strtolower(trim($identifier)) : 'invalid').':'.$request->ip()),
            ];
        });
    }
}
