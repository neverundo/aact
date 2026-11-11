<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommissionRuleResource;
use App\Models\Business;
use App\Models\CommissionRule;
use App\Models\Website;
use App\Services\Commission\CommissionRuleService;
use App\Services\Commission\CreateCommissionRuleData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class CommissionRuleController extends Controller
{
    public function __construct(private readonly CommissionRuleService $rules) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = CommissionRule::query()->with(['business', 'website'])->latest('id');

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

        return CommissionRuleResource::collection($query->paginate(25));
    }

    public function store(Request $request): CommissionRuleResource
    {
        $validated = $request->validate([
            'business_id' => ['required', 'integer', 'exists:businesses,id'],
            'website_id' => ['nullable', 'integer', 'exists:websites,id'],
            'name' => ['required', 'string', 'max:255'],
            'event_type' => ['required', 'string', 'max:64'],
            'rate_bps' => ['required', 'integer', 'min:0', 'max:10000'],
            'flat_minor' => ['sometimes', 'integer', 'min:0'],
            'priority' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after:effective_from'],
        ]);

        $business = Business::query()->findOrFail($validated['business_id']);
        $actor = $request->user();

        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($business->id)) {
            throw ValidationException::withMessages([
                'business_id' => ['You cannot manage rules for this business.'],
            ]);
        }

        $website = null;
        if (! empty($validated['website_id'])) {
            $website = Website::query()->findOrFail($validated['website_id']);
        }

        $rule = $this->rules->create(new CreateCommissionRuleData(
            actor: $actor,
            business: $business,
            name: $validated['name'],
            eventType: $validated['event_type'],
            rateBps: (int) $validated['rate_bps'],
            flatMinor: (int) ($validated['flat_minor'] ?? 0),
            priority: (int) ($validated['priority'] ?? 100),
            effectiveFrom: Carbon::parse($validated['effective_from'])->utc(),
            website: $website,
            effectiveTo: isset($validated['effective_to']) ? Carbon::parse($validated['effective_to'])->utc() : null,
            request: $request,
        ));

        return new CommissionRuleResource($rule->load(['business', 'website']));
    }

    public function deactivate(Request $request, CommissionRule $commissionRule): CommissionRuleResource
    {
        $actor = $request->user();

        if (! $actor->isPlatformAdmin() && ! $actor->isBusinessAdmin($commissionRule->business_id)) {
            abort(403);
        }

        return new CommissionRuleResource(
            $this->rules->deactivate($commissionRule, $actor, $request)
        );
    }
}
