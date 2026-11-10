<?php

namespace App\Services\Integration;

use App\Enums\CommercialEventStatus;
use App\Enums\CommissionStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\CommercialEvent;
use App\Models\Commission;
use App\Models\CommissionRule;
use App\Models\IntegrationCredential;
use App\Models\ReferralCode;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use App\Services\Commission\CommissionRuleService;
use App\Services\Ledger\LedgerService;
use App\Support\Money;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EventIngestionService
{
    public function __construct(
        private readonly CommissionRuleService $rules,
        private readonly LedgerService $ledger,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param  array{
     *   external_event_id: string,
     *   event_type: string,
     *   occurred_at: string,
     *   amount_minor: int,
     *   currency: string,
     *   referral_code?: string|null,
     *   metadata?: array<string, mixed>|null
     * }  $payload
     * @return array{event: CommercialEvent, commission: ?Commission, replayed: bool}
     */
    public function ingest(IntegrationCredential $credential, array $payload, ?Request $request = null): array
    {
        $externalId = trim($payload['external_event_id']);
        $eventType = trim($payload['event_type']);
        $amountMinor = (int) $payload['amount_minor'];
        $currency = strtoupper(trim($payload['currency']));
        $referralCode = isset($payload['referral_code']) ? trim((string) $payload['referral_code']) : null;
        $occurredAt = Carbon::parse($payload['occurred_at'])->utc();

        $this->assertIngestPayload($externalId, $eventType, $amountMinor, $currency, $credential->business);

        $existing = $this->findExistingEvent($credential, $externalId);
        if ($existing !== null) {
            return [
                'event' => $existing,
                'commission' => $existing->commission,
                'replayed' => true,
            ];
        }

        try {
            return DB::transaction(function () use (
                $credential,
                $externalId,
                $eventType,
                $amountMinor,
                $currency,
                $referralCode,
                $occurredAt,
                $payload,
                $request,
            ) {
                $created = $this->createSaleEventOrReplay($credential, [
                    'external_id' => $externalId,
                    'event_type' => $eventType,
                    'amount_minor' => $amountMinor,
                    'currency' => $currency,
                    'referral_code' => $referralCode,
                    'occurred_at' => $occurredAt,
                    'metadata' => $payload['metadata'] ?? null,
                ]);
                if ($created['replayed']) {
                    return $created;
                }

                /** @var CommercialEvent $event */
                $event = CommercialEvent::query()->whereKey($created['event']->id)->lockForUpdate()->firstOrFail();

                if ($event->commission()->exists()) {
                    return [
                        'event' => $event->load('commission'),
                        'commission' => $event->commission,
                        'replayed' => true,
                    ];
                }

                return $this->attributeSaleEvent(
                    $credential,
                    $event,
                    [
                        'external_id' => $externalId,
                        'event_type' => $eventType,
                        'amount_minor' => $amountMinor,
                        'currency' => $currency,
                        'occurred_at' => $occurredAt,
                    ],
                    $request,
                );
            });
        } catch (QueryException $e) {
            $existing = $this->findExistingEvent($credential, $externalId);

            if ($existing !== null) {
                return [
                    'event' => $existing,
                    'commission' => $existing->commission,
                    'replayed' => true,
                ];
            }

            throw $e;
        }
    }

    private function assertIngestPayload(
        string $externalId,
        string $eventType,
        int $amountMinor,
        string $currency,
        Business $business,
    ): void {
        if ($externalId === '' || $eventType === '') {
            throw ValidationException::withMessages([
                'external_event_id' => ['external_event_id and event_type are required.'],
            ]);
        }

        if ($amountMinor <= 0) {
            throw ValidationException::withMessages([
                'amount_minor' => ['amount_minor must be a positive integer.'],
            ]);
        }

        if ($currency !== $business->currency) {
            throw ValidationException::withMessages([
                'currency' => ['Currency must match the business currency ('.$business->currency.').'],
            ]);
        }
    }

    private function findExistingEvent(IntegrationCredential $credential, string $externalId): ?CommercialEvent
    {
        return CommercialEvent::query()
            ->where('business_id', $credential->business_id)
            ->where('source', $credential->source)
            ->where('external_event_id', $externalId)
            ->with('commission')
            ->first();
    }

    /**
     * @param  array{
     *   external_id: string,
     *   event_type: string,
     *   amount_minor: int,
     *   currency: string,
     *   referral_code: ?string,
     *   occurred_at: Carbon,
     *   metadata: array<string, mixed>|null
     * }  $data
     * @return array{event: CommercialEvent, commission: ?Commission, replayed: bool}
     */
    private function createSaleEventOrReplay(IntegrationCredential $credential, array $data): array
    {
        $referralCode = $data['referral_code'];

        try {
            $event = CommercialEvent::query()->create([
                'business_id' => $credential->business_id,
                'website_id' => $credential->website_id,
                'integration_credential_id' => $credential->id,
                'source' => $credential->source,
                'external_event_id' => $data['external_id'],
                'event_type' => $data['event_type'],
                'occurred_at' => $data['occurred_at'],
                'amount_minor' => $data['amount_minor'],
                'currency' => $data['currency'],
                'referral_code' => $referralCode !== '' ? $referralCode : null,
                'payload' => $data['metadata'],
                'status' => CommercialEventStatus::Received,
            ]);
        } catch (QueryException) {
            $race = CommercialEvent::query()
                ->where('business_id', $credential->business_id)
                ->where('source', $credential->source)
                ->where('external_event_id', $data['external_id'])
                ->with('commission')
                ->firstOrFail();

            return [
                'event' => $race,
                'commission' => $race->commission,
                'replayed' => true,
            ];
        }

        return [
            'event' => $event,
            'commission' => null,
            'replayed' => false,
        ];
    }

    /**
     * @param  array{
     *   external_id: string,
     *   event_type: string,
     *   amount_minor: int,
     *   currency: string,
     *   occurred_at: Carbon
     * }  $context
     * @return array{event: CommercialEvent, commission: ?Commission, replayed: bool}
     */
    private function attributeSaleEvent(
        IntegrationCredential $credential,
        CommercialEvent $event,
        array $context,
        ?Request $request,
    ): array {
        $code = null;
        $rule = null;
        $commissionMinor = 0;
        $ignoreReason = null;

        if ($event->referral_code === null) {
            $ignoreReason = 'No referral code provided.';
        } else {
            $code = $this->resolveAttributableCode($credential, $event);
            if ($code === null) {
                return [
                    'event' => $event,
                    'commission' => null,
                    'replayed' => false,
                ];
            }

            $rule = $this->rules->resolve(
                $credential->business_id,
                $credential->website_id,
                $context['event_type'],
                $context['occurred_at'],
                $context['currency'],
            );

            if ($rule === null) {
                $ignoreReason = 'No matching commission rule.';
            } else {
                $commissionMinor = Money::commissionMinor(
                    $context['amount_minor'],
                    $rule->rate_bps,
                    $rule->flat_minor,
                );
                if ($commissionMinor <= 0) {
                    $ignoreReason = 'Computed commission is zero.';
                }
            }
        }

        if ($ignoreReason !== null) {
            return $this->ignoreEvent($event, $ignoreReason);
        }

        return $this->persistAttributedCommission(
            $credential,
            $event,
            $code,
            $rule,
            $context,
            $commissionMinor,
            $request,
        );
    }

    /**
     * @param  array{
     *   external_id: string,
     *   event_type: string,
     *   amount_minor: int,
     *   currency: string,
     *   occurred_at: Carbon
     * }  $context
     * @return array{event: CommercialEvent, commission: ?Commission, replayed: bool}
     */
    private function persistAttributedCommission(
        IntegrationCredential $credential,
        CommercialEvent $event,
        ReferralCode $code,
        CommissionRule $rule,
        array $context,
        int $commissionMinor,
        ?Request $request,
    ): array {
        try {
            $commission = Commission::query()->create([
                'business_id' => $credential->business_id,
                'commercial_event_id' => $event->id,
                'business_membership_id' => $code->business_membership_id,
                'user_id' => $code->user_id,
                'referral_code_id' => $code->id,
                'commission_rule_id' => $rule->id,
                'rule_version' => $rule->version,
                'basis_amount_minor' => $context['amount_minor'],
                'rate_bps' => $rule->rate_bps,
                'flat_minor' => $rule->flat_minor,
                'commission_minor' => $commissionMinor,
                'currency' => $context['currency'],
                'status' => CommissionStatus::Available,
            ]);
        } catch (QueryException) {
            $commission = Commission::query()
                ->where('commercial_event_id', $event->id)
                ->firstOrFail();

            return [
                'event' => $event->fresh('commission'),
                'commission' => $commission,
                'replayed' => true,
            ];
        }

        $this->ledger->postCommissionAccrual($commission);

        $event->forceFill([
            'status' => CommercialEventStatus::Attributed,
            'status_reason' => null,
        ])->save();

        $this->audit->log(
            action: 'commercial_event.attributed',
            actor: null,
            businessId: $credential->business_id,
            entity: new AuditEntity(CommercialEvent::class, $event->id),
            context: [
                'external_event_id' => $context['external_id'],
                'commission_minor' => $commissionMinor,
                'referral_code' => $code->code,
                'source' => $credential->source,
            ],
            request: $request,
        );

        return [
            'event' => $event->fresh('commission'),
            'commission' => $commission,
            'replayed' => false,
        ];
    }

    private function resolveAttributableCode(
        IntegrationCredential $credential,
        CommercialEvent $event,
    ): ?ReferralCode {
        $code = ReferralCode::query()
            ->where('business_id', $credential->business_id)
            ->where('code', $event->referral_code)
            ->where('is_active', true)
            ->with('membership')
            ->first();

        $reason = null;
        if ($code === null
            || $code->membership === null
            || $code->membership->role !== MembershipRole::Referrer
            || $code->membership->status !== MembershipStatus::Approved
        ) {
            $reason = 'Referral code not attributable.';
        } elseif ($code->website_id !== null && $code->website_id !== $credential->website_id) {
            $reason = 'Referral code not valid for this website.';
        } else {
            $membershipWebsiteIds = $code->membership->websites()->pluck('websites.id');
            if ($membershipWebsiteIds->isNotEmpty()
                && ! $membershipWebsiteIds->contains($credential->website_id)
            ) {
                $reason = 'Referrer is not assigned to this website.';
            }
        }

        if ($reason !== null) {
            $this->markIgnored($event, $reason);

            return null;
        }

        return $code;
    }

    /**
     * @return array{event: CommercialEvent, commission: ?Commission, replayed: bool}
     */
    private function ignoreEvent(CommercialEvent $event, string $reason): array
    {
        return [
            'event' => $this->markIgnored($event, $reason),
            'commission' => null,
            'replayed' => false,
        ];
    }

    private function markIgnored(CommercialEvent $event, string $reason): CommercialEvent
    {
        $event->forceFill([
            'status' => CommercialEventStatus::Ignored,
            'status_reason' => $reason,
        ])->save();

        return $event;
    }
}
