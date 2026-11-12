<?php

namespace App\Services\Branding;

use App\Models\Business;
use App\Models\BusinessBranding;
use App\Models\User;
use App\Models\Website;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BusinessBrandingService
{
    private const HEX_PATTERN = '/^#[0-9A-Fa-f]{6}$/';

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array{
     *   display_name?: string|null,
     *   primary_color?: string,
     *   secondary_color?: string,
     *   accent_color?: string
     * }  $data
     */
    public function upsert(Business $business, array $data, User $actor, ?Request $request = null): BusinessBranding
    {
        foreach (['primary_color', 'secondary_color', 'accent_color'] as $colorField) {
            if (isset($data[$colorField]) && ! preg_match(self::HEX_PATTERN, $data[$colorField])) {
                throw ValidationException::withMessages([
                    $colorField => ['Color must be a #RRGGBB hex value.'],
                ]);
            }
        }

        $branding = BusinessBranding::query()->updateOrCreate(
            ['business_id' => $business->id],
            [
                'display_name' => $data['display_name'] ?? null,
                'primary_color' => strtoupper($data['primary_color'] ?? '#1C1917'),
                'secondary_color' => strtoupper($data['secondary_color'] ?? '#57534E'),
                'accent_color' => strtoupper($data['accent_color'] ?? '#0F766E'),
            ]
        );

        $this->audit->log(
            action: 'business_branding.updated',
            actor: $actor,
            businessId: $business->id,
            entity: new AuditEntity(BusinessBranding::class, $branding->id),
            context: [
                'primary_color' => $branding->primary_color,
                'accent_color' => $branding->accent_color,
            ],
            request: $request,
        );

        return $branding;
    }

    public function storeLogo(
        Business $business,
        UploadedFile $file,
        User $actor,
        ?Request $request = null,
    ): BusinessBranding {
        $branding = BusinessBranding::query()->firstOrCreate(
            ['business_id' => $business->id],
            [
                'primary_color' => '#1C1917',
                'secondary_color' => '#57534E',
                'accent_color' => '#0F766E',
            ]
        );

        if ($branding->hasLogo()) {
            Storage::disk($branding->logo_disk)->delete($branding->logo_path);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: 'png');
        $path = sprintf('businesses/%d/logo-%s.%s', $business->id, Str::uuid(), $extension);
        Storage::disk('branding_assets')->putFileAs(
            dirname($path),
            $file,
            basename($path),
        );

        $branding->update([
            'logo_path' => $path,
            'logo_disk' => 'branding_assets',
            'logo_mime' => $file->getMimeType() ?: 'image/png',
        ]);

        $this->audit->log(
            action: 'business_branding.logo_uploaded',
            actor: $actor,
            businessId: $business->id,
            entity: new AuditEntity(BusinessBranding::class, $branding->id),
            context: ['path' => $path],
            request: $request,
        );

        return $branding->fresh() ?? $branding;
    }

    public function fetchWebsiteAssets(Website $website): Website
    {
        $base = rtrim($website->base_url, '/');
        $html = null;
        $faviconUrl = $base.'/favicon.ico';
        $logoUrl = null;

        try {
            $response = Http::timeout(8)->withHeaders([
                'User-Agent' => 'AACT-BrandFetcher/1.0',
                'Accept' => 'text/html,application/xhtml+xml',
            ])->get($base);

            if ($response->successful()) {
                $html = $response->body();
            }
        } catch (\Throwable) {
            // Soft failure: fall back to /favicon.ico
        }

        if (is_string($html) && $html !== '') {
            if (preg_match('/<link[^>]+rel=["\'](?:shortcut )?icon["\'][^>]+href=["\']([^"\']+)["\']/i', $html, $m)
                || preg_match('/<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\'](?:shortcut )?icon["\']/i', $html, $m)) {
                $faviconUrl = $this->absolutize($base, $m[1]);
            }

            if (preg_match('/<link[^>]+rel=["\']apple-touch-icon["\'][^>]+href=["\']([^"\']+)["\']/i', $html, $m)
                || preg_match('/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $m)) {
                $logoUrl = $this->absolutize($base, $m[1]);
            }
        }

        $disk = 'branding_assets';
        $faviconPath = $this->downloadAsset($faviconUrl, sprintf('websites/%d/favicon', $website->id));
        $logoPath = $logoUrl
            ? $this->downloadAsset($logoUrl, sprintf('websites/%d/logo', $website->id))
            : $faviconPath;

        $website->update([
            'brand_disk' => $disk,
            'favicon_path' => $faviconPath,
            'logo_path' => $logoPath,
            'favicon_source_url' => $faviconUrl,
            'logo_source_url' => $logoUrl,
            'logo_fetched_at' => now(),
        ]);

        return $website->fresh() ?? $website;
    }

    private function absolutize(string $base, string $href): string
    {
        if (str_starts_with($href, 'http://') || str_starts_with($href, 'https://')) {
            return $href;
        }

        if (str_starts_with($href, '//')) {
            return 'https:'.$href;
        }

        $absolute = rtrim($base, '/').'/'.ltrim($href, '/');
        if (str_starts_with($href, '/')) {
            $parts = parse_url($base);
            $absolute = ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '').$href;
        }

        return $absolute;
    }

    private function downloadAsset(?string $url, string $prefix): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        $path = null;
        try {
            $response = Http::timeout(8)->withHeaders([
                'User-Agent' => 'AACT-BrandFetcher/1.0',
                'Accept' => 'image/*,*/*',
            ])->get($url);

            $mime = (string) ($response->header('Content-Type') ?? 'image/png');
            if ($response->successful() && str_starts_with($mime, 'image/')) {
                $extension = match (true) {
                    str_contains($mime, 'svg') => 'svg',
                    str_contains($mime, 'jpeg'), str_contains($mime, 'jpg') => 'jpg',
                    str_contains($mime, 'webp') => 'webp',
                    str_contains($mime, 'gif') => 'gif',
                    str_contains($mime, 'x-icon'), str_contains($mime, 'vnd.microsoft.icon') => 'ico',
                    default => 'png',
                };

                $path = $prefix.'-'.Str::uuid().'.'.$extension;
                Storage::disk('branding_assets')->put($path, $response->body());
            }
        } catch (\Throwable) {
            $path = null;
        }

        return $path;
    }
}
