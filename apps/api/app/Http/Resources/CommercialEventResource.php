<?php

namespace App\Http\Resources;

use App\Models\CommercialEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CommercialEvent
 */
class CommercialEventResource extends JsonResource
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
            'website_id' => $this->website_id,
            'source' => $this->source,
            'external_event_id' => $this->external_event_id,
            'related_external_event_id' => $this->related_external_event_id,
            'event_type' => $this->event_type,
            'occurred_at' => $this->occurred_at->toIso8601String(),
            'amount_minor' => $this->amount_minor,
            'currency' => $this->currency,
            'referral_code' => $this->referral_code,
            'status' => $this->status->value,
            'status_reason' => $this->status_reason,
            'commission' => $this->when(
                $this->relationLoaded('commission') && $this->commission !== null,
                fn () => (new CommissionResource($this->commission))->resolve()
            ),
        ];
    }
}
