<?php

namespace App\Models;

use App\Enums\LedgerAccountType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $business_id
 * @property string $code
 * @property string $name
 * @property LedgerAccountType $account_type
 * @property int|null $business_membership_id
 * @property string $currency
 */
class LedgerAccount extends Model
{
    protected $fillable = [
        'business_id',
        'code',
        'name',
        'account_type',
        'business_membership_id',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'account_type' => LedgerAccountType::class,
        ];
    }

    /** @return BelongsTo<Business, $this> */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /** @return HasMany<LedgerLine, $this> */
    public function lines(): HasMany
    {
        return $this->hasMany(LedgerLine::class);
    }
}
