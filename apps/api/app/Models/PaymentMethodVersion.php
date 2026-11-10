<?php

namespace App\Models;

use App\Enums\PaymentMethodStatus;
use App\Enums\PaymentMethodType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property int $user_id
 * @property int $business_id
 * @property int $business_membership_id
 * @property PaymentMethodType $method_type
 * @property string $payload_encrypted
 * @property string $display_mask
 * @property PaymentMethodStatus $status
 * @property int|null $reviewed_by_user_id
 * @property Carbon|null $reviewed_at
 * @property string|null $review_notes
 * @property int $version
 */
class PaymentMethodVersion extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'business_id',
        'business_membership_id',
        'method_type',
        'payload_encrypted',
        'display_mask',
        'status',
        'reviewed_by_user_id',
        'reviewed_at',
        'review_notes',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'method_type' => PaymentMethodType::class,
            'status' => PaymentMethodStatus::class,
            'payload_encrypted' => 'encrypted:array',
            'reviewed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (PaymentMethodVersion $version): void {
            if (blank($version->uuid)) {
                $version->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return BelongsTo<BusinessMembership, $this> */
    public function membership(): BelongsTo
    {
        return $this->belongsTo(BusinessMembership::class, 'business_membership_id');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
