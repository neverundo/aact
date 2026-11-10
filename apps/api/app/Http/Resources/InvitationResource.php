<?php

namespace App\Http\Resources;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Invitation
 */
class InvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'email' => $this->email,
            'name' => $this->name,
            'phone' => $this->phone,
            'phone_verified' => false,
            'business' => [
                'id' => $this->business->id,
                'name' => $this->business->name,
                'slug' => $this->business->slug,
            ],
            'websites' => $this->websites->map(fn ($website) => [
                'id' => $website->id,
                'name' => $website->name,
                'base_url' => $website->base_url,
            ])->values()->all(),
            'expires_at' => $this->expires_at->toIso8601String(),
            'accepted' => $this->isAccepted(),
            'revoked' => $this->isRevoked(),
            'expired' => $this->isExpired(),
        ];
    }
}
