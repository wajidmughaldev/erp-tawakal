<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePortalRole
{
    /** Usage: portal.role (any portal role) or portal.role:superadmin (restricted to the listed roles). */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $allowed = $roles ?: User::ROLES;
        abort_unless($request->user()?->is_active && in_array($request->user()->role, $allowed, true), 403, 'Access denied.');

        return $next($request);
    }
}
