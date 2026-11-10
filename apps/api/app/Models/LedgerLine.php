<?php

namespace App\Models;

use App\Enums\LedgerSide;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $ledger_entry_id
 * @property int $ledger_account_id
 * @property int $business_id
 * @property LedgerSide $side
 * @property int $amount_minor
 */
class LedgerLine extends Model
{
    protected $fillable = [
        'ledger_entry_id',
        'ledger_account_id',
        'business_id',
        'side',
        'amount_minor',
    ];

    protected function casts(): array
    {
        return [
            'side' => LedgerSide::class,
            'amount_minor' => 'integer',
        ];
    }

    /** @return BelongsTo<LedgerEntry, $this> */
    public function entry(): BelongsTo
    {
        return $this->belongsTo(LedgerEntry::class, 'ledger_entry_id');
    }

    /** @return BelongsTo<LedgerAccount, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(LedgerAccount::class, 'ledger_account_id');
    }
}
