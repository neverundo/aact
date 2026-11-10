<?php

namespace App\Services\Onboarding;

use App\Enums\PaymentMethodStatus;
use App\Enums\PaymentMethodType;
use App\Models\BusinessMembership;
use App\Models\PaymentMethodVersion;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\AuthSession;
use App\Support\Iban;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentMethodService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array{iban?: string, phone?: string, holder_name?: string}  $payload
     */
    public function submit(
        User $user,
        BusinessMembership $membership,
        PaymentMethodType $type,
        array $payload,
        ?Request $request = null,
    ): PaymentMethodVersion {
        if ($membership->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'membership' => ['Membership does not belong to the authenticated user.'],
            ]);
        }

        [$encryptedPayload, $mask] = $this->normalizePayload($type, $payload);

        $version = DB::transaction(function () use ($user, $membership, $type, $encryptedPayload, $mask) {
            PaymentMethodVersion::query()
                ->where('business_membership_id', $membership->id)
                ->where('status', PaymentMethodStatus::PendingReview)
                ->update(['status' => PaymentMethodStatus::Superseded]);

            $nextVersion = (int) PaymentMethodVersion::query()
                ->where('business_membership_id', $membership->id)
                ->max('version') + 1;

            return PaymentMethodVersion::query()->create([
                'user_id' => $user->id,
                'business_id' => $membership->business_id,
                'business_membership_id' => $membership->id,
                'method_type' => $type,
                'payload_encrypted' => $encryptedPayload,
                'display_mask' => $mask,
                'status' => PaymentMethodStatus::PendingReview,
                'version' => max(1, $nextVersion),
            ]);
        });

        $this->audit->log(
            action: 'payment_method.submitted',
            actor: $user,
            businessId: $membership->business_id,
            entityType: PaymentMethodVersion::class,
            entityId: $version->id,
            context: [
                'method_type' => $type->value,
                'display_mask' => $mask,
                'version' => $version->version,
            ],
            request: $request,
        );

        return $version;
    }

    public function review(
        User $actor,
        PaymentMethodVersion $version,
        PaymentMethodStatus $status,
        ?string $notes,
        Request $request,
    ): PaymentMethodVersion {
        if (! in_array($status, [PaymentMethodStatus::Approved, PaymentMethodStatus::Rejected], true)) {
            throw ValidationException::withMessages([
                'status' => ['Invalid review status.'],
            ]);
        }

        if ($version->status !== PaymentMethodStatus::PendingReview) {
            throw ValidationException::withMessages([
                'status' => ['Only pending payment methods can be reviewed.'],
            ]);
        }

        $version->forceFill([
            'status' => $status,
            'reviewed_by_user_id' => $actor->id,
            'reviewed_at' => now(),
            'review_notes' => $notes,
        ])->save();

        $this->audit->log(
            action: 'payment_method.reviewed',
            actor: $actor,
            businessId: $version->business_id,
            entityType: PaymentMethodVersion::class,
            entityId: $version->id,
            context: [
                'status' => $status->value,
            ],
            request: $request,
        );

        return $version->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function reveal(User $actor, PaymentMethodVersion $version, Request $request): array
    {
        if (! AuthSession::hasValidStepUp()) {
            throw ValidationException::withMessages([
                'step_up' => ['Recent re-authentication is required to reveal payment details.'],
            ]);
        }

        $payload = $version->payload_encrypted;

        $this->audit->log(
            action: 'payment_method.revealed',
            actor: $actor,
            businessId: $version->business_id,
            entityType: PaymentMethodVersion::class,
            entityId: $version->id,
            context: ['method_type' => $version->method_type->value],
            request: $request,
        );

        return is_array($payload) ? $payload : [];
    }

    /**
     * @param  array{iban?: string, phone?: string, holder_name?: string}  $payload
     * @return array{0: array<string, string>, 1: string}
     */
    private function normalizePayload(PaymentMethodType $type, array $payload): array
    {
        return match ($type) {
            PaymentMethodType::Iban => $this->ibanPayload($payload),
            PaymentMethodType::MbWay => $this->mbwayPayload($payload),
        };
    }

    /**
     * @param  array{iban?: string, holder_name?: string}  $payload
     * @return array{0: array<string, string>, 1: string}
     */
    private function ibanPayload(array $payload): array
    {
        if (blank($payload['iban'] ?? null) || blank($payload['holder_name'] ?? null)) {
            throw ValidationException::withMessages([
                'iban' => ['IBAN and holder name are required.'],
            ]);
        }

        try {
            $iban = Iban::assertValid((string) $payload['iban']);
        } catch (\InvalidArgumentException) {
            throw ValidationException::withMessages([
                'iban' => ['IBAN failed format/checksum validation.'],
            ]);
        }

        return [
            [
                'iban' => $iban,
                'holder_name' => trim((string) $payload['holder_name']),
            ],
            Iban::mask($iban),
        ];
    }

    /**
     * @param  array{phone?: string, holder_name?: string}  $payload
     * @return array{0: array<string, string>, 1: string}
     */
    private function mbwayPayload(array $payload): array
    {
        if (blank($payload['phone'] ?? null) || blank($payload['holder_name'] ?? null)) {
            throw ValidationException::withMessages([
                'phone' => ['MB WAY phone and holder name are required.'],
            ]);
        }

        try {
            $phone = PhoneNumber::normalize((string) $payload['phone']);
        } catch (\InvalidArgumentException) {
            throw ValidationException::withMessages([
                'phone' => ['Phone number format is invalid.'],
            ]);
        }

        return [
            [
                'phone' => $phone,
                'holder_name' => trim((string) $payload['holder_name']),
            ],
            PhoneNumber::mask($phone),
        ];
    }
}
