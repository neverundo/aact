<?php

namespace App\Services\Documents;

use App\Enums\DocumentScanStatus;

/**
 * Test-only scanner. Must never be bound in production.
 */
class FakeFileScanner implements FileScanner
{
    public function __construct(
        private DocumentScanStatus $status = DocumentScanStatus::Clean,
    ) {}

    public function scan(string $absolutePath): array
    {
        return [
            'status' => $this->status,
            'engine' => 'fake',
        ];
    }
}
