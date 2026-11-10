<?php

namespace App\Models;

use App\Enums\PayoutRequestStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $uuid
 * @property int $business_id
 * @property int $business_membership_id
 * @property int $user_id
 * @property int $payment_method_version_id
 * @property int $amount_minor
 * @property string $currency
 * @property PayoutRequestStatus $status
 * @property string|null $status_reason
 * @property int|null $reviewed_by_user_id
 * @property Carbon|null $reviewed_at
 * @property int|null $paid_by_user_id
 * @property Carbon|null $paid_at
 * @property string|null $external_reference
 * @property int|null $ledger_entry_id
 */
class PayoutRequest extends Model
{
    protected $fillable = [
        'uuid',
        'business_id',
        'business_membership_id',
        'user_id',
        'payment_method_version_id',
        'amount_minor',
        'currency',
        'status',
        'status_reason',
        'reviewed_by_user_id',
        'reviewed_at',
        'paid_by_user_id',
        'paid_at',
        'external_reference',
        'ledger_entry_id',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'status' => PayoutRequestStatus::class,
            'reviewed_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (PayoutRequest $request): void {
            if (blank($request->uuid)) {
                $request->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return BelongsTo<BusinessMembership, $this> */
    public function membership(): BelongsTo
    {
        return $this->belongsTo(BusinessMembership::class, 'business_membership_id');
    }

    /** @return BelongsTo<PaymentMethodVersion, $this> */
    public function paymentMethodVersion(): BelongsTo
    {
        return $this->belongsTo(PaymentMethodVersion::class, 'payment_method_version_id');
    }

    /** @return BelongsToMany<PrivateDocument, $this> */
    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(PrivateDocument::class, 'payout_request_documents');
    }
}
