<?php

namespace App\Models;

use App\Enums\MembershipRole;
use App\Enums\PlatformRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property PlatformRole|null $platform_role
 * @property string|null $totp_secret
 * @property Carbon|null $totp_confirmed_at
 * @property int|null $totp_last_timestep
 * @property Carbon|null $email_otp_enabled_at
 * @property Carbon|null $password_changed_at
 * @property string|null $preferred_locale
 */
#[Fillable([
    'name',
    'email',
    'password',
    'email_verified_at',
    'platform_role',
    'totp_secret',
    'totp_confirmed_at',
    'totp_last_timestep',
    'email_otp_enabled_at',
    'password_changed_at',
    'preferred_locale',
])]
#[Hidden(['password', 'remember_token', 'totp_secret'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'platform_role' => PlatformRole::class,
            'totp_secret' => 'encrypted',
            'totp_confirmed_at' => 'datetime',
            'email_otp_enabled_at' => 'datetime',
            'password_changed_at' => 'datetime',
        ];
    }

    /** @return HasMany<BusinessMembership, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(BusinessMembership::class);
    }

    /** @return HasMany<RecoveryCode, $this> */
    public function recoveryCodes(): HasMany
    {
        return $this->hasMany(RecoveryCode::class);
    }

    public function isPlatformAdmin(): bool
    {
        return $this->platform_role === PlatformRole::PlatformAdmin;
    }

    public function hasConfirmedTotp(): bool
    {
        return $this->totp_confirmed_at !== null && filled($this->totp_secret);
    }

    public function hasEmailOtpEnabled(): bool
    {
        return $this->email_otp_enabled_at !== null;
    }

    public function hasAnyMfaEnabled(): bool
    {
        return $this->hasConfirmedTotp() || $this->hasEmailOtpEnabled();
    }

    public function isBusinessAdmin(?int $businessId = null): bool
    {
        $query = $this->memberships()
            ->where('role', MembershipRole::BusinessAdmin)
            ->where('status', 'approved');

        if ($businessId !== null) {
            $query->where('business_id', $businessId);
        }

        return $query->exists();
    }

    public function isAdminUser(): bool
    {
        return $this->isPlatformAdmin() || $this->isBusinessAdmin();
    }

    public function belongsToBusiness(int $businessId): bool
    {
        if ($this->isPlatformAdmin()) {
            return true;
        }

        return $this->memberships()
            ->where('business_id', $businessId)
            ->where('status', 'approved')
            ->exists();
    }

    /**
     * @return list<int>
     */
    public function accessibleBusinessIds(): array
    {
        if ($this->isPlatformAdmin()) {
            return Business::query()->pluck('id')->all();
        }

        return $this->memberships()
            ->where('status', 'approved')
            ->pluck('business_id')
            ->unique()
            ->values()
            ->all();
    }

    public function requiresTotpForAdminAccess(): bool
    {
        return $this->isAdminUser() && config('aact.mfa.admin_totp_required');
    }
}
