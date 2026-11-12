<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\BusinessBrandingResource;
use App\Http\Resources\WebsiteResource;
use App\Models\Business;
use App\Models\BusinessBranding;
use App\Models\Website;
use App\Services\Branding\BusinessBrandingService;
use Illuminate\Http\Request;

class BusinessBrandingController extends Controller
{
    private const HEX_COLOR_REGEX = 'regex:/^#[0-9A-Fa-f]{6}$/';

    public function __construct(private readonly BusinessBrandingService $branding) {}

    public function show(Request $request, Business $business): BusinessBrandingResource
    {
        $this->assertCanManage($request, $business);

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

    public function update(Request $request, Business $business): BusinessBrandingResource
    {
        $this->assertCanManage($request, $business);

        $validated = $request->validate([
            'display_name' => ['nullable', 'string', 'max:255'],
            'primary_color' => ['required', 'string', self::HEX_COLOR_REGEX],
            'secondary_color' => ['required', 'string', self::HEX_COLOR_REGEX],
            'accent_color' => ['required', 'string', self::HEX_COLOR_REGEX],
        ]);

        return new BusinessBrandingResource(
            $this->branding->upsert($business, $validated, $request->user(), $request)
        );
    }

    public function uploadLogo(Request $request, Business $business): BusinessBrandingResource
    {
        $this->assertCanManage($request, $business);

        $validated = $request->validate([
            'logo' => ['required', 'file', 'image', 'max:2048'],
        ]);

        return new BusinessBrandingResource(
            $this->branding->storeLogo($business, $validated['logo'], $request->user(), $request)
        );
    }

    public function fetchWebsiteAssets(Request $request, Website $website): WebsiteResource
    {
        $business = $website->business;
        $this->assertCanManage($request, $business);

        return new WebsiteResource(
            $this->branding->fetchWebsiteAssets($website)
        );
    }

    private function assertCanManage(Request $request, Business $business): void
    {
        $actor = $request->user();
        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($business->id)) {
            abort(403);
        }
    }
}
