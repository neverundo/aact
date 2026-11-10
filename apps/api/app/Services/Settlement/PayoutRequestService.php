<?php

namespace App\Services\Settlement;

use App\Enums\DocumentScanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PaymentMethodStatus;
use App\Enums\PayoutRequestStatus;
use App\Models\BusinessMembership;
use App\Models\PaymentMethodVersion;
use App\Models\PayoutRequest;
use App\Models\PrivateDocument;
use App\Models\User;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use App\Services\Ledger\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayoutRequestService
{
    public function __construct(
        private readonly LedgerService $ledger,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param  list<string>  $documentUuids
     */
    public function request(
        User $user,
        BusinessMembership $membership,
        array $documentUuids,
        ?int $amountMinor,
        ?Request $request = null,
    ): PayoutRequest {
        if ($membership->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'membership' => ['Membership does not belong to the authenticated user.'],
            ]);
        }

        if ($membership->role !== MembershipRole::Referrer || $membership->status !== MembershipStatus::Approved) {
            throw ValidationException::withMessages([
                'membership' => ['Only approved referrer memberships can request payouts.'],
            ]);
        }

        $membership->loadMissing('business');
        $threshold = (int) ($membership->business->payout_threshold_minor ?? 5000);

        return DB::transaction(function () use ($user, $membership, $documentUuids, $amountMinor, $threshold, $request) {
            $locked = BusinessMembership::query()->whereKey($membership->id)->lockForUpdate()->firstOrFail();
            $payable = $this->ledger->payableBalanceMinor($locked);

            if ($payable < $threshold) {
                throw ValidationException::withMessages([
                    'balance' => ["Payable balance {$payable} is below threshold {$threshold}."],
                ]);
            }

            $pending = PayoutRequest::query()
                ->where('business_membership_id', $locked->id)
                ->whereIn('status', [
                    PayoutRequestStatus::Pending->value,
                    PayoutRequestStatus::Approved->value,
                ])
                ->lockForUpdate()
                ->exists();

            if ($pending) {
                throw ValidationException::withMessages([
                    'payout' => ['A payout request is already pending or approved for this membership.'],
                ]);
            }

            $paymentMethod = PaymentMethodVersion::query()
                ->where('business_membership_id', $locked->id)
                ->where('status', PaymentMethodStatus::Approved)
                ->latest('version')
                ->first();

            if ($paymentMethod === null) {
                throw ValidationException::withMessages([
                    'payment_method' => ['An approved payment method is required.'],
                ]);
            }

            $documents = PrivateDocument::query()
                ->where('user_id', $user->id)
                ->where('business_membership_id', $locked->id)
                ->where('scan_status', DocumentScanStatus::Clean)
                ->whereIn('uuid', $documentUuids)
                ->get();

            if ($documents->count() !== count(array_unique($documentUuids)) || $documents->isEmpty()) {
                throw ValidationException::withMessages([
                    'document_uuids' => ['Provide one or more clean scanned documents belonging to this membership.'],
                ]);
            }

            $requestAmount = $amountMinor ?? $payable;
            if ($requestAmount < $threshold || $requestAmount > $payable) {
                throw ValidationException::withMessages([
                    'amount_minor' => ["Amount must be between threshold ({$threshold}) and payable ({$payable})."],
                ]);
            }

            $payout = PayoutRequest::query()->create([
                'business_id' => $locked->business_id,
                'business_membership_id' => $locked->id,
                'user_id' => $user->id,
                'payment_method_version_id' => $paymentMethod->id,
                'amount_minor' => $requestAmount,
                'currency' => $membership->business->currency,
                'status' => PayoutRequestStatus::Pending,
            ]);

            $payout->documents()->sync($documents->pluck('id')->all());

            $this->audit->log(
                action: 'payout_request.created',
                actor: $user,
                businessId: $payout->business_id,
                entity: new AuditEntity(PayoutRequest::class, $payout->id),
                context: ['amount_minor' => $requestAmount],
                request: $request,
            );

            return $payout->load(['documents', 'paymentMethodVersion', 'business']);
        });
    }

    public function approve(User $actor, PayoutRequest $payout, Request $request): PayoutRequest
    {
        if ($payout->status !== PayoutRequestStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending payout requests can be approved.'],
            ]);
        }

        $payout->forceFill([
            'status' => PayoutRequestStatus::Approved,
            'reviewed_by_user_id' => $actor->id,
            'reviewed_at' => now(),
            'status_reason' => null,
        ])->save();

        $this->audit->log(
            action: 'payout_request.approved',
            actor: $actor,
            businessId: $payout->business_id,
            entity: new AuditEntity(PayoutRequest::class, $payout->id),
            request: $request,
        );

        return $payout->fresh();
    }

    public function reject(User $actor, PayoutRequest $payout, string $reason, Request $request): PayoutRequest
    {
        if (! in_array($payout->status, [PayoutRequestStatus::Pending, PayoutRequestStatus::Approved], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only pending/approved payout requests can be rejected.'],
            ]);
        }

        $payout->forceFill([
            'status' => PayoutRequestStatus::Rejected,
            'status_reason' => $reason,
            'reviewed_by_user_id' => $actor->id,
            'reviewed_at' => now(),
        ])->save();

        $this->audit->log(
            action: 'payout_request.rejected',
            actor: $actor,
            businessId: $payout->business_id,
            entity: new AuditEntity(PayoutRequest::class, $payout->id),
            context: ['reason' => $reason],
            request: $request,
        );

        return $payout->fresh();
    }

    public function markPaid(
        User $actor,
        PayoutRequest $payout,
        string $externalReference,
        Request $request,
    ): PayoutRequest {
        return DB::transaction(function () use ($actor, $payout, $externalReference, $request) {
            $locked = PayoutRequest::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== PayoutRequestStatus::Approved) {
                throw ValidationException::withMessages([
                    'status' => ['Only approved payout requests can be marked paid.'],
                ]);
            }

            $membership = BusinessMembership::query()
                ->whereKey($locked->business_membership_id)
                ->lockForUpdate()
                ->firstOrFail();

            $payable = $this->ledger->payableBalanceMinor($membership);
            if ($payable < $locked->amount_minor) {
                throw ValidationException::withMessages([
                    'balance' => ['Payable balance is insufficient to settle this payout.'],
                ]);
            }

            $entry = $this->ledger->postPayoutSettlement($locked);

            $locked->forceFill([
                'status' => PayoutRequestStatus::Paid,
                'paid_by_user_id' => $actor->id,
                'paid_at' => now(),
                'external_reference' => $externalReference,
                'ledger_entry_id' => $entry->id,
            ])->save();

            $this->audit->log(
                action: 'payout_request.paid',
                actor: $actor,
                businessId: $locked->business_id,
                entity: new AuditEntity(PayoutRequest::class, $locked->id),
                context: [
                    'amount_minor' => $locked->amount_minor,
                    'external_reference' => $externalReference,
                ],
                request: $request,
            );

            return $locked->fresh(['documents', 'paymentMethodVersion']);
        });
    }
}
