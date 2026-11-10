<?php

namespace App\Services\Commission;

use App\Models\Business;
use App\Models\CommissionRule;
use App\Models\User;
use App\Models\Website;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class CommissionRuleService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function create(
        User $actor,
        Business $business,
        string $name,
        string $eventType,
        int $rateBps,
        int $flatMinor,
        int $priority,
        Carbon $effectiveFrom,
        ?Website $website = null,
        ?Carbon $effectiveTo = null,
        ?Request $request = null,
    ): CommissionRule {
        if ($website !== null && $website->business_id !== $business->id) {
            throw ValidationException::withMessages([
                'website_id' => ['Website does not belong to the business.'],
            ]);
        }

        if ($rateBps < 0 || $rateBps > 10_000) {
            throw ValidationException::withMessages([
                'rate_bps' => ['Rate must be between 0 and 10000 basis points.'],
            ]);
        }

        if ($flatMinor < 0) {
            throw ValidationException::withMessages([
                'flat_minor' => ['Flat amount must be non-negative.'],
            ]);
        }

        $nextVersion = (int) CommissionRule::query()
            ->where('business_id', $business->id)
            ->where('name', $name)
            ->max('version') + 1;

        $rule = CommissionRule::query()->create([
            'business_id' => $business->id,
            'website_id' => $website?->id,
            'name' => $name,
            'event_type' => $eventType,
            'rate_bps' => $rateBps,
            'flat_minor' => $flatMinor,
            'currency' => $business->currency,
            'priority' => $priority,
            'version' => max(1, $nextVersion),
            'effective_from' => $effectiveFrom,
            'effective_to' => $effectiveTo,
            'is_active' => true,
        ]);

        $this->audit->log(
            action: 'commission_rule.created',
            actor: $actor,
            businessId: $business->id,
            entityType: CommissionRule::class,
            entityId: $rule->id,
            context: [
                'name' => $name,
                'rate_bps' => $rateBps,
                'version' => $rule->version,
            ],
            request: $request,
        );

        return $rule;
    }

    public function resolve(int $businessId, int $websiteId, string $eventType, Carbon $at, string $currency): ?CommissionRule
    {
        $candidates = CommissionRule::query()
            ->where('business_id', $businessId)
            ->where('event_type', $eventType)
            ->where('currency', $currency)
            ->where('is_active', true)
            ->where('effective_from', '<=', $at)
            ->where(function ($query) use ($at): void {
                $query->whereNull('effective_to')->orWhere('effective_to', '>=', $at);
            })
            ->where(function ($query) use ($websiteId): void {
                $query->whereNull('website_id')->orWhere('website_id', $websiteId);
            })
            ->orderByDesc('priority')
            ->orderByDesc('version')
            ->orderByDesc('id')
            ->get();

        return $candidates->first(
            fn (CommissionRule $rule) => $rule->website_id === $websiteId || $rule->website_id === null
        );
    }
}
