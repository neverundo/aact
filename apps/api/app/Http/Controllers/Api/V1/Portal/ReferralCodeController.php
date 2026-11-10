<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReferralCodeResource;
use App\Models\ReferralCode;
use App\Services\Onboarding\ReferralCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class ReferralCodeController extends Controller
{
    public function __construct(private readonly ReferralCodeService $referralCodes) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $codes = ReferralCode::query()
            ->where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->with('membership')
            ->get()
            ->filter(fn (ReferralCode $code) => $code->membership?->status === MembershipStatus::Approved)
            ->values();

        return ReferralCodeResource::collection($codes);
    }

    public function link(Request $request, ReferralCode $referralCode): JsonResponse
    {
        $this->assertOwner($request, $referralCode);

        $validated = $request->validate([
            'website_id' => ['required', 'integer', 'exists:websites,id'],
        ]);

        if ($referralCode->membership?->status !== MembershipStatus::Approved) {
            throw ValidationException::withMessages([
                'code' => ['Referral codes are only available for approved memberships.'],
            ]);
        }

        $url = $this->referralCodes->buildLink($referralCode, (int) $validated['website_id']);

        return response()->json([
            'url' => $url,
            'code' => $referralCode->code,
            'note' => 'Passing ?ref=CODE does not auto-attribute. The external system must send the code on conversion events.',
        ]);
    }

    public function qr(Request $request, ReferralCode $referralCode): JsonResponse
    {
        $this->assertOwner($request, $referralCode);

        $validated = $request->validate([
            'website_id' => ['required', 'integer', 'exists:websites,id'],
        ]);

        return response()->json([
            'code' => $referralCode->code,
            'url' => $this->referralCodes->buildLink($referralCode, (int) $validated['website_id']),
            'qr_svg' => $this->referralCodes->qrSvg($referralCode, (int) $validated['website_id']),
        ]);
    }

    private function assertOwner(Request $request, ReferralCode $referralCode): void
    {
        if ($referralCode->user_id !== $request->user()->id) {
            abort(403);
        }
    }
}
