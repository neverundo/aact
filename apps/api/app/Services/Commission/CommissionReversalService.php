<?php

namespace App\Services\Commission;

use App\Enums\CommercialEventStatus;
use App\Enums\CommissionStatus;
use App\Models\Business;
use App\Models\CommercialEvent;
use App\Models\Commission;
use App\Models\IntegrationCredential;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use App\Services\Ledger\LedgerService;
use App\Support\Money;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CommissionReversalService
{
    public function __construct(
        private readonly LedgerService $ledger,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param  array{
     *   external_event_id: string,
     *   event_type: string,
     *   related_external_event_id: string,
     *   occurred_at: string,
     *   amount_minor: int,
     *   currency: string,
     *   metadata?: array<string, mixed>|null
     * }  $payload
     * @return array{event: CommercialEvent, commission: ?Commission, reversed_minor: int, replayed: bool}
     */
    public function reverse(
        IntegrationCredential $credential,
        array $payload,
        ?Request $request = null,
    ): array {
        $externalId = trim($payload['external_event_id']);
        $relatedId = trim($payload['related_external_event_id']);
        $eventType = trim($payload['event_type']);
        $amountMinor = (int) $payload['amount_minor'];
        $currency = strtoupper(trim($payload['currency']));
        $occurredAt = Carbon::parse($payload['occurred_at'])->utc();

        $this->assertReversalPayload($eventType, $relatedId, $amountMinor, $currency, $credential->business);

        $existing = $this->findExistingEvent($credential, $externalId);
        if ($existing !== null) {
            $originalCommission = Commission::query()
                ->where('business_id', $credential->business_id)
                ->whereHas('event', fn ($q) => $q->where('external_event_id', $relatedId))
                ->first();

            return [
                'event' => $existing,
                'commission' => $originalCommission,
                'reversed_minor' => 0,
                'replayed' => true,
            ];
        }

        try {
            return DB::transaction(function () use (
                $credential,
                $externalId,
                $relatedId,
                $eventType,
                $amountMinor,
                $currency,
                $occurredAt,
                $payload,
                $request,
            ) {
                $created = $this->createReversalEventOrReplay($credential, [
                    'external_id' => $externalId,
                    'related_id' => $relatedId,
                    'event_type' => $eventType,
                    'amount_minor' => $amountMinor,
                    'currency' => $currency,
                    'occurred_at' => $occurredAt,
                    'metadata' => $payload['metadata'] ?? null,
                ]);
                if ($created['replayed']) {
                    return $created;
                }

                /** @var CommercialEvent $event */
                $event = $created['event'];

                return $this->applyReversal($credential, $event, [
                    'related_id' => $relatedId,
                    'event_type' => $eventType,
                    'amount_minor' => $amountMinor,
                    'external_id' => $externalId,
                ], $request);
            });
        } catch (QueryException $e) {
            $existing = $this->findExistingEvent($credential, $externalId);

            if ($existing !== null) {
                return [
                    'event' => $existing,
                    'commission' => null,
                    'reversed_minor' => 0,
                    'replayed' => true,
                ];
            }

            throw $e;
        }
    }

    private function assertReversalPayload(
        string $eventType,
        string $relatedId,
        int $amountMinor,
        string $currency,
        Business $business,
    ): void {
        if (! in_array($eventType, ['refund', 'chargeback'], true)) {
            throw ValidationException::withMessages([
                'event_type' => ['Reversal events must be refund or chargeback.'],
            ]);
        }

        if ($relatedId === '') {
            throw ValidationException::withMessages([
                'related_external_event_id' => ['related_external_event_id is required.'],
            ]);
        }

        if ($amountMinor <= 0) {
            throw ValidationException::withMessages([
                'amount_minor' => ['amount_minor must be positive.'],
            ]);
        }

        if ($currency !== $business->currency) {
            throw ValidationException::withMessages([
                'currency' => ['Currency must match the business currency.'],
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
     *   related_id: string,
     *   event_type: string,
     *   amount_minor: int,
     *   currency: string,
     *   occurred_at: Carbon,
     *   metadata: array<string, mixed>|null
     * }  $data
     * @return array{event: CommercialEvent, commission: ?Commission, reversed_minor: int, replayed: bool}
     */
    private function createReversalEventOrReplay(IntegrationCredential $credential, array $data): array
    {
        try {
            $event = CommercialEvent::query()->create([
                'business_id' => $credential->business_id,
                'website_id' => $credential->website_id,
                'integration_credential_id' => $credential->id,
                'source' => $credential->source,
                'external_event_id' => $data['external_id'],
                'related_external_event_id' => $data['related_id'],
                'event_type' => $data['event_type'],
                'occurred_at' => $data['occurred_at'],
                'amount_minor' => $data['amount_minor'],
                'currency' => $data['currency'],
                'referral_code' => null,
                'payload' => $data['metadata'],
                'status' => CommercialEventStatus::Received,
            ]);
        } catch (QueryException) {
            $race = CommercialEvent::query()
                ->where('business_id', $credential->business_id)
                ->where('source', $credential->source)
                ->where('external_event_id', $data['external_id'])
                ->firstOrFail();

            return [
                'event' => $race,
                'commission' => null,
                'reversed_minor' => 0,
                'replayed' => true,
            ];
        }

        return [
            'event' => $event,
            'commission' => null,
            'reversed_minor' => 0,
            'replayed' => false,
        ];
    }

    /**
     * @param  array{
     *   related_id: string,
     *   event_type: string,
     *   amount_minor: int,
     *   external_id: string
     * }  $context
     * @return array{event: CommercialEvent, commission: ?Commission, reversed_minor: int, replayed: bool}
     */
    private function applyReversal(
        IntegrationCredential $credential,
        CommercialEvent $event,
        array $context,
        ?Request $request,
    ): array {
        $originalEvent = CommercialEvent::query()
            ->where('business_id', $credential->business_id)
            ->where('source', $credential->source)
            ->where('external_event_id', $context['related_id'])
            ->lockForUpdate()
            ->first();

        $commission = null;
        $ignoreReason = null;
        if ($originalEvent === null) {
            $ignoreReason = 'Original commercial event not found.';
        } else {
            $commission = Commission::query()
                ->where('commercial_event_id', $originalEvent->id)
                ->lockForUpdate()
                ->first();

            if ($commission === null || $commission->reversibleMinor() <= 0) {
                $ignoreReason = 'No reversible commission remains.';
            }
        }

        if ($ignoreReason !== null) {
            return $this->ignoreReversal($event, $ignoreReason, $commission);
        }

        $proportional = Money::proportionalMinor(
            $commission->commission_minor,
            $context['amount_minor'],
            $originalEvent->amount_minor,
        );
        $toReverse = min($proportional, $commission->reversibleMinor());

        $membership = $commission->membership()->lockForUpdate()->firstOrFail();
        // Cap against available (payable minus open payout reservations) so soft-locked
        // payout amounts are not clawed back out from under an in-flight settlement.
        $available = $this->ledger->availableBalanceMinor($membership);
        $toReverse = min($toReverse, max(0, $available));

        if ($toReverse <= 0) {
            return $this->ignoreReversal($event, 'Available balance insufficient for reversal.', $commission);
        }

        $this->ledger->postCommissionReversal($commission, $toReverse, $event->id);

        $commission->reversed_minor += $toReverse;
        $commission->status = $commission->reversed_minor >= $commission->commission_minor
            ? CommissionStatus::Reversed
            : CommissionStatus::Available;
        $commission->save();

        $event->forceFill([
            'status' => CommercialEventStatus::Attributed,
            'status_reason' => null,
        ])->save();

        $this->audit->log(
            action: 'commission.reversed',
            actor: null,
            businessId: $credential->business_id,
            entity: new AuditEntity(Commission::class, $commission->id),
            context: [
                'event_type' => $context['event_type'],
                'reversed_minor' => $toReverse,
                'related_external_event_id' => $context['related_id'],
                'external_event_id' => $context['external_id'],
            ],
            request: $request,
        );

        return [
            'event' => $event->fresh(),
            'commission' => $commission->fresh(),
            'reversed_minor' => $toReverse,
            'replayed' => false,
        ];
    }

    /**
     * @return array{event: CommercialEvent, commission: ?Commission, reversed_minor: int, replayed: bool}
     */
    private function ignoreReversal(
        CommercialEvent $event,
        string $reason,
        ?Commission $commission = null,
    ): array {
        $event->forceFill([
            'status' => CommercialEventStatus::Ignored,
            'status_reason' => $reason,
        ])->save();

        return [
            'event' => $event,
            'commission' => $commission,
            'reversed_minor' => 0,
            'replayed' => false,
        ];
    }
}
