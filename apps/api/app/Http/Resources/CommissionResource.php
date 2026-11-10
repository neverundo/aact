<?php

namespace App\Http\Resources;

use App\Models\Commission;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Commission
 */
class CommissionResource extends JsonResource
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
            'commercial_event_id' => $this->commercial_event_id,
            'business_membership_id' => $this->business_membership_id,
            'user_id' => $this->user_id,
            'basis_amount_minor' => $this->basis_amount_minor,
            'rate_bps' => $this->rate_bps,
            'flat_minor' => $this->flat_minor,
            'commission_minor' => $this->commission_minor,
            'reversed_minor' => $this->reversed_minor,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'rule_version' => $this->rule_version,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
