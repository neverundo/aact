<?php

namespace App\Http\Controllers\Api\V1\Portal;

use App\Enums\MembershipRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\MembershipResource;
use App\Models\BusinessMembership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MembershipController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $memberships = BusinessMembership::query()
            ->with(['business', 'websites', 'paymentMethodVersions', 'referralCodes'])
            ->where('user_id', $request->user()->id)
            ->where('role', MembershipRole::Referrer)
            ->latest('id')
            ->get();

        return MembershipResource::collection($memberships);
    }

    public function show(Request $request, BusinessMembership $membership): MembershipResource
    {
        $this->assertOwner($request, $membership);

        return new MembershipResource(
            $membership->load(['business', 'websites', 'paymentMethodVersions', 'referralCodes'])
        );
    }

    private function assertOwner(Request $request, BusinessMembership $membership): void
    {
        if ($membership->user_id !== $request->user()->id) {
            abort(403);
        }
    }
}
