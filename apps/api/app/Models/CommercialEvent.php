<?php

namespace App\Models;

use App\Enums\CommercialEventStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property int $business_id
 * @property int $website_id
 * @property int $integration_credential_id
 * @property string $source
 * @property string $external_event_id
 * @property string|null $related_external_event_id
 * @property string $event_type
 * @property Carbon $occurred_at
 * @property int $amount_minor
 * @property string $currency
 * @property string|null $referral_code
 * @property array<string, mixed>|null $payload
 * @property CommercialEventStatus $status
 * @property string|null $status_reason
 */
class CommercialEvent extends Model
{
    protected $fillable = [
        'uuid',
        'business_id',
        'website_id',
        'integration_credential_id',
        'source',
        'external_event_id',
        'related_external_event_id',
        'event_type',
        'occurred_at',
        'amount_minor',
        'currency',
        'referral_code',
        'payload',
        'status',
        'status_reason',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'amount_minor' => 'integer',
            'payload' => 'array',
            'status' => CommercialEventStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (CommercialEvent $event): void {
            if (blank($event->uuid)) {
                $event->uuid = (string) Str::uuid();
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

    /** @return HasOne<Commission, $this> */
    public function commission(): HasOne
    {
        return $this->hasOne(Commission::class);
    }
}
