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
            $socket = @fsockopen($this->host, $this->port, $errno, $errstr, 2);
            if ($socket === false) {
                return [
                    'status' => DocumentScanStatus::Unavailable,
                    'engine' => 'clamav',
                ];
            }

            fwrite($socket, "zINSTREAM\0");

            $handle = fopen($absolutePath, 'rb');
            if ($handle === false) {
                fclose($socket);

                return [
                    'status' => DocumentScanStatus::Unavailable,
                    'engine' => 'clamav',
                ];
            }

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
                return [
                    'status' => DocumentScanStatus::Clean,
                    'engine' => 'clamav',
                ];
            }

            if (str_contains($response, 'FOUND')) {
                return [
                    'status' => DocumentScanStatus::Infected,
                    'engine' => 'clamav',
                ];
            }

            return [
                'status' => DocumentScanStatus::Unavailable,
                'engine' => 'clamav',
            ];
        } catch (Throwable) {
            return [
                'status' => DocumentScanStatus::Unavailable,
                'engine' => 'clamav',
            ];
        }
    }
}
