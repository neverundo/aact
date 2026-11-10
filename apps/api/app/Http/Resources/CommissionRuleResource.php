<?php

namespace App\Http\Resources;

use App\Models\CommissionRule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CommissionRule
 */
class CommissionRuleResource extends JsonResource
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
            'name' => $this->name,
            'event_type' => $this->event_type,
            'rate_bps' => $this->rate_bps,
            'flat_minor' => $this->flat_minor,
            'currency' => $this->currency,
            'priority' => $this->priority,
            'version' => $this->version,
            'effective_from' => $this->effective_from->toIso8601String(),
            'effective_to' => $this->effective_to?->toIso8601String(),
            'is_active' => $this->is_active,
        ];
    }
}
