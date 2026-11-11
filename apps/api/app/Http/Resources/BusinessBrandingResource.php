<?php

namespace App\Http\Resources;

use App\Models\BusinessBranding;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BusinessBranding
 */
class BusinessBrandingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'business_id' => $this->business_id,
            'display_name' => $this->display_name,
            'primary_color' => $this->primary_color,
            'secondary_color' => $this->secondary_color,
            'accent_color' => $this->accent_color,
            'has_logo' => $this->hasLogo(),
            'logo_url' => $this->hasLogo()
                ? url('/api/v1/branding/businesses/'.$this->business_id.'/logo')
                : null,
        ];
    }
}
