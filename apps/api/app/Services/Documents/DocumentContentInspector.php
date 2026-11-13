<?php

namespace App\Services\Documents;

/**
 * Content-based MIME detection for private portal documents.
 *
 * Do not trust client Content-Type / extension alone — sniff magic bytes
 * (and optionally finfo) so spoofed uploads are rejected before encryption.
 */
final class DocumentContentInspector
{
    /**
     * Detect an allowed document MIME from binary content, or null if unsupported/spoofed.
     */
    public static function detectAllowedMime(string $binary): ?string
    {
        if ($binary === '') {
            return null;
        }

        $fromMagic = self::mimeFromMagicBytes($binary);
        if ($fromMagic === null) {
            return null;
        }

        if (class_exists(\finfo::class)) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $fromFinfo = $finfo->buffer($binary);
            if (is_string($fromFinfo) && $fromFinfo !== '' && $fromFinfo !== 'application/octet-stream') {
                $normalizedFinfo = self::normalizeMime($fromFinfo);
                if ($normalizedFinfo !== $fromMagic
                    && ! self::finfoAgreesWithMagic($normalizedFinfo, $fromMagic)) {
                    return null;
                }
            }
        }

        /** @var list<string> $allowed */
        $allowed = config('aact.documents.allowed_mimes', []);
        if (! in_array($fromMagic, $allowed, true)) {
            return null;
        }

        return $fromMagic;
    }

    public static function extensionForMime(string $mime): string
    {
        return match (self::normalizeMime($mime)) {
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            default => 'bin',
        };
    }

    private static function mimeFromMagicBytes(string $binary): ?string
    {
        if (str_starts_with($binary, '%PDF-')) {
            return 'application/pdf';
        }

        if (strlen($binary) >= 3
            && ord($binary[0]) === 0xFF
            && ord($binary[1]) === 0xD8
            && ord($binary[2]) === 0xFF) {
            return 'image/jpeg';
        }

        if (str_starts_with($binary, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }

        return null;
    }

    private static function normalizeMime(string $mime): string
    {
        $mime = strtolower(trim($mime));
        if ($mime === 'image/jpg') {
            return 'image/jpeg';
        }

        return $mime;
    }

    private static function finfoAgreesWithMagic(string $finfoMime, string $magicMime): bool
    {
        $finfoMime = self::normalizeMime($finfoMime);
        $magicMime = self::normalizeMime($magicMime);

        if ($finfoMime === $magicMime) {
            return true;
        }

        return $finfoMime === 'application/octet-stream';
    }
}
