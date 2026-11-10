<?php

namespace App\Services\Documents;

use App\Enums\DocumentScanStatus;
use Throwable;

class ClamAvFileScanner implements FileScanner
{
    public function __construct(
        private readonly string $host,
        private readonly int $port,
    ) {}

    public function scan(string $absolutePath): array
    {
        try {
            $status = $this->scanPath($absolutePath);
        } catch (Throwable) {
            $status = DocumentScanStatus::Unavailable;
        }

        return [
            'status' => $status,
            'engine' => 'clamav',
        ];
    }

    private function scanPath(string $absolutePath): DocumentScanStatus
    {
        $socket = @fsockopen($this->host, $this->port, $errno, $errstr, 2);
        if ($socket === false) {
            return DocumentScanStatus::Unavailable;
        }

        fwrite($socket, "zINSTREAM\0");

        $handle = fopen($absolutePath, 'rb');
        if ($handle === false) {
            fclose($socket);

            return DocumentScanStatus::Unavailable;
        }

        $this->streamFileToSocket($handle, $socket);
        fclose($handle);
        fwrite($socket, pack('N', 0));

        $response = stream_get_contents($socket) ?: '';
        fclose($socket);

        return $this->statusFromResponse($response);
    }

    /**
     * @param  resource  $handle
     * @param  resource  $socket
     */
    private function streamFileToSocket($handle, $socket): void
    {
        while (! feof($handle)) {
            $chunk = fread($handle, 2048);
            if ($chunk === false || $chunk === '') {
                break;
            }
            fwrite($socket, pack('N', strlen($chunk)).$chunk);
        }
    }

    private function statusFromResponse(string $response): DocumentScanStatus
    {
        // FOUND before OK: signature names may contain "OK" (e.g. "….OK FOUND").
        if (str_contains($response, 'FOUND')) {
            return DocumentScanStatus::Infected;
        }

        // ClamAV clean reply is "stream: OK", not an arbitrary "OK" substring.
        if (preg_match('/:\s*OK\b/', $response) === 1) {
            return DocumentScanStatus::Clean;
        }

        return DocumentScanStatus::Unavailable;
    }
}
