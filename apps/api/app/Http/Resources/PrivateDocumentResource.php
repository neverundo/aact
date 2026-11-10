<?php

namespace App\Http\Resources;

use App\Models\PrivateDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PrivateDocument
 */
class PrivateDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'purpose' => $this->purpose,
            'original_filename' => $this->original_filename,
            'mime' => $this->mime,
            'size_bytes' => $this->size_bytes,
            'scan_status' => $this->scan_status->value,
            'scanned_at' => $this->scanned_at?->toIso8601String(),
            'usable' => $this->isUsable(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
