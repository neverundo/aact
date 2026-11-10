<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property int $business_id
 * @property int $invited_by_user_id
 * @property string $email
 * @property string|null $name
 * @property string|null $phone
 * @property string $token_hash
 * @property Carbon $expires_at
 * @property Carbon|null $revoked_at
 * @property Carbon|null $accepted_at
 * @property int|null $accepted_by_user_id
 * @property int $resend_count
 * @property Carbon|null $last_sent_at
 */
class Invitation extends Model
{
    protected $fillable = [
        'uuid',
        'business_id',
        'invited_by_user_id',
        'email',
        'name',
        'phone',
        'token_hash',
        'expires_at',
        'revoked_at',
        'accepted_at',
        'accepted_by_user_id',
        'resend_count',
        'last_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'accepted_at' => 'datetime',
            'last_sent_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Invitation $invitation): void {
            if (blank($invitation->uuid)) {
                $invitation->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return BelongsTo<User, $this> */
    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    /** @return BelongsToMany<Website, $this> */
    public function websites(): BelongsToMany
    {
        return $this->belongsToMany(Website::class, 'invitation_website');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }

    public function isAcceptable(): bool
    {
        return ! $this->isExpired() && ! $this->isRevoked() && ! $this->isAccepted();
    }
}
