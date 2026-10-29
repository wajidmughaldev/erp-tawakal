<?php

namespace App\Services;

use App\Models\PortalNotification;
use App\Models\User;
use Throwable;

/**
 * Creates in-portal notifications for administrators when something happens.
 * The person who caused the event is not notified about their own action, and a failure here must
 * never undo or block the action itself.
 */
class Notifier
{
    /**
     * @param  array{0:string,1:string|int}|null  $target  [type, id] used to link to the record
     */
    public static function send(string $category, string $level, string $title, string $message, ?array $target = null, ?User $actor = null, bool $superadminsOnly = false): void
    {
        try {
            $recipients = User::where('is_active', true)->whereIn('role', $superadminsOnly ? ['superadmin'] : User::ROLES)
                ->when($actor, fn ($query) => $query->whereKeyNot($actor->id))->pluck('id');
            $now = now();
            $rows = $recipients->map(fn ($id) => [
                'user_id' => $id, 'category' => $category, 'level' => $level, 'title' => mb_substr($title, 0, 160), 'message' => $message,
                'target_type' => $target[0] ?? null, 'target_id' => isset($target[1]) ? (string) $target[1] : null, 'created_at' => $now,
            ])->all();
            if ($rows) {
                PortalNotification::insert($rows);
            }
        } catch (Throwable $error) {
            report($error);
        }
    }
}
