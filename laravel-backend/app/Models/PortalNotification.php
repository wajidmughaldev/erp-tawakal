<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortalNotification extends Model
{
    public const UPDATED_AT = null;

    /** Notifications older than this many days are deleted. */
    public const RETENTION_DAYS = 30;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['read_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function prune(): int
    {
        return static::where('created_at', '<', now()->subDays(self::RETENTION_DAYS))->delete();
    }
}
