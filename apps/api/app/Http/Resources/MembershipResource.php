<?php

namespace App\Http\Resources;

use App\Models\BusinessMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BusinessMembership
 */
class MembershipResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'business_id' => $this->business_id,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'business' => $this->whenLoaded('business', fn () => [
                'id' => $this->business->id,
                'name' => $this->business->name,
                'slug' => $this->business->slug,
            ]),
            'role' => $this->role->value,
            'status' => $this->status->value,
            'status_reason' => $this->status_reason,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'websites' => $this->whenLoaded('websites', fn () => $this->websites->map(fn ($w) => [
                'id' => $w->id,
                'name' => $w->name,
                'base_url' => $w->base_url,
            ])->values()->all()),
            'payment_methods' => PaymentMethodVersionResource::collection($this->whenLoaded('paymentMethodVersions')),
            'referral_codes' => ReferralCodeResource::collection($this->whenLoaded('referralCodes')),
        ];
    }
}
