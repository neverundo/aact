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
        $status = DocumentScanStatus::Unavailable;

        try {
            $socket = @fsockopen($this->host, $this->port, $errno, $errstr, 2);
            if ($socket !== false) {
                fwrite($socket, "zINSTREAM\0");

                $handle = fopen($absolutePath, 'rb');
                if ($handle === false) {
                    fclose($socket);
                } else {
                    while (! feof($handle)) {
                        $chunk = fread($handle, 2048);
                        if ($chunk === false || $chunk === '') {
                            break;
                        }
                        fwrite($socket, pack('N', strlen($chunk)).$chunk);
                    }
                    fclose($handle);
                    fwrite($socket, pack('N', 0));

                    $response = stream_get_contents($socket) ?: '';
                    fclose($socket);

                    if (str_contains($response, 'OK')) {
                        $status = DocumentScanStatus::Clean;
                    } elseif (str_contains($response, 'FOUND')) {
                        $status = DocumentScanStatus::Infected;
                    }
                }
            }
        } catch (Throwable) {
            $status = DocumentScanStatus::Unavailable;
        }

        return [
            'status' => $status,
            'engine' => 'clamav',
        ];
    }
}
