<?php

namespace Tests\Unit\Ledger;

use App\Services\Ledger\LedgerAmountException;
use App\Services\Ledger\LedgerBalanceException;
use Tests\TestCase;

class LedgerExceptionsTest extends TestCase
{
    public function test_factory_messages(): void
    {
        $this->assertSame(
            'Ledger amount must be positive.',
            LedgerAmountException::mustBePositive()->getMessage(),
        );
        $this->assertSame(
            'Ledger entry is not balanced.',
            LedgerBalanceException::entryNotBalanced()->getMessage(),
        );
    }
}
