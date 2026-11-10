<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property int $business_id
 * @property int $website_id
 * @property string $source
 * @property string $name
 * @property string $token_hash
 * @property string $hmac_secret_encrypted
 * @property array<int, string>|null $scopes
 * @property Carbon|null $expires_at
 * @property Carbon|null $revoked_at
 * @property Carbon|null $last_used_at
 * @property int|null $created_by_user_id
 */
class IntegrationCredential extends Model
{
    protected $fillable = [
        'uuid',
        'business_id',
        'website_id',
        'source',
        'name',
        'token_hash',
        'hmac_secret_encrypted',
        'scopes',
        'expires_at',
        'revoked_at',
        'last_used_at',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'hmac_secret_encrypted' => 'encrypted',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (IntegrationCredential $credential): void {
            if (blank($credential->uuid)) {
                $credential->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return BelongsTo<Website, $this> */
    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }

    /** @return HasMany<IntegrationNonce, $this> */
    public function nonces(): HasMany
    {
        return $this->hasMany(IntegrationNonce::class);
    }

    public function isUsable(): bool
    {
        if ($this->revoked_at !== null) {
            return false;
        }

        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }

    public function hasScope(string $scope): bool
    {
        $scopes = $this->scopes ?? [];

        return in_array('*', $scopes, true) || in_array($scope, $scopes, true);
    }
}
