<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Website;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BrandingAssetController extends Controller
{
    public function businessLogo(Business $business): StreamedResponse
    {
        $branding = $business->branding;
        if ($branding === null || ! $branding->hasLogo()) {
            abort(404);
        }

        return $this->stream(
            $branding->logo_disk,
            $branding->logo_path,
            $branding->logo_mime ?: 'image/png',
        );
    }

    public function websiteAsset(Website $website, string $asset): StreamedResponse
    {
        if (! in_array($asset, ['logo', 'favicon'], true)) {
            abort(404);
        }

        $path = $asset === 'logo' ? $website->logo_path : $website->favicon_path;
        $disk = $website->brand_disk;

        if (! filled($path) || ! filled($disk)) {
            abort(404);
        }

        $mime = match (true) {
            str_ends_with($path, '.svg') => 'image/svg+xml',
            str_ends_with($path, '.jpg'), str_ends_with($path, '.jpeg') => 'image/jpeg',
            str_ends_with($path, '.webp') => 'image/webp',
            str_ends_with($path, '.gif') => 'image/gif',
            str_ends_with($path, '.ico') => 'image/x-icon',
            default => 'image/png',
        };

        return $this->stream($disk, $path, $mime);
    }

    private function stream(string $disk, string $path, string $mime): StreamedResponse
    {
        if (! Storage::disk($disk)->exists($path)) {
            abort(404);
        }

        return response()->streamDownload(
            function () use ($disk, $path): void {
                echo Storage::disk($disk)->get($path);
            },
            basename($path),
            [
                'Content-Type' => $mime,
                'Cache-Control' => 'public, max-age=86400',
            ],
            'inline',
        );
    }
}
