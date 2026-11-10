<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\MembershipRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\MembershipResource;
use App\Models\BusinessMembership;
use App\Services\Onboarding\MembershipReviewService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MembershipController extends Controller
{
    public function __construct(private readonly MembershipReviewService $reviews) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = BusinessMembership::query()
            ->with(['business', 'websites', 'paymentMethodVersions', 'referralCodes', 'user'])
            ->where('role', MembershipRole::Referrer)
            ->latest('id');

        if (! $user->isPlatformAdmin()) {
            $query->whereIn('business_id', $user->accessibleBusinessIds());
        }

        if ($request->filled('business_id')) {
            $businessId = (int) $request->integer('business_id');
            if (! $user->belongsToBusiness($businessId)) {
                abort(403);
            }
            $query->where('business_id', $businessId);
        }

        return MembershipResource::collection($query->paginate(25));
    }

    public function approve(Request $request, BusinessMembership $membership): MembershipResource
    {
        $this->assertCanManage($request, $membership);

        return new MembershipResource(
            $this->reviews->approve($request->user(), $membership, $request)
        );
    }

    public function reject(Request $request, BusinessMembership $membership): MembershipResource
    {
        $this->assertCanManage($request, $membership);
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return new MembershipResource(
            $this->reviews->reject($request->user(), $membership, $validated['reason'], $request)
        );
    }

    public function suspend(Request $request, BusinessMembership $membership): MembershipResource
    {
        $this->assertCanManage($request, $membership);
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return new MembershipResource(
            $this->reviews->suspend($request->user(), $membership, $validated['reason'], $request)
        );
    }

    private function assertCanManage(Request $request, BusinessMembership $membership): void
    {
        $actor = $request->user();
        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($membership->business_id)) {
            abort(403);
        }
    }
}
