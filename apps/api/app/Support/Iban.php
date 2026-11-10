<?php

namespace App\Support;

use InvalidArgumentException;

final class Iban
{
    public static function normalize(string $iban): string
    {
        return strtoupper(preg_replace('/\s+/', '', $iban) ?? '');
    }

    public static function isValid(string $iban): bool
    {
        $normalized = self::normalize($iban);

        if (! preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', $normalized)) {
            return false;
        }

        $rearranged = substr($normalized, 4).substr($normalized, 0, 4);
        $numeric = '';

        foreach (str_split($rearranged) as $char) {
            $numeric .= ctype_alpha($char) ? (string) (ord($char) - 55) : $char;
        }

        return self::mod97($numeric) === 1;
    }

    public static function mask(string $iban): string
    {
        $normalized = self::normalize($iban);
        $length = strlen($normalized);

        if ($length < 8) {
            return str_repeat('*', $length);
        }

        return substr($normalized, 0, 4).str_repeat('*', max(0, $length - 8)).substr($normalized, -4);
    }

    public static function assertValid(string $iban): string
    {
        $normalized = self::normalize($iban);

        if (! self::isValid($normalized)) {
            throw new InvalidArgumentException('Invalid IBAN.');
        }

        return $normalized;
    }

    private static function mod97(string $numeric): int
    {
        $checksum = 0;
        foreach (str_split($numeric, 7) as $chunk) {
            $checksum = (int) ($checksum.$chunk) % 97;
        }

        return $checksum;
    }
}
