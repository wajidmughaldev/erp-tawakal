<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CardLifecycleEvent extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected $hidden = ['reason'];

    protected function casts(): array
    {
        return ['reason' => 'encrypted', 'occurred_at' => 'immutable_datetime', 'previous_expiry' => 'immutable_date', 'new_expiry' => 'immutable_date'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Card lifecycle history is immutable.'));
        static::deleting(fn () => throw new \LogicException('Card lifecycle history is immutable.'));
    }
}
