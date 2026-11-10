<?php

namespace App\Services\Onboarding;

use App\Enums\MembershipStatus;
use App\Models\BusinessMembership;
use App\Models\ReferralCode;
use App\Models\Website;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ReferralCodeService
{
    public function ensureDefaultCodes(BusinessMembership $membership): void
    {
        if ($membership->status !== MembershipStatus::Approved) {
            return;
        }

        $websites = $membership->websites;
        if ($websites->isEmpty()) {
            $this->createCode($membership, null);

            return;
        }

        foreach ($websites as $website) {
            $exists = ReferralCode::query()
                ->where('business_membership_id', $membership->id)
                ->where('website_id', $website->id)
                ->exists();

            if (! $exists) {
                $this->createCode($membership, $website);
            }
        }
    }

    public function createCode(BusinessMembership $membership, ?Website $website): ReferralCode
    {
        if ($website !== null && $website->business_id !== $membership->business_id) {
            throw ValidationException::withMessages([
                'website_id' => ['Website does not belong to the membership business.'],
            ]);
        }

        $code = $this->generateUniqueCode($membership->business_id);

        return ReferralCode::query()->create([
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'user_id' => $membership->user_id,
            'website_id' => $website?->id,
            'code' => $code,
            'is_active' => true,
        ]);
    }

    public function buildLink(ReferralCode $referralCode, int $websiteId): string
    {
        if (! $referralCode->is_active) {
            throw ValidationException::withMessages([
                'code' => ['Referral code is inactive.'],
            ]);
        }

        $website = Website::query()
            ->whereKey($websiteId)
            ->where('business_id', $referralCode->business_id)
            ->where('is_active', true)
            ->first();

        if ($website === null) {
            throw ValidationException::withMessages([
                'website_id' => ['Website is not authorized for this business.'],
            ]);
        }

        $allowed = $referralCode->membership->websites()->where('websites.id', $website->id)->exists()
            || $referralCode->website_id === null
            || $referralCode->website_id === $website->id;

        if (! $allowed) {
            throw ValidationException::withMessages([
                'website_id' => ['Website is not assigned to this referrer.'],
            ]);
        }

        $base = rtrim($website->base_url, '/');

        return $base.'?ref='.urlencode($referralCode->code);
    }

    public function qrSvg(ReferralCode $referralCode, int $websiteId): string
    {
        $url = $this->buildLink($referralCode, $websiteId);
        $renderer = new ImageRenderer(new RendererStyle(240), new SvgImageBackEnd);

        return (new Writer($renderer))->writeString($url);
    }

    private function generateUniqueCode(int $businessId): string
    {
        $prefix = (string) config('aact.referral.code_prefix');
        $length = (int) config('aact.referral.code_length');

        for ($i = 0; $i < 20; $i++) {
            $code = $prefix.'-'.Str::upper(Str::random($length));
            $exists = ReferralCode::query()
                ->where('business_id', $businessId)
                ->where('code', $code)
                ->exists();

            if (! $exists) {
                return $code;
            }
        }

        throw ValidationException::withMessages([
            'code' => ['Unable to allocate a unique referral code.'],
        ]);
    }
}
