<?php

namespace App\Http\Resources;

use App\Models\PaymentMethodVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
        ];
    }
}
