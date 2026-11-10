<?php

namespace App\Services\Ledger;

use RuntimeException;

final class LedgerAmountException extends RuntimeException
{
    public static function mustBePositive(): self
    {
        return new self('Ledger amount must be positive.');
    }
}
