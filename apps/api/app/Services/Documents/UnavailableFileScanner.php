<?php

namespace App\Services\Documents;

use App\Enums\DocumentScanStatus;

class UnavailableFileScanner implements FileScanner
{
    public function scan(string $absolutePath): array
    {
        return [
            'status' => DocumentScanStatus::Unavailable,
            'engine' => 'unavailable',
        ];
    }
}
