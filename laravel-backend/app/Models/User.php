<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Foundation\Auth\User as Authenticatable;
use InvalidArgumentException;

class User extends Authenticatable
{
    public const ROLES = ['admin', 'co-admin', 'manager'];

    protected $fillable = ['name', 'email', 'username', 'password', 'role', 'is_active'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['password' => 'hashed', 'is_active' => 'boolean'];
    }

    protected function role(): Attribute
    {
        return Attribute::make(set: function (string $value) {
            if (! in_array($value, self::ROLES, true)) {
                throw new InvalidArgumentException('Unsupported portal role.');
            }

            return $value;
        });
    }

    protected function email(): Attribute
    {
        return Attribute::make(set: fn (string $value) => strtolower(trim($value)));
    }

    protected function username(): Attribute
    {
        return Attribute::make(set: fn (?string $value) => $value === null ? null : strtolower(trim($value)));
    }
}
