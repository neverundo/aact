<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\BusinessBrandingResource;
use App\Models\Business;
use App\Models\BusinessBranding;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BrandingController extends Controller
{
    public function show(Request $request): BusinessBrandingResource
    {
        $validated = $request->validate([
            'business_id' => ['required', 'integer', 'exists:businesses,id'],
        ]);

        $businessId = (int) $validated['business_id'];
        $actor = $request->user();

        if (! $actor->isPlatformAdmin() && ! $actor->belongsToBusiness($businessId)) {
            throw ValidationException::withMessages([
                'business_id' => ['You do not have access to this business.'],
            ]);
        }

        $branding = BusinessBranding::query()->firstOrCreate(
            ['business_id' => $businessId],
            [
                'primary_color' => '#1C1917',
                'secondary_color' => '#57534E',
                'accent_color' => '#0F766E',
            ]
        );

        return new BusinessBrandingResource($branding);
    }

    public function forBusiness(Business $business): BusinessBrandingResource
    {
        $branding = BusinessBranding::query()->firstOrCreate(
            ['business_id' => $business->id],
            [
                'primary_color' => '#1C1917',
                'secondary_color' => '#57534E',
                'accent_color' => '#0F766E',
            ]
        );

        return new BusinessBrandingResource($branding);
    }
}
