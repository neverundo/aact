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
        if (str_contains($response, 'OK')) {
            return DocumentScanStatus::Clean;
        }

        if (str_contains($response, 'FOUND')) {
            return DocumentScanStatus::Infected;
        }

        return DocumentScanStatus::Unavailable;
    }
}
