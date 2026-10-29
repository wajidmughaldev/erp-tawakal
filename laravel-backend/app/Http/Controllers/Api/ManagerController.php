<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Notifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Manager accounts. Superadmin only (see the route group); only the manager role can be created here
 * and accounts are deactivated rather than deleted so historical records keep their meaning.
 */
class ManagerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'search' => ['sometimes', 'nullable', 'string', 'max:254'], 'status' => ['sometimes', 'nullable', Rule::in(['active', 'inactive'])]]);
        $query = User::where('role', 'manager');
        if (! empty($input['status'])) {
            $query->where('is_active', $input['status'] === 'active');
        }
        if (($search = trim($input['search'] ?? '')) !== '') {
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(fn ($q) => $q->whereRaw("name LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("email LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("phone LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("department LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("branch LIKE ? ESCAPE '!'", [$pattern]));
        }
        $page = $query->orderByDesc('id')->paginate(15);

        return response()->json([
            'data' => $page->getCollection()->map(fn (User $user) => $this->resource($user))->values(),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'perPage' => $page->perPage(), 'total' => $page->total(), 'activeTotal' => User::where('role', 'manager')->where('is_active', true)->count()],
        ])->header('Cache-Control', 'no-store');
    }

    public function show(User $manager): JsonResponse
    {
        return $this->record($this->manager($manager));
    }

    public function store(Request $request): JsonResponse
    {
        $input = $request->validate([
            ...$this->profileRules(),
            'email' => ['required', 'string', 'email', 'max:254', Rule::unique('users', 'email')],
            'initialPassword' => ['required', 'string', 'max:72', Password::min(8)->letters()->mixedCase()->numbers()],
        ]);
        $manager = User::create([
            'name' => trim($input['name']), 'email' => $input['email'], 'phone' => trim($input['phone']), 'department' => trim($input['department']), 'branch' => trim($input['branch']),
            'password' => $input['initialPassword'], 'role' => 'manager', 'is_active' => true,
        ]);

        Notifier::send('accounts', 'info', 'Manager account created', "{$manager->name} ({$manager->email}) was added as a manager by {$request->user()->name}.", ['manager', $manager->id], $request->user(), true);

        return $this->record($manager, 201);
    }

    public function update(Request $request, User $manager): JsonResponse
    {
        $manager = $this->manager($manager);
        $input = $request->validate([
            ...$this->profileRules(),
            'email' => ['required', 'string', 'email', 'max:254', Rule::unique('users', 'email')->ignore($manager->id)],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
        $manager->fill(['name' => trim($input['name']), 'email' => $input['email'], 'phone' => trim($input['phone']), 'department' => trim($input['department']), 'branch' => trim($input['branch']), 'is_active' => $input['status'] === 'active']);
        $statusChanged = $manager->isDirty('is_active');
        if ($statusChanged && ! $manager->is_active) {
            // Sign the manager out of any "remember me" session as well.
            $manager->remember_token = Str::random(60);
        }
        $manager->save();
        if ($statusChanged) {
            Notifier::send('accounts', $manager->is_active ? 'info' : 'warning', $manager->is_active ? 'Manager activated' : 'Manager deactivated', "{$manager->name} ({$manager->email}) was ".($manager->is_active ? 'activated' : 'deactivated')." by {$request->user()->name}.", ['manager', $manager->id], $request->user(), true);
        }

        return $this->record($manager);
    }

    private function profileRules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'phone' => ['required', 'string', 'min:5', 'max:50'],
            'department' => ['required', 'string', 'min:2', 'max:120'],
            'branch' => ['required', 'string', 'min:2', 'max:120'],
        ];
    }

    /** Only manager accounts are addressable here; superadmin accounts are never exposed or changed. */
    private function manager(User $user): User
    {
        abort_unless($user->role === 'manager', 404);

        return $user;
    }

    private function record(User $manager, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $this->resource($manager)], $status)->header('Cache-Control', 'no-store');
    }

    private function resource(User $user): array
    {
        return ['id' => (string) $user->id, 'name' => $user->name, 'email' => $user->email, 'phone' => $user->phone ?? '', 'department' => $user->department ?? '', 'branch' => $user->branch ?? '', 'role' => $user->role, 'status' => $user->is_active ? 'active' : 'inactive', 'createdAt' => $user->created_at?->toIso8601String()];
    }
}
