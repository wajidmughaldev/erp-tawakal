<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use App\Notifications\PortalResetPassword;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use InvalidArgumentException;

class User extends Authenticatable
{
    use Notifiable;

    public const ROLES = ['superadmin', 'manager'];

    protected $fillable = ['name', 'email', 'username', 'phone', 'department', 'branch', 'password', 'role', 'is_active'];

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

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new PortalResetPassword($token));
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
