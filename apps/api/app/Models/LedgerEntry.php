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
 * @property int|null $commercial_event_id
 * @property int|null $commission_id
 * @property string $entry_type
 * @property string $idempotency_key
 * @property string|null $description
 * @property Carbon $posted_at
 */
class LedgerEntry extends Model
{
    protected $fillable = [
        'uuid',
        'business_id',
        'commercial_event_id',
        'commission_id',
        'entry_type',
        'idempotency_key',
        'description',
        'posted_at',
    ];

    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (LedgerEntry $entry): void {
            if (blank($entry->uuid)) {
                $entry->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return HasMany<LedgerLine, $this> */
    public function lines(): HasMany
    {
        return $this->hasMany(LedgerLine::class);
    }

    /** @return BelongsTo<Commission, $this> */
    public function commission(): BelongsTo
    {
        return $this->belongsTo(Commission::class);
    }

    public function isBalanced(): bool
    {
        $debits = (int) $this->lines()->where('side', 'debit')->sum('amount_minor');
        $credits = (int) $this->lines()->where('side', 'credit')->sum('amount_minor');

        return $debits === $credits && $debits > 0;
    }
}
