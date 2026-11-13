<?php

namespace App\Services\Documents;

use App\Support\Encryption\PrivateDocumentEncrypter;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Referrer private-document blobs for portal upload/download.
 *
 * - Disk: filesystem disk `private_documents` (local in tests/dev; S3 with
 *   AWS_* + PRIVATE_DOCUMENTS_PREFIX in staging/prod).
 * - Payload is application-encrypted so object storage alone cannot expose the document.
 */
final class PrivateDocumentStorage
{
    public const DISK = 'private_documents';

    public const PAYLOAD_PREFIX = 'aactdoc1:';

    public static function disk(): string
    {
        return self::DISK;
    }

    public static function putEncrypted(string $path, string $binaryContents): void
    {
        $cipher = PrivateDocumentEncrypter::encrypt($binaryContents);
        if ($cipher === '') {
            throw new RuntimeException('Failed to encrypt private document payload.');
        }

        $ok = Storage::disk(self::DISK)->put(self::normalizePath($path), self::PAYLOAD_PREFIX.$cipher, [
            'visibility' => 'private',
        ]);

        if ($ok !== true) {
            throw new RuntimeException('Failed to store private document.');
        }
    }

    public static function getDecrypted(string $path): string
    {
        $raw = Storage::disk(self::DISK)->get(self::normalizePath($path));
        if (! is_string($raw) || $raw === '') {
            throw new RuntimeException('Private document is missing.');
        }

        return self::decryptPayload($raw);
    }

    public static function exists(string $path): bool
    {
        return Storage::disk(self::DISK)->exists(self::normalizePath($path));
    }

    public static function delete(string $path): void
    {
        $normalized = self::normalizePath($path);
        if (Storage::disk(self::DISK)->exists($normalized)) {
            Storage::disk(self::DISK)->delete($normalized);
        }
    }

    public static function isReadable(string $path): bool
    {
        try {
            self::getDecrypted($path);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private static function decryptPayload(string $raw): string
    {
        if (str_starts_with($raw, self::PAYLOAD_PREFIX)) {
            $cipher = substr($raw, strlen(self::PAYLOAD_PREFIX));

            return PrivateDocumentEncrypter::decrypt($cipher);
        }

        // Legacy plaintext objects (pre-encryption) — still readable for download.
        return $raw;
    }

    private static function normalizePath(string $path): string
    {
        return ltrim(str_replace('\\', '/', $path), '/');
    }
}
