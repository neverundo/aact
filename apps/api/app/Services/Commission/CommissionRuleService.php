<?php

namespace App\Services\Commission;

use App\Models\CommissionRule;
use App\Models\User;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class CommissionRuleService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function create(CreateCommissionRuleData $data): CommissionRule
    {
        if ($data->website !== null && $data->website->business_id !== $data->business->id) {
            throw ValidationException::withMessages([
                'website_id' => ['Website does not belong to the business.'],
            ]);
        }

        if ($data->rateBps < 0 || $data->rateBps > 10_000) {
            throw ValidationException::withMessages([
                'rate_bps' => ['Rate must be between 0 and 10000 basis points.'],
            ]);
        }

        if ($data->flatMinor < 0) {
            throw ValidationException::withMessages([
                'flat_minor' => ['Flat amount must be non-negative.'],
            ]);
        }

        $nextVersion = (int) CommissionRule::query()
            ->where('business_id', $data->business->id)
            ->where('name', $data->name)
            ->max('version') + 1;

        $rule = CommissionRule::query()->create([
            'business_id' => $data->business->id,
            'website_id' => $data->website?->id,
            'name' => $data->name,
            'event_type' => $data->eventType,
            'rate_bps' => $data->rateBps,
            'flat_minor' => $data->flatMinor,
            'currency' => $data->business->currency,
            'priority' => $data->priority,
            'version' => max(1, $nextVersion),
            'effective_from' => $data->effectiveFrom,
            'effective_to' => $data->effectiveTo,
            'is_active' => true,
        ]);

        $this->audit->log(
            action: 'commission_rule.created',
            actor: $data->actor,
            businessId: $data->business->id,
            entity: new AuditEntity(CommissionRule::class, $rule->id),
            context: [
                'name' => $data->name,
                'rate_bps' => $data->rateBps,
                'version' => $rule->version,
            ],
            request: $data->request,
        );

        return $rule;
    }

    public function deactivate(CommissionRule $rule, User $actor, ?Request $request = null): CommissionRule
    {
        $rule->update(['is_active' => false]);

        $this->audit->log(
            action: 'commission_rule.deactivated',
            actor: $actor,
            businessId: $rule->business_id,
            entity: new AuditEntity(CommissionRule::class, $rule->id),
            context: [
                'name' => $rule->name,
                'version' => $rule->version,
            ],
            request: $request,
        );

        return $rule->fresh(['business', 'website']) ?? $rule;
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
