<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PortalNotification;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        PortalNotification::prune();
        $input = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'category' => ['sometimes', 'nullable', Rule::in(['requests', 'cards', 'employees', 'accounts', 'unread'])]]);
        $mine = PortalNotification::where('user_id', $request->user()->id);
        $unread = (clone $mine)->whereNull('read_at')->count();
        if ($request->boolean('summary')) {
            return response()->json(['unreadCount' => $unread])->header('Cache-Control', 'no-store');
        }
        $query = clone $mine;
        match ($input['category'] ?? null) {
            null => null,
            'unread' => $query->whereNull('read_at'),
            default => $query->where('category', $input['category']),
        };
        $page = $query->orderByDesc('id')->paginate(20);

        return response()->json([
            'data' => $page->getCollection()->map(fn (PortalNotification $item) => [
                'id' => (string) $item->id, 'title' => $item->title, 'message' => $item->message, 'category' => $item->category, 'level' => $item->level,
                'readAt' => $item->read_at?->toIso8601String(), 'createdAt' => $item->created_at->toIso8601String(),
                ...($item->target_type ? ['target' => ['type' => $item->target_type, 'id' => $item->target_id]] : []),
            ])->values(),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'perPage' => $page->perPage(), 'total' => $page->total()],
            'unreadCount' => $unread,
        ])->header('Cache-Control', 'no-store');
    }

    public function readAll(Request $request)
    {
        PortalNotification::where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->noContent()->header('Cache-Control', 'no-store');
    }
}
