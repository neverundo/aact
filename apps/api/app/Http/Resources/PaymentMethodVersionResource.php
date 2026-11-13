<?php

namespace App\Http\Resources;

use App\Enums\DocumentScanStatus;
use App\Models\PaymentMethodVersion;
use App\Models\PrivateDocument;
use App\Services\Documents\PrivateDocumentStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * @mixin PaymentMethodVersion
 */
class PaymentMethodVersionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $proofPurpose = (string) config('aact.documents.payment_proof_purpose', 'bank_proof');
        $documents = $this->bankProofDocuments($proofPurpose);

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'user_id' => $this->user_id,
            'business_id' => $this->business_id,
            'business_membership_id' => $this->business_membership_id,
            'method_type' => $this->method_type->value,
            'display_mask' => $this->display_mask,
            'status' => $this->status->value,
            'version' => $this->version,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'review_notes' => $this->review_notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'business' => $this->whenLoaded('business', fn () => [
                'id' => $this->business->id,
                'name' => $this->business->name,
            ]),
            'documents' => $documents->map(static fn (PrivateDocument $doc): array => [
                'uuid' => $doc->uuid,
                'purpose' => $doc->purpose,
                'original_filename' => $doc->original_filename,
                'mime' => $doc->mime,
                'size_bytes' => $doc->size_bytes,
                'scan_status' => $doc->scan_status->value,
                'usable' => $doc->isUsable(),
                'created_at' => $doc->created_at?->toIso8601String(),
            ])->values()->all(),
            'has_bank_proof' => $documents->isNotEmpty(),
            'bank_proof_ready' => $documents->contains(
                static fn (PrivateDocument $doc): bool => $doc->scan_status === DocumentScanStatus::Clean
                    && PrivateDocumentStorage::isReadable($doc->path)
            ),
        ];
    }

    /**
     * @return Collection<int, PrivateDocument>
     */
    private function bankProofDocuments(string $proofPurpose): Collection
    {
        if (! $this->relationLoaded('membership')) {
            return collect();
        }

        $membership = $this->membership;
        if ($membership === null || ! $membership->relationLoaded('documents')) {
            return collect();
        }

        return $membership->documents
            ->filter(static fn (PrivateDocument $doc): bool => $doc->purpose === $proofPurpose)
            ->values();
    }
}
