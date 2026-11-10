<?php

namespace App\Http\Resources;

use App\Models\IntegrationCredential;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IntegrationCredential
 */
class IntegrationCredentialResource extends JsonResource
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
            'name' => $this->name,
            'scopes' => $this->scopes,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'revoked_at' => $this->revoked_at?->toIso8601String(),
            'last_used_at' => $this->last_used_at?->toIso8601String(),
            'business' => $this->whenLoaded('business', fn () => [
                'id' => $this->business->id,
                'name' => $this->business->name,
            ]),
            'website' => $this->whenLoaded('website', fn () => [
                'id' => $this->website->id,
                'name' => $this->website->name,
            ]),
        ];
    }
}
