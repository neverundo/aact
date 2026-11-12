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

    /**
     * Proportional share in minor units using integer floor division.
     * Computes intdiv(total * part / whole); whole is treated as at least 1.
     */
    public static function proportionalMinor(int $totalMinor, int $partMinor, int $wholeMinor): int
    {
        if ($totalMinor < 0 || $partMinor < 0 || $wholeMinor < 0) {
            throw new \InvalidArgumentException('Money amounts must be non-negative.');
        }

        return intdiv($totalMinor * $partMinor, max(1, $wholeMinor));
    }
}
