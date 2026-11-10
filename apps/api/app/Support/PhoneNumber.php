<?php

namespace App\Support;

use InvalidArgumentException;

final class PhoneNumber
{
    /**
     * Normalize to E.164-like digits with leading +.
     * MVP: Portuguese-focused formats accepted (+351XXXXXXXXX or 9XXXXXXXX).
     */
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '351') && strlen($digits) === 12) {
            return '+'.$digits;
        }

        if (strlen($digits) === 9 && str_starts_with($digits, '9')) {
            return '+351'.$digits;
        }

        if (str_starts_with($phone, '+') && strlen($digits) >= 10 && strlen($digits) <= 15) {
            return '+'.$digits;
        }

        throw new InvalidArgumentException('Invalid phone number format.');
    }

    public static function mask(string $phone): string
    {
        $normalized = self::normalize($phone);
        $visible = substr($normalized, -3);

        return str_repeat('*', max(0, strlen($normalized) - 3)).$visible;
    }
}
