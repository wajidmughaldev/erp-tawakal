<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function login(Request $request): Response
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'max:254'],
            'password' => ['required', 'string', 'max:72', function ($attribute, $value, $fail) {
                if (is_string($value) && strlen($value) > 72) {
                    $fail('Password must not exceed 72 bytes.');
                }
            }],
            'remember' => ['sometimes', 'boolean'],
        ]);
        $identifier = strtolower(trim($validated['identifier']));
        $credentials = [
            str_contains($identifier, '@') ? 'email' : 'username' => $identifier,
            'password' => $validated['password'],
            'is_active' => true,
            'role' => User::ROLES,
        ];
        if (! Auth::guard('web')->attempt($credentials, $validated['remember'] ?? false)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }
        $request->session()->regenerate();

        return response()->noContent()->header('Cache-Control', 'no-store');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ]])->header('Cache-Control', 'no-store');
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent()->header('Cache-Control', 'no-store');
    }
}
