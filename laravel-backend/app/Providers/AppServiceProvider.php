<?php

namespace App\Providers;

use App\Support\InviteToken;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Behind the host's HTTPS terminator every generated link (signed photo URLs, reset links) must be https.
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
        // This application accepts SPA sessions only, never bearer tokens.
        Sanctum::getAccessTokenFromRequestUsing(fn () => null);
        RateLimiter::for('card-verification', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
        // The public CNIC check is bound to a valid invitation token and rate limited per address and per token.
        RateLimiter::for('cnic-check', fn (Request $request) => [Limit::perMinute(30)->by('ip:'.$request->ip()), Limit::perMinute(15)->by('token:'.hash('sha256', is_string($request->input('token')) ? $request->input('token') : 'invalid'))]);
        RateLimiter::for('invite-validation', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
        RateLimiter::for('candidate-submission', function (Request $request) {
            $token = $request->input('token');

            return [Limit::perMinute(10)->by('candidate-ip:'.$request->ip()), Limit::perMinute(5)->by('candidate-token:'.InviteToken::digest(is_string($token) ? $token : 'invalid'))];
        });
        RateLimiter::for('password-reset', fn (Request $request) => [Limit::perMinute(10)->by('ip:'.$request->ip()), Limit::perHour(5)->by('email:'.hash('sha256', strtolower(trim((string) (is_string($request->input('email')) ? $request->input('email') : ''))).':'.$request->ip()))]);
        RateLimiter::for('login', function (Request $request) {
            $identifier = $request->input('email');

            return [
                Limit::perMinute(30)->by('ip:'.$request->ip()),
                Limit::perMinute(5)->by('account:'.hash('sha256', is_string($identifier) ? strtolower(trim($identifier)) : 'invalid').':'.$request->ip()),
            ];
        });
    }
}
