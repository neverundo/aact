<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\BusinessResource;
use App\Models\Business;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BusinessController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Business::class);

        $user = $request->user();

        $query = Business::query()->with('websites')->orderBy('name');

        if (! $user->isPlatformAdmin()) {
            $query->whereIn('id', $user->accessibleBusinessIds());
        }

        return BusinessResource::collection($query->paginate(25));
    }

    public function store(Request $request): BusinessResource
    {
        $this->authorize('create', Business::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'alpha_dash', 'unique:businesses,slug'],
            'currency' => ['required', 'string', 'size:3'],
            'payout_threshold_minor' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $business = Business::query()->create([
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? Str::slug($validated['name']),
            'currency' => strtoupper($validated['currency']),
            'payout_threshold_minor' => $validated['payout_threshold_minor'] ?? 5000,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return new BusinessResource($business->load('websites'));
    }

    public function show(Business $business): BusinessResource
    {
        $this->authorize('view', $business);

        return new BusinessResource($business->load('websites'));
    }

    public function update(Request $request, Business $business): BusinessResource
    {
        $this->authorize('update', $business);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'alpha_dash', Rule::unique('businesses', 'slug')->ignore($business->id)],
            'currency' => ['sometimes', 'string', 'size:3'],
            'payout_threshold_minor' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['currency'])) {
            $validated['currency'] = strtoupper($validated['currency']);
        }

        $business->update($validated);

        return new BusinessResource($business->fresh()->load('websites'));
    }

    public function destroy(Business $business): JsonResponse
    {
        $this->authorize('delete', $business);
        $business->delete();

        return response()->json(['status' => 'deleted']);
    }
}
