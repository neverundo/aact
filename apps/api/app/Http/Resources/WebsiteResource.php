<?php

namespace App\Http\Resources;

use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Website
 */
class WebsiteResource extends JsonResource
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
            'name' => $this->name,
            'base_url' => $this->base_url,
            'is_active' => $this->is_active,
            'favicon_url' => filled($this->favicon_path)
                ? url('/api/v1/branding/websites/'.$this->id.'/favicon')
                : null,
            'logo_url' => filled($this->logo_path)
                ? url('/api/v1/branding/websites/'.$this->id.'/logo')
                : null,
            'favicon_source_url' => $this->favicon_source_url,
            'logo_source_url' => $this->logo_source_url,
            'logo_fetched_at' => $this->logo_fetched_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
