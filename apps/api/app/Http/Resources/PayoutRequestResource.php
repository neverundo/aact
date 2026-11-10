<?php

namespace App\Http\Resources;

use App\Models\PayoutRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PayoutRequest
 */
class PayoutRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'business_id' => $this->business_id,
            'business_membership_id' => $this->business_membership_id,
            'user_id' => $this->user_id,
            'amount_minor' => $this->amount_minor,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'status_reason' => $this->status_reason,
            'external_reference' => $this->external_reference,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'payment_method' => $this->whenLoaded('paymentMethodVersion', fn () => [
                'id' => $this->paymentMethodVersion->id,
                'method_type' => $this->paymentMethodVersion->method_type->value,
                'display_mask' => $this->paymentMethodVersion->display_mask,
            ]),
            'documents' => $this->whenLoaded('documents', fn () => $this->documents->map(fn ($doc) => [
                'uuid' => $doc->uuid,
                'original_filename' => $doc->original_filename,
                'scan_status' => $doc->scan_status->value,
            ])->values()->all()),
            'business' => $this->whenLoaded('business', fn () => [
                'id' => $this->business->id,
                'name' => $this->business->name,
                'payout_threshold_minor' => $this->business->payout_threshold_minor,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
