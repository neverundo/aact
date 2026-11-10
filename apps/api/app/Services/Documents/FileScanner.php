<?php

namespace App\Services\Documents;

use App\Enums\DocumentScanStatus;

interface FileScanner
{
    /**
     * @return array{status: DocumentScanStatus, engine: string}
     */
    public function scan(string $absolutePath): array;
}
