<?php

namespace App\Support\Encryption;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Encrypt/decrypt private document binaries with a dedicated key.
 *
 * Key format (same as Laravel APP_KEY for AES-256-CBC):
 *   AACT_PRIVATE_DOCUMENT_ENCRYPTION_KEY=base64:$(openssl rand -base64 32)
 * Decoded key material must be exactly 32 bytes (AES-256) or 16 bytes (AES-128).
 *
 * Writes never fall back to APP_KEY so document blobs stay keyed explicitly.
 */
final class PrivateDocumentEncrypter
{
    public static function encrypter(): Encrypter
    {
        $cipher = (string) config('app.cipher', 'AES-256-CBC');
        $normalized = self::normalizeKey(config('aact.documents.encryption_key'), $cipher);
        if ($normalized === null) {
            throw new RuntimeException(
                'AACT_PRIVATE_DOCUMENT_ENCRYPTION_KEY is required for private document encryption. '.
                'Set AACT_PRIVATE_DOCUMENT_ENCRYPTION_KEY=base64:$(openssl rand -base64 32) '.
                '(32 decoded bytes for AES-256-CBC).'
            );
        }

        return new Encrypter($normalized, $cipher);
    }

    public static function encrypt(string $value): string
    {
        return self::encrypter()->encryptString($value);
    }

    public static function decrypt(string $payload): string
    {
        try {
            $plain = self::encrypter()->decryptString($payload);
        } catch (DecryptException $e) {
            throw new RuntimeException('Private document could not be decrypted.', 0, $e);
        }

        if ($plain === '') {
            throw new RuntimeException('Private document decrypt returned empty payload.');
        }

        return $plain;
    }

    /**
     * Normalize a Laravel-style key to raw binary key material accepted by Encrypter.
     */
    public static function normalizeKey(mixed $raw, ?string $cipher = null): ?string
    {
        if (! is_string($raw) || $raw === '') {
            return null;
        }

        $cipher ??= (string) config('app.cipher', 'AES-256-CBC');
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return null;
        }

        $candidate = self::decodeKeyMaterial($trimmed);
        if ($candidate === null) {
            return null;
        }

        if (! Encrypter::supported($candidate, $cipher)) {
            return null;
        }

        return $candidate;
    }

    private static function decodeKeyMaterial(string $trimmed): ?string
    {
        if (Str::startsWith($trimmed, 'base64:')) {
            $payload = preg_replace('/\s+/', '', substr($trimmed, 7)) ?? '';
            if ($payload === '') {
                return null;
            }

            $decoded = base64_decode($payload, true);
            if (! is_string($decoded) || $decoded === '') {
                return null;
            }

            return $decoded;
        }

        $byteLen = strlen($trimmed);
        if ($byteLen === 16 || $byteLen === 32) {
            return $trimmed;
        }

        $compact = preg_replace('/\s+/', '', $trimmed) ?? '';
        if ($compact !== '' && preg_match('/^[A-Za-z0-9+\/]+=*$/', $compact) === 1) {
            $decoded = base64_decode($compact, true);
            if (is_string($decoded) && (strlen($decoded) === 16 || strlen($decoded) === 32)) {
                return $decoded;
            }
        }

        return null;
    }
}
