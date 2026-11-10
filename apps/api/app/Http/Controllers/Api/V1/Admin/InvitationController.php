<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvitationResource;
use App\Models\Business;
use App\Models\Invitation;
use App\Services\Onboarding\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class InvitationController extends Controller
{
    public function __construct(private readonly InvitationService $invitations) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = Invitation::query()->with(['business', 'websites'])->latest('id');

        if (! $user->isPlatformAdmin()) {
            $query->whereIn('business_id', $user->accessibleBusinessIds());
        }

        if ($request->filled('business_id')) {
            $businessId = (int) $request->integer('business_id');
            if (! $user->belongsToBusiness($businessId) || (! $user->isPlatformAdmin() && ! $user->isBusinessAdmin($businessId))) {
                abort(403);
            }
            $query->where('business_id', $businessId);
        }

        return InvitationResource::collection($query->paginate(25));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_id' => ['required', 'integer', 'exists:businesses,id'],
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'website_ids' => ['required', 'array', 'min:1'],
            'website_ids.*' => ['integer', 'exists:websites,id'],
        ]);

        $business = Business::query()->findOrFail($validated['business_id']);
        $actor = $request->user();

        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($business->id)) {
            throw ValidationException::withMessages([
                'business_id' => ['You cannot invite referrers for this business.'],
            ]);
        }

        $created = $this->invitations->create(
            $actor,
            $business,
            $validated['email'],
            $validated['website_ids'],
            $validated['name'] ?? null,
            $validated['phone'] ?? null,
            $request,
        );

        return response()->json([
            'invitation' => (new InvitationResource($created['invitation']))->resolve(),
            // Plain token returned only at creation for local/dev operator convenience.
            // Email remains the primary delivery channel.
            'token' => $created['plain_token'],
        ], 201);
    }

    public function revoke(Request $request, Invitation $invitation): JsonResponse
    {
        $this->assertCanManage($request, $invitation);
        $this->invitations->revoke($invitation, $request->user(), $request);

        return response()->json(['status' => 'revoked']);
    }

    public function resend(Request $request, Invitation $invitation): JsonResponse
    {
        $this->assertCanManage($request, $invitation);
        $resent = $this->invitations->resend($invitation, $request->user(), $request);

        return response()->json([
            'invitation' => (new InvitationResource($resent['invitation']))->resolve(),
            'token' => $resent['plain_token'],
        ]);
    }

    private function assertCanManage(Request $request, Invitation $invitation): void
    {
        $actor = $request->user();
        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($invitation->business_id)) {
            abort(403);
        }
    }
}
