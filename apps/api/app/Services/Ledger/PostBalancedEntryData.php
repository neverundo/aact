<?php

namespace App\Services\Ledger;

use App\Models\LedgerAccount;

final readonly class PostBalancedEntryData
{
    public function __construct(
        public int $businessId,
        public string $idempotencyKey,
        public string $entryType,
        public string $description,
        public int $amountMinor,
        public LedgerAccount $debitAccount,
        public LedgerAccount $creditAccount,
        public ?int $commercialEventId,
        public ?int $commissionId,
    ) {}
}
