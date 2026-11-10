<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\WebsiteResource;
use App\Models\Business;
use App\Models\Website;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class WebsiteController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Website::class);

        $user = $request->user();
        $query = Website::query()->orderBy('name');

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

        return WebsiteResource::collection($query->paginate(50));
    }

    public function store(Request $request): WebsiteResource
    {
        $this->authorize('create', Website::class);

        $validated = $request->validate([
            'business_id' => ['required', 'integer', 'exists:businesses,id'],
            'name' => ['required', 'string', 'max:255'],
            'base_url' => ['required', 'url', 'max:2048'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $business = Business::query()->findOrFail($validated['business_id']);

        if (! $request->user()->isPlatformAdmin() && ! $request->user()->isBusinessAdmin($business->id)) {
            throw ValidationException::withMessages([
                'business_id' => ['You are not allowed to manage this business.'],
            ]);
        }

        $website = Website::query()->create([
            'business_id' => $business->id,
            'name' => $validated['name'],
            'base_url' => rtrim($validated['base_url'], '/'),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return new WebsiteResource($website);
    }

    public function show(Website $website): WebsiteResource
    {
        $this->authorize('view', $website);

        return new WebsiteResource($website);
    }

    public function update(Request $request, Website $website): WebsiteResource
    {
        $this->authorize('update', $website);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'base_url' => [
                'sometimes',
                'url',
                'max:2048',
                Rule::unique('websites', 'base_url')->where(fn ($q) => $q->where('business_id', $website->business_id))->ignore($website->id),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['base_url'])) {
            $validated['base_url'] = rtrim($validated['base_url'], '/');
        }

        $website->update($validated);

        return new WebsiteResource($website->fresh());
    }

    public function destroy(Website $website): JsonResponse
    {
        $this->authorize('delete', $website);
        $website->delete();

        return response()->json(['status' => 'deleted']);
    }
}
