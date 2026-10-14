<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePortalRole
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->is_active && in_array($request->user()->role, User::ROLES, true), 403, 'Access denied.');

        return $next($request);
    }
}
