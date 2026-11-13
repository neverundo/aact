<?php

namespace App\Services\Onboarding;

use App\Enums\DocumentScanStatus;
use App\Enums\PaymentMethodStatus;
use App\Enums\PaymentMethodType;
use App\Models\BusinessMembership;
use App\Models\PaymentMethodVersion;
use App\Models\PrivateDocument;
use App\Models\User;
use App\Services\Audit\AuditEntity;
use App\Services\Audit\AuditLogger;
use App\Services\Documents\PrivateDocumentStorage;
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
            entity: new AuditEntity(PaymentMethodVersion::class, $version->id),
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

        if ($status === PaymentMethodStatus::Rejected && blank($notes)) {
            throw ValidationException::withMessages([
                'notes' => ['A rejection reason is required.'],
            ]);
        }

        $proofReady = false;

        $reviewed = DB::transaction(function () use ($actor, $version, $status, $notes, &$proofReady) {
            /** @var PaymentMethodVersion $locked */
            $locked = PaymentMethodVersion::query()
                ->whereKey($version->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== PaymentMethodStatus::PendingReview) {
                throw ValidationException::withMessages([
                    'status' => ['Only pending payment methods can be reviewed.'],
                ]);
            }

            if ($status === PaymentMethodStatus::Approved) {
                $proofReady = $this->membershipHasReadableBankProof($locked->business_membership_id);
                if (! $proofReady) {
                    throw ValidationException::withMessages([
                        'documents' => ['A clean, readable bank proof document is required before approval.'],
                    ]);
                }
            } else {
                $proofReady = $this->membershipHasReadableBankProof($locked->business_membership_id);
            }

            $locked->forceFill([
                'status' => $status,
                'reviewed_by_user_id' => $actor->id,
                'reviewed_at' => now(),
                'review_notes' => $notes,
            ])->save();

            return $locked->fresh();
        });

        $this->audit->log(
            action: 'payment_method.reviewed',
            actor: $actor,
            businessId: $reviewed->business_id,
            entity: new AuditEntity(PaymentMethodVersion::class, $reviewed->id),
            context: [
                'status' => $status->value,
                'bank_proof_ready' => $proofReady,
            ],
            request: $request,
        );

        return $reviewed;
    }

    private function membershipHasReadableBankProof(int $membershipId): bool
    {
        $proofPurpose = (string) config('aact.documents.payment_proof_purpose', 'bank_proof');

        $documents = PrivateDocument::query()
            ->where('business_membership_id', $membershipId)
            ->where('purpose', $proofPurpose)
            ->where('scan_status', DocumentScanStatus::Clean)
            ->get(['id', 'path']);

        foreach ($documents as $document) {
            if (PrivateDocumentStorage::isReadable($document->path)) {
                return true;
            }
        }

        return false;
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
            entity: new AuditEntity(PaymentMethodVersion::class, $version->id),
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
