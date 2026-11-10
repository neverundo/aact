<?php

namespace App\Support;

final class Money
{
    /**
     * Calculate commission in minor units from basis points + flat fee.
     * Uses integer arithmetic: floor(amount * bps / 10000) + flat.
     */
    public static function commissionMinor(int $basisAmountMinor, int $rateBps, int $flatMinor = 0): int
    {
        if ($basisAmountMinor < 0 || $rateBps < 0 || $flatMinor < 0) {
            throw new \InvalidArgumentException('Money amounts must be non-negative.');
        }

        $variable = intdiv($basisAmountMinor * $rateBps, 10_000);

        return $variable + $flatMinor;
    }
}
