<?php

namespace App\Services\Ledger;

use RuntimeException;

final class LedgerBalanceException extends RuntimeException
{
    public static function entryNotBalanced(): self
    {
        return new self('Ledger entry is not balanced.');
    }
}
