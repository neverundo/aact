<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property int $business_id
 * @property int|null $website_id
 * @property string $name
 * @property string $event_type
 * @property int $rate_bps
 * @property int $flat_minor
 * @property string $currency
 * @property int $priority
 * @property int $version
 * @property Carbon $effective_from
 * @property Carbon|null $effective_to
 * @property bool $is_active
 */
class CommissionRule extends Model
{
    protected $fillable = [
        'uuid',
        'business_id',
        'website_id',
        'name',
        'event_type',
        'rate_bps',
        'flat_minor',
        'currency',
        'priority',
        'version',
        'effective_from',
        'effective_to',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'rate_bps' => 'integer',
            'flat_minor' => 'integer',
            'priority' => 'integer',
            'version' => 'integer',
            'effective_from' => 'datetime',
            'effective_to' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (CommissionRule $rule): void {
            if (blank($rule->uuid)) {
                $rule->uuid = (string) Str::uuid();
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

    public function isEffectiveAt(Carbon $at): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->effective_from->gt($at)) {
            return false;
        }

        return $this->effective_to === null || $this->effective_to->gte($at);
    }
}
