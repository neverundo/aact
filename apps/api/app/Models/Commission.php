<?php

namespace App\Models;

use App\Enums\CommissionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property int $business_id
 * @property int $commercial_event_id
 * @property int $business_membership_id
 * @property int $user_id
 * @property int|null $referral_code_id
 * @property int $commission_rule_id
 * @property int $rule_version
 * @property int $basis_amount_minor
 * @property int $rate_bps
 * @property int $flat_minor
 * @property int $commission_minor
 * @property int $reversed_minor
 * @property string $currency
 * @property CommissionStatus $status
 */
class Commission extends Model
{
    protected $fillable = [
        'uuid',
        'business_id',
        'commercial_event_id',
        'business_membership_id',
        'user_id',
        'referral_code_id',
        'commission_rule_id',
        'rule_version',
        'basis_amount_minor',
        'rate_bps',
        'flat_minor',
        'commission_minor',
        'reversed_minor',
        'currency',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'rule_version' => 'integer',
            'basis_amount_minor' => 'integer',
            'rate_bps' => 'integer',
            'flat_minor' => 'integer',
            'commission_minor' => 'integer',
            'reversed_minor' => 'integer',
            'status' => CommissionStatus::class,
        ];
    }

    public function reversibleMinor(): int
    {
        return max(0, $this->commission_minor - $this->reversed_minor);
    }

    protected static function booted(): void
    {
        static::creating(function (Commission $commission): void {
            if (blank($commission->uuid)) {
                $commission->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return BelongsTo<CommercialEvent, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(CommercialEvent::class, 'commercial_event_id');
    }

    /** @return BelongsTo<BusinessMembership, $this> */
    public function membership(): BelongsTo
    {
        return $this->belongsTo(BusinessMembership::class, 'business_membership_id');
    }

    /** @return BelongsTo<CommissionRule, $this> */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(CommissionRule::class, 'commission_rule_id');
    }
}
