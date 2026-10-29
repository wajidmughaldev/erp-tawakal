<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    private function passwordRules(): array
    {
        return ['required', 'string', 'max:72', PasswordRule::min(8)->letters()->mixedCase()->numbers()];
    }

    public function login(Request $request): Response
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:254'],
            'password' => ['required', 'string', 'max:72'],
            'remember' => ['sometimes', 'boolean'],
        ]);
        $credentials = [
            'email' => strtolower(trim($validated['email'])),
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

    public function changePassword(Request $request): Response
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string', 'max:72'],
            'password' => [...$this->passwordRules(), 'confirmed', 'different:current_password'],
        ]);
        $user = $request->user();
        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.', 'errors' => ['current_password' => ['The current password is incorrect.']]], 422);
        }
        $user->forceFill(['password' => $validated['password'], 'remember_token' => Str::random(60)])->save();

        return response()->noContent()->header('Cache-Control', 'no-store');
    }

    public function forgotPassword(Request $request): Response
    {
        $validated = $request->validate(['email' => ['required', 'string', 'email', 'max:254']]);
        $email = strtolower(trim($validated['email']));
        // Same response whether or not the account exists, to avoid account enumeration.
        if (User::where('email', $email)->where('is_active', true)->whereIn('role', User::ROLES)->exists()) {
            Password::sendResetLink(['email' => $email]);
        }

        return response()->noContent()->header('Cache-Control', 'no-store');
    }

    public function resetPassword(Request $request): Response
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:254'],
            'password' => [...$this->passwordRules(), 'confirmed'],
        ]);
        $status = Password::reset(
            ['email' => strtolower(trim($validated['email'])), 'password' => $validated['password'], 'token' => $validated['token']],
            function (User $user, string $password) {
                abort_unless($user->is_active, 403, 'Access denied.');
                $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            }
        );
        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'This reset link is invalid or has expired.', 'errors' => ['email' => ['This reset link is invalid or has expired.']]], 422);
        }

        return response()->noContent()->header('Cache-Control', 'no-store');
    }
}
