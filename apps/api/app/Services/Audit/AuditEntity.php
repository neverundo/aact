<?php

namespace App\Services\Audit;

final readonly class AuditEntity
{
    public function __construct(
        public string $type,
        public int $id,
    ) {}
}
