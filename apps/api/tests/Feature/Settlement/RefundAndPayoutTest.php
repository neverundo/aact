<?php

namespace Tests\Feature\Settlement;

use App\Enums\CommissionStatus;
use App\Enums\DocumentScanStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\PaymentMethodStatus;
use App\Enums\PaymentMethodType;
use App\Enums\PayoutRequestStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Commission;
use App\Models\IntegrationCredential;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Models\PaymentMethodVersion;
use App\Models\PrivateDocument;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\Website;
use App\Services\Commission\CommissionRuleService;
use App\Services\Commission\CreateCommissionRuleData;
use App\Services\Integration\IntegrationCredentialService;
use App\Support\AuthSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\SignsIntegrationRequests;
use Tests\TestCase;

class RefundAndPayoutTest extends TestCase
{
    use RefreshDatabase;
    use SignsIntegrationRequests;

    public function test_refund_reverses_commission_proportionally_without_deleting_ledger_history(): void
    {
        [$credential, $token, $secret, $code] = $this->bootstrapSaleStack(threshold: 1000);

        $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'sale-1',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 10_000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ])->assertCreated();

        $this->assertSame(1, LedgerEntry::query()->count());
        $this->assertSame(1000, Commission::query()->value('commission_minor'));

        $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'refund-sale-1',
            'event_type' => 'refund',
            'related_external_event_id' => 'sale-1',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 5_000,
            'currency' => 'EUR',
        ])->assertCreated()
            ->assertJsonPath('reversed_minor', 500)
            ->assertJsonPath('commission.reversed_minor', 500)
            ->assertJsonPath('commission.status', CommissionStatus::Available->value);

        $this->assertSame(2, LedgerEntry::query()->count());
        $this->assertSame(4, LedgerLine::query()->count());
        $this->assertTrue(LedgerEntry::query()->where('entry_type', 'commission_reversal')->exists());

        // Retry must not reverse again.
        $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'refund-sale-1',
            'event_type' => 'refund',
            'related_external_event_id' => 'sale-1',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 5_000,
            'currency' => 'EUR',
        ])->assertOk()->assertJsonPath('replayed', true);

        $this->assertSame(2, LedgerEntry::query()->count());
    }

    public function test_full_refund_marks_commission_reversed(): void
    {
        [$credential, $token, $secret, $code] = $this->bootstrapSaleStack(threshold: 1000);

        $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'sale-full',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 10_000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ])->assertCreated();

        $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'refund-full',
            'event_type' => 'chargeback',
            'related_external_event_id' => 'sale-full',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 10_000,
            'currency' => 'EUR',
        ])->assertCreated()
            ->assertJsonPath('commission.status', CommissionStatus::Reversed->value)
            ->assertJsonPath('commission.reversed_minor', 1000);
    }

    public function test_payout_request_settlement_reduces_payable_and_keeps_ledger_balanced(): void
    {
        [$credential, $token, $secret, $code, $referrer, $membership] = $this->bootstrapSaleStack(threshold: 500);

        $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'sale-pay',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 10_000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ])->assertCreated();

        $paymentMethod = PaymentMethodVersion::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'method_type' => PaymentMethodType::Iban,
            'payload_encrypted' => ['iban' => 'DE89370400440532013000', 'holder_name' => 'Referrer'],
            'display_mask' => 'DE89**************3000',
            'status' => PaymentMethodStatus::Approved,
            'version' => 1,
        ]);

        $document = PrivateDocument::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'purpose' => 'payout_proof',
            'disk' => 'private_documents',
            'path' => 'demo/doc.pdf',
            'original_filename' => 'doc.pdf',
            'mime' => 'application/pdf',
            'size_bytes' => 100,
            'scan_status' => DocumentScanStatus::Clean,
            'scanned_at' => now(),
            'scan_engine' => 'fake',
        ]);

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();
        $create = $this->asSpa()->postJson('/api/v1/portal/payout-requests', [
            'membership_id' => $membership->id,
            'document_uuids' => [$document->uuid],
            'amount_minor' => 1000,
        ])->assertCreated();

        $payoutId = $create->json('data.id');

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();
        $this->asSpa()->getJson('/api/v1/portal/balances')
            ->assertOk()
            ->assertJsonPath('data.0.payable_minor', 1000)
            ->assertJsonPath('data.0.reserved_minor', 1000)
            ->assertJsonPath('data.0.available_minor', 0);

        $admin = User::query()->whereHas('memberships', function ($q) use ($membership): void {
            $q->where('business_id', $membership->business_id)
                ->where('role', MembershipRole::BusinessAdmin);
        })->firstOrFail();

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();
        AuthSession::markStepUp();

        $this->asSpa()->postJson('/api/v1/admin/payout-requests/'.$payoutId.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', PayoutRequestStatus::Approved->value);

        $this->asSpa()->postJson('/api/v1/admin/payout-requests/'.$payoutId.'/mark-paid', [
            'external_reference' => 'SEPA-123',
        ])->assertOk()
            ->assertJsonPath('data.status', PayoutRequestStatus::Paid->value);

        $this->assertTrue(LedgerEntry::query()->where('entry_type', 'payout_settlement')->exists());

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();
        $this->asSpa()->getJson('/api/v1/portal/balances')
            ->assertOk()
            ->assertJsonPath('data.0.payable_minor', 0)
            ->assertJsonPath('data.0.reserved_minor', 0)
            ->assertJsonPath('data.0.available_minor', 0);

        foreach (LedgerEntry::query()->with('lines')->get() as $entry) {
            $this->assertTrue($entry->isBalanced());
        }
    }

    public function test_payout_below_threshold_is_rejected(): void
    {
        [, , , , $referrer, $membership] = $this->bootstrapSaleStack(threshold: 50_000);

        PaymentMethodVersion::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'method_type' => PaymentMethodType::Iban,
            'payload_encrypted' => ['iban' => 'DE89370400440532013000', 'holder_name' => 'Referrer'],
            'display_mask' => 'DE89**************3000',
            'status' => PaymentMethodStatus::Approved,
            'version' => 1,
        ]);

        $document = PrivateDocument::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'purpose' => 'payout_proof',
            'disk' => 'private_documents',
            'path' => 'demo/doc2.pdf',
            'original_filename' => 'doc2.pdf',
            'mime' => 'application/pdf',
            'size_bytes' => 100,
            'scan_status' => DocumentScanStatus::Clean,
            'scanned_at' => now(),
            'scan_engine' => 'fake',
        ]);

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();
        $this->asSpa()->postJson('/api/v1/portal/payout-requests', [
            'membership_id' => $membership->id,
            'document_uuids' => [$document->uuid],
        ])->assertStatus(422);
    }

    public function test_payout_requires_referrer_mfa(): void
    {
        [, , , , $referrer, $membership] = $this->bootstrapSaleStack(threshold: 500);
        $referrer->forceFill(['email_otp_enabled_at' => null])->save();

        PaymentMethodVersion::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'method_type' => PaymentMethodType::Iban,
            'payload_encrypted' => ['iban' => 'DE89370400440532013000', 'holder_name' => 'Referrer'],
            'display_mask' => 'DE89**************3000',
            'status' => PaymentMethodStatus::Approved,
            'version' => 1,
        ]);

        $document = PrivateDocument::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'purpose' => 'payout_proof',
            'disk' => 'private_documents',
            'path' => 'demo/doc-mfa.pdf',
            'original_filename' => 'doc-mfa.pdf',
            'mime' => 'application/pdf',
            'size_bytes' => 100,
            'scan_status' => DocumentScanStatus::Clean,
            'scanned_at' => now(),
            'scan_engine' => 'fake',
        ]);

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/portal/payout-requests', [
            'membership_id' => $membership->id,
            'document_uuids' => [$document->uuid],
            'amount_minor' => 500,
        ])
            ->assertForbidden()
            ->assertJsonPath('code', 'mfa_required');
    }

    public function test_approve_fails_when_payable_drops_below_amount(): void
    {
        [$credential, $token, $secret, $code, $referrer, $membership] = $this->bootstrapSaleStack(threshold: 500);

        $this->postSignedEvent($credential, $token, $secret, [
            'external_event_id' => 'sale-approve-guard',
            'event_type' => 'sale',
            'occurred_at' => now()->toIso8601String(),
            'amount_minor' => 10_000,
            'currency' => 'EUR',
            'referral_code' => $code->code,
        ])->assertCreated();

        PaymentMethodVersion::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'method_type' => PaymentMethodType::Iban,
            'payload_encrypted' => ['iban' => 'DE89370400440532013000', 'holder_name' => 'Referrer'],
            'display_mask' => 'DE89**************3000',
            'status' => PaymentMethodStatus::Approved,
            'version' => 1,
        ]);

        $document = PrivateDocument::query()->create([
            'user_id' => $referrer->id,
            'business_id' => $membership->business_id,
            'business_membership_id' => $membership->id,
            'purpose' => 'payout_proof',
            'disk' => 'private_documents',
            'path' => 'demo/doc-approve.pdf',
            'original_filename' => 'doc-approve.pdf',
            'mime' => 'application/pdf',
            'size_bytes' => 100,
            'scan_status' => DocumentScanStatus::Clean,
            'scanned_at' => now(),
            'scan_engine' => 'fake',
        ]);

        $this->actingAs($referrer);
        AuthSession::markFullyAuthenticated();
        $payoutId = $this->asSpa()->postJson('/api/v1/portal/payout-requests', [
            'membership_id' => $membership->id,
            'document_uuids' => [$document->uuid],
            'amount_minor' => 1000,
        ])->assertCreated()->json('data.id');

        // Simulate an out-of-band payable drain (reserved soft-lock cannot prevent raw ledger inserts).
        $payableAccount = \App\Models\LedgerAccount::query()
            ->where('code', 'payable:membership:'.$membership->id)
            ->firstOrFail();
        $expenseAccount = \App\Models\LedgerAccount::query()
            ->where('business_id', $membership->business_id)
            ->where('code', 'commission_expense')
            ->firstOrFail();

        $entryId = \Illuminate\Support\Facades\DB::table('ledger_entries')->insertGetId([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'business_id' => $membership->business_id,
            'commercial_event_id' => null,
            'commission_id' => null,
            'entry_type' => 'test_payable_drain',
            'idempotency_key' => 'test_payable_drain:'.$payoutId,
            'description' => 'Test drain',
            'posted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Illuminate\Support\Facades\DB::table('ledger_lines')->insert([
            [
                'ledger_entry_id' => $entryId,
                'ledger_account_id' => $payableAccount->id,
                'business_id' => $membership->business_id,
                'side' => 'debit',
                'amount_minor' => 1000,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'ledger_entry_id' => $entryId,
                'ledger_account_id' => $expenseAccount->id,
                'business_id' => $membership->business_id,
                'side' => 'credit',
                'amount_minor' => 1000,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $admin = User::query()->whereHas('memberships', function ($q) use ($membership): void {
            $q->where('business_id', $membership->business_id)
                ->where('role', MembershipRole::BusinessAdmin);
        })->firstOrFail();

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $this->asSpa()->postJson('/api/v1/admin/payout-requests/'.$payoutId.'/approve')
            ->assertStatus(422);
    }

    /**
     * @return array{0: IntegrationCredential, 1: string, 2: string, 3: ReferralCode, 4: User, 5: BusinessMembership}
     */
    private function bootstrapSaleStack(int $threshold): array
    {
        $business = Business::factory()->create([
            'currency' => 'EUR',
            'payout_threshold_minor' => $threshold,
        ]);
        $website = Website::factory()->create([
            'business_id' => $business->id,
            'is_active' => true,
        ]);

        $admin = User::factory()->create([
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'totp_confirmed_at' => now(),
        ]);
        BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $admin->id,
            'role' => MembershipRole::BusinessAdmin,
            'status' => MembershipStatus::Approved,
        ]);

        $referrer = User::factory()->create([
            'email_otp_enabled_at' => now(),
        ]);
        $membership = BusinessMembership::factory()->create([
            'business_id' => $business->id,
            'user_id' => $referrer->id,
            'role' => MembershipRole::Referrer,
            'status' => MembershipStatus::Approved,
        ]);
        $membership->websites()->attach($website->id);

        $code = ReferralCode::query()->create([
            'business_id' => $business->id,
            'business_membership_id' => $membership->id,
            'user_id' => $referrer->id,
            'website_id' => $website->id,
            'code' => 'REF-PHASE4CODE',
            'is_active' => true,
        ]);

        $this->actingAs($admin);
        AuthSession::markFullyAuthenticated();

        $created = app(IntegrationCredentialService::class)->create(
            $admin,
            $business,
            $website,
            'checkout',
            'Checkout',
        );

        app(CommissionRuleService::class)->create(new CreateCommissionRuleData(
            actor: $admin,
            business: $business,
            name: 'Sale 10%',
            eventType: 'sale',
            rateBps: 1000,
            flatMinor: 0,
            priority: 100,
            effectiveFrom: Carbon::now()->subDay(),
            website: $website,
        ));

        return [
            $created['credential'],
            $created['plain_token'],
            $created['hmac_secret'],
            $code,
            $referrer,
            $membership,
        ];
    }
}
