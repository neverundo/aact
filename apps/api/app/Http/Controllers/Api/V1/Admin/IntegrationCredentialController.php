<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\IntegrationCredentialResource;
use App\Models\Business;
use App\Models\IntegrationCredential;
use App\Models\Website;
use App\Services\Integration\IntegrationCredentialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class IntegrationCredentialController extends Controller
{
    public function __construct(private readonly IntegrationCredentialService $credentials) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = IntegrationCredential::query()->with(['business', 'website'])->latest('id');

        if (! $user->isPlatformAdmin()) {
            $query->whereIn('business_id', $user->accessibleBusinessIds());
        }

        return IntegrationCredentialResource::collection($query->paginate(25));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_id' => ['required', 'integer', 'exists:businesses,id'],
            'website_id' => ['required', 'integer', 'exists:websites,id'],
            'source' => ['required', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:255'],
            'scopes' => ['sometimes', 'array', 'min:1'],
            'scopes.*' => ['string', 'max:64'],
        ]);

        $business = Business::query()->findOrFail($validated['business_id']);
        $website = Website::query()->findOrFail($validated['website_id']);
        $actor = $request->user();

        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($business->id)) {
            throw ValidationException::withMessages([
                'business_id' => ['You cannot manage integrations for this business.'],
            ]);
        }

        $created = $this->credentials->create(
            $actor,
            $business,
            $website,
            $validated['source'],
            $validated['name'],
            $validated['scopes'] ?? ['events:write'],
            $request,
        );

        return response()->json([
            'credential' => (new IntegrationCredentialResource($created['credential']))->resolve(),
            'token' => $created['plain_token'],
            'hmac_secret' => $created['hmac_secret'],
            'note' => 'Token and HMAC secret are shown only once. Store them securely.',
        ], 201);
    }

    public function revoke(Request $request, IntegrationCredential $integrationCredential): JsonResponse
    {
        $this->assertCanManage($request, $integrationCredential);
        $this->credentials->revoke($integrationCredential, $request->user(), $request);

        return response()->json(['status' => 'revoked']);
    }

    public function rotate(Request $request, IntegrationCredential $integrationCredential): JsonResponse
    {
        $this->assertCanManage($request, $integrationCredential);
        $rotated = $this->credentials->rotate($integrationCredential, $request->user(), $request);

        return response()->json([
            'credential' => (new IntegrationCredentialResource($rotated['credential']))->resolve(),
            'token' => $rotated['plain_token'],
            'hmac_secret' => $rotated['hmac_secret'],
            'note' => 'Rotated secrets are shown only once.',
        ]);
    }

    private function assertCanManage(Request $request, IntegrationCredential $credential): void
    {
        $actor = $request->user();
        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($credential->business_id)) {
            abort(403);
        }
    }
}
