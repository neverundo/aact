<?php

namespace App\Services\Onboarding;

use App\Enums\MembershipStatus;
use App\Enums\PaymentMethodStatus;
use App\Models\BusinessMembership;
use App\Models\User;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MembershipReviewService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ReferralCodeService $referralCodes,
    ) {}

    public function approve(User $actor, BusinessMembership $membership, Request $request): BusinessMembership
    {
        if ($membership->status !== MembershipStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending memberships can be approved.'],
            ]);
        }

        $approvedPayment = $membership->paymentMethodVersions()
            ->where('status', PaymentMethodStatus::Approved)
            ->exists();

        if (! $approvedPayment) {
            throw ValidationException::withMessages([
                'payment_method' => ['An approved payment method version is required before membership approval.'],
            ]);
        }

        $membership = DB::transaction(function () use ($actor, $membership) {
            $membership->forceFill([
                'status' => MembershipStatus::Approved,
                'approved_at' => now(),
                'approved_by_user_id' => $actor->id,
                'status_reason' => null,
            ])->save();

            $this->referralCodes->ensureDefaultCodes($membership->fresh(['websites', 'user']));

            return $membership->fresh(['websites', 'referralCodes', 'paymentMethodVersions']);
        });

        $this->audit->log(
            action: 'membership.approved',
            actor: $actor,
            businessId: $membership->business_id,
            entity: new AuditEntity(BusinessMembership::class, $membership->id),
            request: $request,
        );

        return $membership;
    }

    public function reject(User $actor, BusinessMembership $membership, string $reason, Request $request): BusinessMembership
    {
        if ($membership->status !== MembershipStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending memberships can be rejected.'],
            ]);
        }

        $membership->forceFill([
            'status' => MembershipStatus::Rejected,
            'status_reason' => $reason,
            'approved_at' => null,
            'approved_by_user_id' => $actor->id,
        ])->save();

        $this->audit->log(
            action: 'membership.rejected',
            actor: $actor,
            businessId: $membership->business_id,
            entity: new AuditEntity(BusinessMembership::class, $membership->id),
            context: ['reason' => $reason],
            request: $request,
        );

        return $membership->fresh();
    }

    public function suspend(User $actor, BusinessMembership $membership, string $reason, Request $request): BusinessMembership
    {
        if ($membership->status !== MembershipStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => ['Only approved memberships can be suspended.'],
            ]);
        }

        $membership->forceFill([
            'status' => MembershipStatus::Suspended,
            'status_reason' => $reason,
        ])->save();

        $membership->referralCodes()->update(['is_active' => false]);

        $this->audit->log(
            action: 'membership.suspended',
            actor: $actor,
            businessId: $membership->business_id,
            entity: new AuditEntity(BusinessMembership::class, $membership->id),
            context: ['reason' => $reason],
            request: $request,
        );

        return $membership->fresh(['referralCodes']);
    }
}
